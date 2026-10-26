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
  // The Academy, its grounds and the tombs (gfx/dungeonTiles.ts).
  dg_wall_crypt_torch: { radius: 170, color: 0xffa04a, intensity: 0.9, flicker: 0.35, offsetY: -30 },
  dg_wall_barrow_torch: { radius: 160, color: 0xff9440, intensity: 0.85, flicker: 0.4, offsetY: -30 },
  dg_wall_reliquary_torch: { radius: 180, color: 0xbfe4ff, intensity: 0.85, flicker: 0.2, offsetY: -30 },
  dg_wall_hall_torch: { radius: 170, color: 0xffb04a, intensity: 0.85, flicker: 0.3, offsetY: -30 },
  dg_wall_hall_window: { radius: 120, color: 0xd8c8ff, intensity: 0.5, flicker: 0, offsetY: -24 },
  dg_wall_hearth: { radius: 200, color: 0xff8a3a, intensity: 0.95, flicker: 0.45, offsetY: -8 },
  dg_candelabra: { radius: 150, color: 0xffc060, intensity: 0.8, flicker: 0.25, offsetY: -40 },
  dg_castle_window: { radius: 110, color: 0xffc66a, intensity: 0.6, flicker: 0.1, offsetY: -70 },
  dg_lamp_post: { radius: 170, color: 0xffc060, intensity: 0.85, flicker: 0.2, offsetY: -50 },
  dg_brazier_post: { radius: 190, color: 0xffa04a, intensity: 0.95, flicker: 0.4, offsetY: -44 },
  dg_shelf_sealed: { radius: 90, color: 0xa8d8ff, intensity: 0.5, flicker: 0.1, offsetY: -28 },
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
