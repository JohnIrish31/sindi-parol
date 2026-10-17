# SINDI: Gabi ng mga Parol — Asset Pack

Everything for the game's look, sound and rules, generated in code. No image files, no audio files, no fonts, no CDN.
54 SVGs (about 88 KB raw), 1 sound module, 2 CSS files, 2 tiny helpers, and a tested reference rules engine.

Open `preview.html` in any browser: it has a **playable demo** (2-4 players, or vs a bot), plus every asset, animation and sound.

## Folder layout (keep it as is)

```
assets.ts              typed helpers for Vite (cellTile, parol, bigParol, token, glow, ICON, SCENE, FX)
fx.js                  launchConfetti(), replay(el, cls)
audio/sounds.js        play('place'), setMuted(), unlockAudio(), startAmbient()/stopAmbient()
styles/theme.css       night theme, buttons, board grid, player cards, banner
styles/animations.css  .anim-* classes (drop-in, bloom, relight, ash-puff...) + confetti
reference/rules.js     the rules engine (pure JS). Port it to TypeScript; use it as the test oracle
svg/
  parols/   parol-{pula,asul,berde,kahel}, parol-big-{...} (Malaking Parol), parol-unlit
  cells/    dark, pista, target, ash, ash-pista, lit-{color}, lit-pista-{color}   (100x100 tiles)
  board/    frame            (720x720 wooden frame with lights; the hole is 5.28% inset)
  fx/       glow-{color}, preview-plus, preview-3x3, sparkle
  players/  token-{pula,asul,berde,kahel}
  icons/    sound-on/off, rules, trophy, crown, robot, players, restart, home, ash, pista, malaking-parol, turn, check
  decor/    bg-night, bg-stars (tile), banderitas, banderitas-tile
  scenes/   logo, hero-baryo
  manifest.json
```

Put the whole folder at `src/assets/` in a Vite project.

## Board markup (what theme.css expects)

```html
<div class="board-wrap">
  <img class="frame" src="board/frame.svg" alt="">
  <div class="board">                      <!-- 7x7 grid, 49 children -->
    <button class="cell empty">
      <img class="tile"    src="cells/dark.svg">
      <img class="glow"    src="fx/glow-pula.svg">      <!-- optional, anim-bloom, 300% size -->
      <img class="parol"   src="parols/parol-pula.svg"> <!-- when occupied, anim-drop-in -->
      <img class="preview" src="fx/preview-plus.svg">   <!-- shown on hover / when selected -->
    </button>
  </div>
</div>
```

## The rules in one screen

- 7x7 board, 2-4 players (8 / 6 / 4 parols each). Turn order **snakes** (A B | B A | A B ...) to cancel the last-mover advantage.
- Place a parol on an empty cell: it lights its cell + the 4 neighbours (plus shape). Your own cell always stays yours.
- A cell lit by several colors goes to the color with the most glows. A tie turns it to **ash** (nobody scores).
- One **Malaking Parol** per player per game: lights the full 3x3 (still uses one of your parols).
- 4 golden **Pista** cells are worth 3 points, all others 1. Most points wins; tie goes to more Pista cells; still tied = shared win.

`reference/rules.js` exports `newGame, legalMoves, place, board, scores, result, cover, buildOrder, isPista, isOccupied`.

## Balance notes (from 2,000+ simulated games)

- Skill matters: a 1-ply greedy bot beats a random bot more than 99% of the time.
- 2 players with snake order: 44% / 50% (with ~7% shared wins), so it is balanced.
- 3-4 players: some seat bias remains (middle seat in 3p, the last seat in 4p). Treat these as casual modes and randomize who sits first.
- Bot levels (2 players, alternating seats): greedy beats a 20%-greedy "Madali" bot about 92/100; a Monte Carlo "Mahirap" bot (top 10 moves x 24 random playouts) beats greedy about 34/40, at about 70 ms per whole game in Node.

## Sound names

`click, tick, turn, invalid, place, bloom, steal, ash, pista, bigParol, win, tie, lose` + `startAmbient()` (quiet wind chimes).
Browsers block audio until a user gesture: call `unlockAudio()` in the first tap.

## Animation classes

`anim-drop-in, anim-bloom, anim-relight, anim-ash-puff, anim-pulse-glow, anim-twinkle, anim-sway, anim-float, anim-swing, anim-pop, anim-bump, anim-fade-in, anim-slide-up, anim-shake-x`. Replay with `replay(el, 'anim-bump')`. All motion is disabled under `prefers-reduced-motion`.

## Notes

- Every SVG has unique gradient ids (prefixed by file name), so several can be inlined on one page.
- Colors: pula `#E5384F`, asul `#2F7BEA`, berde `#2FB457`, kahel `#FF8A1F`, gold `#FFD23F`, night `#14123D`.
