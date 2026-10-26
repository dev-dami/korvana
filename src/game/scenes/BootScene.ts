import Phaser from "phaser";

import { DPR, viewHeight, viewWidth } from "../display";
import { buildCharacters } from "../gfx/characters";
import { waitForDisplayFont } from "../gfx/fonts";
import { buildPortraits } from "../gfx/portraits";
import { buildTiles } from "../gfx/tiles";
import { buildDungeonTiles } from "../gfx/dungeonTiles";
import {
  bakeCastle,
  bakeFog,
  bakeGlint,
  bakeGlowDot,
  bakeHills,
  bakeLogo,
  bakeMoon,
  bakePines,
  bakeRipples,
  bakeSky,
  CASTLE_H,
  CASTLE_W,
} from "../gfx/titleArt";
import { GameState } from "../state/GameState";
import { AudioSystem } from "../systems/AudioSystem";
import { SaveSystem } from "../systems/SaveSystem";
import { BRASS, COLOR_DIM, divider, Frame, heading, label, uiCamera, veil } from "../ui/theme";

interface MenuItem {
  label: string;
  run: () => void;
  text: Phaser.GameObjects.Text;
}

interface Mote {
  image: Phaser.GameObjects.Image;
  vx: number;
  vy: number;
  life: number;
  age: number;
  phase: number;
}

const CREDITS = [
  ["Korvana", "The Endless Grounds"],
  ["Art", "Every tile, character, portrait and painted sky is generated in code at boot. No image files; all original."],
  ["Music & sound", "Synthesised live with the Web Audio API. Original compositions; no samples or recordings."],
  ["Type", "Cinzel Decorative © 2012 Natanael Gama.  EB Garamond © 2017 The EB Garamond Project Authors.  Both SIL Open Font License 1.1, bundled via Fontsource."],
  ["Library", "Kenney's Roguelike/RPG pack and Tiny Dungeon (CC0) ship as a swappable tileset; nothing reads them at runtime."],
] as const;

/**
 * Generates the procedural textures the game needs, waits for the fonts, then
 * shows the title: Korvana Academy at night across its lake, the moon up,
 * fog drifting, windows flickering, motes of light rising - and a menu.
 *
 * New Game starts from a clean state and clears the old save; Continue (only
 * offered when a save exists) resumes it.
 */
export class BootScene extends Phaser.Scene {
  private started = false;
  private built = false;
  private audioUnlocked = false;
  private menu: MenuItem[] = [];
  private selected = 0;
  private creditsOpen = false;
  private creditsObjects: Array<Phaser.GameObjects.GameObject | Frame> = [];
  private motes: Mote[] = [];
  private fog: Phaser.GameObjects.TileSprite[] = [];
  private ripples: Phaser.GameObjects.TileSprite | null = null;
  private windowLights: Phaser.GameObjects.Image[] = [];
  private parallax: Array<{ obj: Phaser.GameObjects.Image; depth: number; x: number; y: number }> = [];
  private marker!: Phaser.GameObjects.Graphics;
  private pointer = { x: 0, y: 0 };
  private nextShootingStar = 0;
  /**
   * Bumped on every create(). A resize can restart the scene twice in a row;
   * the first create() then resumes after its font await into a scene that
   * has already been rebuilt, and must not paint a second title over it (its
   * re-baked textures would pull the rug from under the first one's images).
   */
  private generation = 0;

  constructor() {
    super("boot");
  }

  async create(): Promise<void> {
    const generation = ++this.generation;
    uiCamera(this);
    this.started = false;
    this.built = false;
    this.menu = [];
    this.motes = [];
    this.fog = [];
    this.windowLights = [];
    this.parallax = [];
    this.creditsObjects = [];
    this.creditsOpen = false;

    if (!this.textures.exists("char_hero")) {
      buildTiles(this);
      buildDungeonTiles(this);
      buildCharacters(this);
      buildPortraits(this);
    }

    // Canvas text measured before the webfont arrives would be laid out against
    // the fallback, so wait for it before painting the title.
    await waitForDisplayFont();
    if (!this.scene.isActive() || generation !== this.generation) return;

    this.buildTitle();
    this.built = true;

    // The painted layers are baked for one screen size; repaint on resize.
    this.scale.on(Phaser.Scale.Events.RESIZE, this.onResize, this);
    this.events.once(Phaser.Scenes.Events.SHUTDOWN, () => this.scale.off(Phaser.Scale.Events.RESIZE, this.onResize, this));
  }

