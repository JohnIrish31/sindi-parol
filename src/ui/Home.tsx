import { ICON, SCENE } from '../assets/assets';
import type { AppState } from '../game/state';
import { t } from '../i18n';
import { Img, LangToggle, SoundToggle, type Dispatch } from './common';

export default function Home({ state, dispatch }: { state: AppState; dispatch: Dispatch }) {
  const T = t(state.lang);
  return (
    <>
      <div className="banderitas-top anim-sway" aria-hidden="true" />
      <main className="screen scene home">
        <h1 className="sr-only">{T.title}</h1>
        <Img src={SCENE.logo} w={520} h={200} className="logo anim-pop" />
        <Img src={SCENE.hero} w={800} h={420} className="hero anim-fade-in" />
        <p className="tagline">{T.tagline}</p>

        <section className="promo anim-slide-up" aria-labelledby="promo-h">
          <h2 id="promo-h">
            <Img src={ICON.pista} w={64} h={64} className="ic" />
            {T.promoTitle}
          </h2>
          <p>{T.promoBody}</p>
          <LangToggle lang={state.lang} dispatch={dispatch} />
        </section>

        <button type="button" className="btn big" onClick={() => dispatch({ type: 'go', screen: 'setup' })}>
          {T.play}
        </button>
        <button type="button" className="btn big ghost with-icon" onClick={() => dispatch({ type: 'go', screen: 'rules' })}>
          <Img src={ICON.rules} w={64} h={64} className="ic" /> {T.howTo}
        </button>
        <div className="row wrap">
          <SoundToggle muted={state.muted} lang={state.lang} dispatch={dispatch} />
          <button
            type="button"
            className="choice"
            aria-pressed={state.ambient}
            onClick={() => dispatch({ type: 'toggle', key: 'ambient' })}
          >
            {T.music(state.ambient)}
          </button>
        </div>
      </main>
    </>
  );
}
