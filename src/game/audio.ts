let ctx: AudioContext | null = null;
let muted = false;

export function setMuted(m: boolean) {
  muted = m;
}

function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

function tone(
  freq: number,
  dur: number,
  opts: { type?: OscillatorType; gain?: number; when?: number; slide?: number } = {}
) {
  if (muted) return;
  const c = ac();
  if (!c) return;
  try {
    const { type = "sine", gain = 0.12, when = 0, slide = 0 } = opts;
    const t0 = c.currentTime + when;
    const osc = c.createOscillator();
    const g = c.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch {
    /* ignore */
  }
}

export const sfx = {
  click() {
    tone(520, 0.07, { type: "triangle", gain: 0.08 });
  },
  pop() {
    tone(300, 0.09, { type: "sine", gain: 0.1, slide: 260 });
  },
  scan() {
    // classic laser-scanner chirp: short high-pitched beep
    tone(2450, 0.075, { type: "square", gain: 0.05 });
    tone(3100, 0.045, { type: "square", gain: 0.028, when: 0.02 });
  },
  error() {
    tone(160, 0.22, { type: "sawtooth", gain: 0.09, slide: -60 });
  },
  coin() {
    tone(980, 0.07, { type: "square", gain: 0.06 });
    tone(1470, 0.12, { type: "square", gain: 0.05, when: 0.06 });
  },
  ching() {
    tone(1046, 0.09, { type: "triangle", gain: 0.1 });
    tone(1568, 0.16, { type: "triangle", gain: 0.09, when: 0.07 });
  },
  levelup() {
    [523, 659, 784, 1046].forEach((f, i) =>
      tone(f, 0.14, { type: "triangle", gain: 0.1, when: i * 0.09 })
    );
  },
  day() {
    [784, 659, 523].forEach((f, i) =>
      tone(f, 0.16, { type: "sine", gain: 0.09, when: i * 0.11 })
    );
  },
  bell() {
    tone(880, 0.14, { type: "triangle", gain: 0.1 });
    tone(1174.7, 0.22, { type: "triangle", gain: 0.09, when: 0.1 });
    tone(1568, 0.3, { type: "sine", gain: 0.05, when: 0.18 });
  },
};
