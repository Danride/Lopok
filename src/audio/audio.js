// Tactile harvest sound palette: muted wood, seed rattle, soft frame drum and warm plucks.
// Synthesized locally with Web Audio; no external files or browser alert dialogs.
(() => {
  'use strict';
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  const audio = {
    ctx: null, master: null, noiseBuffer: null, muted: false,
    ensure() {
      if (!AudioContextClass) return false;
      try {
        if (!this.ctx) {
          this.ctx = new AudioContextClass();
          const compressor = this.ctx.createDynamicsCompressor();
          compressor.threshold.value = -24; compressor.knee.value = 22;
          compressor.ratio.value = 2.6; compressor.attack.value = 0.006; compressor.release.value = 0.22;
          this.master = this.ctx.createGain(); this.master.gain.value = 0.58;
          this.master.connect(compressor); compressor.connect(this.ctx.destination);
          const length = Math.floor(this.ctx.sampleRate * 1.5);
          this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
          const data = this.noiseBuffer.getChannelData(0);
          for (let i = 0; i < length; i++) data[i] = (Math.random() * 2 - 1) * (0.7 - 0.25 * i / length);
        }
        if (this.ctx.state === 'suspended') {
          const resumed = this.ctx.resume(); if (resumed?.catch) resumed.catch(() => {});
        }
        return true;
      } catch (error) { console.warn('Audio unavailable:', error); return false; }
    },
    tone(freq, duration, options = {}) {
      if (this.muted || !this.ensure()) return;
      const { wave = 'triangle', volume = 0.024, endFreq = freq * 0.72, delay = 0, attack = 0.008, cutoff = 1800, detune = 0 } = options;
      const start = this.ctx.currentTime + delay, end = start + duration;
      const osc = this.ctx.createOscillator(), filter = this.ctx.createBiquadFilter(), env = this.ctx.createGain();
      osc.type = wave; osc.frequency.setValueAtTime(Math.max(35, freq), start);
      if (endFreq) osc.frequency.exponentialRampToValueAtTime(Math.max(35, endFreq), end);
      osc.detune.setValueAtTime(detune, start);
      filter.type = 'lowpass'; filter.frequency.setValueAtTime(cutoff, start); filter.Q.value = 0.7;
      env.gain.setValueAtTime(0.0001, start);
      env.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), start + Math.min(attack, duration * 0.35));
      env.gain.exponentialRampToValueAtTime(0.0001, end);
      osc.connect(filter); filter.connect(env); env.connect(this.master);
      osc.start(start); osc.stop(end + 0.03);
    },
    grain(duration, options = {}) {
      if (this.muted || !this.ensure() || !this.noiseBuffer) return;
      const { volume = 0.018, low = 650, high = 2200, delay = 0 } = options;
      const start = this.ctx.currentTime + delay, end = start + duration;
      const src = this.ctx.createBufferSource(), filter = this.ctx.createBiquadFilter(), env = this.ctx.createGain();
      src.buffer = this.noiseBuffer; filter.type = 'bandpass'; filter.frequency.setValueAtTime(high, start);
      filter.frequency.exponentialRampToValueAtTime(Math.max(80, low), end); filter.Q.value = 0.8;
      env.gain.setValueAtTime(0.0001, start); env.gain.exponentialRampToValueAtTime(volume, start + 0.012);
      env.gain.exponentialRampToValueAtTime(0.0001, end);
      src.connect(filter); filter.connect(env); env.connect(this.master);
      src.start(start, 0, duration); src.stop(end + 0.025);
    },
    wood(freq = 180, volume = 0.03, delay = 0) {
      this.tone(freq, 0.09, { wave: 'sine', volume, endFreq: freq * 0.48, delay, attack: 0.002, cutoff: 900 });
      this.grain(0.035, { volume: volume * 0.36, low: 250, high: 850, delay });
    },
    pluck(freq = 440, delay = 0, volume = 0.022) {
      this.tone(freq, 0.24, { wave: 'triangle', volume, endFreq: freq * 0.93, delay, attack: 0.003, cutoff: 2600 });
      this.tone(freq * 2.01, 0.11, { wave: 'sine', volume: volume * 0.22, endFreq: freq * 1.4, delay, attack: 0.002, cutoff: 3400 });
    },
    whoosh(duration = 0.2, volume = 0.02) { this.grain(duration, { volume, low: 180, high: 1400 }); },
    click() { this.wood(430, 0.018); },
    cut() { this.grain(0.095, { volume: 0.024, low: 420, high: 3200 }); this.wood(250, 0.018, 0.018); },
    hit() { this.wood(104, 0.044); this.grain(0.07, { volume: 0.019, low: 140, high: 780, delay: 0.01 }); },
    hurt() { this.wood(82, 0.045); this.tone(132, 0.18, { wave: 'sine', volume: 0.018, endFreq: 74, attack: 0.02, cutoff: 360, delay: 0.025 }); },
    kill() { this.wood(155, 0.035); this.pluck(392, 0.045, 0.018); },
    levelUp() { [293.66, 369.99, 440, 587.33].forEach((f, i) => this.pluck(f, i * 0.09, i === 3 ? 0.03 : 0.021)); },
    dash() { this.whoosh(0.28, 0.028); this.wood(195, 0.014, 0.07); },
    block() { this.wood(225, 0.038); this.wood(310, 0.021, 0.055); },
    stun() { this.tone(180, 0.3, { wave: 'sine', volume: 0.023, endFreq: 116, attack: 0.035, cutoff: 620 }); this.grain(0.14, { volume: 0.008, low: 220, high: 720, delay: 0.025 }); },
    pickup() { this.pluck(523.25, 0, 0.026); this.pluck(659.25, 0.085, 0.023); },
    death() { this.tone(146.83, 0.55, { wave: 'sine', volume: 0.032, endFreq: 65.4, attack: 0.08, cutoff: 500 }); this.grain(0.38, { volume: 0.009, low: 120, high: 500, delay: 0.04 }); }
  };
  window.LopokAudio = audio;
})();