  private onResize(): void {
    if (!this.started && this.scene.isActive()) this.scene.restart();
  }

  // --- the scene ---------------------------------------------------------------

  private buildTitle(): void {
    const W = viewWidth(this);
    const H = viewHeight(this);
    const horizon = Math.round(H * 0.71);
    this.cameras.main.setBackgroundColor("#04061a");

    // Sky, then the brighter stars as sprites so they can twinkle.
    this.add.image(0, 0, bakeSky(this, W, H)).setOrigin(0).setScale(1 / DPR);
    const dot = bakeGlowDot(this);
    const glint = bakeGlint(this);
    const rnd = new Phaser.Math.RandomDataGenerator(["korvana"]);
    for (let i = 0; i < 70; i++) {
      const star = this.add
        .image(rnd.between(0, W), Math.pow(rnd.frac(), 1.5) * horizon * 0.85, dot)
        .setScale((0.1 + rnd.frac() * 0.16) / DPR)
        .setTint(rnd.pick([0xffffff, 0xffe8c8, 0xcfe0ff]))
        .setAlpha(0.6 + rnd.frac() * 0.4);
      this.tweens.add({
        targets: star,
        alpha: 0.15 + rnd.frac() * 0.3,
        duration: 900 + rnd.between(0, 2600),
        yoyo: true,
        repeat: -1,
        delay: rnd.between(0, 3000),
        ease: "Sine.easeInOut",
      });
    }
    for (let i = 0; i < 6; i++) {
      const g = this.add
        .image(rnd.between(40, W - 40), rnd.between(20, Math.round(horizon * 0.45)), glint)
        .setScale((0.4 + rnd.frac() * 0.4) / DPR)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: g, alpha: 0.35, scale: g.scale * 0.7, duration: 1400 + rnd.between(0, 1500), yoyo: true, repeat: -1 });
    }

    // Moon, high on the left.
    const moonR = Math.round(Math.min(W, H) * 0.065);
    const moonX = W * 0.17;
    const moonY = H * 0.2;
    const moon = this.add.image(moonX, moonY, bakeMoon(this, moonR)).setScale(1 / DPR);
    this.addParallax(moon, 0.01);

    // Hills, then the Academy on its crag.
    const hills = this.add.image(W / 2, horizon + 6, bakeHills(this, W * 1.1, H * 0.3)).setOrigin(0.5, 1).setScale(1 / DPR);
    this.addParallax(hills, 0.02);

    const castleScale = Math.min((H * 0.47) / CASTLE_H, (W * 0.6) / CASTLE_W);
    const { body, lights } = bakeCastle(this);
    const cx = W * 0.6;
    const castle = this.add.image(cx, horizon + 8, body).setOrigin(0.5, 1).setScale(castleScale / DPR);
    this.addParallax(castle, 0.035);
    const glow = this.add
      .image(cx, horizon + 8, lights)
      .setOrigin(0.5, 1)
      .setScale(castleScale / DPR)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.windowLights.push(glow);
    this.addParallax(glow, 0.035);

    // The lake: dark water, the castle reflected and broken by ripples.
    const water = this.add.graphics();
    water.fillGradientStyle(0x14163a, 0x14163a, 0x04050c, 0x04050c, 1);
    water.fillRect(0, horizon, W, H - horizon);
    const reflection = this.add
      .image(cx, horizon + 8, body)
      .setOrigin(0.5, 1)
      .setScale(castleScale / DPR)
      .setFlipY(true)
      .setAlpha(0.22)
      .setTint(0x8090d0);
    reflection.setY(horizon + 8 + (CASTLE_H * castleScale) * 0.98);
    reflection.setOrigin(0.5, 1);
    const reflectedLights = this.add
      .image(cx, reflection.y, lights)
      .setOrigin(0.5, 1)
      .setScale(castleScale / DPR)
      .setFlipY(true)
      .setAlpha(0.35)
      .setBlendMode(Phaser.BlendModes.ADD);
    this.windowLights.push(reflectedLights);
    // Moon's path across the water.
    for (let i = 0; i < 14; i++) {
      const y = horizon + 8 + i * ((H - horizon) / 14);
      const streak = this.add
        .image(moonX + rnd.between(-6, 6), y, dot)
        .setScale((1.4 + i * 0.25) / DPR, 0.08 / DPR)
        .setAlpha(0.35 - i * 0.018)
        .setBlendMode(Phaser.BlendModes.ADD);
      this.tweens.add({ targets: streak, alpha: 0.08, x: streak.x + rnd.between(-8, 8), duration: 700 + rnd.between(0, 900), yoyo: true, repeat: -1 });
    }
    this.ripples = this.add
      .tileSprite(0, horizon, W, H - horizon, bakeRipples(this))
      .setOrigin(0)
      .setTileScale(1 / DPR)
      .setAlpha(0.8);
    // A line of shoreline mist right on the horizon.
    const shore = this.add.graphics();
    shore.fillGradientStyle(0x8090c0, 0x8090c0, 0x8090c0, 0x8090c0, 0, 0, 0.12, 0.12);
    shore.fillRect(0, horizon - 30, W, 30);
    shore.fillGradientStyle(0x8090c0, 0x8090c0, 0x8090c0, 0x8090c0, 0.12, 0.12, 0, 0);
    shore.fillRect(0, horizon, W, 24);

    // Fog banks drifting at different speeds.
    for (const [seed, y, alpha] of [
      [3, horizon - H * 0.2, 0.55],
      [11, horizon - H * 0.06, 0.7],
      [17, H * 0.82, 0.5],
    ] as const) {
      const fog = this.add
        .tileSprite(0, y, W, 220, bakeFog(this, seed))
        .setOrigin(0, 0.5)
        .setTileScale(1 / DPR)
        .setAlpha(alpha);
      this.fog.push(fog);
    }

    // Pines framing the corners.
    const pineH = H * 0.5;
    const left = this.add.image(0, H, bakePines(this, W * 0.32, pineH, 21)).setOrigin(0, 1).setScale(1 / DPR);
    const right = this.add.image(W, H, bakePines(this, W * 0.28, pineH * 0.9, 33, true)).setOrigin(1, 1).setScale(1 / DPR);
    this.addParallax(left, 0.08);
    this.addParallax(right, 0.08);

    // A vignette to pull the eye inward.
    const vignette = this.add.graphics();
    veil(vignette, W, H, 0);
    vignette.fillGradientStyle(0x000000, 0x000000, 0x000000, 0x000000, 0.55, 0.55, 0, 0);
    vignette.fillRect(0, 0, W, H * 0.18);

    this.buildMotes(W, H, dot);
    this.buildLogo(W, H);
    this.buildMenu(W, H);

    this.input.on(Phaser.Input.Events.POINTER_MOVE, (p: Phaser.Input.Pointer) => {
      this.pointer.x = p.x / DPR / W - 0.5;
      this.pointer.y = p.y / DPR / H - 0.5;
    });

    this.cameras.main.fadeIn(900, 4, 6, 26);
  }

  private addParallax(obj: Phaser.GameObjects.Image, depth: number): void {
    this.parallax.push({ obj, depth, x: obj.x, y: obj.y });
  }

  private buildMotes(W: number, H: number, dot: string): void {
    for (let i = 0; i < 46; i++) {
      const image = this.add.image(0, 0, dot).setBlendMode(Phaser.BlendModes.ADD).setTint(Phaser.Math.RND.pick([0xffd27a, 0xffe9b0, 0xa8d8ff]));
      const mote: Mote = { image, vx: 0, vy: 0, life: 1, age: 0, phase: 0 };
      this.respawnMote(mote, W, H, true);
      this.motes.push(mote);
    }
  }

  private respawnMote(m: Mote, W: number, H: number, anywhere: boolean): void {
    m.image.setPosition(Phaser.Math.Between(0, W), anywhere ? Phaser.Math.Between(H * 0.3, H) : H + 10);
    m.image.setScale((0.06 + Math.random() * 0.12) / DPR);
    m.vx = (Math.random() - 0.5) * 8;
    m.vy = -(8 + Math.random() * 22);
    m.life = 5 + Math.random() * 7;
    m.age = anywhere ? Math.random() * m.life : 0;
    m.phase = Math.random() * Math.PI * 2;
  }

  private buildLogo(W: number, H: number): void {
    const size = Math.round(Math.min(132, W * 0.1, H * 0.17));
    const logoY = H * 0.15;
    const logo = this.add.image(W / 2, logoY, bakeLogo(this, size)).setScale(1 / DPR).setAlpha(0);
    this.tweens.add({ targets: logo, alpha: 1, y: logoY, duration: 1600, delay: 300, ease: "Sine.easeOut" });
    this.tweens.add({ targets: logo, scale: (1 / DPR) * 1.012, duration: 3200, yoyo: true, repeat: -1, ease: "Sine.easeInOut" });

    const sub = heading(this, "THE  ENDLESS  GROUNDS", { size: Math.max(15, Math.round(size * 0.17)), color: "#d8c690" })
      .setOrigin(0.5)
      .setLetterSpacing(6)
      .setPosition(W / 2, logoY + size * 0.62)
      .setAlpha(0);
    sub.setShadow(0, 2, "#000000", 6, false, true);
    this.tweens.add({ targets: sub, alpha: 1, duration: 1400, delay: 900 });

    const g = this.add.graphics().setAlpha(0);
    const half = Math.max(sub.width / 2 + 24, 160);
    g.lineStyle(1, BRASS, 0.85);
    for (const s of [-1, 1]) {
      g.lineBetween(W / 2 + s * (sub.width / 2 + 14), sub.y, W / 2 + s * half + s * 60, sub.y);
      g.fillStyle(BRASS, 0.9);
      g.fillCircle(W / 2 + s * half + s * 64, sub.y, 2.2);
    }
    this.tweens.add({ targets: g, alpha: 1, duration: 1400, delay: 1100 });
  }

  private buildMenu(W: number, H: number): void {
    const hasSave = SaveSystem.load() !== null;
    const items: Array<{ label: string; run: () => void }> = [];
    if (hasSave) items.push({ label: "Continue", run: () => this.begin(false) });
    items.push({ label: "New Game", run: () => this.begin(true) });
    items.push({ label: "Credits", run: () => this.openCredits() });

    const top = H * 0.73;
    const step = Math.min(46, H * 0.06);
    this.marker = this.add.graphics();
    this.menu = items.map((item, i) => {
      const text = heading(this, item.label, { size: 26, color: "#cfc3a4" })
        .setOrigin(0.5)
        .setPosition(W / 2, top + i * step)
        .setAlpha(0)
        .setInteractive({ useHandCursor: true });
      text.setShadow(0, 2, "#000000", 6, false, true);
      text.on("pointerover", () => this.select(i));
      text.on("pointerdown", () => {
        this.firstInput();
        this.select(i);
        this.activate();
      });
      this.tweens.add({ targets: text, alpha: 1, duration: 900, delay: 1400 + i * 140 });
      return { ...item, text };
    });
    this.selected = 0;
    this.select(0);

    const hint = label(this, "↑ ↓  choose      ENTER  begin", { size: 15, color: COLOR_DIM, align: "center" })
      .setOrigin(0.5, 1)
      .setPosition(W / 2, H - 16)
      .setAlpha(0);
    hint.setShadow(0, 1, "#000000", 3, false, true);
    this.tweens.add({ targets: hint, alpha: 0.85, duration: 1000, delay: 2000 });

    const kb = this.input.keyboard;
    kb?.on("keydown", (event: KeyboardEvent) => {
      this.firstInput();
      if (this.started) return;
      if (this.creditsOpen) {
        if (["Escape", "Enter", " ", "Backspace"].includes(event.key)) this.closeCredits();
        return;
      }
      if (event.key === "ArrowUp" || event.key === "w" || event.key === "W") this.select((this.selected - 1 + this.menu.length) % this.menu.length);
      else if (event.key === "ArrowDown" || event.key === "s" || event.key === "S") this.select((this.selected + 1) % this.menu.length);
      else if (event.key === "Enter" || event.key === " " || event.key === "e" || event.key === "E") this.activate();
    });
    this.input.on(Phaser.Input.Events.POINTER_DOWN, () => this.firstInput());
  }

  /** Browsers only allow sound after a gesture; the first key or click is it. */
  private firstInput(): void {
    if (this.audioUnlocked) return;
    this.audioUnlocked = true;
    const audio = AudioSystem.shared();
    audio.unlock();
    audio.setZone("title");
  }

  private select(index: number): void {
    if (this.creditsOpen) return;
    if (index !== this.selected && this.audioUnlocked) AudioSystem.shared().playUi("select");
    this.selected = index;
    this.menu.forEach((item, i) => {
      const on = i === index;
      item.text.setColor(on ? "#ffe6a0" : "#bdb194").setScale(on ? 1.06 : 1);
      item.text.setShadow(0, on ? 0 : 2, on ? "#d08a30" : "#000000", on ? 14 : 6, false, true);
    });
  }

  private activate(): void {
    if (this.started || this.creditsOpen) return;
    this.menu[this.selected]?.run();
  }

  // --- credits ------------------------------------------------------------------

  private openCredits(): void {
    this.creditsOpen = true;
    if (this.audioUnlocked) AudioSystem.shared().playUi("open");
    const W = viewWidth(this);
    const H = viewHeight(this);
    const w = Math.min(720, W - 40);
    const h = Math.min(520, H - 40);
    const x = (W - w) / 2;
    const y = (H - h) / 2;

    const dim = this.add.graphics();
    veil(dim, W, H, 0.7);
    const frame = new Frame(this, "parchment").draw(x, y, w, h);
    const g = this.add.graphics();
    const objects: Array<Phaser.GameObjects.GameObject | Frame> = [dim, frame, g];
    let cy = y + 36;
    for (const [title, body] of CREDITS) {
      const t = heading(this, title, { size: title === "Korvana" ? 30 : 17, color: "#3a2412" }).setOrigin(0.5, 0).setPosition(W / 2, cy);
      cy += t.height + 4;
      const b = label(this, body, { size: 16, color: "#3a2a1a", align: "center", wrap: w - 100, lineSpacing: 4 })
        .setOrigin(0.5, 0)
        .setPosition(W / 2, cy);
      b.setFontStyle(title === "Korvana" ? "italic" : "normal");
      cy += b.height + 14;
      if (title === "Korvana") {
        divider(g, W / 2 - 120, cy - 4, 240, 0x8c6a3a, 0.7);
        cy += 10;
      }
      objects.push(t, b);
    }
    const close = label(this, "ENTER or ESC  close", { size: 14, color: "#6a5236", align: "center" }).setOrigin(0.5, 1).setPosition(W / 2, y + h - 22);
    objects.push(close);
    this.creditsObjects = objects;
  }

  private closeCredits(): void {
    for (const o of this.creditsObjects) o.destroy();
    this.creditsObjects = [];
    this.creditsOpen = false;
    if (this.audioUnlocked) AudioSystem.shared().playUi("close");
  }

  // --- starting -----------------------------------------------------------------

  /**
   * A new game starts from defaults and removes the old save, so Continue
   * cannot resurrect it; continuing loads it and resumes where it was made.
   */
  private begin(fresh: boolean): void {
    if (this.started) return;
    const saved = fresh ? null : SaveSystem.load();
    if (fresh) SaveSystem.clear();
    this.started = true;
    this.registry.set("state", new GameState(saved ?? undefined));
    this.registry.set("resume", saved?.position ?? null);
    if (this.audioUnlocked) AudioSystem.shared().playUi("select");

    const item = this.menu[this.selected]?.text;
    if (item) this.tweens.add({ targets: item, scale: 1.18, alpha: 0, duration: 500, ease: "Sine.easeIn" });
    this.cameras.main.fadeOut(700, 4, 6, 12);
    this.cameras.main.once(Phaser.Cameras.Scene2D.Events.FADE_OUT_COMPLETE, () => this.scene.start("world"));
  }

  // --- animation ------------------------------------------------------------------

  update(time: number, delta: number): void {
    if (!this.built) return;
    const dt = Math.min(0.05, delta / 1000);
    const W = viewWidth(this);
    const H = viewHeight(this);

    // Gentle parallax with the mouse, plus a slow breathing sway.
    const sway = Math.sin(time / 6000) * 0.5;
    for (const p of this.parallax) {
      p.obj.setPosition(p.x - (this.pointer.x * W + sway * 20) * p.depth, p.y - this.pointer.y * H * p.depth * 0.5);
    }

    const speeds = [6, 11, 16];
    this.fog.forEach((fog, i) => {
      fog.tilePositionX += (speeds[i] ?? 8) * dt * DPR;
    });
    if (this.ripples) this.ripples.tilePositionX -= 4 * dt * DPR;

    // Window light breathes, as if candles were being carried past.
    for (let i = 0; i < this.windowLights.length; i++) {
      const base = i === 0 ? 0.9 : 0.32;
      this.windowLights[i]!.setAlpha(base * (0.88 + Math.sin(time / 230 + i) * 0.05 + Math.sin(time / 97 + i * 3) * 0.04));
    }

    for (const m of this.motes) {
      m.age += dt;
      if (m.age > m.life) {
        this.respawnMote(m, W, H, false);
        continue;
      }
      const t = m.age / m.life;
      m.image.x += (m.vx + Math.sin(time / 900 + m.phase) * 10) * dt;
      m.image.y += m.vy * dt;
      m.image.setAlpha(Math.sin(t * Math.PI) * (0.55 + Math.sin(time / 180 + m.phase) * 0.35));
    }

    if (time > this.nextShootingStar) {
      this.nextShootingStar = time + 6000 + Math.random() * 7000;
      if (this.nextShootingStar - 6000 > 2500) this.shootingStar(W, H);
    }

    // The selected item has gilded diamonds either side.
    const item = this.menu[this.selected]?.text;
    this.marker.clear();
    if (item && !this.creditsOpen && item.alpha > 0.5) {
      const pulse = 1 + Math.sin(time / 260) * 0.15;
      const off = item.displayWidth / 2 + 22;
      this.marker.fillStyle(0xf0c860, 0.95);
      for (const s of [-1, 1]) {
        const x = item.x + s * off;
        const y = item.y;
        this.marker.fillTriangle(x - 5 * pulse, y, x, y - 6 * pulse, x + 5 * pulse, y);
        this.marker.fillTriangle(x - 5 * pulse, y, x, y + 6 * pulse, x + 5 * pulse, y);
      }
    }
  }

  private shootingStar(W: number, H: number): void {
    const x = W * (0.25 + Math.random() * 0.6);
    const y = H * (0.05 + Math.random() * 0.2);
    const streak = this.add.image(x, y, "title_dot").setScale(1.6 / DPR, 0.06 / DPR).setRotation(0.45).setBlendMode(Phaser.BlendModes.ADD).setAlpha(0);
    this.tweens.add({
      targets: streak,
      x: x + 220,
      y: y + 105,
      alpha: { from: 0.9, to: 0 },
      duration: 900,
      ease: "Quad.easeIn",
      onComplete: () => streak.destroy(),
    });
  }
}
