import { describe, expect, it } from 'vitest';
import {
  board, buildOrder, cover, idx, legalMoves, newGame, PAROLS_PER_PLAYER, pistaDecided, place, result, scores,
  type Game, type Placed,
} from './rules';
import { mulberry32, pick } from './rng';

const sorted = (cells: Array<[number, number]>) => cells.map(([r, c]) => idx(r, c)).sort((a, b) => a - b);
const at = (g: Game, r: number, c: number) => board(g)[idx(r, c)];
const withPlaced = (players: number, placed: Placed[]): Game => ({ ...newGame(players), placed });

describe('cover shapes', () => {
  it('plus shape in the middle', () => {
    expect(sorted(cover(3, 3))).toEqual(sorted([[3, 3], [2, 3], [4, 3], [3, 2], [3, 4]]));
  });
  it('3x3 for the Malaking Parol', () => {
    expect(cover(3, 3, true)).toHaveLength(9);
  });
  it('clips at edges and corners', () => {
    expect(sorted(cover(0, 0))).toEqual(sorted([[0, 0], [1, 0], [0, 1]]));
    expect(cover(0, 3)).toHaveLength(4);
    expect(cover(6, 6, true)).toHaveLength(4);
    expect(cover(0, 3, true)).toHaveLength(6);
  });
});

describe('turn order and setup', () => {
  it('snakes in 2 players', () => {
    expect(buildOrder(2, 8)).toEqual([0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0, 0, 1, 1, 0]);
    expect(newGame(2).order.slice(0, 8)).toEqual([0, 1, 1, 0, 0, 1, 1, 0]);
  });
  it('snakes in 3 and 4 players', () => {
    expect(buildOrder(3, 2)).toEqual([0, 1, 2, 2, 1, 0]);
    expect(buildOrder(4, 2)).toEqual([0, 1, 2, 3, 3, 2, 1, 0]);
  });
  it('parol counts per player count', () => {
    expect(PAROLS_PER_PLAYER).toEqual({ 2: 8, 3: 6, 4: 4 });
    for (const n of [2, 3, 4] as const) {
      const g = newGame(n);
      expect(g.left).toEqual(Array(n).fill(PAROLS_PER_PLAYER[n]));
      expect(g.order).toHaveLength(n * PAROLS_PER_PLAYER[n]);
      expect(g.bigLeft).toEqual(Array(n).fill(true));
    }
  });
  it('rejects 1 or 5 players', () => {
    expect(() => newGame(1)).toThrow();
    expect(() => newGame(5)).toThrow();
  });
});

describe('lighting', () => {
  it('a parol lights its plus and anchors its own cell', () => {
    const g = place(newGame(2), 3, 3);
    const b = board(g);
    expect(b.filter((c) => c.kind === 'lit')).toHaveLength(5);
    expect(at(g, 3, 3)).toMatchObject({ kind: 'lit', owner: 0, anchor: true });
    expect(at(g, 2, 3)).toMatchObject({ kind: 'lit', owner: 0, anchor: false });
    expect(at(g, 2, 2).kind).toBe('dark');
  });
  it('anchor cannot be stolen even when enemies outnumber it', () => {
    const g = withPlaced(2, [
      { p: 0, r: 3, c: 3, big: false },
      { p: 1, r: 2, c: 3, big: false }, { p: 1, r: 4, c: 3, big: false }, { p: 1, r: 3, c: 2, big: false },
    ]);
    expect(at(g, 3, 3)).toMatchObject({ kind: 'lit', owner: 0, anchor: true });
  });
  it('a tie for the most glows becomes ash, a majority wins', () => {
    const tie = withPlaced(2, [{ p: 0, r: 0, c: 0, big: false }, { p: 1, r: 0, c: 2, big: false }]);
    expect(at(tie, 0, 1)).toMatchObject({ kind: 'ash', owner: null });
    const broken = withPlaced(2, [...tie.placed, { p: 0, r: 1, c: 1, big: false }]);
    expect(at(broken, 0, 1)).toMatchObject({ kind: 'lit', owner: 0 });
    expect(at(broken, 1, 2)).toMatchObject({ kind: 'ash' });
  });
  it('3 players: only the top count matters', () => {
    const g = withPlaced(3, [
      { p: 0, r: 2, c: 1, big: false }, { p: 0, r: 1, c: 2, big: false },
      { p: 1, r: 2, c: 3, big: false }, { p: 2, r: 3, c: 2, big: false },
    ]);
    expect(at(g, 2, 2)).toMatchObject({ kind: 'lit', owner: 0 });
  });
  it('the Malaking Parol counts one glow per cell of its 3x3', () => {
    const g = withPlaced(2, [{ p: 0, r: 3, c: 3, big: true }, { p: 1, r: 2, c: 1, big: false }]);
    expect(at(g, 2, 2)).toMatchObject({ kind: 'ash' });
    expect(at(g, 4, 4)).toMatchObject({ kind: 'lit', owner: 0 });
  });
});

