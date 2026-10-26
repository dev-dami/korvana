import type { Biome } from "../types";
import { lerpRGB } from "./paint";
import type { RGB } from "./paint";

/**
 * How the world should look right now: the colour of ambient light, how dark
 * it is, and the colour grade - all as a function of the hour and the biome
 * the player stands in. Lighting, post-processing and atmosphere all read the
 * same `Look`, so the sky, the shadows and the fireflies always agree.
 */

export interface Grade {
  saturation: number;
  contrast: number;
  brightness: number;
  /** Per-channel gain: the colour cast of the grade. */
  r: number;
  g: number;
  b: number;
}

export interface Look {
  /** Multiplied over the whole world. White at noon; deep blue at night. */
  ambient: RGB;
  /** 0 = full daylight, 1 = pitch black. Drives lights, bloom and particles. */
  darkness: number;
  /** 0..1 how golden the light is (sunrise and sunset). */
  golden: number;
  /** 0..1 how much of the night sky is out (for fireflies, stars). */
  night: number;
  grade: Grade;
  bloom: number;
  vignette: number;
  biome: Biome;
}

/** Ambient light through the day. Hours, then colour. */
const SKY: Array<[number, RGB]> = [
  [0, 0x43528a],
  [4.4, 0x43528a],
  [5.4, 0x6a5f96],
  [6.2, 0xd99a8a],
  [7.0, 0xffd6a6],
  [8.3, 0xfff3e2],
  [10.5, 0xffffff],
  [15.5, 0xffffff],
  [17.0, 0xfff0d8],
  [18.2, 0xffd4a8],
  [19.0, 0xf4ae94],
  [19.8, 0x8a74a8],
  [20.9, 0x43528a],
  [24, 0x43528a],
];

function skyAt(hour: number): RGB {
  for (let i = 1; i < SKY.length; i++) {
    const [h1, c1] = SKY[i]!;
    const [h0, c0] = SKY[i - 1]!;
    if (hour <= h1) return lerpRGB(c0, c1, (hour - h0) / Math.max(0.0001, h1 - h0));
  }
  return SKY[0]![1];
}

function luminance(c: RGB): number {
  return (((c >> 16) & 255) * 0.299 + ((c >> 8) & 255) * 0.587 + (c & 255) * 0.114) / 255;
}

interface BiomeLook {
  /** Multiplied into the sky: canopy shade, dust, cold air. */
  filter: RGB;
  grade: Grade;
  /** Extra bloom on top of what the darkness asks for. */
  bloom: number;
  vignette: number;
  /**
   * The least light there ever is here, per channel. The Scar never goes
   * fully dark: the cracks still give off a dull red heat.
   */
  glow: RGB;
}

const g = (saturation: number, contrast: number, brightness: number, r: number, gg: number, b: number): Grade => ({
  saturation,
  contrast,
  brightness,
  r,
  g: gg,
  b,
});

const BIOMES: Record<Biome, BiomeLook> = {
  meadow: { filter: 0xffffff, grade: g(1.06, 1.05, 1.0, 1.03, 1.01, 0.96), bloom: 0, vignette: 0.32, glow: 0 },
  beach: { filter: 0xffffff, grade: g(1.06, 1.04, 1.02, 1.03, 1.01, 0.97), bloom: 0, vignette: 0.3, glow: 0 },
  ocean: { filter: 0xffffff, grade: g(1.05, 1.04, 1.0, 1.0, 1.01, 1.0), bloom: 0, vignette: 0.32, glow: 0 },
  shallows: { filter: 0xffffff, grade: g(1.05, 1.04, 1.0, 1.0, 1.01, 1.0), bloom: 0, vignette: 0.32, glow: 0 },
  forest: { filter: 0xe4eedb, grade: g(1.04, 1.07, 1.0, 0.99, 1.02, 0.96), bloom: 0.05, vignette: 0.42, glow: 0 },
  marsh: { filter: 0xe2e8e0, grade: g(0.88, 1.02, 1.0, 0.98, 1.01, 0.99), bloom: 0.08, vignette: 0.42, glow: 0 },
  highland: { filter: 0xf0f4fa, grade: g(0.94, 1.06, 1.0, 0.97, 0.99, 1.04), bloom: 0, vignette: 0.34, glow: 0 },
  peak: { filter: 0xf4f8ff, grade: g(0.9, 1.04, 1.0, 0.96, 0.99, 1.06), bloom: 0.05, vignette: 0.34, glow: 0 },
  // The Scar: burnt out, drained of colour, a faint ember warmth left in it.
  scar: { filter: 0xb0a098, grade: g(0.5, 1.14, 1.0, 1.08, 0.97, 0.92), bloom: 0.3, vignette: 0.6, glow: 0x4a3430 },
  // Underground: cold and dark, so every torch is an event.
  crypt: { filter: 0xffffff, grade: g(0.82, 1.1, 1.0, 0.95, 0.99, 1.08), bloom: 0.45, vignette: 0.55, glow: 0 },
};

