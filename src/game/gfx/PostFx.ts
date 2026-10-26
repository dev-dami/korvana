import Phaser from "phaser";

import type { Grade, Look } from "./DayCycle";

/**
 * Camera post-processing for the world: a colour grade per biome and hour,
 * bloom that wakes up as the light goes, and a gentle vignette.
 *
 * Everything here rides on the world camera only. The HUD lives in its own
 * scene with its own camera, so none of this ever softens UI text. On the
 * Canvas renderer filters do not exist; the class quietly does nothing.
 */
export class PostFx {
  private readonly enabled: boolean;
  private grade: Phaser.Filters.ColorMatrix | null = null;
  private bloom: Phaser.Types.Actions.AddEffectBloomReturn | null = null;
  private vignette: Phaser.Filters.Vignette | null = null;
  private readonly matrix = new Array<number>(20).fill(0);
  private readonly lastGrade: Grade = { saturation: -1, contrast: -1, brightness: -1, r: -1, g: -1, b: -1 };

  constructor(scene: Phaser.Scene) {
    const camera = scene.cameras.main;
    this.enabled = scene.renderer.type === Phaser.WEBGL && !!camera.filters;
    if (!this.enabled) return;

    try {
      const list = camera.filters.external;
      this.grade = list.addColorMatrix();
      this.bloom =
        Phaser.Actions.AddEffectBloom(camera, {
          threshold: 0.72,
          blurRadius: 3,
          blurSteps: 4,
          blurQuality: 0,
          blendAmount: 0.6,
        })[0] ?? null;
      this.vignette = list.addVignette(0.5, 0.5, 1.0, 0.14, 0x05060c);
    } catch (err) {
      // A filter failing to compile on some driver must not take the game down.
      console.warn("PostFx unavailable", err);
      this.grade = null;
      this.bloom = null;
      this.vignette = null;
    }
  }

  update(look: Look): void {
    if (!this.enabled) return;
    if (this.grade) this.applyGrade(look.grade);

    if (this.bloom) {
      const on = look.bloom > 0.04;
      this.bloom.parallelFilters.active = on;
      if (on) {
        // Darker scenes bloom from a lower threshold: a torch at night should
        // flare, sunlit snow at noon should not.
        const edge = 0.82 - look.bloom * 0.3;
        this.bloom.threshold.setEdge(edge, 1);
        this.bloom.parallelFilters.blend.amount = 0.35 + look.bloom * 0.6;
      }
    }

    if (this.vignette) this.vignette.strength = 0.08 + look.vignette * 0.22;
  }

  /**
   * Saturation, contrast and a per-channel cast folded into one 4x5 matrix.
   * Offsets are in 0..255, which is what Phaser's ColorMatrix expects.
   */
  private applyGrade(gr: Grade): void {
    const last = this.lastGrade;
    if (
      Math.abs(last.saturation - gr.saturation) < 0.002 &&
      Math.abs(last.contrast - gr.contrast) < 0.002 &&
      Math.abs(last.r - gr.r) < 0.002 &&
      Math.abs(last.g - gr.g) < 0.002 &&
      Math.abs(last.b - gr.b) < 0.002 &&
      Math.abs(last.brightness - gr.brightness) < 0.002
    ) {
      return;
    }
    Object.assign(last, gr);

    const s = gr.saturation;
    const lr = 0.2126 * (1 - s);
    const lg = 0.7152 * (1 - s);
    const lb = 0.0722 * (1 - s);
    const c = gr.contrast * gr.brightness;
    const offset = 127.5 * (1 - gr.contrast) * gr.brightness;
    const gains = [gr.r, gr.g, gr.b];
    const m = this.matrix;
    for (let row = 0; row < 3; row++) {
      const gain = (gains[row] ?? 1) * c;
      m[row * 5 + 0] = (lr + (row === 0 ? s : 0)) * gain;
      m[row * 5 + 1] = (lg + (row === 1 ? s : 0)) * gain;
      m[row * 5 + 2] = (lb + (row === 2 ? s : 0)) * gain;
      m[row * 5 + 3] = 0;
      m[row * 5 + 4] = offset * (gains[row] ?? 1);
    }
    m[15] = 0;
    m[16] = 0;
    m[17] = 0;
    m[18] = 1;
    m[19] = 0;
    this.grade?.colorMatrix.set(m);
  }
}
