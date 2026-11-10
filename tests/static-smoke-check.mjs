import { readFileSync, existsSync } from 'node:fs';
import { strict as assert } from 'node:assert';

const html = readFileSync(new URL('../index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../styles/main.css', import.meta.url), 'utf8');
const js = readFileSync(new URL('../src/main.js', import.meta.url), 'utf8');
const audio = readFileSync(new URL('../src/audio/audio.js', import.meta.url), 'utf8');
const input = readFileSync(new URL('../src/input/input.js', import.meta.url), 'utf8');
const balance = readFileSync(new URL('../src/systems/balance.js', import.meta.url), 'utf8');

assert.match(html, /styles\/main\.css/);
assert.match(html, /src\/audio\/audio\.js/);
assert.match(html, /src\/systems\/balance\.js/);
assert.match(html, /src\/input\/input\.js/);
assert.match(html, /src\/main\.js/);
assert.ok(
  html.indexOf('src/audio/audio.js') < html.indexOf('src/systems/balance.js') &&
  html.indexOf('src/systems/balance.js') < html.indexOf('src/input/input.js') &&
  html.indexOf('src/input/input.js') < html.indexOf('src/main.js'),
  'Audio and input modules must load before the game script'
);
assert.ok(css.length > 0, 'CSS file must not be empty');
assert.ok(js.length > 0, 'JavaScript file must not be empty');
assert.match(js, /input\.attach\(canvas, tryDash\)/);
assert.match(js, /function cycleScythe\(\)/);
assert.match(js, /function findFarmTarget\(r\)/);
assert.match(js, /r\.ai\.state === 'hunt'/);
assert.match(js, /weapon\.hitInterval/);
assert.match(balance, /sickle:/);
assert.match(balance, /field:/);
assert.match(balance, /long:/);
assert.match(balance, /hook:/);
assert.match(js, /function rebuildWheatIndex\(\)/);
assert.match(js, /function forNearbyWheat\(/);
assert.doesNotMatch(js, /function harvestAt\(r, hx, hy\) \{\s*for \(const w of wheat\)/);
assert.match(audio, /window\.LopokAudio = sound/);
assert.match(input, /setPointerCapture/);
assert.match(js, /if \(!player \|\| !player\.alive/);
assert.match(css, /@media \(max-width: 640px\)/);
assert.match(css, /safe-area-inset-bottom/);
assert.match(input, /window\.LopokInput = input/);

const ids = [...html.matchAll(/\bid=["']([^"']+)["']/g)].map(m => m[1]);
assert.equal(ids.length, new Set(ids).size, 'HTML IDs must be unique');

console.log('Static smoke checks passed.');
