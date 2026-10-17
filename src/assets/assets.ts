const urls = import.meta.glob('./svg/**/*.svg', { eager: true, query: '?url', import: 'default' }) as Record<string, string>;

export const svg = (path: string): string => {
  const u = urls[`./svg/${path}.svg`];
  if (!u) throw new Error(`Missing asset: ${path}`);
  return u;
};

export type Color = 'pula' | 'asul' | 'berde' | 'kahel';
export const COLORS: ReadonlyArray<{ id: Color; name: string; hex: string }> = [
  { id: 'pula', name: 'Pula', hex: '#E5384F' },
  { id: 'asul', name: 'Asul', hex: '#2F7BEA' },
  { id: 'berde', name: 'Berde', hex: '#2FB457' },
  { id: 'kahel', name: 'Kahel', hex: '#FF8A1F' },
];

export const parol = (c: Color) => svg(`parols/parol-${c}`);
export const bigParol = (c: Color) => svg(`parols/parol-big-${c}`);
export const parolUnlit = () => svg('parols/parol-unlit');
export const token = (c: Color) => svg(`players/token-${c}`);
export const glow = (c: Color) => svg(`fx/glow-${c}`);

export type CellLook =
  | { kind: 'dark'; pista: boolean }
  | { kind: 'ash'; pista: boolean }
  | { kind: 'lit'; owner: Color; pista: boolean };

export function cellTile(look: CellLook): string {
  if (look.kind === 'dark') return svg(look.pista ? 'cells/pista' : 'cells/dark');
  if (look.kind === 'ash') return svg(look.pista ? 'cells/ash-pista' : 'cells/ash');
  return svg(`cells/${look.pista ? 'lit-pista-' : 'lit-'}${look.owner}`);
}

export const FX = {
  previewPlus: svg('fx/preview-plus'), preview3x3: svg('fx/preview-3x3'), sparkle: svg('fx/sparkle'), target: svg('cells/target'),
} as const;

export const ICON = {
  soundOn: svg('icons/sound-on'), soundOff: svg('icons/sound-off'), rules: svg('icons/rules'), trophy: svg('icons/trophy'),
  crown: svg('icons/crown'), robot: svg('icons/robot'), players: svg('icons/players'), restart: svg('icons/restart'),
  home: svg('icons/home'), ash: svg('icons/ash'), pista: svg('icons/pista'), malakingParol: svg('icons/malaking-parol'),
  turn: svg('icons/turn'), check: svg('icons/check'),
} as const;

export const SCENE = {
  logo: svg('scenes/logo'), hero: svg('scenes/hero-baryo'), frame: svg('board/frame'),
  banderitas: svg('decor/banderitas'), bgNight: svg('decor/bg-night'),
} as const;
