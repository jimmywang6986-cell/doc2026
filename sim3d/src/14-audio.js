/* 程序化音效：卡扣、螺丝、风扇、POST 蜂鸣与环境底噪（WebAudio，无外部资源） */
(function (root) {
  'use strict';

  const A = {
    ready: false,
    muted: false,

    init() {
      if (this.ready) return;
      const Ctx = window.AudioContext || window.webkitAudioContext;
      if (!Ctx) return;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.5;
      this.master.connect(this.ctx.destination);
      this.noiseBuf = this.makeNoise(2.0);
      this.ready = true;
      this.ambient();
    },

    resume() {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
    },

    makeNoise(sec) {
      const n = Math.floor(this.ctx.sampleRate * sec);
      const buf = this.ctx.createBuffer(1, n, this.ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < n; i++) d[i] = Math.random() * 2 - 1;
      return buf;
    },

    /** 环境：房间底噪 + 可变风扇声 */
    ambient() {
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      src.loop = true;
      const lp = this.ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.value = 380;
      const g = this.ctx.createGain();
      g.gain.value = 0.022;
      src.connect(lp); lp.connect(g); g.connect(this.master);
      src.start();
      this.roomNoise = g;

      const fsrc = this.ctx.createBufferSource();
      fsrc.buffer = this.noiseBuf;
      fsrc.loop = true;
      const bp = this.ctx.createBiquadFilter();
      bp.type = 'bandpass';
      bp.frequency.value = 700;
      bp.Q.value = 0.9;
      const fg = this.ctx.createGain();
      fg.gain.value = 0;
      fsrc.connect(bp); bp.connect(fg); fg.connect(this.master);
      fsrc.start();
      this.fanGain = fg;
      this.fanFilter = bp;
    },

    setFans(level) {
      if (!this.ready) return;
      const t = this.ctx.currentTime;
      this.fanGain.gain.cancelScheduledValues(t);
      this.fanGain.gain.linearRampToValueAtTime(level * 0.09, t + 0.6);
      this.fanFilter.frequency.linearRampToValueAtTime(420 + level * 620, t + 0.6);
    },

    tone(freq, dur, type, gain, slide) {
      if (!this.ready || this.muted) return;
      const t = this.ctx.currentTime;
      const o = this.ctx.createOscillator();
      const g = this.ctx.createGain();
      o.type = type || 'sine';
      o.frequency.setValueAtTime(freq, t);
      if (slide) o.frequency.exponentialRampToValueAtTime(Math.max(40, slide), t + dur);
      g.gain.setValueAtTime(0.0001, t);
      g.gain.exponentialRampToValueAtTime(gain || 0.18, t + 0.008);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      o.connect(g); g.connect(this.master);
      o.start(t); o.stop(t + dur + 0.02);
    },

    burst(dur, freq, q, gain, type) {
      if (!this.ready || this.muted) return;
      const t = this.ctx.currentTime;
      const src = this.ctx.createBufferSource();
      src.buffer = this.noiseBuf;
      const f = this.ctx.createBiquadFilter();
      f.type = type || 'bandpass';
      f.frequency.value = freq;
      f.Q.value = q || 1.2;
      const g = this.ctx.createGain();
      g.gain.setValueAtTime(gain || 0.25, t);
      g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
      src.connect(f); f.connect(g); g.connect(this.master);
      src.start(t, Math.random(), dur + 0.05);
    },

    play(name) {
      if (!this.ready || this.muted) return;
      switch (name) {
        case 'click': this.burst(0.05, 2600, 3, 0.28); this.tone(880, 0.05, 'square', 0.05); break;
        case 'seat': this.burst(0.11, 1200, 1.6, 0.30); this.tone(180, 0.12, 'sine', 0.10, 120); break;
        case 'screw': for (let i = 0; i < 4; i++) setTimeout(() => this.burst(0.035, 3200, 5, 0.16), i * 70); break;
        case 'squeeze': this.burst(0.28, 520, 0.7, 0.10, 'lowpass'); break;
        case 'pickup': this.burst(0.06, 1800, 2.5, 0.16); break;
        case 'deny': this.tone(220, 0.14, 'sawtooth', 0.10, 150); break;
        case 'ok': this.tone(660, 0.09, 'triangle', 0.12); setTimeout(() => this.tone(990, 0.12, 'triangle', 0.12), 90); break;
        case 'card': this.tone(1320, 0.06, 'sine', 0.07); break;
        case 'beep': this.tone(1046, 0.28, 'square', 0.14); break;
        case 'relay': this.burst(0.05, 320, 1.0, 0.35, 'lowpass'); break;
        case 'boot':
          this.tone(392, 0.18, 'triangle', 0.10);
          setTimeout(() => this.tone(523, 0.18, 'triangle', 0.10), 170);
          setTimeout(() => this.tone(659, 0.30, 'triangle', 0.12), 340);
          break;
        case 'win':
          [523, 659, 784, 1046].forEach((f, i) => setTimeout(() => this.tone(f, 0.35, 'triangle', 0.11), i * 150));
          break;
        default: break;
      }
    },

    step() {
      if (!this.ready || this.muted) return;
      this.burst(0.07, 220 + Math.random() * 120, 0.8, 0.05, 'lowpass');
    },
  };

  root.AUDIO = A;
})(window);
