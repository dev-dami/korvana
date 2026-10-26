import Phaser from "phaser";

import { DEPTH } from "../config";
import type { Biome } from "../types";
import type { Look } from "./DayCycle";
import type { FrameLight } from "./Lighting";

/**
 * Ambient particles: the things that make a place feel alive. Pollen in the
 * meadow sun, fireflies at dusk, leaves under the canopy, mist over the marsh,
 * snow on the peaks, ash and embers in the Scar, dust and drips underground,
 * and the shadows of clouds and birds passing over open country.
 *
 * One fixed pool of images serves every kind. Each frame the budget for each
 * kind is worked out from the biome and the hour; kinds below budget spawn a
 * few more, kinds above it simply stop respawning, so changes fade in and out.
 */

type Kind =
  | "mote"
  | "firefly"
  | "leaf"
  | "mist"
  | "snow"
  | "ash"
  | "ember"
  | "dust"
  | "drip"
  | "cloud"
  | "bird"
  | "shaft";

const KINDS: Kind[] = ["mote", "firefly", "leaf", "mist", "snow", "ash", "ember", "dust", "drip", "cloud", "bird", "shaft"];

const POOL = 300;
/** Glowing kinds draw above the light map; everything else is lit by it. */
const GLOW: ReadonlySet<Kind> = new Set<Kind>(["mote", "firefly", "ember", "shaft"]);
const DEPTH_LIT = DEPTH.weather - 150;
const DEPTH_GLOW = DEPTH.weather - 40;

interface Particle {
  img: Phaser.GameObjects.Image;
  kind: Kind;
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  max: number;
  phase: number;
  alpha: number;
  spin: number;
  /** Ground height for drips; flock slot for birds. */
  extra: number;
}

type Budget = Record<Kind, number>;

function emptyBudget(): Budget {
  return { mote: 0, firefly: 0, leaf: 0, mist: 0, snow: 0, ash: 0, ember: 0, dust: 0, drip: 0, cloud: 0, bird: 0, shaft: 0 };
}

/** How much of each kind a biome wants, before the hour scales it. */
const BIOME_BUDGET: Partial<Record<Biome, Partial<Budget>>> = {
  meadow: { mote: 22, firefly: 34, cloud: 3, bird: 1 },
  beach: { mote: 8, cloud: 3, bird: 1 },
  ocean: { cloud: 3, bird: 1 },
  shallows: { cloud: 3, bird: 1 },
  forest: { mote: 18, firefly: 40, leaf: 18, shaft: 5 },
  marsh: { mote: 8, firefly: 30, mist: 12 },
  highland: { mote: 6, cloud: 2, mist: 3 },
  peak: { snow: 110, mist: 2 },
  scar: { ash: 80, ember: 26, mist: 2 },
  crypt: { dust: 46, drip: 5 },
};

export class Atmosphere {
  private readonly particles: Particle[] = [];
  private readonly counts: Budget = emptyBudget();
  private readonly budget: Budget = emptyBudget();
  private readonly lights: FrameLight[] = [];
  private lightCount = 0;
  private time = 0;
  private birdTimer = 8;
  private birdsPending = 0;

  constructor(scene: Phaser.Scene) {
    for (let i = 0; i < POOL; i++) {
      const img = scene.add.image(0, 0, "fx_dot").setVisible(false).setActive(false);
      this.particles.push({
        img,
        kind: "mote",
        active: false,
        x: 0,
        y: 0,
        vx: 0,
        vy: 0,
        life: 0,
        max: 1,
        phase: 0,
        alpha: 1,
        spin: 0,
        extra: 0,
      });
    }
  }

  /** Small lights the fireflies and embers cast this frame (first `frameLightCount`). */
  get frameLights(): readonly FrameLight[] {
    return this.lights;
  }

  get frameLightCount(): number {
    return this.lightCount;
  }

  update(dt: number, look: Look, view: Phaser.Geom.Rectangle): void {
    this.time += dt;
    this.computeBudget(look, dt);

    for (const k of KINDS) this.counts[k] = 0;
    for (const p of this.particles) if (p.active) this.counts[p.kind]++;

    // Birds are an event, not a population: a whole flock, one bird a frame.
    if (this.birdsPending > 0 && this.spawn("bird", look, view)) this.birdsPending--;

    // Spawn a few per frame toward budget, so a biome change fades in.
    for (const k of KINDS) {
      if (k === "bird") continue;
      let missing = Math.floor(this.budget[k]) - this.counts[k];
      let perFrame = k === "snow" || k === "ash" ? 6 : 2;
      while (missing > 0 && perFrame > 0) {
        if (!this.spawn(k, look, view)) break;
        missing--;
        perFrame--;
      }
    }

    const wind = 14 + Math.sin(this.time * 0.13) * 8;
    let lightCount = 0;
    for (const p of this.particles) {
      if (!p.active) continue;
      p.life += dt;
      const t = p.life / p.max;
      // Big, slow things (cloud shadows, mist banks) live further off screen.
      const margin = p.kind === "cloud" ? 760 : p.kind === "mist" ? 420 : 260;
      if (
        t >= 1 ||
        p.x < view.x - margin ||
        p.x > view.right + margin ||
        p.y < view.y - margin ||
        p.y > view.bottom + margin
      ) {
        this.kill(p);
        continue;
      }
      lightCount = this.step(p, dt, t, wind, look, lightCount);
    }
    this.lightCount = lightCount;
  }

