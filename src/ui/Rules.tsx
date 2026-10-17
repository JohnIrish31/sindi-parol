import { cellTile, ICON, parol } from '../assets/assets';
import { board, idx, newGame, type Game, type Placed } from '../game/rules';
import { COLOR_IDS } from '../game/state';
import { t, type Lang } from '../i18n';
import { Img, type Dispatch } from './common';

const ROWS = [0, 1, 2], COLS = [0, 1, 2, 3];
const at = (p: number, r: number, c: number): Placed => ({ p, r, c, big: false });
const step1: Game = { ...newGame(2), placed: [at(0, 0, 0), at(1, 0, 2)] };
const step2: Game = { ...step1, placed: [...step1.placed, at(0, 1, 1)] };

function MiniBoard({ game, focus }: { game: Game; focus: number }) {
  const cells = board(game);
  return (
    <div className="mini" aria-hidden="true">
      {ROWS.flatMap((r) => COLS.map((c) => {
        const cell = cells[idx(r, c)];
        const m = game.placed.find((x) => x.r === r && x.c === c);
        const look = cell.kind === 'lit'
          ? { kind: 'lit' as const, owner: COLOR_IDS[cell.owner!], pista: cell.pista }
          : { kind: cell.kind, pista: cell.pista };
        return (
          <div key={`${r}-${c}`} className={idx(r, c) === focus ? 'mini-cell focus' : 'mini-cell'}>
            <Img src={cellTile(look)} w={100} h={100} className="tile" />
            {m && <Img src={parol(COLOR_IDS[m.p])} w={110} h={152} className="parol" />}
          </div>
        );
      }))}
    </div>
  );
}

function Line({ icon, text }: { icon: string; text: string }) {
  return (
    <p className="line">
      <Img src={icon} w={64} h={64} className="ic" /> <span>{text}</span>
    </p>
  );
}

export default function Rules({ lang, dispatch }: { lang: Lang; dispatch: Dispatch }) {
  const T = t(lang);
  const back = (
    <button type="button" className="btn ghost" onClick={() => dispatch({ type: 'go', screen: 'home' })}>
      {T.back}
    </button>
  );
  return (
    <main className="screen rules">
      <div className="row">
        <Img src={ICON.rules} w={64} h={64} className="head-ic" />
        <h1 className="grow">{T.rulesTitle}</h1>
      </div>

      <section className="panel">
        <h2>{T.goalH}</h2>
        <p>{T.goal}</p>
        <h2>{T.turnH}</h2>
        <p>{T.turn}</p>
        <h2>{T.fightH}</h2>
        <p>{T.fight}</p>
        <div className="example">
          <figure>
            <MiniBoard game={step1} focus={idx(0, 1)} />
            <figcaption>1. {T.ex1}</figcaption>
          </figure>
          <figure>
            <MiniBoard game={step2} focus={idx(0, 1)} />
            <figcaption>2. {T.ex2}</figcaption>
          </figure>
        </div>
      </section>

      <section className="panel">
        <Line icon={ICON.ash} text={T.ashLine} />
        <Line icon={ICON.pista} text={T.pistaLine} />
        <Line icon={ICON.malakingParol} text={T.bigLine} />
      </section>

      <section className="panel">
        <h2>{T.orderH}</h2>
        <p>{T.order}</p>
        <h2>{T.winH}</h2>
        <p>{T.win}</p>
        <p className="note">{T.casual}</p>
      </section>
      {back}
    </main>
  );
}
