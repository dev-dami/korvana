/**
 * The contract between things that glow and the renderer that lights them.
 *
 * Static emitters are keyed by texture: any chunk sprite whose texture appears
 * in LIGHT_EMITTERS gives off light where it stands, so a torch in a structure
 * template lights itself with no code. Anything that lights up at runtime - a
 * brazier the player kindles, a spell bolt, a lantern - registers a
 * LightSource with the scene's LightRegistry and removes it when it goes out.
 */

export interface LightSpec {
  /** Radius of the lit pool, in world pixels. */
  radius: number;
  /** 0xRRGGBB. */
  color: number;
  /** 0..1 strength at the centre. */
  intensity: number;
  /** 0..1 how much the light wavers. Fire flickers; moonlight does not. */
  flicker?: number;
  /** Offset from the sprite's feet to the flame, in world pixels. */
  offsetY?: number;
}

export interface LightSource extends LightSpec {
  x: number;
  y: number;
}

/** Texture key -> the light it gives off. Extend this for new glowing props. */
export const LIGHT_EMITTERS: Record<string, LightSpec> = {
  st_torch: { radius: 150, color: 0xffa04a, intensity: 0.9, flicker: 0.35, offsetY: -30 },
};

/** Runtime light sources. Owned by WorldScene as `lightRegistry`. */
export class LightRegistry {
  private readonly sources = new Set<LightSource>();

  add(source: LightSource): LightSource {
    this.sources.add(source);
    return source;
  }

  remove(source: LightSource | null | undefined): void {
    if (source) this.sources.delete(source);
  }

  all(): ReadonlySet<LightSource> {
    return this.sources;
  }

  clear(): void {
    this.sources.clear();
  }
}
