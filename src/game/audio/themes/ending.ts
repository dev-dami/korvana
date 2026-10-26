import { MODES } from "../theory";
import { MOTIF_ANSWER, MOTIF_CHORDS, MOTIF_QUESTION } from "./leitmotif";
import type { ThemeDef } from "./types";

/**
 * Ending - the Korvana leitmotif, slower and further away. The celesta
 * remembers it alone in Dorian; then the strings and choir take it into the
 * major, which brightens every chord a little - bittersweet rather than
 * triumphant. A short farewell lets it fade back to the minor.
 */
export const ENDING: ThemeDef = {
  bpm: 58,
  meter: 4,
  root: 62,
  scale: MODES.dorian,
  reverb: 0.55,
  start: "memory",
  layers: {
    celesta: { inst: "celesta", gain: 0.95, pan: 0.3 },
    harp: { inst: "harp", gain: 0.7, pan: -0.38 },
    strings: { inst: "strings", gain: 0.8, pan: -0.12 },
    violins: { inst: "strings", gain: 1.2, pan: -0.25 },
    choir: { inst: "choir", gain: 0.8, pan: 0.12, reverb: 0.65 },
    horn: { inst: "horn", gain: 0.8, pan: 0.22 },
    bass: { inst: "bass", gain: 0.55 },
  },
  sections: {
    memory: {
      chords: MOTIF_CHORDS,
      next: ["reprise"],
      parts: [
        { kind: "line", layer: "celesta", octave: 1, vel: 0.75, phrases: [[MOTIF_QUESTION[0]], [MOTIF_ANSWER[0]]] },
        { kind: "pad", layer: "strings", vel: 0.35 },
        { kind: "arp", layer: "harp", octave: -1, pattern: [0, 2, 4, 2], step: 1, gate: 3, vel: 0.45 },
        { kind: "bass", layer: "bass", octave: -2, pattern: "0/4", vel: 0.4 },
      ],
    },
    reprise: {
      chords: MOTIF_CHORDS,
      next: ["farewell"],
      scale: MODES.ionian,
      parts: [
        { kind: "line", layer: "violins", octave: 1, vel: 0.65, harmony: -2, phrases: [[MOTIF_QUESTION[1]], [MOTIF_ANSWER[0]]] },
        { kind: "pad", layer: "choir", vel: 0.5 },
        { kind: "pad", layer: "strings", octave: -1, vel: 0.4, root: true },
        { kind: "arp", layer: "harp", octave: -1, pattern: [0, 1, 2, 3, 4, 3, 2, 1], step: 0.5, gate: 2, vel: 0.45 },
        { kind: "scatter", layer: "celesta", octave: 2, pool: "chord", count: [0, 1], dur: 2, vel: 0.35 },
        { kind: "bass", layer: "bass", octave: -2, pattern: "0/2 2/2", vel: 0.45 },
        { kind: "line", layer: "horn", octave: 0, vel: 0.55, phrases: [["r/4 | r/4 | r/4 | 4/2 5/2"], ["7/4 | 4/4 | 3/4 | 2/4"]] },
      ],
    },
    farewell: {
      chords: ["0", "6", "3", "0"],
      next: ["memory"],
      parts: [
        { kind: "line", layer: "celesta", octave: 1, vel: 0.65, phrases: [["0/1.5 4/0.5 5/2 | 4/4 | 2/2 3/2 | 0/4"]] },
        { kind: "pad", layer: "strings", vel: 0.3 },
        { kind: "pad", layer: "choir", octave: -1, vel: 0.3 },
        { kind: "bass", layer: "bass", octave: -2, pattern: "0/4", vel: 0.35 },
      ],
    },
  },
};
