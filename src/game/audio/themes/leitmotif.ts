/**
 * The Korvana leitmotif - an original tune, written for this game.
 *
 * Shape: a rising fifth that steps up once more onto the Dorian sixth (the
 * one bright note in a minor key, which is where the "magic" lives), then a
 * slow fall back home. The first half ends unresolved on that sixth; the
 * answer climbs higher and comes to rest on the tonic.
 *
 * Written in scale steps (0 = tonic), four beats to the bar, so the title can
 * state it in Dorian and the ending can re-hear it in the major.
 */

/** Bars 1-4, the question. Alternatives keep repeats from sounding identical. */
export const MOTIF_QUESTION = [
  "0/1.5 4/0.5 5/2 | 4/1 3/0.5 2/0.5 3/2 | 2/1 4/1 7/1.5 6/0.5 | 5/4",
  "0/1 0/0.5 4/0.5 5/2 | 4/1.5 3/0.5 2/1 3/1 | 2/0.5 3/0.5 4/1 7/1.5 6/0.5 | 5/3 4/0.5 3/0.5",
] as const;

/** Bars 5-8, the answer. */
export const MOTIF_ANSWER = [
  "0/1.5 4/0.5 5/1 7/1 | 8/2 7/0.5 6/0.5 4/1 | 5/1 4/1 2/1 3/1 | 0/4",
  "0/1.5 4/0.5 5/1 7/1 | 8/1.5 9/0.5 8/0.5 7/0.5 6/1 | 5/1 4/0.5 3/0.5 2/1 1/1 | 0/4",
] as const;

/** The harmony under the eight bars above. */
export const MOTIF_CHORDS = ["0", "2", "07", "3", "0", "4", "37", "0"] as const;
