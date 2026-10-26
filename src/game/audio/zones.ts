import type { Biome } from "../types";

/**
 * Where the music thinks you are. The scene reports a zone whenever the
 * player's surroundings change and the audio engine crossfades to its theme.
 */
export type MusicZone =
  | "title"
  | "academy"
  | "meadow"
  | "forest"
  | "highland"
  | "coast"
  | "scar"
  | "tomb"
  | "battle"
  | "boss"
  | "ending";

/** Named one-shot sound effects. Mechanisms, UI and story moments use these. */
export type SfxName =
  | "lever"
  | "plate_click"
  | "gate_open"
  | "gate_close"
  | "stone_grind"
  | "spike_trap"
  | "dart"
  | "rumble"
  | "collapse"
  | "secret"
  | "chest_open"
  | "relic_fanfare"
  | "door"
  | "brazier_light"
  | "splash"
  | "portal"
  | "quest_complete"
  | "level_up"
  | "page_turn"
  | "owl";

export function zoneForBiome(biome: Biome, nearAcademy: boolean): MusicZone {
  if (nearAcademy) return "academy";
  switch (biome) {
    case "crypt":
      return "tomb";
    case "scar":
      return "scar";
    case "forest":
    case "marsh":
      return "forest";
    case "highland":
    case "peak":
      return "highland";
    case "beach":
    case "ocean":
    case "shallows":
      return "coast";
    default:
      return "meadow";
  }
}
