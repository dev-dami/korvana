/**
 * A tiny indexed-free pixel canvas for authoring character art in code.
 *
 * Canvas 2D anti-aliases every shape it draws, which smears pixel art into
 * mush. Characters are instead composed here, one whole pixel at a time, with
 * a handful of primitives that know about *form*: a shaded ellipse lights
 * itself from the top-left, so a head or an owl's belly reads as round without
 * anyone hand-placing highlights. A final pass adds the selective outline -
 * each edge pixel takes a darkened version of the colour it borders - which is
 * what makes small sprites read cleanly against busy ground.
 */

/** A colour ramp: highlight, base, shadow and a deep accent shadow. */
export interface Ramp {
  hi: number;
  base: number;
  lo: number;
  deep: number;
}

export function hex(color: string): number {
  return parseInt(color.replace("#", ""), 16);
}

function ch(c: number, shift: number): number {
  return (c >> shift) & 0xff;
}

/** Linear blend of two 0xRRGGBB colours. */
export function blend(a: number, b: number, t: number): number {
  const r = Math.round(ch(a, 16) + (ch(b, 16) - ch(a, 16)) * t);
  const g = Math.round(ch(a, 8) + (ch(b, 8) - ch(a, 8)) * t);
  const bl = Math.round(ch(a, 0) + (ch(b, 0) - ch(a, 0)) * t);
  return (r << 16) | (g << 8) | bl;
}

/**
 * Builds a hue-shifted ramp. Shadows lean toward violet and highlights toward
 * warm cream, the classic painter's trick that keeps shading from looking like
 * someone turned the brightness down.
 */
export function ramp(color: string | number): Ramp {
  const base = typeof color === "number" ? color : hex(color);
  return {
    hi: blend(blend(base, 0xffffff, 0.24), 0xfff0c8, 0.18),
    base,
    lo: blend(blend(base, 0x000000, 0.3), 0x2a1d4a, 0.22),
    deep: blend(blend(base, 0x000000, 0.55), 0x1a1030, 0.3),
  };
}

export class Pix {
  readonly w: number;
  readonly h: number;
  readonly rgb: Uint32Array;
  readonly alpha: Uint8Array;
  /** Pixels the outline pass must leave alone (glows, wisps). */
  readonly noOutline: Uint8Array;

  constructor(w: number, h: number) {
    this.w = w;
    this.h = h;
    this.rgb = new Uint32Array(w * h);
    this.alpha = new Uint8Array(w * h);
    this.noOutline = new Uint8Array(w * h);
  }

  inside(x: number, y: number): boolean {
    return x >= 0 && y >= 0 && x < this.w && y < this.h;
  }

  set(x: number, y: number, c: number, a = 255): void {
    x |= 0;
    y |= 0;
    if (!this.inside(x, y)) return;
    const i = y * this.w + x;
    this.rgb[i] = c;
    this.alpha[i] = a;
    this.noOutline[i] = 0;
  }

  /** A pixel that glows: drawn, but never outlined. */
  glow(x: number, y: number, c: number, a = 255): void {
    this.set(x, y, c, a);
    if (this.inside(x | 0, y | 0)) this.noOutline[(y | 0) * this.w + (x | 0)] = 1;
  }

  get(x: number, y: number): number {
    if (!this.inside(x, y)) return 0;
    return this.rgb[y * this.w + x] ?? 0;
  }

  filled(x: number, y: number): boolean {
    if (!this.inside(x, y)) return false;
    return (this.alpha[y * this.w + x] ?? 0) > 0;
  }

  clear(x: number, y: number): void {
    if (!this.inside(x, y)) return;
    const i = y * this.w + x;
    this.alpha[i] = 0;
  }

  rect(x: number, y: number, w: number, h: number, c: number): void {
    for (let yy = 0; yy < h; yy++) for (let xx = 0; xx < w; xx++) this.set(x + xx, y + yy, c);
  }

  /** Horizontal run from x0 to x1 inclusive. */
  hline(x0: number, x1: number, y: number, c: number): void {
    const a = Math.min(x0, x1);
    const b = Math.max(x0, x1);
    for (let x = a; x <= b; x++) this.set(x, y, c);
  }

  vline(x: number, y0: number, y1: number, c: number): void {
    const a = Math.min(y0, y1);
    const b = Math.max(y0, y1);
    for (let y = a; y <= b; y++) this.set(x, y, c);
  }

