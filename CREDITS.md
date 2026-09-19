# Credits and licensing

## Art shipped in the game

All tiles, characters, props and effects rendered by the game are **generated in
code** at boot — see `src/game/gfx/`. There are no image assets to load, and that
code is original to this project.

## Third-party assets in `public/assets/`

### Ringbearer font — `public/assets/fonts/ringbearer/`

```
The Ringbearer font is (c) Pete Klassen, 2002. All Rights Reserved.
You are allowed to distribute this font free of charge only, and only with the
complete contents of the original archive file included.
You are allowed to use this font for private use only. Commercial use and/or
modification of this font are not allowed.
Ringbearer is based on the "Lord of the Rings" Logo.
(c) 2001-2003 New Line Cinema and Wingnut Films. All Rights Reserved.
```

**This is not an open licence.** Two things follow, and both are already handled:

- The complete original archive is kept together in that directory (the `readme.html`,
  the sample GIFs and `file_id.diz`), because redistribution is only permitted with
  the full archive.
- It is used strictly as a **display face** for the title and character names, never
  for body copy. Nothing in the code depends on it: change `FONT_DISPLAY` in
  `src/game/gfx/fonts.ts` and remove the `@font-face` block in `src/style.css`, and
  the game falls back to a legible serif.

If Korvana is ever distributed commercially or open-sourced, **remove this font
first**.

### Kenney tilesets — `public/assets/kenney/`

- *Roguelike/RPG pack* and *Tiny Dungeon*, by Kenney Vleugels ([kenney.nl](https://kenney.nl)).
- Licence: **Creative Commons Zero (CC0)** — public domain, no attribution required.
  The original `License.txt` is kept in each directory.

These are shipped as a swappable library: the terrain/prop tilesets are there if you
want to replace the generated art with hand-drawn tiles, but nothing currently reads
them at runtime.
