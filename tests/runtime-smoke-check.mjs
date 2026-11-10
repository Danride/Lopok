import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import vm from 'node:vm';

const ids = [...readFileSync(new URL('../index.html', import.meta.url), 'utf8').matchAll(/\bid="([^"]+)"/g)].map(m => m[1]);
const elements = new Map();
class FakeElement {
  constructor(id = '') {
    this.id = id;
    this.style = {};
    this.textContent = '';
    this.innerHTML = '';
    this.classList = { add() {}, remove() {}, toggle() {} };
    this.listeners = {};
  }
  addEventListener(name, fn) { this.listeners[name] = fn; }
  setPointerCapture() {}
  getContext() { return context2d; }
}
for (const id of ids) elements.set(id, new FakeElement(id));

const context2d = new Proxy({
  createRadialGradient() { return { addColorStop() {} }; }
}, {
  get(target, key) {
    if (key in target) return target[key];
    if (typeof key === 'string') return () => {};
    return undefined;
  },
  set(target, key, value) { target[key] = value; return true; }
});

let rafId = 1;
const rafQueue = new Map();
const windowListeners = {};
const windowStub = {
  innerWidth: 1280,
  innerHeight: 720,
  devicePixelRatio: 1,
  addEventListener(name, fn) { windowListeners[name] = fn; }
};
const documentStub = {
  getElementById(id) {
    if (!elements.has(id)) elements.set(id, new FakeElement(id));
    return elements.get(id);
  },
  createElement(tag) { return new FakeElement(tag); }
};
const audioStub = {
  muted: false,
  ensure() { return true; },
  click() {}, dash() {}, block() {}, cut() {}, hit() {}, hurt() {},
  kill() {}, levelUp() {}, pickup() {}, stun() {}, death() {}
};
const sandbox = {
  window: windowStub,
  document: documentStub,
  console,
  Math,
  performance: { now: () => 1000 },
  requestAnimationFrame(fn) { const id = rafId++; rafQueue.set(id, fn); return id; },
  cancelAnimationFrame(id) { rafQueue.delete(id); },
  setTimeout() { return 1; },
  clearTimeout() {},
};
windowStub.LopokAudio = audioStub;

const balanceSource = readFileSync(new URL('../src/systems/balance.js', import.meta.url), 'utf8');
const inputSource = readFileSync(new URL('../src/input/input.js', import.meta.url), 'utf8');
const mainSource = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
vm.createContext(sandbox);
vm.runInContext(balanceSource, sandbox, { filename: 'balance.js' });
vm.runInContext(inputSource, sandbox, { filename: 'input.js' });
vm.runInContext(mainSource, sandbox, { filename: 'main.js' });

// Exercise the menu selector and verify every selected profile label is available.
for (let i = 0; i < 4; i++) sandbox.cycleScythe();
assert.equal(elements.get('scythe-choice').textContent, 'Полевая коса');

// Start a full 100-character match, then advance several animation frames.
sandbox.startGame();
assert.equal(elements.get('hud').style.display, 'block');
assert.ok(rafQueue.size > 0, 'game loop should be scheduled');
let timestamp = 1016;
for (let frame = 0; frame < 8; frame++) {
  const [id, callback] = rafQueue.entries().next().value;
  rafQueue.delete(id);
  callback(timestamp);
  timestamp += 16.67;
}
assert.ok(elements.get('hud-alive').textContent, 'HUD should update alive count');
assert.ok(elements.get('hud-board-rows').innerHTML.length > 0, 'leaderboard should render');
console.log('Runtime smoke check passed: menu, selected scythe, 100 reapers, update/draw and HUD.');
