let ctx = null;
let master = null;
let muted = false;
let ambientTimer = null;
const VOLUME = 0.7;

function ac() {
  if (!ctx) {
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return null;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : VOLUME;
    master.connect(ctx.destination);
  }
  if (ctx.state === 'suspended') ctx.resume();
  return ctx;
}

export function unlockAudio() { ac(); }
export function setMuted(m) { muted = !!m; if (master) master.gain.value = muted ? 0 : VOLUME; }
export function isMuted() { return muted; }

function tone(freq, start, dur, o = {}) {
  const c = ac();
  if (!c || muted) return;
  const { type = 'sine', gain = 0.25, slideTo = null, attack = 0.006 } = o;
  const t0 = c.currentTime + start;
  const osc = c.createOscillator();
  const g = c.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slideTo) osc.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
  g.gain.setValueAtTime(0.0001, t0);
  g.gain.exponentialRampToValueAtTime(gain, t0 + attack);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  osc.connect(g); g.connect(master);
  osc.start(t0); osc.stop(t0 + dur + 0.03);
}

function noise(start, dur, o = {}) {
  const c = ac();
  if (!c || muted) return;
  const { gain = 0.15, type = 'bandpass', freq = 1000, freqTo = null, q = 1 } = o;
  const t0 = c.currentTime + start;
  const len = Math.max(1, Math.floor(c.sampleRate * dur));
  const buf = c.createBuffer(1, len, c.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  const src = c.createBufferSource();
  src.buffer = buf;
  const f = c.createBiquadFilter();
  f.type = type; f.Q.value = q;
  f.frequency.setValueAtTime(freq, t0);
  if (freqTo) f.frequency.exponentialRampToValueAtTime(freqTo, t0 + dur);
  const g = c.createGain();
  g.gain.setValueAtTime(gain, t0);
  g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t0); src.stop(t0 + dur + 0.03);
}

const N = { C4: 261.63, E4: 329.63, G4: 392, A4: 440, C5: 523.25, D5: 587.33, E5: 659.25, G5: 783.99, A5: 880, C6: 1046.5, E6: 1318.5, G6: 1568, C7: 2093 };

const sfx = {
  click: () => tone(900, 0, 0.05, { type: 'square', gain: 0.06 }),
  tick: () => tone(1250, 0, 0.03, { type: 'square', gain: 0.045 }),
  turn: () => { tone(520, 0, 0.08, { type: 'triangle', gain: 0.14 }); tone(780, 0.07, 0.11, { type: 'triangle', gain: 0.14 }); },
  invalid: () => tone(170, 0, 0.18, { type: 'square', gain: 0.1, slideTo: 110 }),
  place: () => {
    noise(0, 0.2, { freq: 500, freqTo: 2200, gain: 0.11, q: 0.9 });
    tone(660, 0.02, 0.4, { type: 'triangle', gain: 0.2 });
    tone(990, 0.06, 0.34, { gain: 0.1 });
  },
  bloom: () => [N.E5, N.G5, N.C6].forEach((f, i) => tone(f, 0.08 + i * 0.07, 0.22, { gain: 0.09 })),
  steal: () => { noise(0, 0.22, { freq: 2200, freqTo: 500, gain: 0.12, q: 0.8 }); tone(440, 0, 0.22, { type: 'triangle', gain: 0.12, slideTo: 330 }); },
  ash: () => { noise(0, 0.32, { type: 'lowpass', freq: 520, gain: 0.16 }); tone(120, 0, 0.3, { gain: 0.16, slideTo: 80 }); },
  pista: () => [N.C6, N.E6, N.G6, N.C7].forEach((f, i) => tone(f, i * 0.06, 0.25, { type: 'triangle', gain: 0.12 })),
  bigParol: () => {
    noise(0, 0.5, { freq: 220, freqTo: 3200, gain: 0.2, q: 0.7 });
    [N.C4, N.E4, N.G4, N.C5].forEach((f, i) => tone(f, 0.12 + i * 0.03, 0.7, { type: 'triangle', gain: 0.16 }));
    tone(N.C7, 0.35, 0.3, { gain: 0.07 });
  },
  win: () => {
    [N.C5, N.E5, N.G5, N.C6].forEach((f, i) => tone(f, i * 0.12, 0.32, { type: 'triangle', gain: 0.24 }));
    [N.C6, N.G5, N.E6].forEach((f, i) => tone(f, 0.55 + i * 0.1, 0.4, { gain: 0.12 }));
  },
  tie: () => [N.G4, N.C5, N.G4, N.C5].forEach((f, i) => tone(f, i * 0.14, 0.3, { type: 'triangle', gain: 0.18 })),
  lose: () => [N.A4, N.G4, N.E4].forEach((f, i) => tone(f, i * 0.22, 0.42, { type: 'triangle', gain: 0.2 })),
};

export const SOUND_NAMES = Object.keys(sfx);
export function play(name) { if (!muted && sfx[name]) sfx[name](); }
export { sfx };

const PENTA = [N.C5, N.D5, N.E5, N.G5, N.A5, N.C6];
export function startAmbient() {
  if (ambientTimer) return;
  const next = () => {
    if (!muted && ctx) tone(PENTA[(Math.random() * PENTA.length) | 0], 0, 1.4, { gain: 0.035, attack: 0.03 });
    ambientTimer = setTimeout(next, 1100 + Math.random() * 2200);
  };
  ac();
  ambientTimer = setTimeout(next, 600);
}
export function stopAmbient() { if (ambientTimer) { clearTimeout(ambientTimer); ambientTimer = null; } }
