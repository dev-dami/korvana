import type { LevelDef } from "./types";

/**
 * Tomb II - the Thornroot Barrow, a root-choked grave-mound in the deep forest.
 *
 *   Antechamber   - safe; the stairs back to the forest.
 *   Dart Gallery  - shooters in both walls fire in a rolling volley; a pale
 *                   plate in the floor sets off two more. A cracked wall hides a page.
 *   The Causeway  - a crumbling bridge over a chasm. The floor gives way behind
 *                   you faster than you can walk, and twice there is no floor at
 *                   all: sprint (Shift) and dash (C) across.
 *   Root Hall     - `barrow_roots`: three stone blocks onto three plates while the
 *                   roots crowd every lane. A rune by the door puts the stones back.
 *   Barrow Heart  - zone `barrow_heart`: the Ninefold Key. Taking it lifts the
 *                   grille on the old shortcut home.
 */
export const THORNROOT_BARROW: LevelDef = {
  id: "thornroot_barrow",
  landmark: "thornroot_barrow",
  tileset: "barrow",
  autoWalls: true,
  music: "tomb",
  rows: [
    "",
    "      T m",
    "  u.!!....u                           ~~~~~~~~~~~~~~~~~~~~~~",
    "  .........   T d   d f d   d   T     ~~~~~~~~~~~~~~~~~~~~~~...u",
    "  ...........,.................... ..*~~~~~~~~~~~~~~~~~~~~~~.*..",
    "  ....*..........*....v....*........k.ZZZZZppZZZZZZZZZZZZppZj...",
    "  .............................x.. ...~~~~~~~~~~~~~~~~~~~~~~....",
    "  .........       e   g   e   C       ~~~~~~~~~~~~~~~~~~~~~~....",
    "  ,.......x                  aaa      ~~~~~~~~~~~~~~~~~~~~~~ ..",
    "     ..                      a8a                             ..",
    "     UU                                                      ..",
    "     ..                                                      ..",
    "     ..                                                      ..",
    "     ..                                                      ..",
    "     ..                                                    q ..",
    "     ..                                              RRRRRRRR..R",
    "     ,*                                              R.........R",
    "     ..                 ..........x....            RRR...RR.*..R",
    "     ..                 ..P.........P..        RRRRR.....RR....R",
    "     ..                 ...*...........     RRRR.......X.RR.RR.R",
    "     ..                 .......S.......     R.....X.RR..........",
    "     ..                 ...................G..O..*...R..R...R...",
    "     ..                 ...................G..O.....RR..R.......",
    "     ..........*.........R.....L.......     R.O......R..RRRR.R..",
    "     .......x........................R.     R...RR....X.........",
    "             W          ............*..     RRR........R.R*.&...",
    "           ccccc        ...............       R....RR...........",
    "           c7c$c        ..P.........P..       RR......RRRRR.....",
    "           ccccc        ....,..........        RRRRRRRR   RRRRRR",
    "                               E",
    "                             bbbbb",
    "                             bb9bb",
    "                             bbbbb",
  ],
  mech: {
    "*": { kind: "glow", id: "torchlight", radius: 340, color: 0xffa860, intensity: 0.8 },
    "!": {
      kind: "portal",
      id: "stairs_up",
      under: "<",
      facing: "up",
      label: "Climb out to the forest",
      to: { landmark: "barrow_entrance", dx: 4, dy: 5, facing: "down" },
    },
    m: {
      kind: "sign",
      id: "lintel",
      under: "M",
      wall: true,
      label: "Read the lintel",
      text: "Roots have split the lintel. Carved beneath them: THE FLOOR OF THIS HOUSE IS OLD AND THIN. THE DEAD STAND STILL. YOU NEED NOT.",
    },

    d: { kind: "darts", id: "volley_down", dir: "down", period: 2.2, offset: 0, wave: 0.4 },
    e: { kind: "darts", id: "volley_up", dir: "up", period: 2.2, offset: 1.1, wave: 0.6 },
    v: { kind: "plate", id: "trip_plate", trip: true },
    f: { kind: "darts", id: "trip_darts", dir: "down", when: "trip_plate" },
    g: { kind: "darts", id: "trip_darts_up", dir: "up", when: "trip_plate" },
    C: { kind: "secret", id: "gallery_crack", reveal: "hit", area: "a" },
    "8": { kind: "loot", id: "page_gallery", item: "keeper_page", when: "gallery_crack" },

    k: { kind: "checkpoint", id: "west_ledge" },
    j: { kind: "checkpoint", id: "east_ledge" },
    Z: { kind: "collapse", id: "causeway", wave: 0.13, reform: 5 },
    p: { kind: "pit", id: "causeway_gap" },

    q: {
      kind: "sign",
      id: "root_stele",
      under: "M",
      wall: true,
      label: "Read the carving",
      text: "Three stones were laid to keep the roots asleep. Lay them again and the roots will remember their manners.",
    },
    X: { kind: "block", id: "stones" },
    O: { kind: "plate", id: "root_plates", weight: "block" },
    "&": { kind: "reset", id: "stone_rune", blocks: ["stones"], unless: "roots" },
    roots: {
      kind: "puzzle",
      id: "roots",
      puzzle: "barrow_roots",
      when: "root_plates",
      text: "With a sound like a long breath let out, the roots draw back from the western door.",
    },
    G: { kind: "gate", id: "root_gate", open: "roots", latch: true, style: "roots", locked: "Roots as thick as your arm have knotted shut the way west. Nothing you carry will cut them." },

    L: {
      kind: "pedestal",
      id: "key",
      item: "ninefold_key",
      text: "The Ninefold Key is cold, heavy, and has nine wards and no teeth at all. Somewhere behind you an old grille shudders.",
    },
    E: { kind: "secret", id: "heart_seam", reveal: "lantern", area: "b" },
    "9": { kind: "loot", id: "page_heart", item: "keeper_page", when: "heart_seam" },

    U: { kind: "gate", id: "shortcut_grille", open: "key", latch: true, locked: "A grille furred with roots. It will not move from this side." },
    W: { kind: "secret", id: "shortcut_seam", reveal: "lantern", area: "c" },
    "7": { kind: "loot", id: "page_shortcut", item: "keeper_page", when: "shortcut_seam" },
    $: { kind: "chest", id: "barrow_chest", gold: 60, items: [{ id: "lesser_tonic", qty: 2 }] },
  },
  spots: {
    barrow_heart_spot: [34, 22],
  },
};
