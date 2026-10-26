import type { LevelDef } from "./types";

/**
 * Korvana Academy from the outside: the keep with its House banners and lit
 * windows, four towers, a walled courtyard and the gatehouse. The great door
 * is a portal into the Academy interior.
 *
 * The courtyard around `academy_gate` is kept clear on purpose - the Act I
 * faculty stand within eight tiles of it (see data/npcs.ts).
 */
export const ACADEMY_GROUNDS: LevelDef = {
  id: "academy_castle",
  landmark: "arrival_grounds",
  tileset: "grounds",
  rows: [
    "",
    "      rrrrrrrrrrrrrrrrrrrrrrrrrrrrr",
    "      rrrrrrrrrrrrrrrrrrrrrrrrrrrrr",
    "      rrrrrrrrrrrrrrrrrrrrrrrrrrrrr",
    "      RRRRRRRRRRRRRRRRRRRRRRRRRRRRR",
    "      rrrrrrrrrrrrrrrrrrrrrrrrrrrrr",
    "  rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr",
    "  rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr",
    "  rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr",
    "  rrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrrr",
    "  ABC#W#1#W#2#W#W##DEF##W#W#3#W#4#W#ABC",
    "  =...............T@@@T...............=",
    "  =..........q.y.........v.z..........=",
    "  =  ;;;;;;;;;   L.....L   ;;;;;;;;;  =",
    "  =               .....               =",
    "  =    o          .....          o    =",
    "  =      fg       .....       fg      =",
    "  =               .....               =",
    "  =...................................=",
    "  =               .....               =",
    "  =      o        .....        o      =",
    "  =  ;;;;;;;;;   L.....L   ;;;;;;;;;  =",
    "  =               .....               =",
    "  =  h h h h h    .....    h h h h h  =",
    "  =               .....               =",
    "  =           L   .....   L           =",
    "  ===============[]...[]===============",
    "                   ,,,",
    "                   ,,,",
    "                   ,,,",
    "                   ,,,",
    "                    ,",
  ],
  mech: {
    "@": {
      kind: "portal",
      id: "great_door",
      under: ".",
      facing: "up",
      label: "Enter the Academy",
      to: { landmark: "academy_interior", dx: 5, dy: 4, facing: "down" },
    },
  },
  spots: {
    academy_gate: [20, 18],
  },
};

/** The Thornroot Barrow's mouth, a grassed-over mound in the deep forest. */
export const BARROW_MOUTH: LevelDef = {
  id: "barrow_mound",
  landmark: "barrow_entrance",
  tileset: "grounds",
  rows: [
    "  mmmmm",
    " mmmmmmm",
    "mmmmmmmmm",
    "nnnnOnnnn",
    "P  T@T  P",
    "    ,",
    "   ,,,",
    "    ,",
  ],
  mech: {
    "@": {
      kind: "portal",
      id: "barrow_door",
      under: "-",
      facing: "up",
      label: "Enter the barrow",
      requiresFlag: "barrow_unsealed",
      locked:
        "Roots have grown through a seal of old iron. It does not so much as creak. Whatever unseals it, it is not your hand - not yet.",
      to: { landmark: "thornroot_barrow", dx: 5, dy: 4, facing: "down" },
    },
  },
  spots: {
    barrow_mouth: [6, 6],
  },
};

/** The Skyfall Reliquary's door, cut into a highland cliff above a flight of steps. */
export const RELIQUARY_STEPS: LevelDef = {
  id: "reliquary_stair",
  landmark: "reliquary_entrance",
  tileset: "grounds",
  rows: [
    " kkkkkkk",
    "kkkkkkkkk",
    "KKKKQKKKK",
    "P  ^@^  P",
    "  T^^^T",
    "    ,",
    "    ,",
  ],
  mech: {
    "@": {
      kind: "portal",
      id: "reliquary_door",
      under: "^",
      facing: "up",
      label: "Enter the Reliquary",
      requiresFlag: "reliquary_unsealed",
      locked:
        "The door is a single slab of pale stone with no handle and no seam. Something in the rock hums, very faintly, like a bell heard from another valley.",
      to: { landmark: "skyfall_reliquary", dx: 5, dy: 4, facing: "down" },
    },
  },
  spots: {
    reliquary_steps: [6, 5],
  },
};
