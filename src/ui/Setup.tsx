import { ICON } from '../assets/assets';
import { LEVELS } from '../game/bots';
import { NAME_MAX, type AppState } from '../game/state';
import { t } from '../i18n';
import { Img, LangToggle, type Dispatch } from './common';

export default function Setup({ state, dispatch }: { state: AppState; dispatch: Dispatch }) {
  const T = t(state.lang);
  const { players, mode, level, names } = state.settings;
  const nameFields = mode === 'bot' ? 1 : players;

  return (
    <main className="screen setup">
      <div className="row">
        <Img src={ICON.players} w={64} h={64} className="head-ic" />
        <h1 className="grow">{T.setupTitle}</h1>
        <LangToggle lang={state.lang} dispatch={dispatch} compact />
      </div>

      <fieldset className="panel">
        <legend>{T.howMany}</legend>
        <div className="choices">
          {([2, 3, 4] as const).map((n) => (
            <button key={n} type="button" className="choice" aria-pressed={players === n}
              onClick={() => dispatch({ type: 'settings', patch: { players: n } })}>
              {n}
            </button>
          ))}
        </div>
        {players > 2 && <p className="note">{T.casualTag}: {T.casual}</p>}
      </fieldset>

      <fieldset className="panel">
        <legend>{T.modeH}</legend>
        <div className="choices two">
          <button type="button" className="choice stack" aria-pressed={mode === 'pass'}
            onClick={() => dispatch({ type: 'settings', patch: { mode: 'pass' } })}>
            <Img src={ICON.players} w={64} h={64} className="ic" />
            {T.pass}<small>{T.passSub}</small>
          </button>
          <button type="button" className="choice stack" aria-pressed={mode === 'bot'}
            onClick={() => dispatch({ type: 'settings', patch: { mode: 'bot' } })}>
            <Img src={ICON.robot} w={64} h={64} className="ic" />
            {T.bot}<small>{T.botSub}</small>
          </button>
        </div>
      </fieldset>

      {mode === 'bot' && (
        <fieldset className="panel">
          <legend>{T.levelH}</legend>
          <div className="choices">
            {LEVELS.map((l) => (
              <button key={l} type="button" className="choice" aria-pressed={level === l}
                onClick={() => dispatch({ type: 'settings', patch: { level: l } })}>
                {T.levels[l]}
              </button>
            ))}
          </div>
        </fieldset>
      )}

      <fieldset className="panel names">
        <legend>{mode === 'bot' ? T.yourName : T.names}</legend>
        {Array.from({ length: nameFields }, (_, i) => (
          <label key={i} className="field">
            <span className="sr-only">{mode === 'bot' ? T.yourName : T.playerN(i + 1)}</span>
            <input
              type="text"
              value={names[i]}
              maxLength={NAME_MAX}
              placeholder={mode === 'bot' ? T.yourName : T.playerN(i + 1)}
              autoComplete="off"
              enterKeyHint="done"
              onChange={(e) => dispatch({ type: 'name', i, name: e.target.value })}
            />
          </label>
        ))}
        <p className="note">{T.nameHint}</p>
      </fieldset>

      <button type="button" className="btn big" onClick={() => dispatch({ type: 'start', seed: newSeed() })}>
        {T.start}
      </button>
      <button type="button" className="btn ghost" onClick={() => dispatch({ type: 'go', screen: 'home' })}>
        {T.back}
      </button>
    </main>
  );
}

export const newSeed = (): number => (Math.random() * 0x100000000) >>> 0;