  destroy(): void {
    for (const p of this.particles) p.img.destroy();
    this.particles.length = 0;
  }

  // --- internals ---------------------------------------------------------

  private computeBudget(look: Look, dt: number): void {
    const b = this.budget;
    for (const k of KINDS) b[k] = 0;
    const base = BIOME_BUDGET[look.biome];
    if (!base) return;
    const day = 1 - look.night;
    for (const k of KINDS) {
      const want = base[k] ?? 0;
      if (want === 0) continue;
      switch (k) {
        case "mote":
          b[k] = want * day * (1 - look.golden * 0.3);
          break;
        case "firefly":
          // Fireflies come out with the dusk and stay all night.
          b[k] = want * Math.min(1, look.night * 1.4 + look.golden * 0.35);
          break;
        case "cloud":
          b[k] = want * day;
          break;
        case "shaft":
          b[k] = day > 0.7 ? want : 0;
          break;
        case "mist":
          // Mist pools at night and lingers into the morning.
          b[k] = want * (0.5 + look.night * 0.5 + look.golden * 0.6);
          break;
        case "bird":
          this.birdTimer -= dt;
          if (this.birdTimer <= 0 && day > 0.6 && this.counts.bird === 0) {
            this.birdTimer = 22 + Math.random() * 30;
            this.birdsPending = 3 + Math.floor(Math.random() * 3);
          }
          break;
        default:
          b[k] = want;
      }
    }
  }

