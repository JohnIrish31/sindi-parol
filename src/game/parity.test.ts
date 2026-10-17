import { describe, expect, it } from 'vitest';
import * as ref from '../assets/reference/rules.js';
import * as ts from './rules';
import { mulberry32, randInt } from './rng';

describe('parity with the reference engine', () => {
  it('constants and helpers match', () => {
    expect(ts.SIZE).toBe(ref.SIZE);
    expect(ts.PISTA).toEqual(ref.PISTA);
    expect(ts.PAROLS_PER_PLAYER).toEqual(ref.PAROLS_PER_PLAYER);
    for (let r = 0; r < 7; r++) for (let c = 0; c < 7; c++) {
      for (const big of [false, true]) expect(ts.cover(r, c, big)).toEqual(ref.cover(r, c, big));
      expect(ts.isPista(r, c)).toBe(ref.isPista(r, c));
    }
    for (const n of [2, 3, 4]) for (const snake of [true, false]) {
      expect(ts.buildOrder(n, 8, snake)).toEqual(ref.buildOrder(n, 8, snake));
      expect(ts.newGame(n, snake)).toEqual(ref.newGame(n, snake));
    }
  });

  it('300 seeded random games: identical board, scores and result after every move', () => {
    const rng = mulberry32(20261017);
    for (let k = 0; k < 300; k++) {
      const n = 2 + (k % 3);
      let a = ts.newGame(n);
      let b = ref.newGame(n);
      while (!a.done) {
        const moves = ts.legalMoves(a);
        expect(moves).toEqual(ref.legalMoves(b));
        const m = moves[randInt(rng, moves.length)];
        a = ts.place(a, m.r, m.c, m.big);
        b = ref.place(b, m.r, m.c, m.big);
        expect(a).toEqual(b);
        expect(ts.board(a)).toEqual(ref.board(b));
        expect(ts.scores(a)).toEqual(ref.scores(b));
        expect(ts.result(a)).toEqual(ref.result(b));
      }
      expect(b.done).toBe(true);
    }
  });

  it('rejects the same illegal moves', () => {
    let a = ts.place(ts.newGame(2), 2, 2, true);
    let b = ref.place(ref.newGame(2), 2, 2, true);
    expect(() => ts.place(a, 2, 2)).toThrow();
    expect(() => ref.place(b, 2, 2)).toThrow();
    a = ts.place(ts.place(a, 0, 0), 0, 1);
    b = ref.place(ref.place(b, 0, 0), 0, 1);
    expect(() => ts.place(a, 5, 5, true)).toThrow();
    expect(() => ref.place(b, 5, 5, true)).toThrow();
  });
});
