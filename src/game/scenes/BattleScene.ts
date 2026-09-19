import Phaser from "phaser";

import { encounterById } from "../data/encounters";
import type { EncounterAction, EncounterDef } from "../data/encounters";
import { ITEMS } from "../data/items";
import { loreById } from "../data/lore";
import { SPELLS } from "../data/spells";
import { weaponById } from "../data/weapons";
import { applyCameraZoom, TEXT_RES, viewHeight, viewWidth } from "../display";
import { sheetKey } from "../gfx/characters";
import { bodyText, displayText } from "../gfx/fonts";
import type { WorldScene } from "./WorldScene";

/** Menu rows. Eight is more than any character can currently fill. */
const MAX_ACTIONS = 8;

type Phase = "menu" | "busy" | "over";

/**
 * A turn-based duel, launched as an overlay from the world. Deliberately
 * separate from the real-time combat in WorldScene - the sparring ring is a
 * different game, and the scene boundary keeps them from tangling.
 *
 * Everything specific to a fight lives in data/encounters.ts, so the sparring
 * shade and the story's final antagonist run through the same code.
 */
export class BattleScene extends Phaser.Scene {
  private world!: WorldScene;
  private encounter!: EncounterDef;

  private phase: Phase = "menu";
  private enemyHealth = 0;
  private wardTurns = 0;
  private log: string[] = [];
  private turnsTaken = 0;

  private enemySprite!: Phaser.GameObjects.Sprite;
  private playerSprite!: Phaser.GameObjects.Sprite;
  private bars!: Phaser.GameObjects.Graphics;
  private titleText!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private menuTexts: Phaser.GameObjects.Text[] = [];
  private actions: Array<{ label: string; run: () => void }> = [];
  /**
   * Menu indices chosen since the last frame.
   *
   * Filled from key events rather than polled with JustDown: Phaser clears a
   * key's justDown flag on keyup, so a press that begins and ends between two
   * frames is dropped entirely - which a low frame rate makes routine.
   */
  private readonly pressed = new Set<number>();

  constructor() {
    super("battle");
  }

  init(data: { encounter?: string }): void {
    this.encounter = encounterById(data.encounter ?? "sparring") ?? encounterById("sparring")!;
    this.enemyHealth = this.encounter.health;
    this.wardTurns = 0;
    this.turnsTaken = 0;
    this.phase = "menu";
    this.log = [`${this.encounter.name} squares up.`];
  }

  create(): void {
    this.world = this.scene.get("world") as WorldScene;
    applyCameraZoom(this);

    // Same trap as the world scene: a scene that is launched, stopped and
    // launched again re-runs create() on the *same* instance, so anything
    // pushed into a field-initialised array accumulates destroyed objects.
    // Left alone, the second duel draws its menu into the previous, dead texts
    // and shows no options at all.
    this.menuTexts = [];
    this.pressed.clear();

    const W = viewWidth(this);
    const H = viewHeight(this);

    this.add.rectangle(0, 0, W, H, 0x07080b, 0.92).setOrigin(0, 0);
    this.add.rectangle(0, H / 2, W, 260, 0x14121a, 1).setOrigin(0, 0.5);

    this.playerSprite = this.add
      .sprite(W * 0.26, H / 2 + 40, sheetKey("hero"), 6)
      .setOrigin(0.5, 1)
      .setScale(4);

    this.enemySprite = this.add
      .sprite(W * 0.74, H / 2 + 40, sheetKey(this.encounter.look), 6)
      .setOrigin(0.5, 1)
      .setScale(this.encounter.scale ?? 4);

    this.bars = this.add.graphics();
    this.titleText = this.add
      .text(W / 2, 34, this.encounter.name, displayText({ size: 34, color: "#e9d9a6" }))
      .setOrigin(0.5, 0)
      .setResolution(TEXT_RES);

    this.logText = this.add
      .text(W / 2, H / 2 - 180, "", bodyText({ size: 17, color: "#e4ddcc", align: "center", lineSpacing: 9 }))
      .setOrigin(0.5, 0)
      .setResolution(TEXT_RES);

    for (let i = 0; i < MAX_ACTIONS; i++) {
      this.menuTexts.push(
        this.add
          .text(W - 300, 0, "", bodyText({ size: 16, color: "#b6d0ff", align: "right" }))
          .setOrigin(1, 0.5)
          .setResolution(TEXT_RES),
      );
    }

    const codes = [
      Phaser.Input.Keyboard.KeyCodes.ONE,
      Phaser.Input.Keyboard.KeyCodes.TWO,
      Phaser.Input.Keyboard.KeyCodes.THREE,
      Phaser.Input.Keyboard.KeyCodes.FOUR,
      Phaser.Input.Keyboard.KeyCodes.FIVE,
      Phaser.Input.Keyboard.KeyCodes.SIX,
      Phaser.Input.Keyboard.KeyCodes.SEVEN,
      Phaser.Input.Keyboard.KeyCodes.EIGHT,
    ];
    codes.forEach((code, index) => {
      this.input.keyboard?.addKey(code).on("down", () => {
        this.world.audio.unlock();
        this.pressed.add(index);
      });
    });

    this.buildActions();
    this.render();
  }

