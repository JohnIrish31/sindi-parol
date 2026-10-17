import { describe, expect, it } from 'vitest';
import { buildSeats, initialState, reducer, seatName, type Action, type AppState } from './state';
import { idx } from './rules';

const run = (s: AppState, ...actions: Action[]) => actions.reduce(reducer, s);
const passGame = (players: 2 | 3 | 4 = 2, lang: 'en' | 'tl' = 'en') =>
  run(initialState, { type: 'lang', lang }, { type: 'settings', patch: { players, mode: 'pass' } }, { type: 'start', seed: 1 });

describe('app reducer', () => {
  it('defaults to English', () => {
    expect(initialState.lang).toBe('en');
  });

  it('seats: shuffled by seed, colors by seat, blank names show the color in the current language', () => {
    const s = { ...initialState.settings, players: 3 as const, mode: 'pass' as const, names: ['Ana', '', 'Ben', ''] };
    const seats = buildSeats(s, 123);
    expect(seats.map((x) => x.color)).toEqual(['pula', 'asul', 'berde']);
    expect(seats.map((x) => seatName(x, 'en'))).toEqual(expect.arrayContaining(['Ana', 'Ben']));
    const unnamed = seats.find((x) => !x.name)!;
    const en = { pula: 'Red', asul: 'Blue', berde: 'Green' } as Record<string, string>;
    const tl = { pula: 'Pula', asul: 'Asul', berde: 'Berde' } as Record<string, string>;
    expect(seatName(unnamed, 'en')).toBe(en[unnamed.color]);
    expect(seatName(unnamed, 'tl')).toBe(tl[unnamed.color]);
    expect(buildSeats(s, 123)).toEqual(seats);
  });

  it('with bots: exactly one human, in a seeded random seat; bots are named by color', () => {
    const s = { ...initialState.settings, players: 4 as const, mode: 'bot' as const };
    const humanSeats = new Set<number>();
    for (let seed = 0; seed < 40; seed++) {
      const seats = buildSeats(s, seed);
      expect(seats.filter((x) => !x.bot)).toHaveLength(1);
      humanSeats.add(seats.findIndex((x) => !x.bot));
    }
    expect(humanSeats.size).toBe(4);
    expect(seatName({ name: '', bot: true, color: 'kahel' }, 'tl')).toBe('Bot Kahel');
  });

  it('names are capped at 10 characters', () => {
    const s = reducer(initialState, { type: 'name', i: 0, name: 'Maria Clara de la Cruz' });
    expect(s.settings.names[0]).toBe('Maria Clar');
  });

  it('start announces the first player (EN and TL)', () => {
    const en = passGame();
    expect(en.screen).toBe('game');
    expect(en.announce).toBe(`First to play: ${seatName(en.seats[0], 'en')}.`);
    expect(en.cells).toHaveLength(49);
    const tl = passGame(2, 'tl');
    expect(tl.announce).toBe(`Unang maglalagay: ${seatName(tl.seats[0], 'tl')}.`);
  });

  it('tap selects, tap again confirms; another tap moves the selection', () => {
    let s = passGame(2, 'tl');
    s = reducer(s, { type: 'select', at: idx(3, 3) });
    expect(s.selected).toBe(idx(3, 3));
    s = reducer(s, { type: 'select', at: idx(2, 2) });
    expect(s.selected).toBe(idx(2, 2));
    expect(s.game!.placed).toHaveLength(0);
    s = reducer(s, { type: 'select', at: idx(2, 2) });
    expect(s.game!.placed).toHaveLength(1);
    expect(s.selected).toBeNull();
    expect(s.fx).toMatchObject({ n: 1, p: 0, at: idx(2, 2), big: false });
    expect(s.fx!.relit).toHaveLength(5);
    expect(s.announce).toContain('sa hilera 3, hanay 3. 5 ang nagbago ng may-ari, 0 ang naging abo.');
  });

  it('English announcement', () => {
    const s = run(passGame(), { type: 'select', at: idx(1, 2) }, { type: 'confirm' });
    const who = seatName(s.seats[0], 'en');
    expect(s.announce).toBe(
      `${who} placed a parol at row 2, column 3. 5 changed owner, 0 turned to ash. ${who} took a Pista! ${seatName(s.seats[1], 'en')}’s turn.`,
    );
  });

  it('occupied cells cannot be selected; confirm needs a selection', () => {
    let s = run(passGame(), { type: 'select', at: 0 }, { type: 'confirm' });
    expect(reducer(s, { type: 'select', at: 0 })).toBe(s);
    expect(reducer(s, { type: 'confirm' })).toBe(s);
    s = run(s, { type: 'select', at: 2 }, { type: 'confirm' });
    expect(s.fx!.ashed).toEqual([1]);
    expect(s.fx!.stolen).toBe(1);
  });

  it('Malaking Parol toggle lights a 3x3 and can only be used once', () => {
    let s = run(passGame(), { type: 'toggleBig' }, { type: 'select', at: idx(3, 3) }, { type: 'confirm' });
    expect(s.fx!.big).toBe(true);
    expect(s.fx!.relit).toHaveLength(9);
    expect(s.big).toBe(false);
    s = run(s, { type: 'select', at: 0 }, { type: 'confirm' }, { type: 'select', at: 6 }, { type: 'confirm' });
    expect(s.game!.turn).toBe(0);
    expect(reducer(s, { type: 'toggleBig' }).big).toBe(false);
  });

  it('humans cannot act on a bot turn; bots cannot act on a human turn', () => {
    let s = run(initialState, { type: 'settings', patch: { players: 2, mode: 'bot' } }, { type: 'start', seed: 2 });
    const botSeat = s.seats.findIndex((x) => x.bot);
    if (s.game!.turn !== botSeat) {
      expect(reducer(s, { type: 'place', r: 3, c: 3, big: false })).toBe(s);
      s = run(s, { type: 'select', at: 0 }, { type: 'confirm' });
    }
    expect(s.game!.turn).toBe(botSeat);
    expect(reducer(s, { type: 'select', at: 10 })).toBe(s);
    s = reducer(s, { type: 'place', r: 3, c: 3, big: false });
    expect(s.game!.placed.at(-1)).toMatchObject({ p: botSeat, r: 3, c: 3 });
  });

  it('a full game goes to the result screen', () => {
    let s = passGame(4);
    for (let i = 0; !s.game!.done; i++) s = run(s, { type: 'select', at: i * 3 % 49 }, { type: 'confirm' });
    expect(s.announce).toContain('Game over!');
    s = reducer(s, { type: 'finish' });
    expect(s.screen).toBe('result');
  });
});
