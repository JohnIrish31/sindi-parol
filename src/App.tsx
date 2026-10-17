import { useEffect, useReducer, useRef } from 'react';
import { initialState, reducer } from './game/state';
import { t } from './i18n';
import { play, setMuted, startAmbient, stopAmbient, unlockAudio } from './assets/audio/sounds.js';
import Home from './ui/Home';
import Rules from './ui/Rules';
import Setup from './ui/Setup';
import GameScreen from './ui/GameScreen';
import Result from './ui/Result';

export default function App() {
  const [state, dispatch] = useReducer(reducer, initialState);
  const unlocked = useRef(false);

  useEffect(() => { setMuted(state.muted); }, [state.muted]);
  useEffect(() => {
    if (state.ambient && !state.muted) startAmbient();
    else stopAmbient();
  }, [state.ambient, state.muted]);
  useEffect(() => { window.scrollTo(0, 0); }, [state.screen]);
  useEffect(() => {
    document.documentElement.lang = state.lang;
    document.title = t(state.lang).title;
  }, [state.lang]);

  const unlock = () => {
    if (unlocked.current) return;
    unlocked.current = true;
    unlockAudio();
  };
  const onClick = (e: React.MouseEvent) => {
    const btn = (e.target as HTMLElement).closest('button');
    if (btn && !btn.classList.contains('cell') && !btn.disabled) play('click');
  };

  let screen: React.ReactNode;
  switch (state.screen) {
    case 'home': screen = <Home state={state} dispatch={dispatch} />; break;
    case 'rules': screen = <Rules lang={state.lang} dispatch={dispatch} />; break;
    case 'setup': screen = <Setup state={state} dispatch={dispatch} />; break;
    case 'game': screen = <GameScreen state={state} dispatch={dispatch} />; break;
    case 'result': screen = <Result state={state} dispatch={dispatch} />; break;
  }

  return (
    <div className="app" onPointerDownCapture={unlock} onKeyDownCapture={unlock} onClickCapture={onClick}>
      {screen}
    </div>
  );
}
