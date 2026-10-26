import Phaser from "phaser";

import { DEPTH } from "../config";
import { LIGHT_EMITTERS } from "./lights";
import type { LightRegistry, LightSource, LightSpec } from "./lights";
import type { Look } from "./DayCycle";
import { lerpRGB } from "./paint";

/**
 * The light map.
 *
 * Each frame a low-resolution render texture is filled with the ambient colour
 * and every light in view is stamped into it additively; the result is laid
 * over the world with MULTIPLY. Ambient white means "no change", so at noon
 * the whole pass is skipped; at night the map is dark blue with warm pools
 * wherever there is fire. The map covers the view plus a margin and is placed
 * in world space, so camera lag behind the player never slides it off.
 *
 * Fire also gets an animated flame and a soft additive halo drawn *above* the
 * light map, so torches glow through the dark rather than merely un-darken it.
 */

/** World pixels per light-map pixel. Light is soft; it needs no more. */
const SCALE = 2;
const MARGIN = 192;
const MAX_FLAMES = 48;

interface Emitter {
  obj: Phaser.GameObjects.GameObject & { x: number; y: number };
  spec: LightSpec;
  phase: number;
}

/** A light handed in for this frame only (the player's own glow). */
export interface FrameLight {
  x: number;
  y: number;
  radius: number;
  color: number;
  intensity: number;
}

export class Lighting {
  private readonly scene: Phaser.Scene;
  private readonly registry: LightRegistry;
  private readonly emitters = new Map<Phaser.GameObjects.GameObject, Emitter>();
  private rt: Phaser.GameObjects.RenderTexture | null = null;
  /** Canvas-renderer fallback: a plain multiplied wash, no light pools. */
  private shade: Phaser.GameObjects.Rectangle | null = null;
  private readonly webgl: boolean;
  private rtW = 0;
  private rtH = 0;
  private readonly flames: Phaser.GameObjects.Image[] = [];
  private readonly halos: Phaser.GameObjects.Image[] = [];
  private time = 0;
  /** Reused stamp config: the light pass allocates nothing per frame. */
  private readonly stamp = { scale: 1, tint: 0xffffff, alpha: 1, blendMode: Phaser.BlendModes.ADD };

  constructor(scene: Phaser.Scene, registry: LightRegistry) {
    this.scene = scene;
    this.registry = registry;
    this.webgl = scene.renderer.type === Phaser.WEBGL;
    for (let i = 0; i < MAX_FLAMES; i++) {
      this.flames.push(
        scene.add.image(0, 0, "fx_flame").setOrigin(0.5, 0.9).setBlendMode(Phaser.BlendModes.ADD).setVisible(false),
      );
      this.halos.push(
        scene.add.image(0, 0, "fx_halo").setBlendMode(Phaser.BlendModes.ADD).setDepth(DEPTH.weather - 60).setVisible(false),
      );
    }
  }

  /** Called for every object added to the scene; keeps the ones that glow. */
  track(obj: Phaser.GameObjects.GameObject): void {
    const key = (obj as Phaser.GameObjects.Image).texture?.key;
    if (!key) return;
    const spec = LIGHT_EMITTERS[key];
    if (!spec) return;
    const pos = obj as Phaser.GameObjects.GameObject & { x: number; y: number };
    this.emitters.set(obj, { obj: pos, spec, phase: (pos.x * 0.37 + pos.y * 0.11) % (Math.PI * 2) });
  }

  untrack(obj: Phaser.GameObjects.GameObject): void {
    this.emitters.delete(obj);
  }

  update(
    dt: number,
    look: Look,
    camera: Phaser.Cameras.Scene2D.Camera,
    personal: FrameLight | null,
    extra: readonly FrameLight[] = [],
    extraCount = 0,
  ): void {
    this.time += dt;
    const viewW = camera.width / camera.zoom;
    const viewH = camera.height / camera.zoom;
    const midX = camera.midPoint.x;
    const midY = camera.midPoint.y;

    this.updateFlames(look, midX, midY, viewW, viewH);

    // Broad daylight: the light map would multiply by white. Skip the pass.
    if (look.darkness < 0.015) {
      this.rt?.setVisible(false);
      this.shade?.setVisible(false);
      return;
    }

    if (!this.webgl) {
      // Canvas cannot build a coloured light map (and Phaser's canvas
      // MULTIPLY falls back to plain source-over), so it gets the time of day
      // as one translucent wash; the flames and halos still glow on top.
      const shade = this.ensureShade();
      shade
        .setPosition(midX - viewW / 2 - MARGIN, midY - viewH / 2 - MARGIN)
        .setSize(viewW + MARGIN * 2, viewH + MARGIN * 2)
        .setFillStyle(lerpRGB(look.ambient, 0x000000, 0.6), Math.min(0.82, look.darkness * 1.05))
        .setVisible(true);
      return;
    }

    const rt = this.ensureTarget(viewW, viewH);
    // Snap to the light-map grid so the map never shimmers as the camera moves.
    const ox = Math.floor((midX - viewW / 2 - MARGIN) / SCALE) * SCALE;
    const oy = Math.floor((midY - viewH / 2 - MARGIN) / SCALE) * SCALE;
    rt.setPosition(ox, oy).setVisible(true);
    rt.fill(look.ambient, 1);

    const right = ox + this.rtW * SCALE;
    const bottom = oy + this.rtH * SCALE;
    // Lights matter more the darker it is; this keeps dusk torches subtle.
    const strength = Math.min(1, 0.35 + look.darkness * 1.1);

    for (const e of this.emitters.values()) {
      const lx = e.obj.x;
      const ly = e.obj.y + (e.spec.offsetY ?? 0);
      const r = e.spec.radius;
      if (lx < ox - r || lx > right + r || ly < oy - r || ly > bottom + r) continue;
      const f = this.flicker(e.spec.flicker ?? 0, e.phase);
      this.light(rt, lx - ox, ly - oy, r * (1 + (f - 1) * 0.25), e.spec.color, e.spec.intensity * f * strength);
    }

    for (const s of this.registry.all()) {
      const r = s.radius;
      const ly = s.y + (s.offsetY ?? 0);
      if (s.x < ox - r || s.x > right + r || ly < oy - r || ly > bottom + r) continue;
      const f = this.flicker(s.flicker ?? 0, (s.x + s.y) * 0.05);
      this.light(rt, s.x - ox, ly - oy, r, s.color, s.intensity * f * strength);
    }

    for (let i = 0; i < extraCount; i++) {
      const l = extra[i];
      if (l) this.light(rt, l.x - ox, l.y - oy, l.radius, l.color, l.intensity * strength);
    }

    if (personal && personal.intensity > 0.01) {
      this.light(rt, personal.x - ox, personal.y - oy, personal.radius, personal.color, personal.intensity);
    }

    rt.render();
  }

