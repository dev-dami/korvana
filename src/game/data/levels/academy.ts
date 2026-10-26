import { prop } from "./tilesets";
import type { LevelDef } from "./types";

/**
 * Inside Korvana Academy.
 *
 *   Vestibule (NW)  - the great door back out to the courtyard.
 *   Long Corridor   - down to the Gallery.
 *   Great Hall (N)  - four House tables under four banners, the dais at the
 *                     far end where the Choosing Lamp sits.
 *   Gallery         - the spine of the ground floor.
 *   Library (SW)    - Master Fennick's desk, the stacks, and behind an iron
 *                     grille the Restricted Section, whose sealed shelf opens
 *                     onto the Undercroft for anyone holding a pass.
 *   Lecture Hall (SE)
 *
 * Nothing hostile spawns here: the landmark's safe radius covers the whole map.
 */
export const ACADEMY_INTERIOR: LevelDef = {
  id: "academy_interior",
  landmark: "academy_interior",
  tileset: "academy",
  autoWalls: true,
  music: "academy",
  rows: [
    "",
    "  T  DD  T         T  1 W  2  W    W  3  W 4  T",
    " o...@@...o       ......_c______________c_......",
    " ....::....       ......__________________......",
    " ..P.::.P..       ......__________________......",
    " ....::....       ......__________________......",
    " ....::....       ......^^^^^^^^^^^^^^^^^^......",
    " ..P.::.P..       ..............::..............",
    " ....::....       ..............::..............",
    " p...::...p       .P..{....{....::....{....{..P.",
    "    .::.          ....|....|....::....|....|....",
    "    .::.          c...|....|....::....|....|...c",
    "    .::.          ....|....|....::....|....|....",
    "   o.::.o         ....|....|....::....|....|....",
    "    .::.          ....|....|....::....|....|....",
    "    .::.          .P..|....|....::....|....|..P.",
    "    .::.          ....|....|....::....|....|....",
    "    .::.          c...|....|....::....|....|...c",
    "    .::.          ....|....|....::....|....|....",
    "   p.::.p         ....}....}....::....}....}....",
    "    .::.          ..............::..............",
    "    .::.          ..............::..............",
    "    .::.                        ::",
    "    .::.    T   W   T     T     ::   T     T   W   T",
    " o....................................................o",
    " ::::::::::::::::::::::::::::::::::::::::::::::::::::::",
    " ......................................................",
    "            ,,                          ..",
    "   W   T    ,,   T   W           W  T   ..   T  W",
    " ,,,,,,,,,,,::,,,,,,,,,,,,    p.....................p",
    " ,,,,l,,,,,,::,,,,,,,g,,,,    .......................",
    " c,,,,,,,,,,::,ddd,,,,,,,c    ..dddddd.......dddddd..",
    " ,,,,,,,,,,,::,,,,,,,,,,,,    .......................",
    " ,kkkkkkkk,,::,,kkkkkkkkk,    ..dddddd.......dddddd..",
    " ,,,,,,,,,,,::,,,,,,,,,,,,    .......................",
    " ,,,,,,,,,,,::,,,,,,,,,,,,    ...........l...........",
    " ,kkkkkkkk,,::,,kkkkkkkkk,    .g....................p",
    " ,,,,,,,,,,,::,,,,,,,,,,,,    .......................",
    " ,,dd,,,,,,,::,,,,,,,dd,,,",
    " ,,,,,,,,,,,::,,,,,,,,,,,,",
    "            GG",
    "   ,,,,,,,,,::,,,,,,,,,,",
    "   ,KKKKKK,,::,,KKKKKKK,",
    "   ,,,,,,,,,::,,,,,,,,,,",
    "   ,KKKKKK,,::,,KKKKKKK,",
    "   ,,,,,,,,,::,,,,,,,,,,",
    "   c,,,l,,,,ZZ,,,,,,,,,c",
  ],
  legend: {
    Z: prop("dg_shelf_sealed"),
  },
  mech: {
    "@": {
      kind: "portal",
      id: "great_door",
      under: ":",
      facing: "up",
      label: "Out to the courtyard",
      to: { landmark: "arrival_grounds", dx: 20, dy: 12, facing: "down" },
    },
    G: {
      kind: "gate",
      id: "restricted_grille",
      under: ":",
      open: { flag: "restricted_pass" },
      style: "iron",
      locked: "The Restricted Section is barred by an iron grille. Master Fennick keeps the only key.",
    },
    Z: {
      kind: "portal",
      id: "sealed_shelf",
      under: "Z",
      trigger: "interact",
      label: "Search the sealed shelf",
      requiresFlag: "restricted_pass",
      locked: "Every book on this shelf is chained, and the chains are warded. Without a pass you dare not touch it.",
      setsFlag: "undercroft_open",
      to: { landmark: "undercroft", dx: 5, dy: 4, facing: "down" },
    },
  },
  spots: {
    hall_lamp: [32, 3],
    hall_dais: [35, 3],
    hall_west: [20, 12],
    hall_east: [45, 12],
    library_desk: [16, 30],
    library_stacks: [6, 35],
    restricted_shelf: [10, 45],
  },
};
