export const SIZE = 7;
export const CELLS = SIZE * SIZE;
export const PISTA: ReadonlyArray<readonly [number, number]> = [[1, 3], [3, 1], [3, 5], [5, 3]];
export type PlayerCount = 2 | 3 | 4;
export const PAROLS_PER_PLAYER: Record<PlayerCount, number> = { 2: 8, 3: 6, 4: 4 };

export interface Move { r: number; c: number; big: boolean }
export interface Placed extends Move { p: number }

export interface Game {
  readonly players: number;
  readonly order: readonly number[];
  readonly placed: readonly Placed[];
  readonly left: readonly number[];
  readonly bigLeft: readonly boolean[];
  readonly turn: number;
  readonly done: boolean;
}

export type CellKind = 'dark' | 'lit' | 'ash';
export interface Cell { r: number; c: number; kind: CellKind; owner: number | null; pista: boolean; anchor: boolean }
export interface Scores { pts: number[]; pistas: number[]; cells: number[] }
export interface Result { winners: number[]; shared: boolean; pts: number[]; pistas: number[] }

export const idx = (r: number, c: number): number => r * SIZE + c;
const inside = (r: number, c: number): boolean => r >= 0 && c >= 0 && r < SIZE && c < SIZE;
export const isPista = (r: number, c: number): boolean => PISTA.some(([pr, pc]) => pr === r && pc === c);

const PLUS: ReadonlyArray<readonly [number, number]> = [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]];

export function cover(r: number, c: number, big = false): Array<[number, number]> {
  const out: Array<[number, number]> = [];
  if (big) {
    for (let dr = -1; dr <= 1; dr++) {
      for (let dc = -1; dc <= 1; dc++) {
        if (inside(r + dr, c + dc)) out.push([r + dr, c + dc]);
      }
    }
  } else {
    for (const [dr, dc] of PLUS) {
      if (inside(r + dr, c + dc)) out.push([r + dr, c + dc]);
    }
  }
  return out;
}

export function buildOrder(players: number, rounds: number, snake = true): number[] {
  const order: number[] = [];
  for (let k = 0; k < rounds; k++) {
    const seats = Array.from({ length: players }, (_, i) => i);
    if (snake && k % 2 === 1) seats.reverse();
    order.push(...seats);
  }
  return order;
}

export const isPlayerCount = (n: number): n is PlayerCount => n === 2 || n === 3 || n === 4;

export function newGame(players: number, snake = true): Game {
  if (!isPlayerCount(players)) throw new Error('Sindi is for 2-4 players');
  const n = PAROLS_PER_PLAYER[players];
  return {
    players,
    order: buildOrder(players, n, snake),
    placed: [],
    left: Array<number>(players).fill(n),
    bigLeft: Array<boolean>(players).fill(true),
    turn: 0,
    done: false,
  };
}

export const isOccupied = (g: Game, r: number, c: number): boolean => g.placed.some((m) => m.r === r && m.c === c);

export function legalMoves(g: Game): Move[] {
  if (g.done) return [];
  const taken = new Set(g.placed.map((m) => idx(m.r, m.c)));
  const canBig = g.bigLeft[g.turn];
  const moves: Move[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      if (taken.has(idx(r, c))) continue;
      moves.push({ r, c, big: false });
      if (canBig) moves.push({ r, c, big: true });
    }
  }
  return moves;
}

export function place(g: Game, r: number, c: number, big = false): Game {
  if (g.done) throw new Error('Tapos na ang laro');
  if (!inside(r, c)) throw new Error('Wala sa board');
  if (isOccupied(g, r, c)) throw new Error('May parol na diyan');
  if (big && !g.bigLeft[g.turn]) throw new Error('Nagamit mo na ang Malaking Parol');

  const left = g.left.slice();
  left[g.turn] -= 1;
  const bigLeft = g.bigLeft.slice();
  if (big) bigLeft[g.turn] = false;

  const placed = g.placed.concat([{ p: g.turn, r, c, big }]);
  const done = left.every((n) => n === 0);
  const turn = done ? g.turn : g.order[placed.length];
  return { ...g, placed, left, bigLeft, turn, done };
}

export function board(g: Game): Cell[] {
  const anchors = new Map<number, number>(g.placed.map((m) => [idx(m.r, m.c), m.p]));
  const counts = new Int8Array(CELLS * g.players);
  for (const m of g.placed) {
    for (const [r, c] of cover(m.r, m.c, m.big)) counts[idx(r, c) * g.players + m.p] += 1;
  }

  const cells: Cell[] = [];
  for (let r = 0; r < SIZE; r++) {
    for (let c = 0; c < SIZE; c++) {
      const i = idx(r, c);
      const pista = isPista(r, c);
      const owner = anchors.get(i);
      if (owner !== undefined) {
        cells.push({ r, c, kind: 'lit', owner, pista, anchor: true });
        continue;
      }

      let max = 0, leader = -1, leaders = 0;
      for (let p = 0; p < g.players; p++) {
        const n = counts[i * g.players + p];
        if (n > max) {
          max = n;
          leader = p;
          leaders = 1;
        } else if (n === max && n > 0) {
          leaders += 1;
        }
      }

      if (max === 0) cells.push({ r, c, kind: 'dark', owner: null, pista, anchor: false });
      else if (leaders === 1) cells.push({ r, c, kind: 'lit', owner: leader, pista, anchor: false });
      else cells.push({ r, c, kind: 'ash', owner: null, pista, anchor: false });
    }
  }
  return cells;
}

export function scoresOf(players: number, cells: readonly Cell[]): Scores {
  const pts = Array<number>(players).fill(0);
  const pistas = Array<number>(players).fill(0);
  const lit = Array<number>(players).fill(0);
  for (const cell of cells) {
    if (cell.kind !== 'lit' || cell.owner === null) continue;
    lit[cell.owner] += 1;
    pts[cell.owner] += cell.pista ? 3 : 1;
    if (cell.pista) pistas[cell.owner] += 1;
  }
  return { pts, pistas, cells: lit };
}

export const scores = (g: Game): Scores => scoresOf(g.players, board(g));

export function result(g: Game): Result {
  const { pts, pistas } = scores(g);
  const best = Math.max(...pts);
  let top = pts.flatMap((n, p) => (n === best ? [p] : []));
  if (top.length > 1) {
    const mostPista = Math.max(...top.map((p) => pistas[p]));
    top = top.filter((p) => pistas[p] === mostPista);
  }
  return { winners: top, shared: top.length > 1, pts, pistas };
}

export function pistaDecided(r: Result): boolean {
  const best = Math.max(...r.pts);
  return r.pts.filter((n) => n === best).length > r.winners.length;
}
