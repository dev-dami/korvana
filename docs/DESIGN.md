# Korvana — Design Bible

> A wizarding-school mystery that turns into a tomb-raiding expedition.
> Think *first year at a castle school of magic* crossed with *torch-lit vaults,
> pressure plates and a boulder at your back* — all original, nothing borrowed.

This document is the contract every workstream builds against. Ids listed here
are **binding**: code and data in different files reference them by string, so
renaming one breaks another team's work. Add new ids freely; do not rename the
ones below.

---

## 1. Tone and pillars

1. **Deep role-play.** Characters have histories, opinions and secrets. Dialogue
   offers real choices (kind / sharp / curious / brave), choices move
   *affinity* and set *flags*, and flags change later scenes and the ending.
   Prose is literate, dry, warm and a little funny — never modern slang.
2. **School of magic.** Professors, Houses, a sorting ceremony, lessons that
   teach spells, a library with a restricted section, owls, potions, a ghost.
3. **Tomb raiding.** Ancient vaults beneath and beyond the grounds: traps,
   environmental puzzles, secrets, relics, a rival treasure-hunter, and at
   least one set-piece escape.
4. **Looks and sounds expensive.** Lit, atmospheric, animated, scored.
5. **Original and clean.** No copyrighted names, art, music or fonts. Never use
   names from existing franchises (no "Hogwarts", "Gryffindor", "Lara", etc.).
   All art is generated in code; all music is synthesised in code.

---

## 2. Setting

**Korvana Academy of the Old Workings** stands at the edge of *the Endless
Grounds* — a land that goes on further than anyone has mapped, because it
quietly closes back on itself. The closing is held by **the Lock**, worked
six hundred years ago by **the Nine Keepers** around **the Moonwell**, far to
the north. The Lock is failing: *Moonwell splinters* are surfacing in the grass.

### The four Houses (sorted by the Choosing Lamp)

| id (flag `house_<id>`) | House        | Virtue                | Colours            | Sigil  |
|------------------------|--------------|-----------------------|--------------------|--------|
| `emberhart`            | Emberhart    | courage, candour      | ember red & brass  | a stag with a burning crown |
| `thornwick`            | Thornwick    | loyalty, growing things | moss green & bone | a briar wreath |
| `ravelle`              | Ravelle      | curiosity, cunning    | midnight blue & silver | a raven with a key |
| `stillwater`           | Stillwater   | patience, wisdom      | slate teal & pearl | a heron |

`GameState.house` returns the player's house (or null before the Choosing).

### The three Keepers' Relics

| item id          | Relic             | Hidden in              | Power in play |
|------------------|-------------------|------------------------|---------------|
| `wardens_lantern`| The Warden's Lantern | the Undercroft (beneath the Academy) | reveals hidden walls/glyphs |
| `ninefold_key`   | The Ninefold Key  | the Thornroot Barrow (deep forest) | opens Keeper seals |
| `silent_bell`    | The Silent Bell   | the Skyfall Reliquary (highlands) | stuns wraiths; needed against Vale |

---

## 3. Cast (look keys are binding)

| npc id              | Name                     | Role | look key |
|---------------------|--------------------------|------|----------|
| (player)            | Wren                     | late-arriving first-year | `hero`, and `hero_<house>` once sorted |
| `headmistress_vey`  | Headmistress Orlaith Vey | head of the Academy; kind, steel underneath, knows more than she says | `headmistress` |
| `choosing_lamp`     | The Choosing Lamp        | ancient talking lantern on the Great Hall dais; sorts students | `lamp` |
| `professor_alden`   | Professor Alden          | Divination; dry wit; mentor | `professor` |
| `professor_wick`    | Mistress Wick            | Herbology & Wards; brisk, motherly | `herbologist` |
| `librarian_fennick` | Master Fennick           | Librarian; guards the Restricted Section | `librarian` |
| `student_amelia`    | Amelia                   | third-year friend, brave, lost her owl | `student` |
| `student_corvin`    | Corvin                   | third-year, obsessive scholar of the splinters | `scholar` |
| `owl_pip`           | Pip                      | Amelia's owl | `owl` |
| `ghost_hollis`      | Brother Hollis           | drowned scholar-ghost in the Undercroft; hints and lore | `ghost` |
| `seren_ashdown`     | Seren Ashdown            | expelled alumna turned relic-hunter; rival → possible ally | `raider` |
| `keeper_ilse`       | Keeper Ilse              | the last Keeper, alone in the Scar | `herbologist` (or `keeper` if drawn) |
| `vale`              | Vale                     | brilliant fourth-year turned antagonist | `vale` |

Enemy looks: `shade`, `husk`, `wraith`, `adept` (existing) plus `bat`,
`spider`, `guardian` (animated armour), `skeleton` (bone warden).

Unknown look keys fall back to `student` at runtime (see `Actor`), so data can
reference a look before the art for it exists.

---

## 4. Story — five acts

Quest ids are binding. Stage details belong to the story workstream.

### Act I — The Arrival
Wren arrives late with a letter. Meets the faculty and students outside the
Academy, goes into the Great Hall, and is **sorted by the Choosing Lamp**
(a multi-question conversation; answers weight a House; the player may argue
with the Lamp and pick). First lessons teach spells.

- `the_choosing` — attend the Choosing in the Great Hall (giver `headmistress_vey`).
- `first_lesson`, `wards_reading`, `missing_owl`, `moonwell_shards`, `proving_ground`.

