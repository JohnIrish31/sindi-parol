import { legalMoves, place, scores, type Game, type Move } from './rules';
import { mulberry32, nextSeed, pick, shuffle, type Rng } from './rng';

export type Level = 'madali' | 'katamtaman' | 'mahirap';
export const LEVELS: readonly Level[] = ['madali', 'katamtaman', 'mahirap'];

export const MADALI_GREEDY_CHANCE = 0.2;
export const BIG_EARLY_PENALTY = 0.6;
export const MC_CANDIDATES = 10;
export const MC_PLAYOUTS = 24;
const EPS = 1e-9;

export function margin(g: Game, me: number): number {
  const { pts } = scores(g);
  let best = -Infinity;
  for (let p = 0; p < pts.length; p++) {
    if (p !== me && pts[p] > best) best = pts[p];
  }
  return pts[me] - best;
}

export function greedyValue(g: Game, m: Move): number {
  const me = g.turn;
  const value = margin(place(g, m.r, m.c, m.big), me);
  if (m.big && g.left[me] > 3) return value - BIG_EARLY_PENALTY;
  return value;
}

export function rankMoves(g: Game, rng: Rng): Array<{ move: Move; value: number }> {
  const ranked = shuffle(rng, legalMoves(g)).map((move) => ({ move, value: greedyValue(g, move) }));
  ranked.sort((a, b) => b.value - a.value);
  return ranked;
}

export const randomMove = (g: Game, rng: Rng): Move => pick(rng, legalMoves(g));
export const greedyMove = (g: Game, rng: Rng): Move => rankMoves(g, rng)[0].move;

export function madaliMove(g: Game, rng: Rng): Move {
  return rng() < MADALI_GREEDY_CHANCE ? greedyMove(g, rng) : randomMove(g, rng);
}

export function playout(g: Game, rng: Rng): Game {
  while (!g.done) {
    const m = randomMove(g, rng);
    g = place(g, m.r, m.c, m.big);
  }
  return g;
}

export function* mahirapSteps(g: Game, rng: Rng): Generator<void, Move, void> {
  const me = g.turn;
  const candidates = rankMoves(g, rng).slice(0, MC_CANDIDATES).map((x) => x.move);
  const seed = nextSeed(rng);

  let best = candidates[0];
  let bestAvg = -Infinity;
  for (const m of candidates) {
    const after = place(g, m.r, m.c, m.big);
    const stream = mulberry32(seed);
    let sum = 0;
    for (let i = 0; i < MC_PLAYOUTS; i++) sum += margin(playout(after, stream), me);

    const avg = sum / MC_PLAYOUTS;
    if (avg > bestAvg + EPS) {
      bestAvg = avg;
      best = m;
    }
    yield;
  }
  return best;
}

export function runSteps<T>(it: Generator<void, T, void>): T {
  let r = it.next();
  while (!r.done) r = it.next();
  return r.value;
}

export function* botSteps(level: Level, g: Game, rng: Rng): Generator<void, Move, void> {
  if (level === 'mahirap') return yield* mahirapSteps(g, rng);
  if (level === 'katamtaman') return greedyMove(g, rng);
  return madaliMove(g, rng);
}

export const chooseMove = (level: Level, g: Game, rng: Rng): Move => runSteps(botSteps(level, g, rng));
