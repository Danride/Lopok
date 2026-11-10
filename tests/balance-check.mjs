import { readFileSync } from 'node:fs';
import { strict as assert } from 'node:assert';
import vm from 'node:vm';

const source = readFileSync(new URL('../src/systems/balance.js', import.meta.url), 'utf8');
const windowStub = {};
vm.runInNewContext(source, { window: windowStub, Object });
const { SCYTHES, SCYTHE_ORDER, TUNING } = windowStub.LopokBalance;

assert.deepEqual(Array.from(SCYTHE_ORDER), ['sickle', 'field', 'long', 'hook']);
assert.equal(Object.keys(SCYTHES).length, 4);
for (const key of SCYTHE_ORDER) {
  const weapon = SCYTHES[key];
  assert.ok(weapon.range > 0.7 && weapon.range < 1.3, `${key}: range in sensible bounds`);
  assert.ok(weapon.damage > 0.7 && weapon.damage < 1.2, `${key}: damage in sensible bounds`);
  assert.ok(weapon.hitInterval >= 0.4 && weapon.hitInterval <= 0.85, `${key}: hit interval in sensible bounds`);
  assert.ok(weapon.bladeWidth >= 7 && weapon.bladeWidth <= 12, `${key}: visible blade width`);
}

assert.ok(SCYTHES.sickle.hitInterval < SCYTHES.field.hitInterval, 'sickle is the quick option');
assert.ok(SCYTHES.long.range > SCYTHES.field.range, 'long scythe trades for reach');
assert.ok(SCYTHES.long.hitInterval > SCYTHES.field.hitInterval, 'long scythe attacks more slowly');
assert.ok(SCYTHES.hook.knockback > SCYTHES.field.knockback, 'hook has a control niche');
assert.ok(TUNING.magnetPulse >= 0.35, 'magnet is rate limited');
assert.ok(TUNING.magnetHarvestsPerPulse <= 2, 'magnet burst is capped');
assert.ok(TUNING.rageDamageMultiplier < 1.6, 'rage cannot double all damage');
assert.ok(TUNING.shieldHits <= 2, 'shield has a limited hit budget');

console.log('Balance checks passed: four weapon identities and capped bonuses verified.');
