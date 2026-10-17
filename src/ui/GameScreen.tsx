import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ICON, parol, token } from '../assets/assets';
import { play } from '../assets/audio/sounds.js';
import { replay } from '../assets/fx.js';
import { botSteps } from '../game/bots';
import { mulberry32 } from '../game/rng';
import { scoresOf, type Game } from '../game/rules';
import { isHumanTurn, seatName, type AppState, type Seat } from '../game/state';
import { t, type Lang } from '../i18n';
import Board from './Board';
import { Img, LangToggle, SoundToggle, type Dispatch } from './common';

const THINK_MIN = 600, THINK_SPREAD = 300, FIRST_MOVE_EXTRA = 1400, FINISH_DELAY = 1800;

function PlayersBar({ seats, game, pts, lang, thinking }: { seats: Seat[]; game: Game; pts: number[]; lang: Lang; thinking: boolean }) {
  const T = t(lang);
  return (
    <div className="players-bar">
      {seats.map((seat, p) => {
        const active = !game.done && game.turn === p;
        return (
          <div key={p} className={`pcard c-${seat.color}${active ? ' active anim-pulse-glow' : ''}`} aria-current={active ? 'true' : undefined}>
            <Img src={token(seat.color)} w={80} h={80} className="token" />
            <div className="name">
              <span className="nm">{seatName(seat, lang)}</span>
              {seat.bot && <Img src={ICON.robot} w={64} h={64} alt="(bot)" className={`robot${active && thinking ? ' anim-twinkle' : ''}`} />}
            </div>
            <div key={pts[p]} className="pts anim-bump" aria-label={T.pts(pts[p])}>{pts[p]}</div>
            <div className="pips" role="img" aria-label={`${T.parolsLeft(game.left[p])}. ${game.bigLeft[p] ? T.bigReady : T.bigUsed}.`}>
              {Array.from({ length: game.left[p] }, (_, k) => <Img key={k} src={parol(seat.color)} w={110} h={152} />)}
              <Img src={ICON.malakingParol} w={64} h={64} className={`big-flag${game.bigLeft[p] ? '' : ' off'}`} />
            </div>
          </div>
        );
      })}
    </div>
  );
}