const CRYPT_AMBIENT: RGB = 0x0e1019;

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Blends looks over time so walking across a biome border, or into a crypt,
 * eases rather than snaps.
 */
export class DayCycle {
  private crypt = 0;
  private biome: Biome = "meadow";
  private readonly look: Look = {
    ambient: 0xffffff,
    darkness: 0,
    golden: 0,
    night: 0,
    grade: g(1, 1, 1, 1, 1, 1),
    bloom: 0,
    vignette: 0.3,
    biome: "meadow",
  };
  private readonly blended: BiomeLook = {
    filter: 0xffffff,
    grade: g(1, 1, 1, 1, 1, 1),
    bloom: 0,
    vignette: 0.3,
    glow: 0,
  };
  private first = true;

  /** `dayFraction`: 0 = midnight, 0.5 = noon. */
  update(dayFraction: number, biome: Biome, dt: number): Look {
    const target = BIOMES[biome] ?? BIOMES.meadow;
    this.biome = biome;
    // Snap on the first frame (no fade from meadow when you load in a crypt),
    // ease afterwards. Going underground is quicker than a biome border.
    const k = this.first ? 1 : 1 - Math.exp(-dt * (biome === "crypt" ? 6 : 1.4));
    this.first = false;
    const b = this.blended;
    b.filter = lerpRGB(b.filter, target.filter, k);
    b.glow = lerpRGB(b.glow, target.glow, k);
    b.bloom = lerp(b.bloom, target.bloom, k);
    b.vignette = lerp(b.vignette, target.vignette, k);
    for (const key of ["saturation", "contrast", "brightness", "r", "g", "b"] as const) {
      b.grade[key] = lerp(b.grade[key], target.grade[key], k);
    }
    this.crypt = lerp(this.crypt, biome === "crypt" ? 1 : 0, k);

    const hour = (((dayFraction % 1) + 1) % 1) * 24;
    const sky = skyAt(hour);
    const outdoor = this.atLeast(this.multiply(sky, b.filter), b.glow);
    const ambient = lerpRGB(outdoor, CRYPT_AMBIENT, this.crypt);

    const look = this.look;
    look.ambient = ambient;
    look.darkness = Math.max(0, Math.min(1, 1 - luminance(ambient)));
    const skyDark = 1 - luminance(sky);
    look.night = Math.max(0, Math.min(1, (skyDark - 0.25) / 0.4)) * (1 - this.crypt);
    look.golden = this.goldenness(hour) * (1 - this.crypt);
    // Night is less saturated, the way eyes see it.
    const nightSat = lerp(1, 0.82, look.night);
    look.grade.saturation = b.grade.saturation * nightSat;
    look.grade.contrast = b.grade.contrast;
    look.grade.brightness = b.grade.brightness;
    look.grade.r = b.grade.r * lerp(1, 1.04, look.golden);
    look.grade.g = b.grade.g;
    look.grade.b = b.grade.b * lerp(1, 0.94, look.golden);
    look.bloom = Math.min(1, b.bloom + look.darkness * 0.55);
    look.vignette = b.vignette + look.night * 0.12;
    look.biome = this.biome;
    return look;
  }

  private goldenness(hour: number): number {
    const morning = Math.max(0, 1 - Math.abs(hour - 6.9) / 1.4);
    const evening = Math.max(0, 1 - Math.abs(hour - 18.6) / 1.5);
    return Math.max(morning, evening);
  }

  private atLeast(a: RGB, floor: RGB): RGB {
    const r = Math.max((a >> 16) & 255, (floor >> 16) & 255);
    const gg = Math.max((a >> 8) & 255, (floor >> 8) & 255);
    const bl = Math.max(a & 255, floor & 255);
    return (r << 16) | (gg << 8) | bl;
  }

  private multiply(a: RGB, b: RGB): RGB {
    const r = (((a >> 16) & 255) * ((b >> 16) & 255)) / 255;
    const gg = (((a >> 8) & 255) * ((b >> 8) & 255)) / 255;
    const bl = ((a & 255) * (b & 255)) / 255;
    return ((r & 255) << 16) | ((gg & 255) << 8) | (bl & 255);
  }
}
