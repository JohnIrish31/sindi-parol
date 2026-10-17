import { useEffect } from 'react';
import { ICON, token } from '../assets/assets';
import { play } from '../assets/audio/sounds.js';
import { launchConfetti } from '../assets/fx.js';
import { pistaDecided, result } from '../game/rules';
import { seatName, type AppState } from '../game/state';
import { joinNames, t } from '../i18n';
import { Img, type Dispatch } from './common';
import { newSeed } from './Setup';

export default function Result({ state, dispatch }: { state: AppState; dispatch: Dispatch }) {
  const { seats, lang } = state;
  const T = t(lang);
  const r = result(state.game!);
  const byPista = pistaDecided(r);
  const humanWon = r.winners.some((p) => !seats[p].bot);
  const names = r.winners.map((p) => seatName(seats[p], lang));

  useEffect(() => {
    if (!humanWon) { play('lose'); return; }
    play(r.shared ? 'tie' : 'win');
    return launchConfetti();
  }, []);

  const ranking = seats
    .map((seat, p) => ({ seat, p }))
    .sort((a, b) => r.pts[b.p] - r.pts[a.p] || r.pistas[b.p] - r.pistas[a.p]);

  return (
    <>
      <div className="banderitas-top anim-sway" aria-hidden="true" />
      <main className="screen scene result">
        <Img src={humanWon ? ICON.trophy : ICON.crown} w={64} h={64} className="trophy anim-pop" />
        <h1 className="banner anim-pop" aria-live="polite">{r.shared ? T.tie : T.wins(names[0])}</h1>
        {r.shared && <p className="center sub-banner">{T.sharedBy(joinNames(lang, names))}</p>}
        {!humanWon && <p className="center sub-banner">{T.tryAgain}</p>}
        {byPista && <p className="center sub-banner"><Img src={ICON.pista} w={64} h={64} className="ic" /> {T.byPista}</p>}

        <ol className="ranking">
          {ranking.map(({ seat, p }) => (
            <li key={p} className={`pcard c-${seat.color} anim-slide-up`}>
              <Img src={token(seat.color)} w={80} h={80} className="token" />
              <div className="name">
                <span className="nm">{seatName(seat, lang)}</span>
                {seat.bot && <Img src={ICON.robot} w={64} h={64} alt="(bot)" className="robot" />}
                {r.winners.includes(p) && <Img src={ICON.crown} w={64} h={64} alt="★" className="robot" />}
              </div>
              <div className="pts">{T.pts(r.pts[p])}</div>
              {byPista && <div className="pips">{T.pistaN(r.pistas[p])}</div>}
            </li>
          ))}
        </ol>

        <button type="button" className="btn big with-icon" onClick={() => dispatch({ type: 'start', seed: newSeed() })}>
          <Img src={ICON.restart} w={64} h={64} className="ic" /> {T.again}
        </button>
        <button type="button" className="btn big ghost with-icon" onClick={() => dispatch({ type: 'go', screen: 'home' })}>
          <Img src={ICON.home} w={64} h={64} className="ic" /> {T.home}
        </button>
      </main>
    </>
  );
}
