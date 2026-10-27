# Korvana: The Endless Grounds

A story-driven top-down RPG: a first year at a castle school of magic that turns
into an expedition through trapped, torch-lit tombs. Built with Phaser 4 and
TypeScript. Every sprite, tile and note of music is generated in code, and no
copyrighted assets ship with it (see [CREDITS.md](CREDITS.md)).

## Running it

```sh
bun install
bun run dev        # http://localhost:5173
bun run build      # type-check and production build into dist/
bun scripts/check-story.ts   # static story checks + headless playthrough of every ending
bun scripts/check-duel.ts    # duel rule scenarios + AI bouts for every encounter
```

## The game

- **Five acts.** Arrive late at Korvana Academy. Be sorted into one of four Houses
  by the Choosing Lamp. Earn your way into the Restricted Section. Then go down
  into three ancient tombs after the Keepers' Relics, cross the Moonwell Scar,
  and face Vale at the Wellhead. The ending is decided by what you said and did
  along the way.
- **Role-play.** Nineteen characters with branching dialogue, affinity and
  memory; House-specific reactions; a rival relic-hunter you can work with or
  race; 53 journal entries.
- **Tombs.** Pressure plates, pushable blocks, levers and timed gates, spike and
  dart traps, crumbling floors, braziers lit with fire spells, secrets revealed
  by the Warden's Lantern, and a collapsing-vault boulder escape.
- **Presentation.** Dynamic day/night lighting, bloom and colour grading, weather
  and particles, shaded characters with portraits, an adaptive orchestral-style
  score synthesised live with Web Audio.

## Controls

| Key | Action | Key | Action |
|-----|--------|-----|--------|
| WASD / arrows | move | SHIFT | sprint |
| C | dash (crosses gaps) | E | talk / interact |
| Z / X | light / heavy attack | SPACE | cast selected spell |
| 1-6 | choose spell / dialogue choice | M | spellbook |
| I | satchel | J | journal |
| T | cycle weapon | Q | drink a tonic |
| F8 / F9 | save / load | N | sound on/off |
| P / ESC | pause | ` | debug overlay |

## Duels

Duels are fought face to face in real time, in a pseudo-3D arena. The camera
swings with the line between you and your opponent, so circling them turns the
world around you.

- **Story duels** (Seren, Vale, the sparring ring) start where the story calls for them.
- **Civilians react to how you hit them.** Strike someone with a weapon and they
  run off. Hex them with magic and they call you out: wands out, a friendly duel
  to the yield. Win or lose, they remember it.

| Key | In a duel |
|-----|-----------|
| A / D | advance / retreat |
| W / S | circle round your opponent |
| Z | slash (press again for a three-cut combo) |
| X | heavy blow (breaks a tired guard) |
| SHIFT (or F) | guard; raise it just as a blow or bolt lands to **parry** or **deflect** it |
| C | dodge (brief invulnerability) |
| SPACE | cast the attuned spell; mash it to win a **spell-lock** when two bolts meet |
| 1-6 | choose a spell |
| Q | drink a tonic |
| ESC ×2 | yield (not every opponent allows it) |

## Code map

See [docs/DESIGN.md](docs/DESIGN.md) for the design bible and the ids that
connect the systems. In short:

- `src/game/data/` holds the story, dialogue, quests, levels and items, as data.
- `src/game/systems/` holds the story director, dialogue, quests, mechanisms, combat and audio.
- `src/game/gfx/` holds the procedural art, lighting, particles and post-processing.
- `src/game/audio/` holds the music engine, instruments, themes and sound effects.
- `src/game/world/` holds the endless chunked world and landmark stamping.
- `src/game/duel/` holds the real-time duel: rules (DuelSim), opponent AI, camera, arenas and fighters.
- `src/game/scenes/` holds the title, world, UI and duel scenes.
