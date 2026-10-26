/**
 * Pixel-level drawing for generated art.
 *
 * Canvas paths anti-alias every edge, which turns pixel art into mush once the
 * camera zooms it. Everything that should look hand-pixelled is instead drawn
 * into a plain RGBA buffer here - hard-edged discs, dithered ramps, single
 * highlight pixels - and only then copied onto a canvas.
 */

export type RGB = number;

export function rgb(hex: string): RGB {
  return parseInt(hex.replace("#", ""), 16);
}

export function lerpRGB(a: RGB, b: RGB, t: number): RGB {
  const k = t < 0 ? 0 : t > 1 ? 1 : t;
  const r = ((a >> 16) & 255) + ((((b >> 16) & 255) - ((a >> 16) & 255)) * k);
  const g = ((a >> 8) & 255) + ((((b >> 8) & 255) - ((a >> 8) & 255)) * k);
  const bl = (a & 255) + (((b & 255) - (a & 255)) * k);
  return ((r & 255) << 16) | ((g & 255) << 8) | (bl & 255);
}

/** amount > 0 lightens towards white, < 0 darkens towards black. */
export function shadeRGB(c: RGB, amount: number): RGB {
  return amount >= 0 ? lerpRGB(c, 0xffffff, amount) : lerpRGB(c, 0x000000, -amount);
}

/** 4x4 Bayer matrix, normalised to [0, 1). The backbone of every dithered ramp. */
const BAYER = [0, 8, 2, 10, 12, 4, 14, 6, 3, 11, 1, 9, 15, 7, 13, 5];
export function bayer(x: number, y: number): number {
  return (BAYER[(y & 3) * 4 + (x & 3)] ?? 0) / 16;
}

