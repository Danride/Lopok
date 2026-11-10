// Central gameplay tuning and four distinct scythe archetypes.
// These are fictional game stats and 2D visual profiles, not real-world equipment specs.
(() => {
  'use strict';

  const scythes = {
    sickle: {
      id: 'sickle', name: 'Серп', role: 'быстрый ближний бой',
      range: 0.84, damage: 0.88, hitInterval: 0.46, spin: 1.28,
      bladeWidth: 7, bladeCurve: 16, shaftWidth: 3.2,
      metal: '#c8d0c8', edge: '#f0e8d1', accent: '#86b6a1', knockback: 0.88
    },
    field: {
      id: 'field', name: 'Полевая коса', role: 'сбалансированная',
      range: 1.00, damage: 1.00, hitInterval: 0.58, spin: 1.00,
      bladeWidth: 9, bladeCurve: 10, shaftWidth: 3.8,
      metal: '#aeb8c0', edge: '#f0e8d1', accent: '#d8b85b', knockback: 1.00
    },
    long: {
      id: 'long', name: 'Длинная коса', role: 'дальняя дистанция',
      range: 1.22, damage: 1.10, hitInterval: 0.78, spin: 0.78,
      bladeWidth: 11, bladeCurve: 13, shaftWidth: 3.2,
      metal: '#9db7cf', edge: '#edf3f5', accent: '#7fa5c5', knockback: 1.02
    },
    hook: {
      id: 'hook', name: 'Коса-крюк', role: 'контроль пространства',
      range: 1.04, damage: 0.96, hitInterval: 0.68, spin: 0.91,
      bladeWidth: 10, bladeCurve: 3, shaftWidth: 4.2,
      metal: '#b9a9c9', edge: '#f0e8d1', accent: '#aa83c6', knockback: 1.18
    }
  };

  const tuning = {
    baseSpeed: 158,
    levelSpeedLoss: 0.0045,
    speedBuffMultiplier: 1.30,
    speedBuffDuration: 5.5,
    magnetDuration: 7,
    magnetPulse: 0.5,
    magnetHarvestsPerPulse: 2,
    shieldDuration: 9,
    shieldHits: 2,
    rageDuration: 6,
    rageDamageMultiplier: 1.45,
    rageSpinMultiplier: 1.35,
    dashDuration: 0.20,
    dashCooldown: 2.65,
    dashSpeed: 520,
    blockDuration: 0.52,
    blockCooldown: 3.6,
    parryStun: 1.15,
    successfulBlockRecovery: 2.0,
    passiveRegenPerSecond: 0.018,
    levelUpHealFraction: 0.25,
    heartHealFraction: 0.30,
    baseHitDamage: 12,
    perLevelHitDamage: 2.6,
    rodDamageMultiplier: 0.72,
    baseHp: 90,
    hpPerLevel: 12
  };

  window.LopokBalance = Object.freeze({
    SCYTHE_ORDER: Object.freeze(['sickle', 'field', 'long', 'hook']),
    SCYTHES: Object.freeze(Object.fromEntries(
      Object.entries(scythes).map(([key, value]) => [key, Object.freeze(value)])
    )),
    TUNING: Object.freeze(tuning)
  });
})();