  /** Adds a light source that lives for `ms` and fades out. Handy for impacts. */
  flash(source: LightSource, ms: number): void {
    this.registry.add(source);
    this.scene.tweens.add({
      targets: source,
      intensity: 0,
      radius: source.radius * 0.6,
      duration: ms,
      ease: "Quad.easeOut",
      onComplete: () => this.registry.remove(source),
    });
  }

  destroy(): void {
    this.rt?.destroy();
    this.rt = null;
    this.shade?.destroy();
    this.shade = null;
    for (const img of [...this.flames, ...this.halos]) img.destroy();
    this.flames.length = 0;
    this.halos.length = 0;
    this.emitters.clear();
  }

  private light(rt: Phaser.GameObjects.RenderTexture, x: number, y: number, radius: number, color: number, alpha: number): void {
    const s = this.stamp;
    s.scale = (radius * 2) / SCALE / 128;
    s.tint = color;
    s.alpha = Math.min(1, alpha);
    rt.stamp("fx_light", undefined, x / SCALE, y / SCALE, s);
  }

  /** 0..1 multiplier that wavers like a flame. Zero flicker returns 1. */
  private flicker(amount: number, phase: number): number {
    if (amount <= 0) return 1;
    const t = this.time;
    const n = Math.sin(t * 7.1 + phase) * 0.5 + Math.sin(t * 12.7 + phase * 1.7) * 0.3 + Math.sin(t * 23.3 + phase * 2.9) * 0.2;
    return 1 - amount * 0.32 * (0.5 + 0.5 * n);
  }

  private updateFlames(look: Look, midX: number, midY: number, viewW: number, viewH: number): void {
    let used = 0;
    const left = midX - viewW / 2 - 64;
    const right = midX + viewW / 2 + 64;
    const top = midY - viewH / 2 - 96;
    const bottom = midY + viewH / 2 + 96;
    const glow = 0.25 + look.darkness * 0.75;

    for (const e of this.emitters.values()) {
      if (used >= MAX_FLAMES) break;
      if ((e.spec.flicker ?? 0) < 0.15) continue;
      const x = e.obj.x;
      const y = e.obj.y + (e.spec.offsetY ?? 0);
      if (x < left || x > right || y < top || y > bottom) continue;
      const f = this.flicker(e.spec.flicker ?? 0, e.phase);
      const t = this.time * 9 + e.phase;
      const flame = this.flames[used]!;
      flame
        .setVisible(true)
        .setPosition(x + Math.sin(t * 0.7) * 0.6, y + 4)
        .setDepth(e.obj.y + 2)
        .setTint(e.spec.color)
        .setScale(0.55 + Math.sin(t) * 0.05, (0.6 + Math.sin(t * 1.3) * 0.1) * f)
        .setAlpha(0.55 + 0.35 * f);
      const halo = this.halos[used]!;
      halo
        .setVisible(look.darkness > 0.05)
        .setPosition(x, y)
        .setTint(e.spec.color)
        .setScale((e.spec.radius / 64) * 0.75 * (0.92 + f * 0.08))
        .setAlpha(0.3 * glow * f);
      used++;
    }
    for (let i = used; i < this.flames.length; i++) {
      const flame = this.flames[i]!;
      if (!flame.visible) break;
      flame.setVisible(false);
      this.halos[i]!.setVisible(false);
    }
  }

  private ensureShade(): Phaser.GameObjects.Rectangle {
    if (!this.shade) {
      this.shade = this.scene.add
        .rectangle(0, 0, 16, 16, 0xffffff)
        .setOrigin(0, 0)
        .setDepth(DEPTH.weather - 100)
        .setVisible(false);
    }
    return this.shade;
  }

  private ensureTarget(viewW: number, viewH: number): Phaser.GameObjects.RenderTexture {
    const w = Math.ceil((viewW + MARGIN * 2) / SCALE);
    const h = Math.ceil((viewH + MARGIN * 2) / SCALE);
    if (this.rt && w === this.rtW && h === this.rtH) return this.rt;

    this.rt?.destroy();
    this.rtW = w;
    this.rtH = h;
    const rt = this.scene.add
      .renderTexture(0, 0, w, h)
      .setOrigin(0, 0)
      .setScale(SCALE)
      .setDepth(DEPTH.weather - 100)
      .setBlendMode(Phaser.BlendModes.MULTIPLY);
    rt.texture.setFilter(Phaser.Textures.FilterMode.LINEAR);
    this.rt = rt;
    return rt;
  }
}
