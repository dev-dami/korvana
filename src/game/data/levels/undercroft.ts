import type { LevelDef } from "./types";

/**
 * Tomb I - the Undercroft, a flooded crypt beneath the Academy library.
 *
 * The tutorial tomb. Each room teaches one thing and the centrepiece asks for
 * all of it:
 *
 *   Landing     - light a brazier with fire to open the way (Brother Hollis waits here).
 *   Spike Hall  - three rows of spikes on staggered timers. A cracked wall hides a page.
 *   Plate Room  - a plate opens the south gate only while weighed down; a stone
 *                 block keeps it down for you.
 *   The Nave    - `undercroft_floodgate`: three sluice levers, pulled in the order
 *                 the mural gives (Moon, Stars, Sun), drain the flooded nave.
 *   The Heart   - zone `undercroft_heart`: the Warden's Lantern on its pedestal.
 *                 The Lantern shows a seam in the east wall.
 *   Shortcut    - the floodgate also lifts a grille back to the Landing; the
 *                 Lantern finds one more seam on the way.
 */
export const UNDERCROFT: LevelDef = {
  id: "undercroft",
  landmark: "undercroft",
  tileset: "crypt",
  autoWalls: true,
  music: "tomb",
  rows: [
    "",
    "   m    T                        T    l    T",
    "  u.!!....u                     u..........u",
    "  .........   T       T      T  ............",
    "  ....*.... ..w.s...t...v,....  .....*......",
    "  .........H....s...t...v.*........X........",
    "  .....1...H..*.s...t...v...................",
    "  ......... .,..s...t...v.w...  ............",
    "  ,......2.           C         ........O...",
    "  .,x....,.          aaa        .....*......",
    "        ..           a8a        ,x..........",
    "        UU                      ...........&",
    "        ..                           JJ",
    "        ..                 T    n    ..         T",
    "        ..              ............................",
    "        ..              ..P....*............*....P..",
    "        ..              ....Q........Y.........V....",
    "        ..              ............................",
    "        x.              ......P....P.+..P....P......",
    "        ..              ............................",
    "        *.              FFFFFFFFFFFFFFFFFFFFFFFFFFFF",
    "        ..              FFFFFFFFFFFFFFFFFFFFFFFFFFFF",
    "        ..              FFFFFFFFFFFFFFFFFFFFFFFFFFFF",
    "        ..              FFFFFFFFFFFFFFFFFFFFFFFFFFFF",
    "        ..              FFFFFFFFFFFFFFFFFFFFFFFFFFFF",
    "        ..              FFFFFFFFFFFFFFFFFFFFFFFFFFFF",
    "        ..              FFFFFFFFFFFFFFFFFFFFFFFFFFFF",
    "        ..              ............................",
    "        ..,...*...........P...*.............*....P..",
    "        .........x...........................x,.....",
    "            W           ......,x....................",
    "          ccccc                      KK",
    "          ccccc                      ..",
    "          c7c$c               ................",
    "          ccccc               .P............P.",
    "                              ....*........... bbbb",
    "                              ................ bbbb",
    "                              ...S...L....S...Ebb9b",
    "                              ................ bbbb",
    "                              ...........*.... bbbb",
    "                              .P............P.",
    "                              ....,......,....",
  ],
  mech: {
    "*": { kind: "glow", id: "torchlight", radius: 340, color: 0xffb070, intensity: 0.8 },
    "+": { kind: "glow", id: "waterlight", radius: 420, color: 0x7fb8d8, intensity: 0.7 },
    "!": {
      kind: "portal",
      id: "stairs_up",
      under: "<",
      facing: "up",
      label: "Climb back to the library",
      to: { landmark: "academy_interior", dx: 12, dy: 44, facing: "up" },
    },
    m: {
      kind: "sign",
      id: "landing_mural",
      under: "M",
      wall: true,
      label: "Read the frieze",
      text: "A monk holds a torch to a cold brazier while a door swings open beside him. Scratched beneath, newer: FIRE WAKES WHAT THE WATER PUT TO SLEEP.",
    },
    "1": { kind: "brazier", id: "landing_brazier" },
    H: { kind: "gate", id: "landing_gate", open: "landing_brazier", latch: true, locked: "An iron grate, cold and wet. The brazier beside it is dark." },
    "2": { kind: "loot", id: "landing_tonic", item: "lesser_tonic" },

    s: { kind: "spikes", id: "spikes_a", period: 2.4, up: 1, offset: 0 },
    t: { kind: "spikes", id: "spikes_b", period: 2.4, up: 1, offset: 0.8 },
    v: { kind: "spikes", id: "spikes_c", period: 2.4, up: 1, offset: 1.6 },
    C: { kind: "secret", id: "spike_crack", reveal: "hit", area: "a" },
    "8": { kind: "loot", id: "page_spikes", item: "keeper_page", when: "spike_crack" },

    l: {
      kind: "sign",
      id: "plate_inscription",
      under: "M",
      wall: true,
      label: "Read the inscription",
      text: "Above a square of brass set in the floor: WHAT IS HEAVY STAYS. WHAT WALKS AWAY IS FORGOTTEN.",
    },
    X: { kind: "block", id: "stone" },
    O: { kind: "plate", id: "brass_plate" },
    "&": { kind: "reset", id: "stone_rune", blocks: ["stone"] },
    J: {
      kind: "gate",
      id: "plate_gate",
      open: { any: ["brass_plate", "floodgate"] },
      locked: "The gate is shut. The brass plate in the floor would lift it, if something kept it pressed.",
    },

    n: {
      kind: "sign",
      id: "nave_mural",
      under: "M",
      wall: true,
      label: "Read the mural",
      text: "The Brothers drained the nave as the night drains away: first the Moon goes down, then the Stars go out, and last of all the Sun is let in.",
    },
    Q: { kind: "lever", id: "moon", once: true, label: "Sluice of the Moon" },
    Y: { kind: "lever", id: "stars", once: true, label: "Sluice of the Stars" },
    V: { kind: "lever", id: "sun", once: true, label: "Sluice of the Sun" },
    sluices: { kind: "sequence", id: "sluices", order: ["moon", "stars", "sun"], resets: ["moon", "stars", "sun"] },
    floodgate: {
      kind: "puzzle",
      id: "floodgate",
      puzzle: "undercroft_floodgate",
      when: "sluices",
      text: "Deep below, old gates grind open. The nave roars, and drains away into the dark.",
    },
    F: { kind: "flood", id: "nave_water", under: ";", drained: "floodgate" },
    K: { kind: "gate", id: "heart_gate", open: "floodgate", latch: true, style: "stone", locked: "A slab of stone, slick with weed. Water presses against it from the nave side." },

    L: {
      kind: "pedestal",
      id: "lantern",
      item: "wardens_lantern",
      text: "You lift the Warden's Lantern. Its light is thin and grey - and where it falls, the walls seem to show their seams.",
    },
    E: { kind: "secret", id: "heart_seam", reveal: "lantern", area: "b" },
    "9": { kind: "loot", id: "page_heart", item: "keeper_page", when: "heart_seam" },

    U: { kind: "gate", id: "shortcut_grille", open: "floodgate", latch: true, locked: "A rusted grille. From this side there is nothing to lift it with." },
    W: { kind: "secret", id: "shortcut_seam", reveal: "lantern", area: "c" },
    "7": { kind: "loot", id: "page_shortcut", item: "keeper_page", when: "shortcut_seam" },
    $: { kind: "chest", id: "brothers_chest", gold: 40, items: [{ id: "mana_draught" }] },
  },
  spots: {
    undercroft_ghost: [8, 4],
  },
};
