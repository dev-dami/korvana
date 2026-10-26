import type { MusicZone } from "../zones";
import { ACADEMY } from "./academy";
import { BATTLE, BOSS } from "./combat";
import { SCAR, TOMB } from "./depths";
import { ENDING } from "./ending";
import { COAST, FOREST, HIGHLAND, MEADOW } from "./overworld";
import { TITLE } from "./title";
import type { ThemeDef } from "./types";

/** Every zone has a theme; the compiler holds us to that when a zone is added. */
export const THEMES: Record<MusicZone, ThemeDef> = {
  title: TITLE,
  academy: ACADEMY,
  meadow: MEADOW,
  forest: FOREST,
  highland: HIGHLAND,
  coast: COAST,
  scar: SCAR,
  tomb: TOMB,
  battle: BATTLE,
  boss: BOSS,
  ending: ENDING,
};