  private spawn(kind: Kind, look: Look, view: Phaser.Geom.Rectangle): boolean {
    const p = this.particles.find((q) => !q.active);
    if (!p) return false;
    const img = p.img;
    p.kind = kind;
    p.active = true;
    p.life = 0;
    p.phase = Math.random() * Math.PI * 2;
    p.spin = 0;
    p.extra = 0;
    const rx = () => view.x - 60 + Math.random() * (view.width + 120);
    const ry = () => view.y - 60 + Math.random() * (view.height + 120);
    img.setVisible(true).setActive(true).setRotation(0).clearTint().setBlendMode(Phaser.BlendModes.NORMAL);
    img.setDepth(GLOW.has(kind) ? DEPTH_GLOW : DEPTH_LIT);

    switch (kind) {
      case "mote":
        img.setTexture("fx_soft").setScale(0.1 + Math.random() * 0.08).setTint(look.golden > 0.3 ? 0xffd9a0 : 0xfff6d0);
        img.setBlendMode(Phaser.BlendModes.ADD);
        p.x = rx();
        p.y = ry();
        p.vx = (Math.random() - 0.5) * 10;
        p.vy = (Math.random() - 0.5) * 6;
        p.max = 5 + Math.random() * 6;
        p.alpha = 0.35 + Math.random() * 0.35;
        break;
      case "firefly":
        img.setTexture("fx_soft").setScale(0.2 + Math.random() * 0.08).setTint(Math.random() > 0.4 ? 0xe2ff8a : 0xfff49a);
        img.setBlendMode(Phaser.BlendModes.ADD);
        p.x = rx();
        p.y = ry();
        p.vx = 0;
        p.vy = 0;
        p.max = 9 + Math.random() * 10;
        p.alpha = 1;
        break;
      case "leaf":
        img.setTexture(`fx_leaf_${Math.floor(Math.random() * 3)}`).setScale(1);
        p.x = rx();
        p.y = view.y - 40 - Math.random() * 120;
        p.vx = 6 + Math.random() * 10;
        p.vy = 18 + Math.random() * 16;
        p.spin = (Math.random() - 0.5) * 5;
        p.max = 30;
        p.alpha = 0.95;
        break;
      case "mist":
        img.setTexture("fx_mist").setScale(1.6 + Math.random() * 1.8, 1.2 + Math.random() * 0.8);
        p.x = rx();
        p.y = ry();
        p.vx = 4 + Math.random() * 6;
        p.vy = (Math.random() - 0.5) * 2;
        p.max = 18 + Math.random() * 14;
        p.alpha = 0.16 + Math.random() * 0.12;
        break;
      case "snow":
        img.setTexture(Math.random() > 0.6 ? "fx_flake" : "fx_dot").setScale(Math.random() > 0.8 ? 1.5 : 1);
        p.x = rx();
        p.y = view.y - 20 - Math.random() * (view.height + 40);
        p.vx = 0;
        p.vy = 26 + Math.random() * 30;
        p.max = 30;
        p.alpha = 0.7 + Math.random() * 0.3;
        break;
      case "ash":
        img.setTexture("fx_dot").setScale(Math.random() > 0.7 ? 1.5 : 1).setTint(Math.random() > 0.5 ? 0xbdb4ab : 0x8a837c);
        p.x = rx();
        p.y = ry();
        p.vx = 0;
        p.vy = 8 + Math.random() * 14;
        p.max = 12 + Math.random() * 10;
        p.alpha = 0.55 + Math.random() * 0.3;
        break;
      case "ember":
        img.setTexture("fx_soft").setScale(0.08 + Math.random() * 0.06).setTint(Math.random() > 0.5 ? 0xff8a3a : 0xffc060);
        img.setBlendMode(Phaser.BlendModes.ADD);
        p.x = rx();
        p.y = view.y + Math.random() * (view.height + 80);
        p.vx = (Math.random() - 0.3) * 10;
        p.vy = -(16 + Math.random() * 26);
        p.max = 3 + Math.random() * 4;
        p.alpha = 1;
        break;
      case "shaft":
        // Sunlight slanting down through gaps in the canopy.
        img.setTexture("fx_shaft").setScale(1 + Math.random() * 0.8, 1.4 + Math.random() * 0.8).setRotation(-0.55);
        img.setTint(look.golden > 0.3 ? 0xffc27a : 0xfff0c8).setBlendMode(Phaser.BlendModes.ADD);
        p.x = rx();
        p.y = ry();
        p.vx = 3 + Math.random() * 3;
        p.vy = 0;
        p.max = 10 + Math.random() * 8;
        p.alpha = 0.14 + Math.random() * 0.1 + look.golden * 0.08;
        break;
      case "dust":
        img.setTexture("fx_dot").setScale(Math.random() > 0.7 ? 1 : 0.5).setTint(0xd8d0c0);
        p.x = rx();
        p.y = ry();
        p.vx = (Math.random() - 0.5) * 4;
        p.vy = (Math.random() - 0.5) * 3;
        p.max = 8 + Math.random() * 8;
        p.alpha = 0.5;
        break;
      case "drip":
        img.setTexture("fx_dot").setScale(0.5, 1.5).setTint(0xb8d8f0);
        p.x = rx();
        p.y = ry();
        p.extra = p.y + 36 + Math.random() * 30;
        p.vx = 0;
        p.vy = 30;
        p.max = 3;
        p.alpha = 0.8;
        break;
      case "cloud":
        img.setTexture("fx_cloud").setScale(2.4 + Math.random() * 1.8, 2 + Math.random() * 1.2);
        p.x = view.x - 640 + Math.random() * 160;
        p.y = view.y - 100 + Math.random() * (view.height + 200);
        // Clouds already overhead when you arrive, not only drifting in.
        if (this.counts.cloud === 0 && Math.random() > 0.4) p.x = rx();
        p.vx = 16 + Math.random() * 8;
        p.vy = 3;
        p.max = 120;
        p.alpha = 0.18 + Math.random() * 0.08;
        break;
      case "bird": {
        // A loose V: every bird in a flock shares a heading, offset in slot order.
        const slot = this.counts.bird;
        const leader = this.particles.find((q) => q.active && q.kind === "bird" && q !== p);
        img.setTexture("fx_bird_0").setScale(1.2);
        if (leader && slot > 0) {
          p.x = leader.x - 14 * slot - Math.random() * 6;
          p.y = leader.y + (slot % 2 === 0 ? 10 : -10) * Math.ceil(slot / 2);
          p.vx = leader.vx;
          p.vy = leader.vy;
        } else {
          p.x = view.x - 200;
          p.y = view.y + view.height * (0.25 + Math.random() * 0.6);
          p.vx = 80 + Math.random() * 20;
          p.vy = -10 - Math.random() * 10;
        }
        p.extra = slot;
        p.max = 30;
        p.alpha = 0.28;
        this.counts.bird++;
        break;
      }
    }
    img.setPosition(p.x, p.y).setAlpha(0);
    return true;
  }

