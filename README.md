# Sindi: Night of the Parols / Gabi ng mga Parol

A Filipino lantern strategy board game for 2-4 players: pass-and-play on one device, or against bots.
Plays in **English** (default) or **Tagalog**. Switch any time from the home screen, setup or the game header.
Small static web app: React + Vite, no backend, no network calls.

## Run

```sh
npm install
npm run dev      # http://localhost:5173
npm run test     # rules, parity with the reference engine, bots, reducer
npm run build    # type-check, build to dist/, print gzip sizes + budget check
```

## How to play

1. On your turn, tap an empty square (it shows what your parol will light), then press **Light it! / Sindihan!**, or tap the same square again.
2. A parol lights its own square plus the 4 next to it. Its own square is always yours.
3. Any other square goes to the color shining on it the most; a tie turns it to **ash** (nobody scores).
4. The 4 golden **Pista** squares are worth 3 points. Once per game, the **Malaking Parol** lights a full 3x3.
5. When every parol is placed, most points wins (tie: more Pista; still tied: shared win).

## Deploy

`npm run build`, then upload the `dist/` folder to any static host (Netlify, Vercel, GitHub Pages, Cloudflare Pages, S3...).
Asset URLs are relative to the site root; for a sub-path (e.g. GitHub Pages project sites) add `base: '/<repo>/'` to `vite.config.ts`.

## Layout

- `src/game/`: pure TypeScript: `rules.ts` (port of `src/assets/reference/rules.js`), `bots.ts`, `rng.ts` (mulberry32), `state.ts` (the reducer). No React.
- `src/i18n.ts`: every UI string in English and Tagalog.
- `src/ui/`: screens (Home, Rules, Setup, GameScreen + Board, Result).
- `src/assets/`: the provided art, sounds, CSS and reference engine (unchanged).
- `reference-preview.html`: the asset pack's visual demo (not shipped).
