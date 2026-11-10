// Soft procedural sound engine for ЖНЕЦЫ.
// Uses Web Audio API only: no downloads, external tracks, or large audio assets.
(() => {
  'use strict';

  const AudioContextClass = window.AudioContext || window.webkitAudioContext;

  const sound = {
    ctx: null,
    master: null,
    noiseBuffer: null,
    muted: false,

    ensure() {
      if (!AudioContextClass) return false;

      try {
        if (!this.ctx) {
          this.ctx = new AudioContextClass();

          const compressor = this.ctx.createDynamicsCompressor();
          compressor.threshold.value = -20;
          compressor.knee.value = 18;
          compressor.ratio.value = 3;
          compressor.attack.value = 0.004;
          compressor.release.value = 0.18;

          this.master = this.ctx.createGain();
          this.master.gain.value = 0.72;
          this.master.connect(compressor);
          compressor.connect(this.ctx.destination);

          // Reuse one noise buffer for soft rustles and airy movement sounds.
          const length = this.ctx.sampleRate * 2;
          this.noiseBuffer = this.ctx.createBuffer(1, length, this.ctx.sampleRate);
          const samples = this.noiseBuffer.getChannelData(0);
          for (let i = 0; i < length; i++) {
            samples[i] = (Math.random() * 2 - 1) * 0.55;
          }
        }

        if (this.ctx.state === 'suspended') {
          const resumeResult = this.ctx.resume();
          if (resumeResult && typeof resumeResult.catch === 'function') {
            resumeResult.catch(() => {});
          }
        }
        return true;
      } catch (error) {
        // Audio is optional; gameplay must continue if a browser blocks audio.
        console.warn('Audio could not be initialized:', error);
        return false;
      }
    },

    note(frequency, duration, options = {}) {
      if (this.muted || !this.ensure()) return;

      const {
        wave = 'sine',
        volume = 0.035,
        slide = null,
        delay = 0,
        attack = 0.012,
        cutoff = 0,
        detune = 0
      } = options;

      const startAt = this.ctx.currentTime + Math.max(0, delay);
      const endAt = startAt + Math.max(0.025, duration);
      const oscillator = this.ctx.createOscillator();
      const envelope = this.ctx.createGain();
      let output = oscillator;

      oscillator.type = wave;
      oscillator.frequency.setValueAtTime(Math.max(30, frequency), startAt);
      oscillator.detune.setValueAtTime(detune, startAt);

      if (slide && slide > 0) {
        oscillator.frequency.exponentialRampToValueAtTime(Math.max(30, slide), endAt);
      }

      if (cutoff > 0) {
        const filter = this.ctx.createBiquadFilter();
        filter.type = 'lowpass';
        filter.frequency.setValueAtTime(cutoff, startAt);
        filter.Q.value = 0.55;
        oscillator.connect(filter);
        output = filter;
      }

      const peak = Math.max(0.0001, volume);
      envelope.gain.setValueAtTime(0.0001, startAt);
      envelope.gain.exponentialRampToValueAtTime(peak, startAt + Math.min(attack, duration * 0.45));
      envelope.gain.exponentialRampToValueAtTime(0.0001, endAt);

      output.connect(envelope);
      envelope.connect(this.master);
      oscillator.start(startAt);
      oscillator.stop(endAt + 0.025);
    },

    rustle(duration, options = {}) {
      if (this.muted || !this.ensure() || !this.noiseBuffer) return;

      const {
        volume = 0.025,
        filterType = 'lowpass',
        cutoff = 1500,
        delay = 0
      } = options;

      const startAt = this.ctx.currentTime + Math.max(0, delay);
      const source = this.ctx.createBufferSource();
      const filter = this.ctx.createBiquadFilter();
      const envelope = this.ctx.createGain();

      source.buffer = this.noiseBuffer;
      filter.type = filterType;
      filter.frequency.setValueAtTime(cutoff, startAt);
      filter.Q.value = 0.65;

      envelope.gain.setValueAtTime(0.0001, startAt);
      envelope.gain.exponentialRampToValueAtTime(Math.max(0.0001, volume), startAt + 0.018);
      envelope.gain.exponentialRampToValueAtTime(0.0001, startAt + duration);

      source.connect(filter);
      filter.connect(envelope);
      envelope.connect(this.master);
      source.start(startAt, 0, duration);
      source.stop(startAt + duration + 0.025);
    },

    click() {
      this.note(620, 0.055, { volume: 0.026, slide: 790, attack: 0.004 });
      this.note(1040, 0.035, { volume: 0.012, delay: 0.012, attack: 0.003 });
    },

    cut() {
      this.rustle(0.075, { volume: 0.018, filterType: 'highpass', cutoff: 1800 });
      this.note(390, 0.075, { wave: 'triangle', volume: 0.018, slide: 270, attack: 0.006 });
    },

    hit() {
      this.note(150, 0.12, { volume: 0.045, slide: 92, attack: 0.004, cutoff: 520 });
      this.rustle(0.055, { volume: 0.012, cutoff: 430 });
    },

    hurt() {
      this.note(225, 0.2, { wave: 'triangle', volume: 0.043, slide: 118, attack: 0.018, cutoff: 650 });
      this.note(164, 0.16, { volume: 0.018, slide: 112, delay: 0.035, attack: 0.02 });
    },

    kill() {
      this.note(260, 0.16, { wave: 'triangle', volume: 0.032, slide: 360, attack: 0.012 });
      this.note(390, 0.2, { volume: 0.026, slide: 510, delay: 0.065, attack: 0.018 });
    },

    levelUp() {
      [523.25, 659.25, 783.99, 1046.5].forEach((frequency, index) => {
        this.note(frequency, 0.2, {
          volume: index === 3 ? 0.038 : 0.028,
          delay: index * 0.075,
          attack: 0.018
        });
      });
    },

    dash() {
      this.rustle(0.22, { volume: 0.032, cutoff: 1050 });
      this.note(280, 0.2, { volume: 0.018, slide: 145, attack: 0.035, cutoff: 750 });
    },

    block() {
      this.note(740, 0.11, { volume: 0.035, slide: 920, attack: 0.006 });
      this.note(1108.7, 0.14, { volume: 0.025, delay: 0.045, attack: 0.012 });
    },

    stun() {
      this.note(330, 0.28, { wave: 'triangle', volume: 0.025, slide: 247, attack: 0.04, cutoff: 850 });
      this.note(392, 0.2, { volume: 0.014, slide: 294, delay: 0.04, attack: 0.035 });
    },

    pickup() {
      this.note(659.25, 0.11, { volume: 0.026, slide: 783.99, attack: 0.008 });
      this.note(987.77, 0.14, { volume: 0.025, delay: 0.07, attack: 0.012 });
    },

    death() {
      [392, 329.63, 261.63, 196].forEach((frequency, index) => {
        this.note(frequency, 0.24, {
          wave: 'triangle',
          volume: 0.026 - index * 0.003,
          delay: index * 0.13,
          slide: frequency * 0.92,
          attack: 0.025,
          cutoff: 900
        });
      });
    }
  };

  window.LopokAudio = sound;
})();
