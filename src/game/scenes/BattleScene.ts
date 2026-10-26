import Phaser from "phaser";

import { encounterById } from "../data/encounters";
import type { EncounterAction, EncounterDef } from "../data/encounters";
import { ITEMS } from "../data/items";
import { loreById } from "../data/lore";
import { SPELLS } from "../data/spells";
import { weaponById } from "../data/weapons";
import { DPR, TEXT_RES, viewHeight, viewWidth } from "../display";
import { attackKey, castKey, idleKey, sheetKey } from "../gfx/characters";
import { arenaLayout, bakeArena, bakeRuneRing } from "../gfx/duelArt";
import { heroLook } from "../gfx/looks";
import { displayText } from "../gfx/fonts";
import { roundPortraitKey } from "../ui/Hud";
import { medallionKey } from "../ui/icons";
import {
  capsuleBar,
  COLOR_DIM,
  COLOR_GOLD,
  COLOR_INK,
  COLOR_INK_SOFT,
  Frame,
  heading,
  HEALTH,
  HEALTH_DARK,
  keyBadge,
  label,
  MANA,
  MANA_DARK,
  uiCamera,
  WARD,
} from "../ui/theme";
import type { WorldScene } from "./WorldScene";

/** Menu rows. Eight is more than any character can currently fill. */
const MAX_ACTIONS = 8;
const PLATE_W = 360;
const PLATE_H = 96;
const PORTRAIT = 72;

type Phase = "menu" | "busy" | "over";

