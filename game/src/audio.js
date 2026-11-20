// Sound: WebAudio only — synthesized radio stations and effects, no files.
// Three original stations: Delta 88.1 Rain FM, Vesper Talk, Bayou Gold.
import { RANKS } from './player.js';

export const STATIONS = [
  { name: 'Delta 88.1 Rain FM', kind: 'rain' },
  { name: 'Vesper Talk', kind: 'talk' },
  { name: 'Bayou Gold', kind: 'bayou' },
];

// Chord progressions (Hz) per station, looped by a step scheduler.
const PROG = {
  rain: [[220, 261.6, 329.6], [174.6, 220, 261.6], [196, 246.9, 293.7], [146.8, 220, 293.7]],
  bayou: [[146.8, 185, 220], [110, 164.8, 220], [130.8, 196, 246.9], [98, 146.8, 196]],
  talk: [[110], [110], [130.8], [98]],
};

export function initAudio(G) {
  G.audio = {
    ctx: null, station: 0, step: 0, nextAt: 0, sirenOsc: null, muted: false,
    ensure() {
      if (!this.ctx) {
        try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); } catch { return; }
      }
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },
    sfx(name) {
      this.ensure();
      if (!this.ctx || this.muted) return;
      const ctx = this.ctx;
      const mk = (freq, dur, type, gain, slideTo) => {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = type; o.frequency.setValueAtTime(freq, ctx.currentTime);
        if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, ctx.currentTime + dur);
        g.gain.setValueAtTime(gain, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + dur);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + dur);
      };
      if (name === 'shot') mk(900, 0.12, 'square', 0.12, 120);
      else if (name === 'eshot') mk(700, 0.1, 'square', 0.05, 150);
      else if (name === 'hit') mk(220, 0.08, 'sine', 0.15, 90);
      else if (name === 'pickup') { mk(660, 0.1, 'sine', 0.12); setTimeout(() => mk(990, 0.14, 'sine', 0.12), 90); }
      else if (name === 'complete') { [523, 659, 784].forEach((f, i) => setTimeout(() => mk(f, 0.18, 'sine', 0.12), i * 110)); }
      else if (name === 'mission') mk(440, 0.2, 'sine', 0.1, 660);
      else if (name === 'ability') { mk(520, 0.12, 'sine', 0.1); setTimeout(() => mk(780, 0.16, 'sine', 0.1), 100); }
      else if (name === 'takeover') { [392, 523, 659, 784].forEach((f, i) => setTimeout(() => mk(f, 0.22, 'sine', 0.12), i * 130)); }
      else if (name === 'door') mk(180, 0.08, 'triangle', 0.1, 120);
      else if (name === 'swap') mk(500, 0.07, 'triangle', 0.08, 700);
      else if (name === 'siren') {
        if (this.sirenOsc) return;
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = 'sine'; o.frequency.value = 700; g.gain.value = 0.02;
        const lfo = ctx.createOscillator(); lfo.frequency.value = 0.5;
        const lg = ctx.createGain(); lg.gain.value = 250;
        lfo.connect(lg); lg.connect(o.frequency);
        o.connect(g); g.connect(ctx.destination);
        o.start(); lfo.start();
        this.sirenOsc = { o, lfo, g };
        setTimeout(() => this.stopSiren(), 4000);
      }
    },
    stopSiren() {
      if (!this.sirenOsc) return;
      try { this.sirenOsc.o.stop(); this.sirenOsc.lfo.stop(); } catch { /* already stopped */ }
      this.sirenOsc = null;
    },
    cycleStation(G2) {
      this.station = (this.station + 1) % STATIONS.length;
      this.step = 0;
      if (G2.hud) G2.hud.notify(`Radio: ${STATIONS[this.station].name}`);
    },
    tick(G2, dt) {
      if (!this.ctx || this.muted) return;
      const st = STATIONS[this.station];
      const stepDur = st.kind === 'talk' ? 0.5 : 0.42;
      this.nextAt -= dt;
      if (this.nextAt > 0) return;
      this.nextAt = stepDur;
      const chord = PROG[st.kind][this.step % PROG[st.kind].length];
      const ctx = this.ctx;
      for (const f of chord) {
        const o = ctx.createOscillator(), g = ctx.createGain();
        o.type = st.kind === 'bayou' ? 'triangle' : 'sine';
        o.frequency.value = f;
        g.gain.setValueAtTime(0.035, ctx.currentTime);
        g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + stepDur * 1.8);
        o.connect(g); g.connect(ctx.destination);
        o.start(); o.stop(ctx.currentTime + stepDur * 1.8);
      }
      // A soft rain patter: filtered noise bursts on Rain FM.
      if (st.kind === 'rain' && this.step % 2 === 0) {
        const len = ctx.sampleRate * 0.08;
        const buf = ctx.createBuffer(1, len, ctx.sampleRate);
        const data = buf.getChannelData(0);
        for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * 0.05;
        const src = ctx.createBufferSource(); src.buffer = buf;
        const g = ctx.createGain(); g.gain.value = 0.5;
        src.connect(g); g.connect(ctx.destination); src.start();
      }
      this.step += 1;
    },
  };
  return G.audio;
}
export { RANKS };