function hashInt(x: number, y: number, seed: number): number {
  let h = Math.imul(x | 0, 0x27d4eb2d) ^ Math.imul(y | 0, 0x165667b1) ^ Math.imul(seed | 0, 0x9e3779b1);
  h = Math.imul(h ^ (h >>> 15), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

/**
 * Value noise whose lattice wraps every `period` cells, so a tile painted with
 * it joins itself seamlessly when the same variant sits next to itself.
 */
export function wrapNoise(x: number, y: number, cell: number, period: number, seed: number): number {
  const fx = x / cell;
  const fy = y / cell;
  const xi = Math.floor(fx);
  const yi = Math.floor(fy);
  const u = fx - xi;
  const v = fy - yi;
  const su = u * u * (3 - 2 * u);
  const sv = v * v * (3 - 2 * v);
  const w = (n: number) => ((n % period) + period) % period;
  const a = hashInt(w(xi), w(yi), seed);
  const b = hashInt(w(xi + 1), w(yi), seed);
  const c = hashInt(w(xi), w(yi + 1), seed);
  const d = hashInt(w(xi + 1), w(yi + 1), seed);
  const top = a + (b - a) * su;
  const bottom = c + (d - c) * su;
  return top + (bottom - top) * sv;
}

/** Two octaves of wrapping noise for a `size`-pixel tile. */
export function tileNoise(x: number, y: number, size: number, cell: number, seed: number): number {
  const p1 = Math.max(1, Math.round(size / cell));
  const p2 = Math.max(1, Math.round(size / (cell / 2)));
  return wrapNoise(x, y, cell, p1, seed) * 0.65 + wrapNoise(x, y, cell / 2, p2, seed + 31) * 0.35;
}

export class Painter {
  readonly w: number;
  readonly h: number;
  readonly data: Uint8ClampedArray<ArrayBuffer>;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.data = new Uint8ClampedArray(new ArrayBuffer(w * h * 4));
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  /** Source-over blend of one pixel. Coordinates are floored, never anti-aliased. */
  px(x: number, y: number, c: RGB, a = 1): void {
    x |= 0;
    y |= 0;
    if (a <= 0 || x < 0 || y < 0 || x >= this.w || y >= this.h) return;
    const i = (y * this.w + x) * 4;
    const d = this.data;
    const r = (c >> 16) & 255;
    const g = (c >> 8) & 255;
    const b = c & 255;
    if (a >= 1) {
      d[i] = r;
      d[i + 1] = g;
      d[i + 2] = b;
      d[i + 3] = 255;
      return;
    }
    const da = (d[i + 3] ?? 0) / 255;
    const oa = a + da * (1 - a);
    if (oa <= 0) return;
    d[i] = (r * a + (d[i] ?? 0) * da * (1 - a)) / oa;
    d[i + 1] = (g * a + (d[i + 1] ?? 0) * da * (1 - a)) / oa;
    d[i + 2] = (b * a + (d[i + 2] ?? 0) * da * (1 - a)) / oa;
    d[i + 3] = oa * 255;
  }

  /** Alpha of an existing pixel, 0..1. */
  alpha(x: number, y: number): number {
    if (!this.inside(x, y)) return 0;
    return (this.data[((y | 0) * this.w + (x | 0)) * 4 + 3] ?? 0) / 255;
  }

  get(x: number, y: number): RGB {
    const i = ((y | 0) * this.w + (x | 0)) * 4;
    const d = this.data;
    return ((d[i] ?? 0) << 16) | ((d[i + 1] ?? 0) << 8) | (d[i + 2] ?? 0);
  }

  /** Multiplies an existing pixel's colour toward black (k<0) or white (k>0), keeping alpha. */
  tone(x: number, y: number, k: number): void {
    if (!this.inside(x, y)) return;
    const i = ((y | 0) * this.w + (x | 0)) * 4;
    if ((this.data[i + 3] ?? 0) === 0) return;
    const c = shadeRGB(this.get(x, y), k);
    this.data[i] = (c >> 16) & 255;
    this.data[i + 1] = (c >> 8) & 255;
    this.data[i + 2] = c & 255;
  }

  rect(x: number, y: number, w: number, h: number, c: RGB, a = 1): void {
    for (let yy = y; yy < y + h; yy++) for (let xx = x; xx < x + w; xx++) this.px(xx, yy, c, a);
  }

  fill(c: RGB, a = 1): void {
    this.rect(0, 0, this.w, this.h, c, a);
  }

  /** A hard-edged ellipse. */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: RGB, a = 1): void {
    const x0 = Math.floor(cx - rx);
    const x1 = Math.ceil(cx + rx);
    const y0 = Math.floor(cy - ry);
    const y1 = Math.ceil(cy + ry);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        if (dx * dx + dy * dy <= 1) this.px(x, y, c, a);
      }
    }
  }

  disc(cx: number, cy: number, r: number, c: RGB, a = 1): void {
    this.ellipse(cx, cy, r, r, c, a);
  }

  /** A soft, dithered ellipse that fades out to its rim. Good for contact shadows. */
  softEllipse(cx: number, cy: number, rx: number, ry: number, c: RGB, a: number): void {
    const x0 = Math.floor(cx - rx);
    const x1 = Math.ceil(cx + rx);
    const y0 = Math.floor(cy - ry);
    const y1 = Math.ceil(cy + ry);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const dx = (x + 0.5 - cx) / rx;
        const dy = (y + 0.5 - cy) / ry;
        const d = dx * dx + dy * dy;
        if (d > 1) continue;
        this.px(x, y, c, a * (1 - d) * (1 - d * 0.3));
      }
    }
  }

  /** Bresenham line. */
  line(x0: number, y0: number, x1: number, y1: number, c: RGB, a = 1): void {
    x0 = Math.round(x0);
    y0 = Math.round(y0);
    x1 = Math.round(x1);
    y1 = Math.round(y1);
    const dx = Math.abs(x1 - x0);
    const dy = -Math.abs(y1 - y0);
    const sx = x0 < x1 ? 1 : -1;
    const sy = y0 < y1 ? 1 : -1;
    let err = dx + dy;
    for (;;) {
      this.px(x0, y0, c, a);
      if (x0 === x1 && y0 === y1) break;
      const e2 = 2 * err;
      if (e2 >= dy) {
        err += dy;
        x0 += sx;
      }
      if (e2 <= dx) {
        err += dx;
        y0 += sy;
      }
    }
  }

  /** A thick line made of discs, for branches and trunks. */
  thickLine(x0: number, y0: number, x1: number, y1: number, w0: number, w1: number, c: RGB): void {
    const len = Math.hypot(x1 - x0, y1 - y0);
    const steps = Math.max(1, Math.ceil(len));
    for (let i = 0; i <= steps; i++) {
      const t = i / steps;
      this.disc(x0 + (x1 - x0) * t, y0 + (y1 - y0) * t, Math.max(0.5, (w0 + (w1 - w0) * t) / 2), c);
    }
  }

  /**
   * Draws a 1px dark outline around every opaque pixel that borders a
   * transparent one. Outlines are what make small sprites read at a glance.
   */
  outline(c: RGB, a = 1, threshold = 0.5): void {
    const marks: number[] = [];
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.alpha(x, y) >= threshold) continue;
        if (
          this.alpha(x - 1, y) >= threshold ||
          this.alpha(x + 1, y) >= threshold ||
          this.alpha(x, y - 1) >= threshold ||
          this.alpha(x, y + 1) >= threshold
        ) {
          marks.push(x, y);
        }
      }
    }
    for (let i = 0; i < marks.length; i += 2) this.px(marks[i] ?? 0, marks[i + 1] ?? 0, c, a);
  }

  /**
   * Shades opaque pixels by how close they are to the top-left (lit) or
   * bottom-right (shadow) of a blob, giving round volumes a light direction.
   */
  volume(cx: number, cy: number, r: number, lightK: number, darkK: number): void {
    for (let y = 0; y < this.h; y++) {
      for (let x = 0; x < this.w; x++) {
        if (this.alpha(x, y) === 0) continue;
        const dx = (x - cx) / r;
        const dy = (y - cy) / r;
        const d = Math.hypot(dx, dy);
        if (d > 1.2) continue;
        const lit = -(dx * 0.6 + dy * 0.8);
        if (lit > 0.35) this.tone(x, y, lightK * Math.min(1, (lit - 0.35) * 2));
        else if (lit < -0.2) this.tone(x, y, -darkK * Math.min(1, (-lit - 0.2) * 1.6));
      }
    }
  }

  put(ctx: CanvasRenderingContext2D, x = 0, y = 0): void {
    ctx.putImageData(new ImageData(this.data, this.w, this.h), x, y);
  }

  /** Composites onto a context with normal blending (putImageData would replace). */
  draw(ctx: CanvasRenderingContext2D, x = 0, y = 0): void {
    ctx.drawImage(this.toCanvas(), x, y);
  }

  toCanvas(): HTMLCanvasElement {
    const canvas = document.createElement("canvas");
    canvas.width = this.w;
    canvas.height = this.h;
    const ctx = canvas.getContext("2d");
    if (ctx) this.put(ctx);
    return canvas;
  }
}

/**
 * Maps a 0..1 value onto a colour ramp with ordered dithering between steps,
 * the classic way pixel art fakes a gradient with a handful of colours.
 */
export function ramp(colors: readonly RGB[], v: number, x: number, y: number): RGB {
  const n = colors.length - 1;
  const f = Math.max(0, Math.min(0.9999, v)) * n;
  const i = Math.floor(f);
  const frac = f - i;
  const pick = frac > bayer(x, y) ? i + 1 : i;
  return colors[Math.min(n, pick)] ?? colors[0] ?? 0;
}
