/**
 * Lightweight Web Audio SFX (no external assets).
 * Inspired by recording interaction moments; not ripped samples.
 */
export class SFX {
  constructor() {
    this.ctx = null;
    this.enabled = localStorage.getItem('oxy_sfx_muted') !== '1';
    this._lastPeg = 0;
    this._lastBounce = 0;
  }

  ensure() {
    if (!this.ctx) {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return null;
      this.ctx = new AC();
    }
    if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    return this.ctx;
  }

  setEnabled(on) {
    this.enabled = !!on;
    localStorage.setItem('oxy_sfx_muted', on ? '0' : '1');
    if (on) this.ensure();
  }

  toggle() {
    this.setEnabled(!this.enabled);
    return this.enabled;
  }

  _tone({ freq = 440, dur = 0.08, type = 'sine', gain = 0.08, slide = 0, delay = 0 }) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const t0 = ctx.currentTime + delay;
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(gain, t0 + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(ctx.destination);
    osc.start(t0);
    osc.stop(t0 + dur + 0.02);
  }

  _noise({ dur = 0.05, gain = 0.04, hp = 800 }) {
    if (!this.enabled) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const n = Math.floor(ctx.sampleRate * dur);
    const buf = ctx.createBuffer(1, n, ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < n; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / n);
    const src = ctx.createBufferSource();
    src.buffer = buf;
    const filter = ctx.createBiquadFilter();
    filter.type = 'highpass';
    filter.frequency.value = hp;
    const g = ctx.createGain();
    g.gain.value = gain;
    src.connect(filter);
    filter.connect(g);
    g.connect(ctx.destination);
    src.start();
  }

  pull() {
    this._tone({ freq: 220, dur: 0.06, type: 'triangle', gain: 0.03, slide: 40 });
  }

  release(power = 1) {
    const p = Math.max(0.5, Math.min(1.5, power));
    this._tone({ freq: 320 * p, dur: 0.12, type: 'sine', gain: 0.09, slide: 180 });
    this._noise({ dur: 0.04, gain: 0.03, hp: 1200 });
  }

  peg() {
    const now = performance.now();
    if (now - this._lastPeg < 40) return;
    this._lastPeg = now;
    this._tone({ freq: 900 + Math.random() * 200, dur: 0.035, type: 'square', gain: 0.035 });
  }

  bounceSoft() {
    const now = performance.now();
    if (now - this._lastBounce < 70) return;
    this._lastBounce = now;
    this._tone({ freq: 260, dur: 0.05, type: 'triangle', gain: 0.04, slide: -60 });
  }

  noReact() {
    this._tone({ freq: 180, dur: 0.08, type: 'sine', gain: 0.05, slide: -40 });
  }

  weak() {
    this._tone({ freq: 210, dur: 0.07, type: 'triangle', gain: 0.045, slide: -30 });
  }

  transfer() {
    this._tone({ freq: 520, dur: 0.1, type: 'sine', gain: 0.08, slide: 220 });
    this._tone({ freq: 780, dur: 0.12, type: 'sine', gain: 0.05, slide: 120, delay: 0.05 });
  }

  event() {
    this._tone({ freq: 440, dur: 0.09, type: 'square', gain: 0.05, slide: 160 });
    this._noise({ dur: 0.06, gain: 0.035, hp: 600 });
  }

  revive() {
    this._tone({ freq: 360, dur: 0.14, type: 'sine', gain: 0.07, slide: 280 });
    this._tone({ freq: 540, dur: 0.16, type: 'sine', gain: 0.05, slide: 200, delay: 0.08 });
  }

  result() {
    this._tone({ freq: 392, dur: 0.16, type: 'sine', gain: 0.07 });
    this._tone({ freq: 494, dur: 0.18, type: 'sine', gain: 0.06, delay: 0.1 });
    this._tone({ freq: 587, dur: 0.22, type: 'sine', gain: 0.055, delay: 0.2 });
  }

  uiClick() {
    this._tone({ freq: 660, dur: 0.04, type: 'square', gain: 0.03 });
  }

  copyOk() {
    this._tone({ freq: 700, dur: 0.06, type: 'sine', gain: 0.05, slide: 100 });
  }
}

export const sfx = new SFX();
