import { memo, useCallback, useEffect, useRef, useState, type KeyboardEvent, type RefObject } from 'react';
import { bigParol, cellTile, FX, glow, parol, SCENE, type CellLook } from '../assets/assets';
import { replay } from '../assets/fx.js';
import { idx, SIZE, type Cell as CellState, type Placed } from '../game/rules';
import { seatName, type MoveFx, type Seat } from '../game/state';
import { t, type Lang } from '../i18n';
import { Img } from './common';

type Anim = '' | 'anim-relight' | 'anim-ash-puff';

interface CellProps {
  i: number;
  tile: string;
  parolSrc: string | null;
  drop: boolean;
  glowSrc: string | null;
  anim: Anim;
  animKey: number;
  sparkleKey: number;
  selected: boolean;
  preview: string | null;
  letter: string;
  label: string;
  tab: 0 | -1;
  onTap: (i: number) => void;
  onKey: (e: KeyboardEvent<HTMLButtonElement>, i: number) => void;
  onFocusCell: (i: number) => void;
}

const Cell = memo(function Cell(p: CellProps) {
  const tileRef = useRef<HTMLImageElement>(null);
  useEffect(() => {
    const el = tileRef.current;
    if (!p.anim || !p.animKey || !el) return;
    el.classList.remove('anim-relight', 'anim-ash-puff');
    replay(el, p.anim);
  }, [p.anim, p.animKey]);

  return (
    <button
      type="button"
      className={`cell ${p.parolSrc ? 'occupied' : 'empty'}${p.selected ? ' selected' : ''}`}
      aria-label={p.label}
      aria-disabled={p.parolSrc ? true : undefined}
      tabIndex={p.tab}
      onClick={() => p.onTap(p.i)}
      onKeyDown={(e) => p.onKey(e, p.i)}
      onFocus={() => p.onFocusCell(p.i)}
    >
      <img ref={tileRef} className="tile" src={p.tile} width={100} height={100} alt="" decoding="async" draggable={false} />
      {p.glowSrc && <Img src={p.glowSrc} w={300} h={300} className="glow anim-bloom" />}
      {p.parolSrc && <Img src={p.parolSrc} w={110} h={152} className={p.drop ? 'parol anim-drop-in' : 'parol'} />}
      {p.sparkleKey > 0 && <img key={p.sparkleKey} className="sparkle" src={FX.sparkle} width={100} height={100} alt="" decoding="async" />}
      {p.preview && <Img src={p.preview} w={300} h={300} className="preview" />}
      {p.letter && <span className="sym" aria-hidden="true">{p.letter}</span>}
    </button>
  );
});

function lookOf(cell: CellState, seats: Seat[]): CellLook {
  if (cell.kind === 'lit') return { kind: 'lit', owner: seats[cell.owner!].color, pista: cell.pista };
  return { kind: cell.kind, pista: cell.pista };
}

interface BoardProps {
  cells: CellState[];
  placed: readonly Placed[];
  seats: Seat[];
  lang: Lang;
  fx: MoveFx | null;
  selected: number | null;
  big: boolean;
  symbols: boolean;
  locked: boolean;
  onTap: (i: number) => void;
  wrapRef: RefObject<HTMLDivElement>;
}

export default function Board({ cells, placed, seats, lang, fx, selected, big, symbols, locked, onTap, wrapRef }: BoardProps) {
  const T = t(lang);
  const [focusIdx, setFocusIdx] = useState(idx(3, 3));
  const gridRef = useRef<HTMLDivElement>(null);

  const onKey = useCallback((e: KeyboardEvent<HTMLButtonElement>, i: number) => {
    const r = Math.floor(i / SIZE);
    const c = i % SIZE;
    const moves: Record<string, [number, number]> = {
      ArrowUp: [r - 1, c],
      ArrowDown: [r + 1, c],
      ArrowLeft: [r, c - 1],
      ArrowRight: [r, c + 1],
      Home: [r, 0],
      End: [r, SIZE - 1],
    };
    const dest = moves[e.key];
    if (!dest) return;
    e.preventDefault();

    const clamp = (n: number) => Math.min(SIZE - 1, Math.max(0, n));
    const next = idx(clamp(dest[0]), clamp(dest[1]));
    setFocusIdx(next);
    (gridRef.current?.children[next] as HTMLElement | undefined)?.focus();
  }, []);

  const parolAt = new Map(placed.map((m) => [idx(m.r, m.c), m]));
  const relit = new Set(fx?.relit), ashed = new Set(fx?.ashed), pista = new Set(fx?.pista);
  const previewSrc = big ? FX.preview3x3 : FX.previewPlus;

  return (
    <div className="board-wrap" ref={wrapRef}>
      <Img src={SCENE.frame} w={720} h={720} className="frame" />
      <div className={`board${locked ? ' locked' : ''}`} ref={gridRef} role="group" aria-label={T.title}>
        {cells.map((cell, i) => {
          const m = parolAt.get(i);
          const owner = cell.kind === 'lit' ? seats[cell.owner!] : null;
          const parts = [T.rowCol(cell.r + 1, cell.c + 1)];
          if (m) parts.push(T.parolOf(seatName(seats[m.p], lang), m.big));
          else if (owner) parts.push(T.litBy(seatName(owner, lang)));
          else parts.push(cell.kind === 'ash' ? T.ash : T.empty);
          if (cell.pista) parts.push('Pista');
          if (selected === i) parts.push(T.selected);
          const isNew = !!fx && fx.at === i;
          const anim: Anim = ashed.has(i) ? 'anim-ash-puff' : relit.has(i) ? 'anim-relight' : '';
          return (
            <Cell
              key={i}
              i={i}
              tile={cellTile(lookOf(cell, seats))}
              parolSrc={m ? (m.big ? bigParol : parol)(seats[m.p].color) : null}
              drop={isNew}
              glowSrc={isNew && m ? glow(seats[m.p].color) : null}
              anim={anim}
              animKey={anim ? fx!.n : 0}
              sparkleKey={pista.has(i) ? fx!.n : 0}
              selected={selected === i}
              preview={m ? null : previewSrc}
              letter={symbols && owner ? T.letters[owner.color] : ''}
              label={parts.join(', ')}
              tab={i === focusIdx ? 0 : -1}
              onTap={onTap}
              onKey={onKey}
              onFocusCell={setFocusIdx}
            />
          );
        })}
      </div>
    </div>
  );
}
