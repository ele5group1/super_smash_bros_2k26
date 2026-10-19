# Visual direction

Style: strict 8-bit, NES-era. Every sprite, tile, box, and sound is built from scratch. No commercial character art, logos, or trade-dress copies.

## Screens and palette

- Logical resolution 256x144, integer-scaled, nearest-neighbor, letterboxed. No antialiasing. UI aligns to an 8-pixel grid.
- At most 16 colors on screen. At most 3 colors plus transparency per sprite and per background tile.
- Halloween palette: midnight #1B1530, purple #5B3B8C, pumpkin #E8862E, eerie mint #8FD9A0, cream #F2E2C4, danger red #C94A52, plus black and white.
- No gradients, shadows, glow, or blur. Dithering only as a pattern from palette colors.

## Title screen

- Bitmap-style logo "BOO BASH ARENA", dark sky, drifting original ghosts, bordered frame with pumpkin and star tiles, blinking "PRESS START".

## Battle screen

- Side-view stage.
- Opponent status plate upper-left, player plate lower-right, full-width command box along the bottom.
- Fighter sprites up to 32x32. Idle 2 frames at 4 fps, attack 3 frames, hurt 1 frame, faint 3 frames, victory 2 frames.
- Command box doubles as the action menu on touch screens. In analytics mode it shows the adviser's estimated win rate per option.

## Audio

- Two-channel chiptune: pulse, triangle, and noise, via the Web Audio API. No sample files.
- Separate music and SFX mute. Reduced-motion turns off screen shake and flashes but keeps HUD updates.

## Mobile

- Phones are playable terminals. Support portrait and landscape.
- Battle view shows a "rotate for battle" prompt in portrait. Lobby and draft work in portrait.
- Command box rows are at least 44 px tall. Draft cards scroll horizontally inside their own container.
- No page scroll, pinch zoom, or pull-to-refresh during a battle.
- Respect safe-area insets on notched phones.
- Test at 390x844 and 844x390.
- The dashboard collapses into stacked panels on a phone and stays read-only.

## Sprite budget

- Five roles × two factions = ten fighters. Each needs idle, attack, hurt, faint, and victory frames.
- Plan the art lead's time: about 2 hours per fighter in pixel art, plus tiles and UI.
