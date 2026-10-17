import type { Dispatch as ReactDispatch } from 'react';
import { ICON } from '../assets/assets';
import type { Action } from '../game/state';
import { LANGS, TEXT, t, type Lang } from '../i18n';

export type Dispatch = ReactDispatch<Action>;

interface ImgProps { src: string; w: number; h: number; alt?: string; className?: string }

export function Img({ src, w, h, alt = '', className }: ImgProps) {
  return <img src={src} width={w} height={h} alt={alt} className={className} decoding="async" draggable={false} />;
}

export function SoundToggle({ muted, lang, dispatch }: { muted: boolean; lang: Lang; dispatch: Dispatch }) {
  return (
    <button
      type="button"
      className="btn icon-btn"
      aria-label={muted ? t(lang).soundOn : t(lang).soundOff}
      onClick={() => dispatch({ type: 'toggle', key: 'muted' })}
    >
      <Img src={muted ? ICON.soundOff : ICON.soundOn} w={64} h={64} />
    </button>
  );
}

export function LangToggle({ lang, dispatch, compact = false }: { lang: Lang; dispatch: Dispatch; compact?: boolean }) {
  return (
    <div className="lang-toggle" role="group" aria-label={t(lang).langLabel}>
      {LANGS.map((l) => (
        <button
          key={l}
          type="button"
          className="choice"
          lang={l}
          aria-pressed={lang === l}
          onClick={() => dispatch({ type: 'lang', lang: l })}
        >
          {compact ? l.toUpperCase() : TEXT[l].langName}
        </button>
      ))}
    </div>
  );
}
