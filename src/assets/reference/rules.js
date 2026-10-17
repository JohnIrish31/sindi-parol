export const SIZE = 7;
export const PISTA = [[1, 3], [3, 1], [3, 5], [5, 3]];
export const PAROLS_PER_PLAYER = { 2: 8, 3: 6, 4: 4 };

const idx = (r, c) => r * SIZE + c;
const inside = (r, c) => r >= 0 && c >= 0 && r < SIZE && c < SIZE;
export const isPista = (r, c) => PISTA.some(([pr, pc]) => pr === r && pc === c);

export function cover(r, c, big = false) {
  const out = [];
  if (big) {
    for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) if (inside(r + dr, c + dc)) out.push([r + dr, c + dc]);
  } else {
    for (const [dr, dc] of [[0, 0], [-1, 0], [1, 0], [0, -1], [0, 1]]) if (inside(r + dr, c + dc)) out.push([r + dr, c + dc]);
  }
  return out;
}

export function buildOrder(players, rounds, snake = true) {
  const order = [];
  for (let k = 0; k < rounds; k++) {
    const seats = Array.from({ length: players }, (_, i) => i);
    if (snake && k % 2 === 1) seats.reverse();
    order.push(...seats);
  }
  return order;
}

export function newGame(players, snake = true) {
  if (!PAROLS_PER_PLAYER[players]) throw new Error('Sindi is for 2-4 players');
  return {
    players,
    order: buildOrder(players, PAROLS_PER_PLAYER[players], snake),
    placed: [],
    left: Array(players).fill(PAROLS_PER_PLAYER[players]),
    bigLeft: Array(players).fill(true),
    turn: 0,
    done: false,
  };
}

export const isOccupied = (g, r, c) => g.placed.some((m) => m.r === r && m.c === c);

export function legalMoves(g) {
  if (g.done) return [];
  const moves = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    if (isOccupied(g, r, c)) continue;
    moves.push({ r, c, big: false });
    if (g.bigLeft[g.turn]) moves.push({ r, c, big: true });
  }
  return moves;
}

export function place(g, r, c, big = false) {
  if (g.done) throw new Error('Tapos na ang laro');
  if (!inside(r, c)) throw new Error('Wala sa board');
  if (isOccupied(g, r, c)) throw new Error('May parol na diyan');
  if (big && !g.bigLeft[g.turn]) throw new Error('Nagamit mo na ang Malaking Parol');
  const left = g.left.slice(); left[g.turn] -= 1;
  const bigLeft = g.bigLeft.slice(); if (big) bigLeft[g.turn] = false;
  const placed = g.placed.concat([{ p: g.turn, r, c, big }]);
  const done = left.every((n) => n === 0);
  const turn = done ? g.turn : g.order[placed.length];
  return { ...g, placed, left, bigLeft, turn, done };
}

export function board(g) {
  const anchor = new Map(g.placed.map((m) => [idx(m.r, m.c), m.p]));
  const counts = Array.from({ length: SIZE * SIZE }, () => Array(g.players).fill(0));
  for (const m of g.placed) for (const [r, c] of cover(m.r, m.c, m.big)) counts[idx(r, c)][m.p] += 1;
  const cells = [];
  for (let r = 0; r < SIZE; r++) for (let c = 0; c < SIZE; c++) {
    const i = idx(r, c), pista = isPista(r, c);
    if (anchor.has(i)) { cells.push({ r, c, kind: 'lit', owner: anchor.get(i), pista, anchor: true }); continue; }
    const row = counts[i], max = Math.max(...row);
    if (max === 0) { cells.push({ r, c, kind: 'dark', owner: null, pista, anchor: false }); continue; }
    const leaders = row.flatMap((n, p) => (n === max ? [p] : []));
    if (leaders.length === 1) cells.push({ r, c, kind: 'lit', owner: leaders[0], pista, anchor: false });
    else cells.push({ r, c, kind: 'ash', owner: null, pista, anchor: false });
  }
  return cells;
}

export function scores(g) {
  const pts = Array(g.players).fill(0), pistas = Array(g.players).fill(0), cells = Array(g.players).fill(0);
  for (const cell of board(g)) {
    if (cell.kind !== 'lit') continue;
    cells[cell.owner] += 1;
    pts[cell.owner] += cell.pista ? 3 : 1;
    if (cell.pista) pistas[cell.owner] += 1;
  }
  return { pts, pistas, cells };
}

export function result(g) {
  const { pts, pistas } = scores(g);
  const best = Math.max(...pts);
  let top = pts.flatMap((n, p) => (n === best ? [p] : []));
  if (top.length > 1) {
    const bp = Math.max(...top.map((p) => pistas[p]));
    top = top.filter((p) => pistas[p] === bp);
  }
  return { winners: top, shared: top.length > 1, pts, pistas };
}