  private step(p: Particle, dt: number, t: number, wind: number, look: Look, lightCount: number): number {
    const img = p.img;
    // Most kinds fade in and out over their life.
    const fade = Math.min(1, t * 6, (1 - t) * 6);
    switch (p.kind) {
      case "mote":
        p.x += (p.vx + Math.sin(this.time * 0.8 + p.phase) * 6) * dt;
        p.y += (p.vy + Math.cos(this.time * 0.6 + p.phase) * 4) * dt;
        img.setAlpha(p.alpha * fade * (0.6 + 0.4 * Math.sin(this.time * 3 + p.phase)));
        break;
      case "firefly": {
        // Wander: the heading drifts, the speed stays lazy.
        p.phase += (Math.sin(this.time * 0.7 + p.extra) * 1.4 + (Math.random() - 0.5) * 2) * dt;
        p.vx = Math.cos(p.phase) * 16;
        p.vy = Math.sin(p.phase) * 11;
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const pulse = Math.pow(Math.max(0, Math.sin(this.time * 2.1 + p.phase * 3 + p.max)), 3);
        const a = (0.15 + 0.85 * pulse) * fade;
        img.setAlpha(a);
        if (a > 0.3 && lightCount < 24) lightCount = this.addLight(lightCount, p.x, p.y, 34, 0xc8ff60, 0.45 * a);
        break;
      }
      case "leaf":
        p.x += (p.vx + wind * 0.6 + Math.sin(this.time * 2.2 + p.phase) * 18) * dt;
        p.y += (p.vy + Math.cos(this.time * 2.2 + p.phase) * 8) * dt;
        img.setRotation(img.rotation + p.spin * dt).setScale(Math.cos(this.time * 3 + p.phase), 1);
        img.setAlpha(p.alpha * Math.min(1, p.life * 2));
        break;
      case "mist":
        p.x += (p.vx + wind * 0.15) * dt;
        p.y += p.vy * dt;
        img.setAlpha(p.alpha * Math.min(1, t * 4, (1 - t) * 4));
        break;
      case "snow":
        p.x += (wind * 0.9 + Math.sin(this.time * 1.5 + p.phase) * 10) * dt;
        p.y += p.vy * dt;
        img.setAlpha(p.alpha * Math.min(1, p.life * 3));
        break;
      case "ash":
        p.x += (wind * 0.5 + Math.sin(this.time * 0.9 + p.phase) * 9) * dt;
        p.y += p.vy * dt;
        img.setAlpha(p.alpha * fade);
        break;
      case "ember": {
        p.x += (p.vx + Math.sin(this.time * 4 + p.phase) * 8) * dt;
        p.y += p.vy * dt;
        const a = fade * (0.6 + 0.4 * Math.sin(this.time * 17 + p.phase));
        img.setAlpha(a);
        if (lightCount < 24 && a > 0.5) lightCount = this.addLight(lightCount, p.x, p.y, 26, 0xff7a30, 0.3 * a);
        break;
      }
      case "shaft":
        p.x += p.vx * dt;
        img.setAlpha(p.alpha * Math.min(1, p.life * 0.8, (p.max - p.life) * 0.8) * (0.8 + 0.2 * Math.sin(this.time * 0.7 + p.phase)));
        break;
      case "dust":
        p.x += (p.vx + Math.sin(this.time * 0.4 + p.phase) * 2) * dt;
        p.y += (p.vy + Math.cos(this.time * 0.3 + p.phase) * 2) * dt;
        img.setAlpha(p.alpha * fade);
        break;
      case "drip":
        if (p.y < p.extra) {
          p.vy += 420 * dt;
          p.y += p.vy * dt;
          img.setAlpha(p.alpha);
        } else {
          // The splash: the drop becomes a widening ring and fades.
          if (img.texture.key !== "fx_ring") img.setTexture("fx_ring").setScale(0.05, 0.025);
          img.setScale(img.scaleX + dt * 0.5, img.scaleY + dt * 0.25).setAlpha(Math.max(0, img.alpha - dt * 2.5));
          if (img.alpha <= 0.01) p.life = p.max;
        }
        break;
      case "cloud":
        p.x += (p.vx + wind * 0.3) * dt;
        p.y += p.vy * dt;
        img.setAlpha(p.alpha * (1 - look.darkness) * Math.min(1, p.life * 0.5, (1 - t) * 8));
        break;
      case "bird": {
        p.x += p.vx * dt;
        p.y += p.vy * dt;
        const flap = Math.sin(this.time * 11 + p.extra * 1.3) > 0;
        img.setTexture(flap ? "fx_bird_0" : "fx_bird_1").setAlpha(p.alpha * (1 - look.darkness) * Math.min(1, p.life));
        break;
      }
    }
    img.setPosition(p.x, p.y);
    return lightCount;
  }

  private addLight(index: number, x: number, y: number, radius: number, color: number, intensity: number): number {
    let l = this.lights[index];
    if (!l) {
      l = { x: 0, y: 0, radius: 0, color: 0, intensity: 0 };
      this.lights[index] = l;
    }
    l.x = x;
    l.y = y;
    l.radius = radius;
    l.color = color;
    l.intensity = intensity;
    return index + 1;
  }

  private kill(p: Particle): void {
    p.active = false;
    p.img.setVisible(false).setActive(false);
  }
}