describe('scoring', () => {
  it('Pista cells are worth 3, others 1', () => {
    const g = place(newGame(2), 1, 2);
    expect(scores(g)).toEqual({ pts: [3 + 4, 0], pistas: [1, 0], cells: [5, 0] });
  });
  it('ash scores nothing', () => {
    const g = withPlaced(2, [{ p: 0, r: 0, c: 0, big: false }, { p: 1, r: 0, c: 2, big: false }]);
    expect(scores(g).pts).toEqual([2, 3]);
  });
});

describe('moves', () => {
  it('occupied cells are rejected and not legal', () => {
    const g = place(newGame(2), 3, 3);
    expect(() => place(g, 3, 3)).toThrow();
    expect(legalMoves(g).some((m) => m.r === 3 && m.c === 3)).toBe(false);
    expect(() => place(g, 7, 0)).toThrow();
  });
  it('Malaking Parol only once per player, and it uses a parol', () => {
    let g = place(newGame(2), 0, 0, true);
    expect(g.bigLeft).toEqual([false, true]);
    expect(g.left).toEqual([7, 8]);
    g = place(g, 6, 6);
    g = place(g, 6, 0);
    expect(g.turn).toBe(0);
    expect(() => place(g, 3, 3, true)).toThrow();
    expect(legalMoves(g).some((m) => m.big)).toBe(false);
  });
  it('the game ends when every parol is placed', () => {
    const rng = mulberry32(7);
    let g = newGame(2);
    let n = 0;
    while (!g.done) { const m = pick(rng, legalMoves(g)); g = place(g, m.r, m.c, m.big); n++; }
    expect(n).toBe(16);
    expect(g.left).toEqual([0, 0]);
    expect(legalMoves(g)).toEqual([]);
    expect(() => place(g, 0, 0)).toThrow();
  });
});

describe('result and tie-breaks', () => {
  const base = newGame(2);
  it('most points wins', () => {
    const g = { ...withPlaced(2, [{ p: 0, r: 3, c: 3, big: true }, { p: 1, r: 0, c: 6, big: false }]), done: true };
    expect(result(g)).toMatchObject({ winners: [0], shared: false });
  });
  it('equal points: more Pista wins', () => {
    const g = withPlaced(2, [
      { p: 0, r: 0, c: 3, big: false },
      { p: 1, r: 6, c: 0, big: false }, { p: 1, r: 6, c: 6, big: false },
    ]);
    const r = result({ ...g, done: true });
    expect(r.pts).toEqual([6, 6]);
    expect(r.pistas).toEqual([1, 0]);
    expect(r).toMatchObject({ winners: [0], shared: false });
    expect(pistaDecided(r)).toBe(true);
  });
  it('equal points and Pista: shared win (Tabla)', () => {
    const g = withPlaced(2, [{ p: 0, r: 0, c: 0, big: false }, { p: 1, r: 6, c: 6, big: false }]);
    const r = result({ ...g, done: true });
    expect(r).toMatchObject({ winners: [0, 1], shared: true });
    expect(pistaDecided(r)).toBe(false);
    expect(base.done).toBe(false);
  });
});

describe('random complete games', () => {
  for (const n of [2, 3, 4]) {
    it(`300 games with ${n} players terminate with a valid result`, () => {
      const rng = mulberry32(1000 + n);
      for (let k = 0; k < 300; k++) {
        let g = newGame(n), moves = 0;
        while (!g.done) {
          const m = pick(rng, legalMoves(g));
          expect(g.order[g.placed.length]).toBe(g.turn);
          g = place(g, m.r, m.c, m.big);
          if (++moves > 64) throw new Error('did not terminate');
        }
        expect(moves).toBe(n * PAROLS_PER_PLAYER[n as 2 | 3 | 4]);
        const r = result(g);
        expect(r.winners.length).toBeGreaterThan(0);
        expect(r.shared).toBe(r.winners.length > 1);
        const best = Math.max(...r.pts);
        for (const w of r.winners) expect(r.pts[w]).toBe(best);
        expect(r.pts.reduce((a, b) => a + b, 0)).toBeLessThanOrEqual(49 + 4 * 2);
      }
    });
  }
});