/**
 * A turn-based duel, launched as an overlay from the world. Deliberately
 * separate from the real-time combat in WorldScene - the sparring ring is a
 * different game, and the scene boundary keeps them from tangling.
 *
 * Everything specific to a fight lives in data/encounters.ts, so the sparring
 * shade and the story's final antagonist run through the same code.
 *
 * The presentation is a staged duel: a vaulted hall with a rune circle in the
 * floor, both duellists drawn large and breathing, ornate plates for each
 * side, a parchment log, and the action menu on an ink panel. Every action
 * has a little theatre - a lunge, a bolt of light, a ward bubble, numbers
 * that jump off the target.
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
  private playerLook = "hero";
  private playerHome = { x: 0, y: 0 };
  private enemyHome = { x: 0, y: 0 };
  private bars!: Phaser.GameObjects.Graphics;
  private wardBubble!: Phaser.GameObjects.Graphics;
  private ring!: Phaser.GameObjects.Image;
  private flames: Phaser.GameObjects.Image[] = [];
  private frames: Frame[] = [];
  private playerStats!: Phaser.GameObjects.Text;
  private enemyStats!: Phaser.GameObjects.Text;
  private titleText!: Phaser.GameObjects.Text;
  private logText!: Phaser.GameObjects.Text;
  private menuTitle!: Phaser.GameObjects.Text;
  private menuTexts: Phaser.GameObjects.Text[] = [];
  private menuKeys: Phaser.GameObjects.Text[] = [];
  private menuFrame!: Frame;
  private logFrame!: Frame;
  private actions: Array<{ label: string; run: () => void }> = [];
  private enemyGhost = 1;
  private playerGhost = 1;
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
    uiCamera(this);

    // Same trap as the world scene: a scene that is launched, stopped and
    // launched again re-runs create() on the *same* instance, so anything
    // pushed into a field-initialised array accumulates destroyed objects.
    // Left alone, the second duel draws its menu into the previous, dead texts
    // and shows no options at all.
    this.menuTexts = [];
    this.menuKeys = [];
    this.flames = [];
    this.frames = [];
    this.pressed.clear();
    this.badges = null;
    this.enemyGhost = 1;
    this.playerGhost = 1;
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => {
      for (const frame of this.frames) frame.destroy();
      this.frames = [];
    });

    // Duel music while this scene lives; releasing the hold lets the world's zone back in.
    this.world.audio.holdZone(this.encounter.boss ? "boss" : "battle", "duel");
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.world.audio.holdZone(null, "duel"));

    const W = viewWidth(this);
    const H = viewHeight(this);
    const L = arenaLayout(W, H);
    const accent = this.encounter.boss ? "#6fd0a0" : "#8fb4ff";
    const accentHex = Phaser.Display.Color.HexStringToColor(accent).color;

    // --- the hall --------------------------------------------------------------
    this.add.image(0, 0, bakeArena(this, W, H, accent)).setOrigin(0).setScale(1 / DPR);
    this.ring = this.add
      .image(L.ringX, L.ringY, bakeRuneRing(this, L.ringRX, L.ringRY))
      .setScale(1 / DPR)
      .setTint(accentHex)
      .setBlendMode(Phaser.BlendModes.ADD)
      .setAlpha(0.6);
    this.tweens.add({ targets: this.ring, alpha: 0.95, duration: 1600, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });
    for (const b of L.braziers) {
      const flame = this.add
        .image(b.x, b.y - 22, "fx_glow")
        .setBlendMode(Phaser.BlendModes.ADD)
        .setScale(0.9)
        .setTint(0xffa040);
      this.flames.push(flame);
    }

    // --- duellists ---------------------------------------------------------------
    this.playerLook = heroLook(this.world.state.house);
    const unit = Math.max(3, Math.round((H * 0.34) / 48));
    this.playerHome = { x: L.ringX - L.ringRX * 0.55, y: L.ringY + L.ringRY * 0.35 };
    this.enemyHome = { x: L.ringX + L.ringRX * 0.55, y: L.ringY + L.ringRY * 0.35 };

    const shadows = this.add.graphics();
    shadows.fillStyle(0x000000, 0.45);
    shadows.fillEllipse(this.playerHome.x, this.playerHome.y - 2, 22 * unit, 6 * unit);
    shadows.fillEllipse(this.enemyHome.x, this.enemyHome.y - 2, 22 * unit, 6 * unit);

    this.playerSprite = this.add
      .sprite(this.playerHome.x, this.playerHome.y, sheetKey(this.playerLook))
      .setOrigin(0.5, 1)
      .setScale(unit);
    this.playerSprite.anims.play(idleKey(this.playerLook, "right"));

    const enemyLook = this.textures.exists(sheetKey(this.encounter.look)) ? this.encounter.look : "shade";
    const enemyScale = Math.max(3, Math.round(unit * ((this.encounter.scale ?? 4) / 4)));
    this.enemySprite = this.add
      .sprite(this.enemyHome.x, this.enemyHome.y, sheetKey(enemyLook))
      .setOrigin(0.5, 1)
      .setScale(enemyScale);
    this.enemySprite.anims.play(idleKey(enemyLook, "left"));

    this.wardBubble = this.add.graphics();

    // --- plates -------------------------------------------------------------------
    this.bars = this.add.graphics().setDepth(20);
    const plateY = 22;
    this.frames.push(new Frame(this, "ink").draw(24, plateY, PLATE_W, PLATE_H).setDepth(10));
    this.frames.push(new Frame(this, "ink").draw(W - 24 - PLATE_W, plateY, PLATE_W, PLATE_H).setDepth(10));
    const medal = medallionKey(this, PORTRAIT + 10);
    const pCx = 24 + 14 + PORTRAIT / 2;
    const eCx = W - 24 - 14 - PORTRAIT / 2;
    const pCy = plateY + PLATE_H / 2;
    this.add.image(pCx, pCy, roundPortraitKey(this, this.playerLook, PORTRAIT)).setScale(1 / DPR).setDepth(21);
    this.add.image(pCx, pCy, medal).setScale(1 / DPR).setDepth(22);
    this.add.image(eCx, pCy, roundPortraitKey(this, enemyLook, PORTRAIT)).setScale(1 / DPR).setDepth(21).setFlipX(true);
    this.add.image(eCx, pCy, medal).setScale(1 / DPR).setDepth(22);

    heading(this, this.world.state.player.name, { size: 21, color: "#f0deaa", align: "left" })
      .setPosition(pCx + PORTRAIT / 2 + 14, plateY + 12)
      .setDepth(21);
    heading(this, this.encounter.name, { size: 19, color: this.encounter.boss ? "#a8f0c8" : "#f0deaa", align: "right" })
      .setOrigin(1, 0)
      .setPosition(eCx - PORTRAIT / 2 - 14, plateY + 13)
      .setDepth(21);
    this.playerStats = label(this, "", { size: 13, color: "#fff4e6", bold: true }).setOrigin(1, 0.5).setDepth(21);
    this.playerStats.setStroke("#1a0808", 3);
    this.enemyStats = label(this, "", { size: 13, color: "#fff4e6", bold: true }).setOrigin(0, 0.5).setDepth(21);
    this.enemyStats.setStroke("#1a0808", 3);

    this.titleText = this.add
      .text(W / 2, plateY + 14, "", displayText({ size: 26, color: "#e9d9a6" }))
      .setOrigin(0.5, 0)
      .setResolution(TEXT_RES)
      .setDepth(21);
    this.titleText.setShadow(0, 2, "#000000", 6, false, true);

    // --- log and menu ----------------------------------------------------------------
    this.logFrame = new Frame(this, "parchment").setDepth(10);
    this.frames.push(this.logFrame);
    this.logText = label(this, "", { size: 16, color: COLOR_INK, lineSpacing: 6 }).setDepth(21);
    this.menuFrame = new Frame(this, "ink").setDepth(10);
    this.frames.push(this.menuFrame);
    this.menuTitle = heading(this, "", { size: 16, color: COLOR_GOLD, align: "left" }).setDepth(21);

    for (let i = 0; i < MAX_ACTIONS; i++) {
      const text = label(this, "", { size: 16, color: "#ece4d0" }).setOrigin(0, 0.5).setDepth(21);
      text.setInteractive({ useHandCursor: true });
      text.on("pointerdown", () => this.pressed.add(i));
      text.on("pointerover", () => text.setColor("#ffe6a0"));
      text.on("pointerout", () => text.setColor("#ece4d0"));
      this.menuTexts.push(text);
      this.menuKeys.push(label(this, "", { size: 12, color: "#1a1208", bold: true }).setOrigin(0.5).setDepth(22));
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

    // The duellists step into the ring.
    this.playerSprite.x -= 60;
    this.enemySprite.x += 60;
    this.playerSprite.setAlpha(0);
    this.enemySprite.setAlpha(0);
    this.tweens.add({ targets: this.playerSprite, x: this.playerHome.x, alpha: 1, duration: 500, ease: "Cubic.easeOut" });
    this.tweens.add({ targets: this.enemySprite, x: this.enemyHome.x, alpha: 1, duration: 500, ease: "Cubic.easeOut", delay: 120 });

    this.buildActions();
    this.render();
  }

  update(time: number, delta: number): void {
    // Flames lick; the ward shimmers; bars catch up with the damage.
    for (let i = 0; i < this.flames.length; i++) {
      const f = this.flames[i]!;
      f.setScale(0.85 + Math.sin(time / 90 + i * 2) * 0.06 + Math.sin(time / 37 + i) * 0.03).setAlpha(0.75 + Math.sin(time / 60 + i) * 0.12);
    }
    const dt = delta / 1000;
    const ef = Math.max(0, this.enemyHealth / this.encounter.health);
    const pf = this.world.state.player.health / this.world.state.player.maxHealth;
    this.enemyGhost = ef < this.enemyGhost ? Math.max(ef, this.enemyGhost - dt * 0.4) : ef;
    this.playerGhost = pf < this.playerGhost ? Math.max(pf, this.playerGhost - dt * 0.4) : pf;
    this.drawBars();
    this.drawWard(time);

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
        label: `Cast ${spell.name}  (${spell.manaCost} mana)`,
        run: () => this.playerCast(id),
      });
    }

    this.actions.push({
      label: "Ward  (halve the next two blows)",
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
    this.lunge(this.playerSprite, this.playerHome, 1, attackKey(this.playerLook, "right"), idleKey(this.playerLook, "right"), () => this.hitEnemy(damage));

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
    this.castBolt(spell.color, () => this.hitEnemy(damage, spell.color));

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
    this.playerSprite.anims.play(castKey(this.playerLook, "right"));
    this.time.delayedCall(320, () => this.playerSprite.anims.play(idleKey(this.playerLook, "right")));
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

      let warded = false;
      if (this.wardTurns > 0 && damage > 0) {
        this.wardTurns--;
        damage = Math.ceil(damage / 2);
        warded = true;
        this.pushLog("The ward holds.");
      }

      this.pushLog(action.text.replace("{name}", this.encounter.name).replace("{d}", String(damage)));

      const enemyLook = this.enemySprite.texture.key.replace(/^char_/, "");
      if (damage > 0) {
        this.lunge(this.enemySprite, this.enemyHome, -1, attackKey(enemyLook, "left"), idleKey(enemyLook, "left"), () => {
          this.world.audio.playHurt();
          this.playerSprite.setTint(0xff9a9a);
          this.time.delayedCall(200, () => this.playerSprite.clearTint());
          this.cameras.main.shake(160, 0.006);
          this.popNumber(this.playerSprite.x, this.playerSprite.y - this.playerSprite.displayHeight * 0.8, `-${damage}`, warded ? "#ffe08a" : "#ff8a7a");
          if (warded) this.flashWard();
        });
        this.world.state.damage(damage);
      } else {
        // A turn spent on itself: it glows.
        this.enemySprite.anims.play(castKey(enemyLook, "left"));
        this.time.delayedCall(360, () => this.enemySprite.anims.play(idleKey(enemyLook, "left")));
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

  // --- theatre -----------------------------------------------------------

  /** Steps in, strikes, steps back. `onHit` fires at the moment of contact. */
  private lunge(
    sprite: Phaser.GameObjects.Sprite,
    home: { x: number; y: number },
    dir: 1 | -1,
    strikeAnim: string,
    idleAnim: string,
    onHit: () => void,
  ): void {
    sprite.anims.play(strikeAnim);
    this.tweens.add({
      targets: sprite,
      x: home.x + dir * 70,
      duration: 140,
      ease: "Quad.easeOut",
      onComplete: () => {
        onHit();
        this.tweens.add({
          targets: sprite,
          x: home.x,
          duration: 260,
          ease: "Quad.easeInOut",
          onComplete: () => sprite.anims.play(idleAnim),
        });
      },
    });
  }

  /** A bolt of the spell's colour from the wand to the target, with a trail. */
  private castBolt(color: number, onHit: () => void): void {
    this.playerSprite.anims.play(castKey(this.playerLook, "right"));
    const sx = this.playerSprite.x + this.playerSprite.displayWidth * 0.3;
    const sy = this.playerSprite.y - this.playerSprite.displayHeight * 0.62;
    const tx = this.enemySprite.x;
    const ty = this.enemySprite.y - this.enemySprite.displayHeight * 0.5;
    const bolt = this.add.image(sx, sy, "fx_glow_cool").setBlendMode(Phaser.BlendModes.ADD).setScale(0.32).setTint(color).setDepth(5);
    const core = this.add.image(sx, sy, "fx_glow").setBlendMode(Phaser.BlendModes.ADD).setScale(0.12).setDepth(6);
    let last = 0;
    this.tweens.add({
      targets: [bolt, core],
      x: tx,
      y: ty,
      duration: 330,
      ease: "Sine.easeIn",
      onUpdate: () => {
        if (this.time.now - last < 22) return;
        last = this.time.now;
        const mote = this.add.image(bolt.x, bolt.y, "fx_glow_cool").setBlendMode(Phaser.BlendModes.ADD).setScale(0.16).setTint(color).setDepth(4);
        this.tweens.add({ targets: mote, alpha: 0, scale: 0.02, duration: 300, onComplete: () => mote.destroy() });
      },
      onComplete: () => {
        bolt.destroy();
        core.destroy();
        const burst = this.add.image(tx, ty, "fx_glow_cool").setBlendMode(Phaser.BlendModes.ADD).setScale(0.3).setTint(color).setDepth(6);
        this.tweens.add({ targets: burst, scale: 1.6, alpha: 0, duration: 380, onComplete: () => burst.destroy() });
        onHit();
        this.playerSprite.anims.play(idleKey(this.playerLook, "right"));
      },
    });
  }

  private hitEnemy(damage: number, color = 0xffffff): void {
    const sprite = this.enemySprite;
    sprite.setTint(0xff9a9a);
    this.time.delayedCall(140, () => sprite.clearTint());
    this.tweens.add({ targets: sprite, x: this.enemyHome.x + 14, duration: 60, yoyo: true, ease: "Quad.easeOut" });
    const slash = this.add
      .image(sprite.x, sprite.y - sprite.displayHeight * 0.5, "fx_slash")
      .setBlendMode(Phaser.BlendModes.ADD)
      .setScale(1.6)
      .setTint(color)
      .setRotation(Math.PI)
      .setDepth(6);
    this.tweens.add({ targets: slash, alpha: 0, scale: 2.2, duration: 260, onComplete: () => slash.destroy() });
    this.cameras.main.shake(90, 0.003);
    this.popNumber(sprite.x, sprite.y - sprite.displayHeight * 0.85, `${damage}`, "#ffffff");
  }

  private popNumber(x: number, y: number, text: string, color: string): void {
    const t = this.add
      .text(x, y, text, displayText({ size: 34, color }))
      .setOrigin(0.5)
      .setResolution(TEXT_RES)
      .setDepth(30)
      .setScale(0.6);
    t.setStroke("#140808", 6);
    this.tweens.add({ targets: t, scale: 1, y: y - 18, duration: 160, ease: "Back.easeOut" });
    this.tweens.add({ targets: t, alpha: 0, y: y - 60, duration: 700, delay: 420, onComplete: () => t.destroy() });
  }

  private flashWard(): void {
    const g = this.add.graphics().setDepth(7);
    const x = this.playerSprite.x;
    const y = this.playerSprite.y - this.playerSprite.displayHeight * 0.5;
    g.lineStyle(4, WARD, 1);
    g.strokeEllipse(x, y, this.playerSprite.displayWidth * 1.2, this.playerSprite.displayHeight * 1.1);
    this.tweens.add({ targets: g, alpha: 0, duration: 400, onComplete: () => g.destroy() });
  }

  private drawWard(time: number): void {
    const g = this.wardBubble;
    g.clear();
    if (this.wardTurns <= 0) return;
    const x = this.playerSprite.x;
    const y = this.playerSprite.y - this.playerSprite.displayHeight * 0.48;
    const w = this.playerSprite.displayWidth * 1.15;
    const h = this.playerSprite.displayHeight * 1.05;
    const pulse = 0.5 + Math.sin(time / 200) * 0.2;
    g.fillStyle(WARD, 0.08 + pulse * 0.05);
    g.fillEllipse(x, y, w, h);
    g.lineStyle(2, WARD, pulse);
    g.strokeEllipse(x, y, w, h);
    g.lineStyle(1, 0xfff4c8, pulse * 0.7);
    g.strokeEllipse(x, y, w * 0.92, h * 0.94);
  }

  private pushLog(line: string): void {
    this.log.push(line);
    if (this.log.length > 4) this.log.shift();
  }

  // --- presentation ------------------------------------------------------

  private drawBars(): void {
    const { player } = this.world.state;
    const W = viewWidth(this);
    const plateY = 22;
    const g = this.bars;
    g.clear();
    const px = 24 + 14 + PORTRAIT + 14;
    const barW = PLATE_W - (px - 24) - 20;
    capsuleBar(g, px, plateY + 46, barW, 15, player.health / player.maxHealth, HEALTH, HEALTH_DARK, this.playerGhost);
    capsuleBar(g, px, plateY + 68, barW * 0.82, 10, player.mana / player.maxMana, MANA, MANA_DARK);
    this.playerStats.setPosition(px + barW - 8, plateY + 53.5).setText(`${Math.ceil(player.health)} / ${player.maxHealth}`);

    const ex = W - 24 - PLATE_W + 20;
    const ef = Math.max(0, this.enemyHealth / this.encounter.health);
    const enemyColor = this.encounter.boss ? 0x3fae7a : 0x8e44ad;
    capsuleBar(g, ex, plateY + 46, barW, 15, ef, enemyColor, 0x1a1028, this.enemyGhost);
    this.enemyStats.setPosition(ex + 8, plateY + 53.5).setText(`${Math.max(0, Math.ceil(this.enemyHealth))} / ${this.encounter.health}`);

    if (this.wardTurns > 0) {
      g.lineStyle(2, WARD, 0.9);
      g.strokeCircle(24 + 14 + PORTRAIT / 2, plateY + PLATE_H / 2, PORTRAIT / 2 + 4);
    }
  }

  private render(): void {
    const W = viewWidth(this);
    const H = viewHeight(this);

    this.titleText.setText(this.encounter.boss ? "The Final Duel" : "A Duel");

    // Parchment log, bottom left; the newest line darkest.
    const logW = Math.min(560, W * 0.44);
    const logH = 142;
    const logX = 24;
    const logY = H - logH - 20;
    this.logFrame.draw(logX, logY, logW, logH);
    this.logText
      .setPosition(logX + 28, logY + 22)
      .setWordWrapWidth(logW - 56)
      .setText(this.log.join("\n"))
      .setColor(this.log.length > 0 ? COLOR_INK : COLOR_INK_SOFT);

    // The menu, bottom right, laid out from its last row upward.
    const visible = this.phase === "menu" ? this.actions : [];
    const rowH = 32;
    const menuW = Math.min(420, W - logW - 72);
    const rows = Math.max(1, this.actions.length);
    const menuH = 56 + rows * rowH;
    const menuX = W - menuW - 24;
    const menuY = H - menuH - 20;
    this.menuFrame.draw(menuX, menuY, menuW, menuH);
    this.menuTitle
      .setPosition(menuX + 22, menuY + 16)
      .setText(this.phase === "menu" ? "Your move" : this.phase === "busy" ? `${this.encounter.name} moves…` : "")
      .setColor(this.phase === "menu" ? COLOR_GOLD : COLOR_DIM);

    // Number badges are part of the bar graphics; redraw them here.
    const badges = this.badgeLayer();
    badges.clear();
    for (let i = 0; i < this.menuTexts.length; i++) {
      const text = this.menuTexts[i]!;
      const key = this.menuKeys[i]!;
      const action = this.actions[i];
      if (!action) {
        text.setVisible(false);
        key.setVisible(false);
        continue;
      }
      const y = menuY + 54 + i * rowH;
      const live = visible.includes(action);
      keyBadge(badges, menuX + 32, y, 10, live);
      key.setVisible(true).setText(`${i + 1}`).setPosition(menuX + 32, y);
      text
        .setVisible(true)
        .setPosition(menuX + 52, y)
        .setText(action.label)
        .setAlpha(live ? 1 : 0.4);
    }
  }

  private badges: Phaser.GameObjects.Graphics | null = null;

  private badgeLayer(): Phaser.GameObjects.Graphics {
    if (!this.badges || !this.badges.scene) this.badges = this.add.graphics().setDepth(21);
    return this.badges;
  }

  private finish(victory: boolean, message: string): void {
    this.phase = "over";
    this.pushLog(message);
    this.render();

    if (victory) {
      this.world.audio.playDefeat();
      this.grantVictory();
      this.tweens.add({ targets: this.enemySprite, alpha: 0, y: this.enemySprite.y + 10, duration: 700, delay: 400 });
    } else {
      this.world.audio.playUi("error");
      this.game.events.emit("korvana:toast", `Duel lost. ${message}`);
    }
    this.banner(victory ? "Victory" : "Yielded", victory);

    this.time.delayedCall(victory ? 1800 : 1400, () => {
      this.scene.resume("world");
      this.scene.stop();
    });
  }

  private banner(text: string, victory: boolean): void {
    const W = viewWidth(this);
    const H = viewHeight(this);
    const t = this.add
      .text(W / 2, H * 0.36, text, displayText({ size: 64, color: victory ? "#f6dc8c" : "#c8bca0", padding: 12 }))
      .setOrigin(0.5)
      .setResolution(TEXT_RES)
      .setDepth(40)
      .setAlpha(0)
      .setScale(0.85);
    t.setShadow(0, 0, victory ? "#e09040" : "#000000", 22, false, true);
    this.tweens.add({ targets: t, alpha: 1, scale: 1, duration: 420, ease: "Back.easeOut" });
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
