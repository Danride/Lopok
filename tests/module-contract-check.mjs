import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import vm from 'node:vm';

const audioSource = readFileSync(new URL('../src/audio/audio.js', import.meta.url), 'utf8');
const inputSource = readFileSync(new URL('../src/input/input.js', import.meta.url), 'utf8');

class FakeParam {
  value = 0;
  setValueAtTime(value) { this.value = value; }
  exponentialRampToValueAtTime(value) { this.value = value; }
}

class FakeNode {
  constructor() {
    this.gain = new FakeParam();
    this.frequency = new FakeParam();
    this.detune = new FakeParam();
    this.Q = new FakeParam();
    this.threshold = new FakeParam();
    this.knee = new FakeParam();
    this.ratio = new FakeParam();
    this.attack = new FakeParam();
    this.release = new FakeParam();
  }
  connect() {}
  start() {}
  stop() {}
}

class FakeAudioContext {
  currentTime = 1;
  sampleRate = 8000;
  state = 'running';
  destination = {};
  oscillatorCount = 0;

  createDynamicsCompressor() { return new FakeNode(); }
  createGain() { return new FakeNode(); }
  createBiquadFilter() { return new FakeNode(); }
  createBuffer(_channels, length) {
    const samples = new Float32Array(length);
    return { getChannelData: () => samples };
  }
  createBufferSource() { return new FakeNode(); }
  createOscillator() {
    this.oscillatorCount++;
    return new FakeNode();
  }
  resume() { this.state = 'running'; return Promise.resolve(); }
}

const audioWindow = { AudioContext: FakeAudioContext };
vm.runInNewContext(audioSource, { window: audioWindow, Math, console });
const audio = audioWindow.LopokAudio;
assert.ok(audio, 'audio module must register itself');
assert.equal(audio.ensure(), true);

for (const effect of [
  'click', 'cut', 'hit', 'hurt', 'kill', 'levelUp',
  'dash', 'block', 'stun', 'pickup', 'death'
]) {
  assert.equal(typeof audio[effect], 'function', `${effect} sound must exist`);
  audio[effect]();
}
assert.ok(audio.ctx.oscillatorCount >= 15, 'sound effects should schedule notes');

audio.muted = true;
const mutedCount = audio.ctx.oscillatorCount;
audio.click();
assert.equal(audio.ctx.oscillatorCount, mutedCount, 'muted audio must stay silent');

let clock = 1000;
const canvasListeners = {};
const windowListeners = {};
const inputWindow = {
  LopokAudio: audio,
  addEventListener: (name, callback) => { windowListeners[name] = callback; }
};
vm.runInNewContext(inputSource, {
  window: inputWindow,
  Math,
  performance: { now: () => clock }
});

const canvas = {
  capturedPointer: null,
  addEventListener: (name, callback) => { canvasListeners[name] = callback; },
  setPointerCapture(id) { this.capturedPointer = id; }
};

let dashCalls = 0;
inputWindow.LopokInput.attach(canvas, () => { dashCalls++; });
canvasListeners.pointerdown({ pointerId: 7, clientX: 100, clientY: 100 });
assert.equal(canvas.capturedPointer, 7, 'pointer must be captured');
canvasListeners.pointermove({ pointerId: 7, clientX: 150, clientY: 100 });
assert.ok(inputWindow.LopokInput.x > 0.8, 'pointer movement should update horizontal input');
canvasListeners.pointerup({ pointerId: 7 });
assert.equal(inputWindow.LopokInput.x, 0, 'pointer release should clear input');

clock += 500;
canvasListeners.pointerdown({ pointerId: 8, clientX: 120, clientY: 120 });
clock += 100;
canvasListeners.pointerdown({ pointerId: 9, clientX: 125, clientY: 122 });
assert.equal(dashCalls, 1, 'double tap should trigger exactly one dash callback');

windowListeners.blur();
assert.equal(inputWindow.LopokInput.y, 0, 'window blur should clear movement input');

console.log('Audio and input module contract checks passed.');