  update(): void {
    if (this.pressed.size === 0) return;

    const chosen = [...this.pressed];
    this.pressed.clear();
    if (this.phase !== "menu") return;

    for (const index of chosen) {
      const action = this.actions[index];
      if (action) {
        action.run();
        return;
      }
    }
  }

  private buildActions(): void {
    const state = this.world.state;
    this.actions = [];

    this.actions.push({
      label: `Attack with the ${weaponById(state.player.weapon).name}`,
      run: () => this.playerAttack(),
    });

    for (const id of state.player.learnedSpells) {
      const spell = SPELLS[id];
      if (!spell || spell.damage <= 0) continue;
      if (this.actions.length >= MAX_ACTIONS - 2) break;
      this.actions.push({
        label: `Cast ${spell.name} (${spell.manaCost} mp)`,
        run: () => this.playerCast(id),
      });
    }

    this.actions.push({
      label: "Ward (halve the next two blows)",
      run: () => this.playerWard(),
    });

    if (!this.encounter.noYield) {
      this.actions.push({
        label: "Yield",
        run: () => this.finish(false, "You lower your wand."),
      });
    }
  }

  // --- player turns ------------------------------------------------------

  private playerAttack(): void {
    const weapon = weaponById(this.world.state.player.weapon);
    const damage = Math.round(weapon.light.damage * (0.85 + Math.random() * 0.4));
    this.enemyHealth -= damage;
    this.world.audio.playAttack(false, true);
    this.pushLog(`You swing the ${weapon.name} for ${damage}.`);
    this.hitEnemy();

    if (this.enemyHealth <= 0) {
      this.finish(true, this.encounter.victoryText);
      return;
    }
    this.enemyTurn();
  }

  private playerCast(id: string): void {
    const spell = SPELLS[id];
    if (!spell) return;
    if (!this.world.state.spendMana(spell.manaCost)) {
      this.world.audio.playUi("error");
      this.pushLog("Not enough mana.");
      this.render();
      return;
    }

    const damage = spell.damage + Math.floor(Math.random() * 4);
    this.enemyHealth -= damage;
    this.world.audio.playSpell(spell.kind);
    this.pushLog(`You cast ${spell.name} for ${damage}.`);

    const flash = this.add
      .image(this.enemySprite.x, this.enemySprite.y - 60, "fx_glow_cool")
      .setBlendMode("ADD")
      .setScale(0.3)
      .setTint(spell.color);
    this.tweens.add({
      targets: flash,
      scale: 1.4,
      alpha: 0,
      duration: 340,
      onComplete: () => flash.destroy(),
    });

    if (this.enemyHealth <= 0) {
      this.finish(true, this.encounter.victoryText);
      return;
    }
    this.enemyTurn();
  }

  private playerWard(): void {
    this.wardTurns = 2;
    this.world.audio.playUi("select");
    this.pushLog("You raise a ward.");
    this.enemyTurn();
  }

  // --- enemy turn --------------------------------------------------------

  private enemyTurn(): void {
    this.phase = "busy";
    this.turnsTaken++;
    this.render();

    this.time.delayedCall(620, () => {
      const action = this.pickAction();
      let damage =
        action.max > 0 ? action.min + Math.floor(Math.random() * (action.max - action.min + 1)) : 0;

      if (this.wardTurns > 0 && damage > 0) {
        this.wardTurns--;
        damage = Math.ceil(damage / 2);
        this.pushLog("The ward holds.");
      }

      this.pushLog(action.text.replace("{name}", this.encounter.name).replace("{d}", String(damage)));

      if (damage > 0) {
        this.world.audio.playHurt();
        this.world.state.damage(damage);
        this.playerSprite.setTint(0xff9a9a);
        this.time.delayedCall(140, () => this.playerSprite.clearTint());
      }

      if (this.world.state.player.health <= 0) {
        // Losing is a setback, not a dead end: you wake up at the last
        // checkpoint rather than in the middle of another attempt.
        this.world.state.player.health = Math.max(1, Math.round(this.world.state.player.maxHealth * 0.4));
        this.finish(false, this.encounter.defeatText);
        return;
      }

      this.phase = "menu";
      this.buildActions();
      this.render();
    });
  }

