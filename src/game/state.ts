import { board, idx, isPlayerCount, newGame, place, SIZE, type Cell, type Game, type PlayerCount } from './rules';
import { mulberry32, shuffle } from './rng';
import type { Level } from './bots';
import { COLOR_IDS, t, type ColorId, type Lang } from '../i18n';

export { COLOR_IDS, type ColorId };
export const NAME_MAX = 10;

export type Screen = 'home' | 'rules' | 'setup' | 'game' | 'result';
export type Mode = 'pass' | 'bot';

export interface Settings { players: PlayerCount; mode: Mode; level: Level; names: string[] }
export interface Seat { name: string; bot: boolean; color: ColorId }

export interface MoveFx {
  n: number;
  p: number;
  at: number;
  big: boolean;
  relit: number[];
  ashed: number[];
  stolen: number;
  pista: number[];
}

export interface AppState {
  screen: Screen;
  lang: Lang;
  settings: Settings;
  seats: Seat[];
  seed: number;
  game: Game | null;
  cells: Cell[];
  selected: number | null;
  big: boolean;
  fx: MoveFx | null;
  announce: string;
  muted: boolean;
  ambient: boolean;
  symbols: boolean;
}

export type Action =
  | { type: 'go'; screen: 'home' | 'rules' | 'setup' }
  | { type: 'lang'; lang: Lang }
  | { type: 'settings'; patch: Partial<Omit<Settings, 'names'>> }
  | { type: 'name'; i: number; name: string }
  | { type: 'start'; seed: number }
  | { type: 'select'; at: number }
  | { type: 'confirm' }
  | { type: 'toggleBig' }
  | { type: 'place'; r: number; c: number; big: boolean }
  | { type: 'finish' }
  | { type: 'toggle'; key: 'muted' | 'ambient' | 'symbols' };

export const initialState: AppState = {
  screen: 'home',
  lang: 'en',
  settings: { players: 2, mode: 'bot', level: 'katamtaman', names: ['', '', '', ''] },
  seats: [],
  seed: 0,
  game: null,
  cells: [],
  selected: null,
  big: false,
  fx: null,
  announce: '',
  muted: false,
  ambient: false,
  symbols: false,
};

export function buildSeats(s: Settings, seed: number): Seat[] {
  let people: { name: string; bot: boolean }[];
  if (s.mode === 'bot') {
    const bots = Array.from({ length: s.players - 1 }, () => ({ name: '', bot: true }));
    people = [{ name: s.names[0].trim(), bot: false }, ...bots];
  } else {
    people = s.names.slice(0, s.players).map((name) => ({ name: name.trim(), bot: false }));
  }
  return shuffle(mulberry32(seed), people).map((who, i) => ({ ...who, color: COLOR_IDS[i] }));
}

export function seatName(seat: Seat, lang: Lang): string {
  if (seat.name) return seat.name;
  const color = t(lang).colors[seat.color];
  return seat.bot ? t(lang).botName(color) : color;
}

export const isHumanTurn = (s: AppState): boolean => !!s.game && !s.game.done && !s.seats[s.game.turn]?.bot;

function diff(before: Cell[], after: Cell[], mover: number): Omit<MoveFx, 'n' | 'p' | 'at' | 'big'> {
  const relit: number[] = [];
  const ashed: number[] = [];
  const pista: number[] = [];
  let stolen = 0;

  for (let i = 0; i < after.length; i++) {
    const now = after[i];
    const was = before[i];
    const newOwner = now.kind === 'lit' && (was.kind !== 'lit' || was.owner !== now.owner);

    if (newOwner) relit.push(i);
    if (now.kind === 'ash' && was.kind !== 'ash') ashed.push(i);
    if (was.kind === 'lit' && was.owner !== mover && (now.kind !== 'lit' || now.owner !== was.owner)) stolen += 1;
    if (newOwner && now.pista) pista.push(i);
  }
  return { relit, ashed, stolen, pista };
}

function applyMove(s: AppState, r: number, c: number, big: boolean): AppState {
  const g = s.game;
  if (!g || g.done) return s;
  if (r < 0 || c < 0 || r >= SIZE || c >= SIZE || s.cells[idx(r, c)].anchor) return s;

  const p = g.turn;
  const useBig = big && g.bigLeft[p];
  const next = place(g, r, c, useBig);
  const cells = board(next);
  const fx: MoveFx = { n: next.placed.length, p, at: idx(r, c), big: useBig, ...diff(s.cells, cells, p) };

  const T = t(s.lang);
  const who = seatName(s.seats[p], s.lang);
  let announce = T.placed(who, useBig, r + 1, c + 1, fx.relit.length, fx.ashed.length);
  if (fx.pista.length) announce += ' ' + T.newPista(who);
  if (next.done) announce += ' ' + T.gameOver;
  else announce += ' ' + T.turnOf(seatName(s.seats[next.turn], s.lang)) + '.';

  return { ...s, game: next, cells, fx, selected: null, big: false, announce };
}

export function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'go':
      return {
        ...s,
        screen: a.screen,
        game: a.screen === 'home' ? null : s.game,
        selected: null,
        big: false,
        fx: null,
      };

    case 'lang':
      return { ...s, lang: a.lang };

    case 'settings': {
      const players = a.patch.players ?? s.settings.players;
      if (!isPlayerCount(players)) return s;
      return { ...s, settings: { ...s.settings, ...a.patch, players } };
    }

    case 'name': {
      if (a.i < 0 || a.i > 3) return s;
      const names = s.settings.names.slice();
      names[a.i] = a.name.slice(0, NAME_MAX);
      return { ...s, settings: { ...s.settings, names } };
    }

    case 'start': {
      const seats = buildSeats(s.settings, a.seed);
      const game = newGame(s.settings.players);
      return {
        ...s,
        screen: 'game',
        seats,
        seed: a.seed,
        game,
        cells: board(game),
        selected: null,
        big: false,
        fx: null,
        announce: t(s.lang).firstUp(seatName(seats[game.turn], s.lang)) + '.',
      };
    }

    case 'select': {
      if (!isHumanTurn(s)) return s;
      if (a.at < 0 || a.at >= s.cells.length || s.cells[a.at].anchor) return s;
      if (s.selected === a.at) return applyMove(s, Math.floor(a.at / SIZE), a.at % SIZE, s.big);
      return { ...s, selected: a.at };
    }

    case 'confirm':
      if (!isHumanTurn(s) || s.selected === null) return s;
      return applyMove(s, Math.floor(s.selected / SIZE), s.selected % SIZE, s.big);

    case 'toggleBig':
      if (!isHumanTurn(s) || !s.game!.bigLeft[s.game!.turn]) return s;
      return { ...s, big: !s.big };

    case 'place':
      if (!s.game || s.game.done || !s.seats[s.game.turn].bot) return s;
      return applyMove(s, a.r, a.c, a.big);

    case 'finish':
      if (!s.game?.done) return s;
      return { ...s, screen: 'result', selected: null };

    case 'toggle':
      return { ...s, [a.key]: !s[a.key] };
  }
}
