import { floor } from "./tilesets";
import type { LevelDef } from "./types";

/**
 * Tomb III - the Skyfall Reliquary, a white vault cut into the highlands.
 *
 *   Narthex          - safe; the stairs back to the steps.
 *   Gallery of Flames - three braziers that burn out after a while; light all
 *                       three at once to raise the eastern gate. Spike walls
 *                       stand in between. A cracked wall hides a page.
 *   Bell Chamber     - `reliquary_bells`: four bells, struck (by spell, blade or
 *                       hand) in the order the steles tell: Heron, Stag, Briar, Raven.
 *   Reliquary Heart  - zone `reliquary_heart`: the Silent Bell. Lifting it brings
 *                       the vault down: the way back slams shut, a stone door opens
 *                       on the west, and a boulder follows you all the way out
 *                       (`reliquary_escape`).
 */
export const SKYFALL_RELIQUARY: LevelDef = {
  id: "skyfall_reliquary",
  landmark: "skyfall_reliquary",
  tileset: "reliquary",
  autoWalls: true,
  music: "tomb",
  rows: [
    "",
    "   T     mT                            T     n          T",
    "  o.!!......o  T                T    .....................",
    "  ........... .......ss......tt..... .....................",
    "  ........... ....1..ss.P....tt..3.. ..H...............I..",
    "  ...................ss......tt.....G.....................",
    "  ....,,.............ss......tt.....G.....................",
    "  ........... .......ss......tt.....G..................... bbb",
    "  ........... ..P....ss...2..ttP.... .........,,,......... bbb",
    "  ,........., .......ss......tt..... ....N....,o,....Y....Eb9b",
    "        W                 C          .........,,,......... bbb",
    "      ccccc              aaa         ..................... bbb",
    "      c7c$c              a8a         .....................",
    "      ccccc                          .....................",
    "                                     ..J...............K..",
    "                                     .......q.....z.......",
    "                                     .....................",
    "                                              VV",
    "                                              ..",
    "                                        ...............",
    "                                        ..P.........P..",
    "                                        ...............",
    "                                        ....,..........",
    "               ...............r.....%%.X...............",
    "               .........r...........%%.X......L........",
    "               ..                       ...............",
    "               ..                       .........,.....",
    "               ..                       ..P.........P..",
    "               ..                       ...............",
    "               r.",
    "               ..",
    "               ..",
    "               .r                         ........",
    "               ..                         ........",
    "               ..                         ........",
    "               .......OO.................&.......^",
    "               .......OO........r........&.......^",
    "                                          ........",
    "                                          ........",
    "                                          ........",
  ],
  legend: {
    "&": floor("dg_floor_marble_inlay"),
  },
  mech: {
    "!": {
      kind: "portal",
      id: "stairs_up",
      under: "<",
      facing: "up",
      label: "Climb back to the steps",
      to: { landmark: "reliquary_entrance", dx: 4, dy: 5, facing: "down" },
    },
    "^": {
      kind: "portal",
      id: "exit_stairs",
      under: "<",
      label: "Climb out",
      to: { landmark: "reliquary_entrance", dx: 6, dy: 4, facing: "down" },
    },
    m: {
      kind: "sign",
      id: "narthex_frieze",
      under: "M",
      wall: true,
      label: "Read the frieze",
      text: "THE RELIQUARY OF THE SKYFALL. Here the Keepers hung the bell that does not ring, high and far, so that nothing would ever wake it by accident.",
    },

    "1": { kind: "brazier", id: "flame_a", burn: 14 },
    "2": { kind: "brazier", id: "flame_b", burn: 14 },
    "3": { kind: "brazier", id: "flame_c", burn: 14 },
    flames: {
      kind: "puzzle",
      id: "flames",
      puzzle: "reliquary_flames",
      when: { all: ["flame_a", "flame_b", "flame_c"] },
      text: "Three fires burn together, and the eastern gate lifts on its chains.",
    },
    G: { kind: "gate", id: "flame_gate", open: "flames", latch: true, locked: "A portcullis of white iron. Three cold braziers watch it." },
    s: { kind: "spikes", id: "spikes_west", period: 2.2, up: 0.9, offset: 0 },
    t: { kind: "spikes", id: "spikes_east", period: 2.2, up: 0.9, offset: 1.1 },
    C: { kind: "secret", id: "gallery_crack", reveal: "hit", area: "a" },
    "8": { kind: "loot", id: "page_gallery", item: "keeper_page", when: "gallery_crack" },

    n: {
      kind: "sign",
      id: "sky_frieze",
      under: "M",
      wall: true,
      label: "Read the frieze",
      text: "A frieze of the sky turning, dawn to dark, carved right round the chamber. Under it, one line: RING THEM AS THE DAY IS RUNG.",
    },
    N: { kind: "sign", id: "stele_dawn", label: "Read the stele", text: "At first light the heron wades the shallows, and is the first of all things to speak." },
    Y: { kind: "sign", id: "stele_noon", label: "Read the stele", text: "At noon the stag stands in the burning glade. Nothing in all the day is louder." },
    q: { kind: "sign", id: "stele_dusk", label: "Read the stele", text: "At dusk the briar closes its hands." },
    z: { kind: "sign", id: "stele_night", label: "Read the stele", text: "And the raven keeps the night, and the key, and the last word." },
    H: { kind: "bell", id: "heron", note: 392, label: "Bell of the Heron" },
    I: { kind: "bell", id: "stag", note: 494, label: "Bell of the Stag" },
    J: { kind: "bell", id: "briar", note: 587, label: "Bell of the Briar" },
    K: { kind: "bell", id: "raven", note: 784, label: "Bell of the Raven" },
    peal: { kind: "sequence", id: "peal", order: ["heron", "stag", "briar", "raven"] },
    bells: {
      kind: "puzzle",
      id: "bells",
      puzzle: "reliquary_bells",
      when: "peal",
      text: "The last note does not fade. It hangs in the air, and the southern door answers it.",
    },
    E: { kind: "secret", id: "bell_seam", reveal: "lantern", area: "b" },
    "9": { kind: "loot", id: "page_bells", item: "keeper_page", when: "bell_seam" },
    V: {
      kind: "gate",
      id: "heart_gate",
      // Slams shut when the Bell is lifted, and opens again once you are out.
      open: { any: [{ all: ["bells", { not: "relic" }] }, "escape"] },
      style: "stone",
      locked: "A door of white stone, without a handle. It is listening for something.",
    },

    L: {
      kind: "pedestal",
      id: "relic",
      item: "silent_bell",
      text: "The Silent Bell is no bigger than your fist, and makes no sound at all when you lift it. Everything else does.",
    },
    X: { kind: "gate", id: "escape_door", open: "relic", latch: true, style: "stone" },
    "%": {
      kind: "escape",
      id: "escape",
      puzzle: "reliquary_escape",
      armed: "relic",
      goal: "&",
      path: [
        [37.5, 24],
        [16, 24],
        [16, 36],
        [41.5, 36],
      ],
      speed: 230,
      delay: 1.2,
    },
    O: { kind: "pit", id: "escape_gap" },

    W: { kind: "secret", id: "narthex_seam", reveal: "lantern", area: "c" },
    "7": { kind: "loot", id: "page_narthex", item: "keeper_page", when: "narthex_seam" },
    $: { kind: "chest", id: "reliquary_chest", gold: 80, items: [{ id: "mana_draught" }, { id: "lesser_tonic" }] },
  },
  spots: {
    reliquary_heart_spot: [50, 23],
  },
};
