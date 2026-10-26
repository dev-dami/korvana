import { LEVEL_DEFS } from "./levels";

/**
 * Named places to stand, for anyone who needs to be somewhere precise inside
 * an authored structure: the Headmistress on the dais, the librarian behind
 * her desk, a rival waiting at a tomb mouth.
 *
 * Each spot is a tile offset from a landmark's origin, so it moves with the
 * landmark. NPCs reference spots with `home: { kind: "spot", id }`.
 *
 * Spots inside authored levels are declared next to the map they belong to
 * (data/levels/*.ts), so moving a room moves its spots with it. The binding ids
 * from docs/DESIGN.md section 5 all live there:
 *
 *   academy_gate                       arrival_grounds (the courtyard)
 *   hall_dais, hall_lamp,
 *   hall_east, hall_west,
 *   library_desk, library_stacks,
 *   restricted_shelf                   academy_interior
 *   undercroft_ghost                   undercroft (the landing)
 *   barrow_mouth                       barrow_entrance (outside, on the path)
 *   barrow_heart_spot                  thornroot_barrow (relic chamber)
 *   reliquary_steps                    reliquary_entrance (outside, on the steps)
 *   reliquary_heart_spot               skyfall_reliquary (relic chamber)
 */
export interface SpotDef {
  landmark: string;
  dx: number;
  dy: number;
}

export const SPOTS: Record<string, SpotDef> = {};

for (const level of LEVEL_DEFS) {
  for (const [id, [dx, dy]] of Object.entries(level.spots ?? {})) {
    SPOTS[id] = { landmark: level.landmark, dx, dy };
  }
}

export function spotById(id: string): SpotDef | undefined {
  return SPOTS[id];
}
