import { describe, expect, it } from 'vitest';
import { botSteps, chooseMove, greedyValue, madaliMove, rankMoves, type Level } from './bots';
import { legalMoves, newGame, place, result, type Game } from './rules';
import { mulberry32 } from './rng';

function duel(a: Level, b: Level, games: number, seed: number): number {
  let wins = 0;
  for (let k = 0; k < games; k++) {
    const rng = mulberry32(seed + k);
    const levels: Level[] = k % 2 === 0 ? [a, b] : [b, a];
    const aSeat = k % 2 === 0 ? 0 : 1;
    let g: Game = newGame(2);
    while (!g.done) {
      const m = chooseMove(levels[g.turn], g, rng);
      g = place(g, m.r, m.c, m.big);
    }
    const r = result(g);
    if (!r.shared && r.winners[0] === aSeat) wins++;
  }
  return wins;
}

describe('bots', () => {
  it('always return a legal move', () => {
    const rng = mulberry32(3);
    for (const level of ['madali', 'katamtaman', 'mahirap'] as const) {
      let g = newGame(3);
      while (!g.done) {
        const m = chooseMove(level, g, rng);
        expect(legalMoves(g)).toContainEqual(m);
        g = place(g, m.r, m.c, m.big);
      }
    }
  });

  it('are deterministic with a seeded RNG', () => {
    const g = place(place(newGame(2), 3, 3), 1, 1);
    for (const level of ['madali', 'katamtaman', 'mahirap'] as const) {
      expect(chooseMove(level, g, mulberry32(42))).toEqual(chooseMove(level, g, mulberry32(42)));
    }
  });

  it('greedy penalizes an early Malaking Parol but not a late one', () => {
    const g = newGame(2);
    const plain = greedyValue(g, { r: 3, c: 3, big: false });
    const big = greedyValue(g, { r: 3, c: 3, big: true });
    expect(plain).toBe(5);
    expect(big).toBeCloseTo(9 - 0.6);
    const late = { ...g, left: [2, 2] };
    expect(greedyValue(late, { r: 3, c: 3, big: true })).toBe(9);
  });

  it('Katamtaman plays the best greedy move', () => {
    const rng = mulberry32(9);
    const g = newGame(2);
    const best = rankMoves(g, rng)[0];
    for (const x of rankMoves(g, mulberry32(10))) expect(x.value).toBeLessThanOrEqual(best.value);
  });

  it('Madali is mostly random but sometimes greedy', () => {
    const rng = mulberry32(5);
    const g = newGame(2);
    const values = Array.from({ length: 200 }, () => greedyValue(g, madaliMove(g, rng)));
    const top = Math.max(...values);
    const greedyShare = values.filter((v) => v === top).length / values.length;
    expect(greedyShare).toBeGreaterThan(0.1);
    expect(greedyShare).toBeLessThan(0.45);
  });

  it('Mahirap yields once per candidate (time slices)', () => {
    const it = botSteps('mahirap', newGame(2), mulberry32(1));
    let steps = 0;
    let r = it.next();
    while (!r.done) { steps++; r = it.next(); }
    expect(steps).toBe(10);
    expect(r.value).toBeDefined();
  });

  it('Katamtaman beats Madali in at least 85 of 100 games', () => {
    const wins = duel('katamtaman', 'madali', 100, 100);
    console.log(`Katamtaman vs Madali: ${wins}/100`);
    expect(wins).toBeGreaterThanOrEqual(85);
  });

  it('Mahirap beats Katamtaman in at least 24 of 40 games', () => {
    const wins = duel('mahirap', 'katamtaman', 40, 500);
    console.log(`Mahirap vs Katamtaman: ${wins}/40`);
    expect(wins).toBeGreaterThanOrEqual(24);
  }, 60_000);
});