export default function GameScreen({ state, dispatch }: { state: AppState; dispatch: Dispatch }) {
  const { seats, cells, fx, lang } = state;
  const game = state.game!;
  const T = t(lang);
  const stateRef = useRef(state);
  stateRef.current = state;
  const wrapRef = useRef<HTMLDivElement>(null);
  const botRng = useMemo(() => mulberry32(state.seed ^ 0x5bd1e995), [state.seed]);
  const [intro, setIntro] = useState(true);
  const [leaving, setLeaving] = useState(false);

  const current = seats[game.turn];
  const human = isHumanTurn(state);
  const botTurn = !game.done && current.bot;
  const pts = useMemo(() => scoresOf(game.players, cells).pts, [game.players, cells]);

  useEffect(() => {
    setIntro(true);
    const id = setTimeout(() => setIntro(false), 2400);
    return () => clearTimeout(id);
  }, [state.seed]);

  useEffect(() => {
    if (!fx) return;
    const timers: number[] = [];
    const later = (ms: number, name: string) => {
      timers.push(window.setTimeout(() => play(name), ms));
    };
    play(fx.big ? 'bigParol' : 'place');
    later(90, 'bloom');
    if (fx.stolen) later(260, 'steal');
    if (fx.ashed.length) later(360, 'ash');
    if (fx.pista.length) later(460, 'pista');
    if (!stateRef.current.game?.done) later(520, 'turn');
    return () => timers.forEach(clearTimeout);
  }, [fx]);

  useEffect(() => {
    if (game.done || !seats[game.turn].bot) return;
    let alive = true;
    let timer = 0;
    let delay = THINK_MIN + Math.floor(botRng() * THINK_SPREAD);
    if (game.placed.length === 0) delay += FIRST_MOVE_EXTRA;

    timer = window.setTimeout(() => {
      const steps = botSteps(state.settings.level, game, botRng);
      const tick = () => {
        if (!alive) return;
        const r = steps.next();
        if (r.done) dispatch({ type: 'place', ...r.value });
        else timer = window.setTimeout(tick, 0);
      };
      tick();
    }, delay);
    return () => {
      alive = false;
      clearTimeout(timer);
    };
  }, [game, seats, botRng, state.settings.level, dispatch]);

  useEffect(() => {
    if (!game.done) return;
    const id = setTimeout(() => dispatch({ type: 'finish' }), FINISH_DELAY);
    return () => clearTimeout(id);
  }, [game.done, dispatch]);

  const onTap = useCallback((i: number) => {
    const s = stateRef.current;
    if (!isHumanTurn(s)) return;
    if (s.cells[i].anchor) {
      play('invalid');
      replay(wrapRef.current, 'anim-shake-x');
      return;
    }
    if (s.selected !== i) play('tick');
    dispatch({ type: 'select', at: i });
  }, [dispatch]);

  const upcoming = game.order.slice(game.placed.length + 1, game.placed.length + 4);
  const canBig = human && game.bigLeft[game.turn];

  let hint: React.ReactNode;
  if (game.done) hint = T.gameOver;
  else if (intro && game.placed.length === 0) hint = T.firstUp(seatName(current, lang));
  else hint = (
    <>
      {T.turnOf(seatName(current, lang))}
      {botTurn && <small className="sub"><Img src={ICON.robot} w={64} h={64} className="ic anim-twinkle" /> {T.thinking}</small>}
      {human && state.selected === null && <small className="sub">{T.pickHint}</small>}
    </>
  );

  return (
    <main className="screen game">
      <div className="topbar">
        <button type="button" className="btn icon-btn" aria-label={T.home} onClick={() => setLeaving(true)}>
          <Img src={ICON.home} w={64} h={64} />
        </button>
        <LangToggle lang={lang} dispatch={dispatch} compact />
        <SoundToggle muted={state.muted} lang={lang} dispatch={dispatch} />
      </div>

      <PlayersBar seats={seats} game={game} pts={pts} lang={lang} thinking={botTurn} />

      <div className={`hint turn c-${current.color}${intro && game.placed.length === 0 ? ' anim-pop' : ''}`}>
        <Img src={token(current.color)} w={80} h={80} className="ic" />
        <span>{hint}</span>
      </div>

      <Board
        cells={cells}
        placed={game.placed}
        seats={seats}
        lang={lang}
        fx={fx}
        selected={state.selected}
        big={state.big}
        symbols={state.symbols}
        locked={!human}
        onTap={onTap}
        wrapRef={wrapRef}
      />

      <div className="controls">
        <button type="button" className="btn ghost big-toggle" aria-pressed={state.big} disabled={!canBig}
          onClick={() => dispatch({ type: 'toggleBig' })}>
          <Img src={ICON.malakingParol} w={64} h={64} className="ic" />
          <span>{T.bigBtn}<small>{T.bigSub}</small></span>
        </button>
        <button type="button" className="btn confirm" disabled={!human || state.selected === null}
          onClick={() => dispatch({ type: 'confirm' })}>
          <Img src={ICON.check} w={64} h={64} className="ic" /> {T.light}
        </button>
      </div>

      <div className="footer">
        <div className="next">
          <span>{T.next}:</span>
          {upcoming.length === 0 && !game.done && <b>{T.lastParol}</b>}
          {upcoming.map((p, k) => (
            <span key={k} className="who">
              <Img src={token(seats[p].color)} w={80} h={80} />
              <small>{seatName(seats[p], lang)}</small>
            </span>
          ))}
        </div>
        <button type="button" className="choice" aria-pressed={state.symbols}
          onClick={() => dispatch({ type: 'toggle', key: 'symbols' })}>
          {T.symbols}
        </button>
      </div>

      <p className="sr-only" aria-live="polite">{state.announce}</p>

      {leaving && (
        <div className="modal" role="dialog" aria-modal="true" aria-labelledby="leave-q">
          <div className="panel anim-pop">
            <p id="leave-q">{T.leaveQ}</p>
            <div className="row">
              <button type="button" className="btn ghost grow" autoFocus onClick={() => setLeaving(false)}>{T.leaveNo}</button>
              <button type="button" className="btn grow" onClick={() => dispatch({ type: 'go', screen: 'home' })}>{T.leaveYes}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