  line(x0: number, y0: number, x1: number, y1: number, c: number): void {
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
      this.set(x0, y0, c);
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

  /** Filled ellipse sampled at pixel centres. */
  ellipse(cx: number, cy: number, rx: number, ry: number, c: number): void {
    this.ellipseWith(cx, cy, rx, ry, () => c);
  }

  /**
   * An ellipse lit from the upper left. The tone of each pixel comes from the
   * surface normal, so anything round gets a believable highlight and core
   * shadow for free.
   */
  shadedEllipse(cx: number, cy: number, rx: number, ry: number, r: Ramp, bias = 0): void {
    this.ellipseWith(cx, cy, rx, ry, (nx, ny) => {
      const light = -nx * 0.55 - ny * 0.75 + bias;
      if (light > 0.62) return r.hi;
      if (light < -0.62) return r.deep;
      if (light < -0.22) return r.lo;
      return r.base;
    });
  }

  ellipseWith(
    cx: number,
    cy: number,
    rx: number,
    ry: number,
    tone: (nx: number, ny: number, x: number, y: number) => number | null,
  ): void {
    const x0 = Math.floor(cx - rx - 1);
    const x1 = Math.ceil(cx + rx + 1);
    const y0 = Math.floor(cy - ry - 1);
    const y1 = Math.ceil(cy + ry + 1);
    for (let y = y0; y <= y1; y++) {
      for (let x = x0; x <= x1; x++) {
        const nx = (x + 0.5 - cx) / rx;
        const ny = (y + 0.5 - cy) / ry;
        if (nx * nx + ny * ny > 1) continue;
        const c = tone(nx, ny, x, y);
        if (c !== null) this.set(x, y, c);
      }
    }
  }

  /** Scanline polygon fill, sampled at pixel centres. */
  poly(points: Array<[number, number]>, c: number | ((x: number, y: number) => number | null)): void {
    if (points.length < 3) return;
    let minY = Infinity;
    let maxY = -Infinity;
    for (const [, y] of points) {
      minY = Math.min(minY, y);
      maxY = Math.max(maxY, y);
    }
    for (let y = Math.floor(minY); y <= Math.ceil(maxY); y++) {
      const sy = y + 0.5;
      const xs: number[] = [];
      for (let i = 0; i < points.length; i++) {
        const a = points[i]!;
        const b = points[(i + 1) % points.length]!;
        if ((a[1] <= sy && b[1] > sy) || (b[1] <= sy && a[1] > sy)) {
          xs.push(a[0] + ((sy - a[1]) / (b[1] - a[1])) * (b[0] - a[0]));
        }
      }
      xs.sort((p, q) => p - q);
      for (let k = 0; k + 1 < xs.length; k += 2) {
        const from = Math.ceil(xs[k]! - 0.5);
        const to = Math.floor(xs[k + 1]! - 0.5);
        for (let x = from; x <= to; x++) {
          const color = typeof c === "number" ? c : c(x, y);
          if (color !== null) this.set(x, y, color);
        }
      }
    }
  }

  /** Repaints already-filled pixels inside a rect, e.g. to shade a fold. */
  recolor(x: number, y: number, w: number, h: number, map: (c: number, x: number, y: number) => number): void {
    for (let yy = y; yy < y + h; yy++) {
      for (let xx = x; xx < x + w; xx++) {
        if (!this.filled(xx, yy)) continue;
        this.set(xx, yy, map(this.get(xx, yy), xx, yy), this.alpha[yy * this.w + xx]);
      }
    }
  }

  /**
   * Selective outline: every empty pixel touching the sprite takes a darkened
   * version of its neighbour. `ink` pulls every outline toward one colour so a
   * whole cast shares a family resemblance.
   */
  outline(ink = 0x170f1f, strength = 0.62, alphaScale = 1): void {
    const { w, h } = this;
    const src = this.alpha.slice();
    const rgb = this.rgb.slice();
    const skip = this.noOutline.slice();
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const i = y * w + x;
        if (src[i]) continue;
        let n = -1;
        if (x > 0 && src[i - 1] && !skip[i - 1]) n = i - 1;
        else if (x < w - 1 && src[i + 1] && !skip[i + 1]) n = i + 1;
        else if (y > 0 && src[i - w] && !skip[i - w]) n = i - w;
        else if (y < h - 1 && src[i + w] && !skip[i + w]) n = i + w;
        if (n < 0) continue;
        const c = blend(blend(rgb[n]!, 0x000000, strength), ink, 0.45);
        this.rgb[i] = c;
        this.alpha[i] = Math.round(Math.min(255, (src[n] ?? 255) * alphaScale));
      }
    }
  }

  /** Multiplies the alpha of every pixel - for ghosts. */
  fade(alpha: number): void {
    for (let i = 0; i < this.alpha.length; i++) {
      const a = this.alpha[i]!;
      if (a) this.alpha[i] = Math.round(a * alpha);
    }
  }

  /** Copies another buffer onto this one, optionally mirrored. */
  stamp(src: Pix, ox: number, oy: number, mirror = false): void {
    for (let y = 0; y < src.h; y++) {
      for (let x = 0; x < src.w; x++) {
        const i = y * src.w + x;
        const a = src.alpha[i]!;
        if (!a) continue;
        const tx = mirror ? src.w - 1 - x : x;
        this.set(ox + tx, oy + y, src.rgb[i]!, a);
      }
    }
  }

  /** Writes the buffer into a 2D context at (ox, oy), at `scale` pixels per pixel. */
  blit(ctx: CanvasRenderingContext2D, ox: number, oy: number, mirror = false, scale = 1): void {
    const w = this.w * scale;
    const h = this.h * scale;
    const img = ctx.createImageData(w, h);
    const d = img.data;
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const sx0 = Math.floor(x / scale);
        const sx = mirror ? this.w - 1 - sx0 : sx0;
        const si = Math.floor(y / scale) * this.w + sx;
        const a = this.alpha[si]!;
        if (!a) continue;
        const c = this.rgb[si]!;
        const o = (y * w + x) * 4;
        d[o] = (c >> 16) & 0xff;
        d[o + 1] = (c >> 8) & 0xff;
        d[o + 2] = c & 0xff;
        d[o + 3] = a;
      }
    }
    // putImageData ignores compositing, so draw through a scratch canvas to
    // keep transparent pixels transparent on a shared sheet.
    const scratch = document.createElement("canvas");
    scratch.width = w;
    scratch.height = h;
    scratch.getContext("2d")!.putImageData(img, 0, 0);
    ctx.drawImage(scratch, ox, oy);
  }
}

/** Deterministic tiny RNG so every boot paints the same characters. */
export function seeded(seed: number): () => number {
  let s = seed >>> 0 || 1;
  return () => {
    s ^= s << 13;
    s ^= s >>> 17;
    s ^= s << 5;
    return ((s >>> 0) % 100000) / 100000;
  };
}