### Act II — The Undercroft
Corvin's splinters lead to the Keepers. Fennick grants a Restricted Section pass
(flag `restricted_pass`) once you have earned it. A sealed shelf in the
Restricted Section opens into **the Undercroft**, a flooded crypt under the
Academy. Brother Hollis haunts it. Solve the floodgates, claim the
**Warden's Lantern**. Vale is glimpsed leaving with splinters.

- `restricted_section` → `the_undercroft`.
- Puzzle id `undercroft_floodgate`. Relic `wardens_lantern`.

### Act III — Relics of the Keepers
Headmistress Vey admits what the Lock is. Two relics remain. In the deep forest
Wren meets **Seren Ashdown** at the Thornroot Barrow — she wants the relics to
sell, or says she does. The player chooses to work with her (flag `seren_ally`)
or race her (flag `seren_rival`); the relationship evolves through the act.
Then the **Skyfall Reliquary** in the highlands, ending in a collapsing-vault
escape.

- `the_barrow` (puzzle `barrow_roots`, relic `ninefold_key`).
- `the_reliquary` (puzzles `reliquary_bells`, `reliquary_escape`, relic `silent_bell`).
- `seren_bargain` (side/companion arc).
- Optional: `the_nine_pages` — collect 9 `keeper_page` items hidden as secrets
  across all three tombs (3 per tomb) for Fennick; reward lore + a spell.

### Act IV — The Scar
With the relics (flag `relics_gathered`), Alden sends Wren to the **North
Waystone** and across into **the Moonwell Scar**. **Keeper Ilse**.

- `the_north_road`, `keeper_ilse` (existing, re-gated and re-written).

### Act V — The Hollow Choir
Down the Wellhead to stop **Vale**. The final confrontation depends on what
the player has done: Vale can be *defeated*, *redeemed* (high affinity +
`vale_heard` flag) or *bound with the Silent Bell*; Seren may arrive to help
(`seren_ally`) or to steal the moment (`seren_rival`). Epilogue varies.

- `the_hollow_choir` (existing, extended). Ending flags: `ending_redeemed`,
  `ending_defeated`, `ending_bound`; always `game_complete`.

---

## 5. World layout and ids

### Surface landmarks (`data/landmarks.ts`)
Existing: `arrival_grounds` (the Academy — id kept, it is `START_LANDMARK`),
`treeline`, `scarred_ground`, `waystone_north`, `the_scar`, `keeper_camp`,
`wellhead`.

New:
- `barrow_entrance` — deep forest, west/north-west of the Academy.
- `reliquary_entrance` — highlands, north-east, before the waystone.

### Underground levels
Interiors are **landmark structures built far south of the surface**
(tile y ≥ 3000) inside a forced `crypt` biome. `crypt` ground is `void`, which
is solid; only authored floor tiles are walkable. Portals link a surface door
to an interior and back.

| landmark id          | What |
|----------------------|------|
| `academy_interior`   | Great Hall, corridors, Library and Restricted Section. Safe (no spawns). |
| `undercroft`         | Tomb 1. Its relic chamber is the zone `undercroft_heart`. |
| `thornroot_barrow`   | Tomb 2. Relic chamber zone `barrow_heart`. |
| `skyfall_reliquary`  | Tomb 3. Relic chamber zone `reliquary_heart`. |

Zones (`*_heart` and similar) are landmarks with no structure, used only for
`landmark_reached` triggers.

### Named spots (`data/spots.ts`) — binding ids
`academy_gate`, `hall_dais`, `hall_lamp`, `hall_east`, `hall_west`,
`library_desk`, `library_stacks`, `restricted_shelf`, `undercroft_ghost`,
`barrow_mouth`, `barrow_heart_spot`, `reliquary_steps`, `reliquary_heart_spot`.

NPCs use `home: { kind: "spot", id }`.

---

## 6. Shared contracts in code

- **Events** (`systems/GameEvents.ts`): adds `puzzle_solved`, `secret_found`,
  `trap_triggered` to the existing kinds.
- **Lights** (`gfx/lights.ts`): `LIGHT_EMITTERS` maps a texture key to the
  light it gives off; `WorldScene.lightRegistry` holds runtime lights.
- **Audio** (`audio/zones.ts`): `MusicZone`, `SfxName`, `zoneForBiome`.
  `AudioSystem.shared()` is the one audio engine; it has `setZone(zone)` and
  `playSfx(name)`. WorldScene reports the zone on every geography check.
- **House**: `GameState.house`, flags `house_<id>`, `HOUSE_IDS`.
- **Flags used across workstreams**: `sorted`, `house_<id>`, `restricted_pass`,
  `undercroft_open`, `barrow_unsealed`, `reliquary_unsealed`, `seren_ally`,
  `seren_rival`, `relics_gathered`, `vale_heard`, `act1_complete`,
  `act2_started`, `ilse_done`, `game_complete`, `ending_*`.
  Mechanism gates may require a flag or an item; the story sets the flags.

---

## 7. Engineering rules

- `bun run build` (tsc + vite) must pass with zero errors. TypeScript is strict
  about unused locals and parameters.
- Match the existing code style: data-driven, explanatory comments on *why*,
  small focused classes. `WorldScene` is the hub — keep logic in your own
  modules and hook them in with a few lines.
- No network assets. No copyrighted material. Generated art and synthesised
  audio only.
- Performance budget: 60 fps on a mid-range laptop. Bake to textures, pool
  objects, avoid per-frame allocation in hot loops.
