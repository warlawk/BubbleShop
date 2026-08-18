/**
 * Audio System - Procedural sound effects generator using Web Audio API
 * Generates retro-style game sounds without external audio files
 */

let ctx: AudioContext | null = null;
let muted = false;

/**
 * Set global mute state for all sound effects
 */
export function setMuted(m: boolean) {
  muted = m;
}

/**
 * Get or create the AudioContext singleton
 * Handles browser compatibility and auto-resume from suspended state
 */
function ac(): AudioContext | null {
  try {
    if (!ctx) {
      const AC = window.AudioContext || (window as any).webkitAudioContext;
      if (!AC) return null;
      ctx = new AC();
    }
    // Browsers require user interaction before audio can play
    if (ctx.state === "suspended") ctx.resume();
    return ctx;
  } catch {
    return null;
  }
}

/**
 * Play a single tone with optional frequency sweep
 * @param freq - Starting frequency in Hz
 * @param dur - Duration in seconds
 * @param opts.type - Oscillator waveform type (sine, square, triangle, sawtooth)
 * @param opts.gain - Volume level (0-1)
 * @param opts.when - Delay before playing (seconds)
 * @param opts.slide - Frequency change over duration (positive=up, negative=down)
 */
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
    // Envelope: quick attack, sustain, decay
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g).connect(c.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  } catch {
    /* ignore audio errors */
  }
}

/**
 * Sound effects library - each method plays a distinct game sound
 */
export const sfx = {
  /** UI button click - short neutral blip */
  click() {
    tone(520, 0.07, { type: "triangle", gain: 0.08 });
  },
  /** Item placement/selection - rising pop */
  pop() {
    tone(300, 0.09, { type: "sine", gain: 0.1, slide: 260 });
  },
  /** Barcode scanner - high-pitched laser chirp */
  scan() {
    tone(2450, 0.075, { type: "square", gain: 0.05 });
    tone(3100, 0.045, { type: "square", gain: 0.028, when: 0.02 });
  },
  /** Error/walkout - low descending buzz */
  error() {
    tone(160, 0.22, { type: "sawtooth", gain: 0.09, slide: -60 });
  },
  /** Payment received - pleasant two-tone */
  coin() {
    tone(980, 0.07, { type: "square", gain: 0.06 });
    tone(1470, 0.12, { type: "square", gain: 0.05, when: 0.06 });
  },
  /** Successful transaction - bright ascending chime */
  ching() {
    tone(1046, 0.09, { type: "triangle", gain: 0.1 });
    tone(1568, 0.16, { type: "triangle", gain: 0.09, when: 0.07 });
  },
  /** Store level up - triumphant four-note arpeggio */
  levelup() {
    [523, 659, 784, 1046].forEach((f, i) =>
      tone(f, 0.14, { type: "triangle", gain: 0.1, when: i * 0.09 })
    );
  },
  /** Day transition - gentle three-note descent */
  day() {
    [784, 659, 523].forEach((f, i) =>
      tone(f, 0.16, { type: "sine", gain: 0.09, when: i * 0.11 })
    );
  },
  /** Victory/special event - celebratory bell chord */
  bell() {
    tone(880, 0.14, { type: "triangle", gain: 0.1 });
    tone(1174.7, 0.22, { type: "triangle", gain: 0.09, when: 0.1 });
    tone(1568, 0.3, { type: "sine", gain: 0.05, when: 0.18 });
  },
};