  /** The antagonist argues before he fights; ward turns should not be wasted on it. */
  private pickAction(): EncounterAction {
    const action = this.encounter.actions;
    const total = action.reduce((sum, a) => sum + a.weight, 0);
    let roll = Math.random() * total;
    for (const candidate of action) {
      roll -= candidate.weight;
      if (roll <= 0) return candidate;
    }
    return action[0]!;
  }

  // --- presentation ------------------------------------------------------

  private hitEnemy(): void {
    this.enemySprite.setTint(0xff9a9a);
    this.time.delayedCall(140, () => this.enemySprite.clearTint());
  }

  private pushLog(line: string): void {
    this.log.push(line);
    if (this.log.length > 4) this.log.shift();
  }

  private render(): void {
    const { player } = this.world.state;
    const W = viewWidth(this);
    const H = viewHeight(this);

    this.bars.clear();
    this.drawBar(60, 84, 380, 18, player.health / player.maxHealth, 0xc0392b);
    this.drawBar(60, 110, 380, 13, player.mana / player.maxMana, 0x3b7fd4);
    this.drawBar(W - 440, 84, 380, 18, this.enemyHealth / this.encounter.health, 0x8e44ad);

    this.logText.setText(this.log.join("\n"));
    this.logText.setPosition(W / 2, H / 2 - 180);

    if (this.wardTurns > 0) {
      this.bars.lineStyle(2, 0xd9b44a, 0.9);
      this.bars.strokeRoundedRect(52, 76, 396, 48, 6);
    }

    // Options are laid out from the bottom of the screen upward, so the list
    // can be any length without colliding with the log above it.
    const visible = this.phase === "menu" ? this.actions : [];
    const rowHeight = 26;
    const firstY = H - 32 - (visible.length - 1) * rowHeight;

    for (let i = 0; i < this.menuTexts.length; i++) {
      const text = this.menuTexts[i];
      if (!text) continue;
      const action = visible[i];
      if (!action) {
        text.setVisible(false);
        continue;
      }
      text.setVisible(true).setPosition(W - 40, firstY + i * rowHeight).setText(`[${i + 1}]  ${action.label}`);
    }

    this.titleText.setText(this.phase === "busy" ? `${this.encounter.name}...` : this.encounter.name);
  }

  private drawBar(x: number, y: number, w: number, h: number, fraction: number, color: number): void {
    this.bars.fillStyle(0x000000, 0.6);
    this.bars.fillRect(x, y, w, h);
    this.bars.fillStyle(color, 1);
    this.bars.fillRect(x, y, Math.round(w * Math.max(0, Math.min(1, fraction))), h);
    this.bars.lineStyle(1, 0x555a66, 1);
    this.bars.strokeRect(x, y, w, h);
  }

  private finish(victory: boolean, message: string): void {
    this.phase = "over";
    this.pushLog(message);
    this.render();

    if (victory) {
      this.world.audio.playDefeat();
      this.grantVictory();
    } else {
      this.world.audio.playUi("error");
      this.game.events.emit("korvana:toast", `Duel lost. ${message}`);
    }

    this.time.delayedCall(victory ? 1100 : 900, () => {
      this.scene.resume("world");
      this.scene.stop();
    });
  }

  private grantVictory(): void {
    const state = this.world.state;
    const encounter = this.encounter;

    this.world.audio.playReward();
    state.player.gold += encounter.gold;

    const lines = [`${encounter.name} defeated.`];
    if (encounter.gold > 0) lines.push(`+${encounter.gold} gold.`);

    // One-shot rewards are gated on a flag so a repeatable duel cannot be
    // farmed for the boss's sword.
    const rewardFlag = `battle_reward_${encounter.id}`;
    if (encounter.rewardItem && !state.flag(rewardFlag)) {
      const reward = ITEMS[encounter.rewardItem];
      if (this.world.inventory.add(encounter.rewardItem)) {
        state.setFlag(rewardFlag);
        lines.push(`Received ${reward?.name ?? encounter.rewardItem}.`);
      }
    }

    if (encounter.lore && state.unlockLore(encounter.lore)) {
      lines.push(`Journal: ${loreById(encounter.lore)?.title ?? encounter.lore}`);
    }

    const events = this.world.gameEvents;
    events.emit({ kind: "battle_won", id: encounter.id });
    if (encounter.boss) events.emit({ kind: "boss_defeated", id: encounter.id });

    for (const line of lines) this.game.events.emit("korvana:toast", line);
  }
}
