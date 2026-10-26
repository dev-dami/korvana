/**
 * Named places to stand, for anyone who needs to be somewhere precise inside
 * an authored structure: the Headmistress on the dais, the librarian behind
 * her desk, a rival waiting at a tomb mouth.
 *
 * Each spot is a tile offset from a landmark's origin, so it moves with the
 * landmark. NPCs reference spots with `home: { kind: "spot", id }`.
 */
export interface SpotDef {
  landmark: string;
  dx: number;
  dy: number;
}

export const SPOTS: Record<string, SpotDef> = {};

export function spotById(id: string): SpotDef | undefined {
  return SPOTS[id];
}
