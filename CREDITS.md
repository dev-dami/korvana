# Credits and licensing

Korvana ships **no copyrighted third-party art, music or sound**. Everything the
player sees or hears is either generated in code by this project or released
under an open licence listed below.

## Art

All tiles, characters, props, lighting and effects are **generated in code** at
boot — see `src/game/gfx/`. There are no image assets to load, and that code is
original to this project.

## Music and sound

All music and sound effects are **synthesised live with the Web Audio API** —
see `src/game/audio/` and `src/game/systems/AudioSystem.ts`. The melodies,
harmonies and arrangements are original compositions written for Korvana; no
samples or recordings are used.

## Fonts — SIL Open Font License 1.1

Bundled from npm via [Fontsource](https://fontsource.org), so the game never
calls out to a font CDN. The full licence text ships in each package's
`LICENSE` file under `node_modules/@fontsource/`.

- **Cinzel Decorative** — © 2012 Natanael Gama. Display face for titles and names.
- **EB Garamond** — © 2017 The EB Garamond Project Authors. Body text.

## Kenney tilesets — `public/assets/kenney/`

- *Roguelike/RPG pack* and *Tiny Dungeon*, by Kenney Vleugels ([kenney.nl](https://kenney.nl)).
- Licence: **Creative Commons Zero (CC0)** — public domain, no attribution required.
  The original `License.txt` is kept in each directory.

These are shipped as a swappable library: nothing currently reads them at
runtime.
