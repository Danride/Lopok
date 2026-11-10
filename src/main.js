// Audio is initialized separately in src/audio/audio.js.
const audio = window.LopokAudio;
const { SCYTHES, SCYTHE_ORDER, TUNING: BALANCE } = window.LopokBalance;
let selectedScytheId = 'field';

// ═══════════════════════════════════════════════════════════════════════════════
// CANVAS
// ═══════════════════════════════════════════════════════════════════════════════
const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');
let W, H, dpr;

function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth;
  H = window.innerHeight;
  canvas.width = Math.floor(W * dpr);
  canvas.height = Math.floor(H * dpr);
  canvas.style.width = W + 'px';
  canvas.style.height = H + 'px';
}
resize();
window.addEventListener('resize', resize);

// ═══════════════════════════════════════════════════════════════════════════════
// CONSTANTS / HELPERS
// ═══════════════════════════════════════════════════════════════════════════════
const CELL = 1400, CHUNK = 280, GRID = 3, WORLD = CELL * GRID;
const rand = (a, b) => a + Math.random() * (b - a);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const dist2 = (ax, ay, bx, by) => { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; };
const segDist2 = (px, py, ax, ay, bx, by) => {
  const abx = bx - ax, aby = by - ay;
  const t = clamp(((px - ax) * abx + (py - ay) * aby) / (abx * abx + aby * aby || 1), 0, 1);
  const dx = px - (ax + abx * t), dy = py - (ay + aby * t);
  return dx * dx + dy * dy;
};

const BONUS_COLOR = { speed: '#7fd1c0', magnet: '#d9812e', shield: '#8fb8e8', rage: '#e06048', coin: '#e8c547', heart: '#e08090' };
const BUFF_META = {
  speed: { label: 'ВЕТЕР', color: '#7fd1c0' },
  magnet: { label: 'МАГНИТ', color: '#d9812e' },
  shield: { label: 'ЩИТ', color: '#8fb8e8' },
  rage: { label: 'ЯРОСТЬ', color: '#e06048' }
};

const REGIONS = [
  { id: 'center', name: 'Центровое поле', cells: [[1,1]], anchor: [1,1], ground: '#b3913c', groundAlt: '#ab8836', wheatStalk: '#8f7a2a', wheatHead: '#ecd06a', wheatXp: 8, wheatMin: 26, wheatMax: 40, grow: 12, catCount: 10, catColor: '#7c6a2c', catXp: 16, weights: [['coin', 4], ['heart', 2], ['speed', 2], ['magnet', 1], ['shield', 1], ['rage', 1]] },
  { id: 'north',  name: 'Мерзлая грива', cells: [[0,0],[1,0],[2,0]], anchor: [1,0], ground: '#7e93a3', groundAlt: '#768b9b', wheatStalk: '#5f7484', wheatHead: '#dfe8dd', wheatXp: 15, wheatMin: 20, wheatMax: 28, grow: 16, catCount: 16, catColor: '#b9c9d6', catXp: 26, weights: [['shield', 4], ['heart', 3], ['coin', 1], ['rage', 1]] },
  { id: 'south',  name: 'Сухая степь', cells: [[0,2],[1,2],[2,2]], anchor: [1,2], ground: '#c08a4a', groundAlt: '#b78143', wheatStalk: '#93662c', wheatHead: '#e8b84b', wheatXp: 5, wheatMin: 30, wheatMax: 40, grow: 8, catCount: 24, catColor: '#a3552e', catXp: 10, weights: [['speed', 4], ['magnet', 3], ['coin', 2], ['heart', 1]] },
  { id: 'west',   name: 'Туманный луг', cells: [[0,1]], anchor: [0,1], ground: '#79995f', groundAlt: '#719157', wheatStalk: '#55703c', wheatHead: '#d6d97e', wheatXp: 7, wheatMin: 22, wheatMax: 38, grow: 11, catCount: 18, catColor: '#4c6b34', catXp: 15, weights: [['magnet', 4], ['coin', 3], ['speed', 1], ['heart', 2]] },
  { id: 'east',   name: 'Багряная заря', cells: [[2,1]], anchor: [2,1], ground: '#a86752', groundAlt: '#9f5f4b', wheatStalk: '#7a4534', wheatHead: '#f0b271', wheatXp: 11, wheatMin: 20, wheatMax: 34, grow: 13, catCount: 14, catColor: '#8c3b30', catXp: 20, weights: [['rage', 4], ['shield', 2], ['speed', 2], ['coin', 1]] }
];

function cellRegion(cx, cy) {
  if (cy === 0) return 1;
  if (cy === GRID - 1) return 2;
  if (cx === 0) return 3;
  if (cx === GRID - 1) return 4;
  return 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STATE
// ═══════════════════════════════════════════════════════════════════════════════
let running = false, paused = false, gameOver = false;
let time = 0, lastT = 0;
let player, reapers = [], wheat = [], cats = [], bonuses = [], particles = [], texts = [];
const WHEAT_BUCKET_SIZE = 160;
const WHEAT_BUCKET_STRIDE = 64;
let wheatBuckets = new Map();
let camX = WORLD / 2, camY = WORLD / 2, zoom = 1;
let shakeT = 0, shakeAmp = 0, flash = 0;
const input = window.LopokInput;
let lastRegion = -2, regionFlashT = 0;
let bonusSpawnT = 0;
let cutSndCd = 0;

const MAX_PARTICLES = 400;

function xpNeed(level) { return 40 + (level - 1) * 45; }

function createReaper(name, isPlayer, skin, requestedScytheId = null) {
  const gx = Math.floor(Math.random() * GRID), gy = Math.floor(Math.random() * GRID);
  const x = gx * CELL + rand(80, CELL - 80), y = gy * CELL + rand(80, CELL - 80);
  const scytheId = requestedScytheId || (isPlayer ? selectedScytheId : SCYTHE_ORDER[reapers.length % SCYTHE_ORDER.length]);
  const scythe = SCYTHES[scytheId] || SCYTHES.field;
  return {
    id: reapers.length, name, isPlayer, skin, scytheId,
    x, y, vx: 0, vy: 0, dir: rand(0, Math.PI * 2),
    level: 1, xp: 0, score: 0,
    radius: 16, pickLen: 56,
    theta: rand(0, Math.PI * 2),
    omega: rand(2.2, 2.8) * scythe.spin * (Math.random() < 0.5 ? -1 : 1),
    hitCd: 0, hp: 102, maxHp: 102, lastHurt: -10,
    dashT: 0, dashCd: rand(0, 2), dashDx: 0, dashDy: 0,
    speedT: 0, magnetT: 0, shieldT: 0, shieldHits: 0, rageT: 0,
    blockT: 0, blockCd: rand(0, 1.2), stunT: 0, magnetCd: rand(0, 0.25),
    alive: true, respawnT: 0,
    kills: 0, harvests: 0, coinsRun: 0,
    skill: isPlayer ? 1 : rand(0.78, 1.22),
    ai: { thinkT: rand(0, 0.25), tx: x, ty: y, state: 'farm', farmT: 0, orbitA: rand(0, Math.PI * 2), orbit: Math.random() < 0.5 ? -1 : 1, orbitR: rand(70, 150), aimAngle: rand(0, Math.PI * 2), targetId: -1, aggression: rand(0.38, 0.72) }
  };
}

function applyLevel(r) {
  r.radius = clamp(16 + (r.level - 1) * 1.5, 16, 48);
  r.pickLen = clamp((r.radius * 1.9 + 28 + (r.level - 1) * 1.9) * (SCYTHES[r.scytheId] || SCYTHES.field).range, 46, 176);
  r.maxHp = BALANCE.baseHp + r.level * BALANCE.hpPerLevel;
}

function speedOf(r) {
  let s = BALANCE.baseSpeed * (1 - Math.min(r.level, 40) * BALANCE.levelSpeedLoss);
  if (!r.isPlayer) s *= 0.72 + 0.36 * r.skill;
  if (r.speedT > 0) s *= BALANCE.speedBuffMultiplier;
  return s;
}

function zoomFor(level) { return clamp(1.12 - (level - 1) * 0.0085, 0.72, 1.12); }

function addParticle(p) {
  particles.push(p);
  if (particles.length > MAX_PARTICLES) particles.splice(0, particles.length - MAX_PARTICLES);
}

// ═══════════════════════════════════════════════════════════════════════════════
// SPATIAL INDEX — wheat does not move, so its buckets are built once per world.
// ═══════════════════════════════════════════════════════════════════════════════
function wheatBucketKey(bx, by) {
  return bx + by * WHEAT_BUCKET_STRIDE;
}

function rebuildWheatIndex() {
  wheatBuckets = new Map();
  for (const stalk of wheat) {
    const bx = Math.floor(stalk.x / WHEAT_BUCKET_SIZE);
    const by = Math.floor(stalk.y / WHEAT_BUCKET_SIZE);
    const key = wheatBucketKey(bx, by);
    let bucket = wheatBuckets.get(key);
    if (!bucket) {
      bucket = [];
      wheatBuckets.set(key, bucket);
    }
    bucket.push(stalk);
  }
}

function forNearbyWheat(x, y, radius, visit) {
  const minX = Math.max(0, Math.floor((x - radius) / WHEAT_BUCKET_SIZE));
  const maxX = Math.floor((x + radius) / WHEAT_BUCKET_SIZE);
  const minY = Math.max(0, Math.floor((y - radius) / WHEAT_BUCKET_SIZE));
  const maxY = Math.floor((y + radius) / WHEAT_BUCKET_SIZE);

  for (let by = minY; by <= maxY; by++) {
    for (let bx = minX; bx <= maxX; bx++) {
      const bucket = wheatBuckets.get(wheatBucketKey(bx, by));
      if (!bucket) continue;
      for (const stalk of bucket) {
        if (visit(stalk) === false) return false;
      }
    }
  }
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// WORLD GENERATION
// ═══════════════════════════════════════════════════════════════════════════════
function buildWorld() {
  wheat = [];
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const rg = REGIONS[cellRegion(gx, gy)];
      for (let cy = 0; cy < 5; cy++) {
        for (let cx = 0; cx < 5; cx++) {
          const count = rg.wheatMin + Math.floor(rand(0, rg.wheatMax - rg.wheatMin + 1));
          for (let k = 0; k < count; k++) {
            wheat.push({
              x: gx * CELL + cx * CHUNK + rand(16, CHUNK - 16),
              y: gy * CELL + cy * CHUNK + rand(16, CHUNK - 16),
              stage: rand(0.4, 1), grow: rg.grow, phase: rand(0, Math.PI * 2),
              dead: false, cutT: 0, respawn: 0, fallDir: Math.random() < 0.5 ? -1 : 1,
              value: rg.wheatXp, region: cellRegion(gx, gy)
            });
          }
        }
      }
    }
  }
  rebuildWheatIndex();

  cats = [];
  REGIONS.forEach((rg, ri) => {
    for (let i = 0; i < rg.catCount; i++) {
      const [gx, gy] = rg.cells[Math.floor(Math.random() * rg.cells.length)];
      cats.push({
        x: gx * CELL + rand(60, CELL - 60), y: gy * CELL + rand(60, CELL - 60),
        dir: rand(0, Math.PI * 2), speed: rand(20, 38), wig: rand(0, 10),
        alive: true, respawn: 0, region: ri, cellX: gx, cellY: gy
      });
    }
  });
}

function spawnAll() {
  reapers = [];
  const names = ['Серп','Колос','Жнец','Сноп','Зерно','Рожь','Ячмень','Мельник','Хлеб','Солома','Косарь','Борода','Плуг','Овин','Гумно','Ток','Степной','Ветер','Гром','Молот','Крыло','Клык','Шип','Дым','Пепел','Корень','Побег','Ливень','Зной','Иней','Урожай','Полдень'];
  const skins = ['#4f9e4f','#c9503f','#4a7fbf','#e3b93d','#d9812e','#33302b','#e9e5d8','#8a5cbf','#3fb8a8'];
  player = createReaper('ТЫ', true, '#e3b93d');
  applyLevel(player); player.hp = player.maxHp;
  reapers.push(player);
  for (let i = 0; i < 99; i++) {
    const b = createReaper(names[i % names.length] + (i >= names.length ? i : ''), false, skins[Math.floor(Math.random() * skins.length)], SCYTHE_ORDER[i % SCYTHE_ORDER.length]);
    applyLevel(b); b.hp = b.maxHp;
    if (Math.random() < 0.35) { b.level = 2 + Math.floor(rand(0, 6)); applyLevel(b); b.hp = b.maxHp; b.score = b.level * 60; }
    reapers.push(b);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// INPUT
// ═══════════════════════════════════════════════════════════════════════════════
input.attach(canvas, tryDash);

function tryDash() {
  if (!player || !player.alive || player.dashCd > 0 || player.stunT > 0 || gameOver) return;
  let dx = input.x, dy = input.y;
  if (Math.hypot(dx, dy) < 0.2) { dx = Math.cos(player.dir); dy = Math.sin(player.dir); }
  const len = Math.hypot(dx, dy) || 1;
  player.dashDx = dx / len; player.dashDy = dy / len;
  player.dashT = BALANCE.dashDuration; player.dashCd = BALANCE.dashCooldown;
  audio.dash();
  for (let i = 0; i < 6; i++) {
    addParticle({
      x: player.x - player.dashDx * player.radius, y: player.y - player.dashDy * player.radius,
      vx: -player.dashDx * rand(40, 130) + rand(-40, 40), vy: -player.dashDy * rand(40, 130) + rand(-40, 40),
      g: 0, t: 0, max: rand(0.2, 0.4), size: rand(2, 5), color: '#f5e6b0', kind: 'dot'
    });
  }
}

function tryBlock() {
  if (!player || !player.alive || player.blockCd > 0 || player.stunT > 0 || gameOver) return;
  player.blockT = BALANCE.blockDuration; player.blockCd = BALANCE.blockCooldown;
  audio.block();
  for (let i = 0; i < 8; i++) {
    const a = rand(0, Math.PI * 2);
    addParticle({
      x: player.x + Math.cos(a) * (player.radius + 8), y: player.y + Math.sin(a) * (player.radius + 8),
      vx: Math.cos(a) * rand(30, 90), vy: Math.sin(a) * rand(30, 90),
      g: 0, t: 0, max: rand(0.2, 0.35), size: rand(2, 3.5), color: '#f0d878', kind: 'spark'
    });
  }
}

function toggleMute() { audio.muted = !audio.muted; document.getElementById('mute-btn').textContent = audio.muted ? '🔇' : '🔊'; }
function togglePause() { paused = !paused; }

function cycleScythe() {
  const current = SCYTHE_ORDER.indexOf(selectedScytheId);
  selectedScytheId = SCYTHE_ORDER[(current + 1) % SCYTHE_ORDER.length];
  const weapon = SCYTHES[selectedScytheId];
  const label = document.getElementById('scythe-choice');
  const info = document.getElementById('scythe-description');
  if (label) label.textContent = weapon.name;
  if (info) info.textContent = weapon.role + ' · дальность ' + Math.round(weapon.range * 100) + '% · темп ' + Math.round((1 / weapon.hitInterval) * 100) / 100 + '/с';
}

// ═══════════════════════════════════════════════════════════════════════════════
// BONUSES
// ═══════════════════════════════════════════════════════════════════════════════
function rollBonus(rg) {
  let tot = 0;
  for (const [, w] of rg.weights) tot += w;
  let roll = Math.random() * tot;
  for (const [t, w] of rg.weights) { roll -= w; if (roll <= 0) return t; }
  return 'coin';
}

function applyBonus(r, type) {
  switch (type) {
    case 'speed':  r.speedT = BALANCE.speedBuffDuration; break;
    case 'magnet': r.magnetT = BALANCE.magnetDuration; r.magnetCd = 0; break;
    case 'shield': r.shieldT = BALANCE.shieldDuration; r.shieldHits = BALANCE.shieldHits; break;
    case 'rage':   r.rageT = BALANCE.rageDuration; break;
    case 'coin':   if (r.isPlayer) r.coinsRun += 15 + Math.floor(rand(0, 16)); else r.score += 40; break;
    case 'heart':  r.hp = Math.min(r.maxHp, r.hp + r.maxHp * BALANCE.heartHealFraction); break;
  }
  if (r.isPlayer) {
    audio.pickup();
    const label = type === 'speed' ? 'ВЕТЕР!' : type === 'magnet' ? 'МАГНИТ!' : type === 'shield' ? 'ЩИТ!' : type === 'rage' ? 'ЯРОСТЬ!' : type === 'coin' ? 'МОНЕТЫ!' : 'ЛЕЧЕНИЕ!';
    texts.push({ x: r.x, y: r.y - r.radius - 22, txt: label, color: BONUS_COLOR[type], t: 0, big: false });
  }
}

function updateBonuses(dt) {
  bonusSpawnT -= dt;
  if (bonusSpawnT <= 0 && bonuses.length < 42) {
    bonusSpawnT = 0.7;
    const rg = REGIONS[Math.floor(Math.random() * REGIONS.length)];
    const [gx, gy] = rg.cells[Math.floor(Math.random() * rg.cells.length)];
    bonuses.push({
      x: gx * CELL + rand(50, CELL - 50),
      y: gy * CELL + rand(50, CELL - 50),
      type: rollBonus(rg), t: 0, max: 14
    });
  }
  for (let i = bonuses.length - 1; i >= 0; i--) {
    const b = bonuses[i];
    b.t += dt;
    if (b.t >= b.max) { bonuses.splice(i, 1); continue; }
    for (const r of reapers) {
      if (!r.alive) continue;
      if (dist2(r.x, r.y, b.x, b.y) < (r.radius + 15) ** 2) {
        bonuses.splice(i, 1);
        applyBonus(r, b.type);
        break;
      }
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// UPDATE
// ═══════════════════════════════════════════════════════════════════════════════
function update(dt) {
  time += dt;
  if (shakeT > 0) shakeT = Math.max(0, shakeT - dt);
  if (flash > 0) flash = Math.max(0, flash - dt * 1.4);
  if (cutSndCd > 0) cutSndCd -= dt;
  if (regionFlashT > 0) {
    regionFlashT = Math.max(0, regionFlashT - dt);
    if (regionFlashT <= 0) document.getElementById('hud-region').style.display = 'none';
  }
  updateFx(dt);

  if (gameOver) return;

  // Wheat regrow
  for (const w of wheat) {
    if (w.dead) {
      if (w.cutT > 0) w.cutT -= dt;
      else { w.respawn -= dt; if (w.respawn <= 0) { w.dead = false; w.stage = 0; } }
    } else if (w.stage < 1) w.stage = Math.min(1, w.stage + dt / w.grow);
  }

  // Cats
  for (const c of cats) {
    if (!c.alive) { c.respawn -= dt; if (c.respawn <= 0) { c.x = c.cellX * CELL + rand(60, CELL - 60); c.y = c.cellY * CELL + rand(60, CELL - 60); c.alive = true; } continue; }
    c.wig += dt * 6; c.dir += rand(-1.6, 1.6) * dt;
    const nx = c.x + Math.cos(c.dir) * c.speed * dt, ny = c.y + Math.sin(c.dir) * c.speed * dt;
    const bx = c.cellX * CELL, by = c.cellY * CELL;
    if (nx < bx + 30 || nx > bx + CELL - 30) c.dir = Math.PI - c.dir; else c.x = nx;
    if (ny < by + 30 || ny > by + CELL - 30) c.dir = -c.dir; else c.y = ny;
  }

  updateBonuses(dt);

  // Reapers
  for (const r of reapers) {
    if (!r.alive) { if (!r.isPlayer) { r.respawnT -= dt; if (r.respawnT <= 0) respawnBot(r); } continue; }
    r.hitCd = Math.max(0, r.hitCd - dt); r.dashCd = Math.max(0, r.dashCd - dt);
    r.blockT = Math.max(0, r.blockT - dt); r.blockCd = Math.max(0, r.blockCd - dt);
    r.speedT = Math.max(0, r.speedT - dt); r.magnetT = Math.max(0, r.magnetT - dt); r.rageT = Math.max(0, r.rageT - dt);
    if (r.shieldT > 0) { r.shieldT -= dt; if (r.shieldT <= 0) r.shieldHits = 0; }
    if (time - r.lastHurt > 3.5) r.hp = Math.min(r.maxHp, r.hp + r.maxHp * BALANCE.passiveRegenPerSecond * dt);

    if (r.stunT > 0) {
      r.stunT -= dt;
      r.vx *= Math.max(0, 1 - dt * 9); r.vy *= Math.max(0, 1 - dt * 9);
      r.x += r.vx * dt; r.y += r.vy * dt;
      r.x = clamp(r.x, 6, WORLD - 6); r.y = clamp(r.y, 6, WORLD - 6);
      continue;
    }
    const scythe = SCYTHES[r.scytheId] || SCYTHES.field;
    if (!r.isPlayer && r.ai.state === 'hunt' && Number.isFinite(r.ai.aimAngle)) {
      const delta = Math.atan2(Math.sin(r.ai.aimAngle - r.theta), Math.cos(r.ai.aimAngle - r.theta));
      const turnRate = Math.abs(r.omega) * (r.rageT > 0 ? BALANCE.rageSpinMultiplier : 1);
      r.theta += clamp(delta, -turnRate * dt, turnRate * dt);
    } else {
      r.theta += r.omega * (r.rageT > 0 ? BALANCE.rageSpinMultiplier : 1) * dt;
    }

    let ix = 0, iy = 0;
    if (r.isPlayer) { ix = input.x; iy = input.y; }
    else {
      botThink(r, dt);
      const dx = r.ai.tx - r.x, dy = r.ai.ty - r.y, l = Math.hypot(dx, dy);
      if (l > 24) { ix = dx / l; iy = dy / l; }
      let sx = 0, sy = 0;
      for (const o of reapers) {
        if (o === r || !o.alive) continue;
        const d2 = dist2(r.x, r.y, o.x, o.y);
        if (d2 < 190 * 190 && d2 > 0.01) {
          const d = Math.sqrt(d2), f = (190 - d) / 190;
          sx += ((r.x - o.x) / d) * f; sy += ((r.y - o.y) / d) * f;
        }
      }
      if (sx || sy) { ix += sx * 1.5; iy += sy * 1.5; const nl = Math.hypot(ix, iy) || 1; ix /= nl; iy /= nl; }
    }

    const sp = speedOf(r);
    if (r.dashT > 0) { r.dashT -= dt; r.vx = r.dashDx * BALANCE.dashSpeed; r.vy = r.dashDy * BALANCE.dashSpeed; }
    else { r.vx += (ix * sp - r.vx) * Math.min(1, dt * 7); r.vy += (iy * sp - r.vy) * Math.min(1, dt * 7); }
    r.x += r.vx * dt; r.y += r.vy * dt;
    r.x = clamp(r.x, 6, WORLD - 6); r.y = clamp(r.y, 6, WORLD - 6);
    if (Math.hypot(r.vx, r.vy) > 30) r.dir = Math.atan2(r.vy, r.vx);

    const hx = r.x + Math.cos(r.theta) * r.pickLen, hy = r.y + Math.sin(r.theta) * r.pickLen;
    harvestAt(r, hx, hy);

    // Magnet harvests a small burst at a fixed interval, independent of frame rate.
    if (r.magnetT > 0) {
      r.magnetCd = Math.max(0, r.magnetCd - dt);
      if (r.magnetCd <= 0) {
      let n = 0;
      forNearbyWheat(r.x, r.y, 150, (w) => {
        if (!w.dead && w.stage >= 0.6 && dist2(r.x, r.y, w.x, w.y) < 150 * 150) {
          cutWheat(r, w);
          n++;
          if (n >= BALANCE.magnetHarvestsPerPulse) return false;
        }
      });
      r.magnetCd = BALANCE.magnetPulse;
      }
    }
  }

  // Combat
  for (const a of reapers) {
    if (!a.alive || a.stunT > 0) continue;
    const hx = a.x + Math.cos(a.theta) * a.pickLen, hy = a.y + Math.sin(a.theta) * a.pickLen;
    const sx = a.x + Math.cos(a.theta) * a.radius * 0.5, sy = a.y + Math.sin(a.theta) * a.radius * 0.5;
    for (const v of reapers) {
      if (v === a || !v.alive) continue;
      const tipHit = dist2(hx, hy, v.x, v.y) < (v.radius + 7) ** 2;
      const rodHit = !tipHit && segDist2(v.x, v.y, sx, sy, hx, hy) < (v.radius + 5) ** 2;
      if (tipHit || rodHit) {
        if (a.hitCd <= 0) {
          const weapon = SCYTHES[a.scytheId] || SCYTHES.field;
          a.hitCd = weapon.hitInterval;
          let dmg = (BALANCE.baseHitDamage + a.level * BALANCE.perLevelHitDamage) * weapon.damage;
          if (a.rageT > 0) dmg *= BALANCE.rageDamageMultiplier;
          if (rodHit) dmg *= BALANCE.rodDamageMultiplier;
          hurt(v, a, dmg, hx, hy, weapon.knockback);
        }
        break;
      }
    }
  }

  // Body separation
  for (let i = 0; i < reapers.length; i++) {
    const a = reapers[i];
    if (!a.alive) continue;
    for (let j = i + 1; j < reapers.length; j++) {
      const b = reapers[j];
      if (!b.alive) continue;
      const dx = b.x - a.x, dy = b.y - a.y, rr = a.radius + b.radius;
      const d2v = dx * dx + dy * dy;
      if (d2v > 0.01 && d2v < rr * rr) {
        const d = Math.sqrt(d2v), push = ((rr - d) / d) * 0.5;
        a.x -= dx * push * 0.5; a.y -= dy * push * 0.5;
        b.x += dx * push * 0.5; b.y += dy * push * 0.5;
      }
    }
  }

  // Camera
  const k = Math.min(1, dt * 5);
  camX += (player.x - camX) * k;
  camY += (player.y - camY) * k;
  zoom += (zoomFor(player.level) - zoom) * Math.min(1, dt * 2);
}

function harvestAt(r, hx, hy) {
  forNearbyWheat(hx, hy, 40, (w) => {
    if (w.dead || w.stage < 0.6) return;
    if (dist2(hx, hy, w.x, w.y - 10) < 26 * 26) cutWheat(r, w);
  });
  for (const c of cats) {
    if (!c.alive) continue;
    if (dist2(hx, hy, c.x, c.y) < 22 * 22) killCat(r, c);
  }
}

function grantXp(r, amount) {
  r.xp += amount; r.score += amount;
  let leveled = false;
  while (r.xp >= xpNeed(r.level)) { r.xp -= xpNeed(r.level); r.level++; leveled = true; }
  if (leveled) {
    applyLevel(r);
    r.hp = Math.min(r.maxHp, r.hp + r.maxHp * BALANCE.levelUpHealFraction);
    addParticle({ x: r.x, y: r.y, vx: 0, vy: 0, g: 0, t: 0, max: 0.6, size: r.radius, color: '#e8c547', kind: 'ring' });
    if (r.isPlayer) {
      audio.levelUp();
      texts.push({ x: r.x, y: r.y - r.radius - 30, txt: 'УРОВЕНЬ ' + r.level, color: '#e8c547', t: 0, big: true });
    }
  }
}

function cutWheat(r, w) {
  w.dead = true; w.cutT = 0.32; w.respawn = rand(7, 15);
  r.harvests++;
  if (r.isPlayer) r.coinsRun += 1;
  const head = REGIONS[w.region].wheatHead;
  for (let i = 0; i < 4; i++) {
    addParticle({ x: w.x, y: w.y - 14, vx: rand(-50, 50), vy: rand(-110, -30), g: 240, t: 0, max: rand(0.3, 0.55), size: rand(1.5, 3), color: head, kind: 'dot' });
  }
  if (r.isPlayer && cutSndCd <= 0) { cutSndCd = 0.07; audio.cut(); }
  grantXp(r, w.value);
}

function killCat(r, c) {
  c.alive = false; c.respawn = rand(8, 14);
  const rg = REGIONS[c.region];
  if (r.isPlayer) r.coinsRun += 3;
  for (let i = 0; i < 6; i++) {
    addParticle({ x: c.x, y: c.y, vx: rand(-90, 90), vy: rand(-90, 90), g: 160, t: 0, max: rand(0.25, 0.45), size: rand(2, 4), color: rg.catColor, kind: 'dot' });
  }
  if (r.isPlayer) { audio.hit(); texts.push({ x: c.x, y: c.y - 18, txt: '+' + rg.catXp + 'xp', color: '#d6d97e', t: 0, big: false }); }
  grantXp(r, rg.catXp);
  if (Math.random() < 0.3) bonuses.push({ x: c.x + rand(-26, 26), y: c.y + rand(-26, 26), type: rollBonus(rg), t: 0, max: 12 });
}

function hurt(v, a, dmg, hx, hy, knockbackScale = 1) {
  if (v.blockT > 0) {
    v.blockT = 0; v.blockCd = Math.max(v.blockCd, BALANCE.successfulBlockRecovery);
    a.stunT = BALANCE.parryStun; a.dashT = 0; a.vx = 0; a.vy = 0;
    audio.block();
    addParticle({ x: v.x, y: v.y, vx: 0, vy: 0, g: 0, t: 0, max: 0.45, size: v.radius + 10, color: '#f0d878', kind: 'ring' });
    for (let i = 0; i < 8; i++) addParticle({ x: hx, y: hy, vx: rand(-140, 140), vy: rand(-140, 140), g: 0, t: 0, max: rand(0.2, 0.4), size: rand(2, 3.5), color: '#ffffff', kind: 'spark' });
    if (v.isPlayer) { texts.push({ x: v.x, y: v.y - v.radius - 26, txt: 'БЛОК!', color: '#f0d878', t: 0, big: true }); shakeT = Math.max(shakeT, 0.15); shakeAmp = 4; }
    if (a.isPlayer) { audio.stun(); texts.push({ x: a.x, y: a.y - a.radius - 26, txt: 'ОГЛУШЁН', color: '#b9c9d6', t: 0, big: true }); flash = Math.max(flash, 0.3); }
    return;
  }
  if (v.shieldHits > 0) {
    v.shieldHits--; if (v.shieldHits <= 0) v.shieldT = 0;
    for (let i = 0; i < 5; i++) addParticle({ x: hx, y: hy, vx: rand(-90, 90), vy: rand(-90, 90), g: 0, t: 0, max: 0.3, size: 2.5, color: '#8fb8e8', kind: 'spark' });
    if (v.isPlayer) audio.hit();
    return;
  }
  v.hp -= dmg; v.lastHurt = time;
  const d = Math.hypot(v.x - hx, v.y - hy) || 1;
  v.vx += ((v.x - hx) / d) * 190 * knockbackScale; v.vy += ((v.y - hy) / d) * 190 * knockbackScale;
  for (let i = 0; i < 5; i++) addParticle({ x: hx, y: hy, vx: rand(-120, 120), vy: rand(-120, 120), g: 200, t: 0, max: 0.35, size: 2.5, color: '#f0d878', kind: 'spark' });
  if (v.isPlayer) { flash = 0.5; shakeT = 0.25; shakeAmp = 7; audio.hurt(); }
  else if (a.isPlayer) { audio.hit(); shakeT = Math.max(shakeT, 0.1); shakeAmp = 3; }
  if (v.hp <= 0) kill(v, a);
}

function kill(v, a) {
  v.alive = false; v.respawnT = rand(4, 8); a.kills++;
  const gained = Math.max(3, Math.round(xpNeed(v.level) * 0.5));
  grantXp(a, gained);
  if (a.isPlayer) {
    a.coinsRun += 6 + v.level * 2;
    audio.kill();
    texts.push({ x: v.x, y: v.y - 24, txt: 'СРЕЗАЛ ' + v.name + ' · +' + gained + 'xp', color: '#e8c547', t: 0, big: false });
  }
  for (let i = 0; i < 18; i++) {
    const ang = rand(0, Math.PI * 2), sp = rand(40, 220);
    addParticle({ x: v.x, y: v.y, vx: Math.cos(ang) * sp, vy: Math.sin(ang) * sp, g: 140, t: 0, max: rand(0.4, 0.8), size: rand(2, 5), color: v.skin, kind: 'dot' });
  }
  addParticle({ x: v.x, y: v.y, vx: 0, vy: 0, g: 0, t: 0, max: 0.5, size: v.radius, color: v.skin, kind: 'ring' });
  for (let i = 0; i < 2; i++) bonuses.push({ x: v.x + rand(-30, 30), y: v.y + rand(-30, 30), type: 'coin', t: 0, max: 10 });
  if (v.isPlayer) { gameOver = true; audio.death(); shakeT = 0.6; shakeAmp = 12; flash = 0.8; setTimeout(showGameOver, 700); }
}

function respawnBot(r) {
  const gx = Math.floor(Math.random() * GRID), gy = Math.floor(Math.random() * GRID);
  r.x = gx * CELL + rand(80, CELL - 80); r.y = gy * CELL + rand(80, CELL - 80);
  r.vx = 0; r.vy = 0; r.level = 1; r.xp = 0; r.score = Math.max(0, r.score * 0.2);
  applyLevel(r); r.hp = r.maxHp; r.alive = true;
  r.speedT = 0; r.magnetT = 0; r.shieldT = 0; r.shieldHits = 0; r.rageT = 0;
  r.blockT = 0; r.blockCd = rand(0.8, 1.8); r.stunT = 0; r.magnetCd = 0;
  r.dashCd = rand(1.2, 2.2) / r.skill;
}

function findFarmTarget(r) {
  let best = null;
  let bestScore = Infinity;
  forNearbyWheat(r.x, r.y, 620, (w) => {
    if (w.dead || w.stage < 0.58) return;
    const d2v = dist2(r.x, r.y, w.x, w.y);
    const growthPenalty = (1 - w.stage) * 42000;
    const valueBonus = w.value * 1250;
    const score = d2v + growthPenalty - valueBonus;
    if (score < bestScore) {
      bestScore = score;
      best = w;
    }
  });
  return best;
}

function botThink(r, dt) {
  r.ai.thinkT -= dt;
  r.ai.farmT -= dt;
  if (r.ai.thinkT > 0) return;
  r.ai.thinkT = rand(0.13, 0.22) / r.skill;

  let near = null;
  let nearestD2 = 560 * 560;
  let nearbyEnemies = 0;
  let weakest = null;
  let weakestD2 = Infinity;

  for (const other of reapers) {
    if (other === r || !other.alive) continue;
    const d2v = dist2(r.x, r.y, other.x, other.y);
    if (d2v < 420 * 420) nearbyEnemies++;
    if (d2v < nearestD2) {
      nearestD2 = d2v;
      near = other;
    }
    if (d2v < 480 * 480 && other.level <= r.level + 1 && other.hp / other.maxHp < 0.8 && d2v < weakestD2) {
      weakest = other;
      weakestD2 = d2v;
    }
  }

  // Choose a vulnerable target when it is tactically better than the nearest one.
  if (weakest && near && weakestD2 < nearestD2 * 1.7) {
    near = weakest;
    nearestD2 = weakestD2;
  }

  const distance = near ? Math.sqrt(nearestD2) : Infinity;
  const healthRatio = r.hp / r.maxHp;
  const levelThreat = near ? near.level > r.level * (1.16 + r.skill * 0.08) : false;
  const outnumbered = nearbyEnemies >= 3;
  const shouldFlee = near && (healthRatio < 0.30 || (levelThreat && healthRatio < 0.72) || (outnumbered && healthRatio < 0.58));

  if (near) {
    const angleToEnemy = Math.atan2(near.y - r.y, near.x - r.x);
    const weapon = SCYTHES[r.scytheId] || SCYTHES.field;
    const enemyToBot = Math.atan2(r.y - near.y, r.x - near.x);
    const facingDelta = Math.abs(Math.atan2(Math.sin(near.theta - enemyToBot), Math.cos(near.theta - enemyToBot)));
    const inDangerArc = facingDelta < 0.48 && nearestD2 < (near.pickLen + r.radius + 36) ** 2;

    // Defensive block is timed against an incoming sweep rather than random distance checks.
    if (r.blockCd <= 0 && inDangerArc && Math.random() < 0.42 + r.skill * 0.25) {
      r.blockT = BALANCE.blockDuration;
      r.blockCd = BALANCE.blockCooldown + rand(0.1, 0.65);
    }

    if (shouldFlee) {
      r.ai.state = 'flee';
      const away = angleToEnemy + Math.PI + Math.sin(time * 2.4 + r.id) * 0.28;
      r.ai.aimAngle = away;
      r.ai.tx = r.x + Math.cos(away) * 430;
      r.ai.ty = r.y + Math.sin(away) * 430;
      if (r.dashCd <= 0 && distance < 245 && Math.random() < 0.72) {
        r.dashDx = Math.cos(away);
        r.dashDy = Math.sin(away);
        r.dashT = BALANCE.dashDuration;
        r.dashCd = BALANCE.dashCooldown + rand(0.15, 0.7);
      }
    } else if (distance < 430 && (r.ai.aggression + (r.rageT > 0 ? 0.2 : 0) > 0.43 || (near.hp / near.maxHp < 0.38))) {
      r.ai.state = 'hunt';
      r.ai.targetId = near.id;
      r.ai.aimAngle = angleToEnemy;
      r.ai.orbitA += dt * (0.85 + r.skill * 0.45) * r.ai.orbit;
      if (Math.random() < 0.025) r.ai.orbit = -r.ai.orbit;
      const desiredGap = r.pickLen * (weapon.id === 'long' ? 0.77 : 0.58) + r.radius + near.radius * 0.35;
      const orbitR = clamp(desiredGap, 52, 210);
      r.ai.tx = near.x + near.vx * 0.28 + Math.cos(r.ai.orbitA) * orbitR;
      r.ai.ty = near.y + near.vy * 0.28 + Math.sin(r.ai.orbitA) * orbitR;

      if (r.dashCd <= 0 && distance > 150 && distance < 360 && Math.random() < 0.16 + r.skill * 0.12) {
        r.dashDx = Math.cos(angleToEnemy);
        r.dashDy = Math.sin(angleToEnemy);
        r.dashT = BALANCE.dashDuration;
        r.dashCd = BALANCE.dashCooldown + rand(0.2, 0.8);
      }
    } else {
      r.ai.state = 'farm';
      r.ai.targetId = -1;
      r.ai.aimAngle = angleToEnemy;
    }
  } else {
    r.ai.targetId = -1;
  }

  if (r.ai.state !== 'hunt' && r.ai.state !== 'flee') {
    r.ai.state = 'farm';
    const reached = dist2(r.x, r.y, r.ai.tx, r.ai.ty) < 58 * 58;
    if (reached || r.ai.farmT <= 0) {
      r.ai.farmT = rand(2.0, 3.2);
      const target = findFarmTarget(r);
      if (target) {
        r.ai.tx = target.x + rand(-18, 18);
        r.ai.ty = target.y + rand(-18, 18);
      } else {
        const gx = Math.floor(Math.random() * GRID), gy = Math.floor(Math.random() * GRID);
        r.ai.tx = gx * CELL + rand(80, CELL - 80);
        r.ai.ty = gy * CELL + rand(80, CELL - 80);
      }
    }
    const moveAngle = Math.atan2(r.ai.ty - r.y, r.ai.tx - r.x);
    r.ai.aimAngle = moveAngle;
  }

  r.ai.tx = clamp(r.ai.tx, 6, WORLD - 6);
  r.ai.ty = clamp(r.ai.ty, 6, WORLD - 6);
}

// ═══════════════════════════════════════════════════════════════════════════════
// FX UPDATE
// ═══════════════════════════════════════════════════════════════════════════════
function updateFx(dt) {
  for (let i = particles.length - 1; i >= 0; i--) {
    const p = particles[i];
    p.t += dt;
    if (p.t >= p.max) { particles.splice(i, 1); continue; }
    p.vy += p.g * dt;
    p.x += p.vx * dt;
    p.y += p.vy * dt;
  }
  for (let i = texts.length - 1; i >= 0; i--) {
    const t = texts[i];
    t.t += dt;
    if (t.t > 1.2) texts.splice(i, 1);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// RENDER
// ═══════════════════════════════════════════════════════════════════════════════
function draw() {
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.fillStyle = '#171208';
  ctx.fillRect(0, 0, W, H);

  const shx = shakeT > 0 ? rand(-shakeAmp, shakeAmp) * shakeT : 0;
  const shy = shakeT > 0 ? rand(-shakeAmp, shakeAmp) * shakeT : 0;

  ctx.save();
  ctx.translate(W / 2, H / 2);
  ctx.scale(zoom, zoom);
  ctx.translate(-camX + shx, -camY + shy);

  const vw = W / 2 / zoom + 120;
  const vx0 = camX - vw, vx1 = camX + vw;
  const vy0 = camY - (H / 2 / zoom + 120), vy1 = camY + (H / 2 / zoom + 120);

  drawGround(vx0, vy0, vx1, vy1);
  drawWheat(vx0, vy0, vx1, vy1);
  drawBonuses();
  drawCats(vx0, vy0, vx1, vy1);
  for (const r of reapers) {
    if (!r.alive || r.x < vx0 || r.x > vx1 || r.y < vy0 || r.y > vy1) continue;
    if (!r.isPlayer) drawReaper(r);
  }
  if (player.alive) drawReaper(player);
  drawParticles();
  drawTexts();
  ctx.restore();

  // Vignette
  const g = ctx.createRadialGradient(W / 2, H / 2, Math.min(W, H) * 0.36, W / 2, H / 2, Math.max(W, H) * 0.75);
  g.addColorStop(0, 'rgba(23,18,8,0)');
  g.addColorStop(1, 'rgba(23,18,8,0.5)');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);

  if (flash > 0) { ctx.fillStyle = `rgba(200,50,30,${clamp(flash * 0.45, 0, 0.5)})`; ctx.fillRect(0, 0, W, H); }
  if (gameOver) { ctx.fillStyle = 'rgba(23,18,8,0.45)'; ctx.fillRect(0, 0, W, H); }
}

function drawGround(vx0, vy0, vx1, vy1) {
  for (let gy = 0; gy < GRID; gy++) {
    for (let gx = 0; gx < GRID; gx++) {
      const rx = gx * CELL, ry = gy * CELL;
      if (rx > vx1 || rx + CELL < vx0 || ry > vy1 || ry + CELL < vy0) continue;
      const rg = REGIONS[cellRegion(gx, gy)];
      ctx.fillStyle = rg.ground;
      ctx.fillRect(rx, ry, CELL, CELL);
      for (let cy = 0; cy < 5; cy++) {
        for (let cx = 0; cx < 5; cx++) {
          if ((cx + cy) % 2 === 0) continue;
          ctx.fillStyle = rg.groundAlt;
          ctx.fillRect(rx + cx * CHUNK, ry + cy * CHUNK, CHUNK, CHUNK);
        }
      }
      ctx.strokeStyle = 'rgba(23,18,8,0.14)';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (let i = 1; i < 5; i++) {
        ctx.moveTo(rx + i * CHUNK, ry); ctx.lineTo(rx + i * CHUNK, ry + CELL);
        ctx.moveTo(rx, ry + i * CHUNK); ctx.lineTo(rx + CELL, ry + i * CHUNK);
      }
      ctx.stroke();
      ctx.strokeStyle = 'rgba(23,18,8,0.26)';
      ctx.lineWidth = 3;
      ctx.strokeRect(rx + 1.5, ry + 1.5, CELL - 3, CELL - 3);
    }
  }
  for (const rg of REGIONS) {
    let minx = 9, miny = 9, maxx = -1, maxy = -1;
    for (const [gx, gy] of rg.cells) { minx = Math.min(minx, gx); miny = Math.min(miny, gy); maxx = Math.max(maxx, gx); maxy = Math.max(maxy, gy); }
    const rx = minx * CELL, ry = miny * CELL, w = (maxx - minx + 1) * CELL, h = (maxy - miny + 1) * CELL;
    if (rx > vx1 || rx + w < vx0 || ry > vy1 || ry + h < vy0) continue;
    ctx.strokeStyle = 'rgba(23,18,8,0.45)';
    ctx.lineWidth = 8;
    ctx.strokeRect(rx + 4, ry + 4, w - 8, h - 8);
    ctx.strokeStyle = 'rgba(232,197,71,0.22)';
    ctx.lineWidth = 2;
    ctx.strokeRect(rx + 14, ry + 14, w - 28, h - 28);
    const [ax, ay] = rg.anchor;
    ctx.fillStyle = 'rgba(23,18,8,0.12)';
    ctx.font = '42px "Segoe UI", sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(rg.name.toUpperCase(), ax * CELL + CELL / 2, ay * CELL + CELL / 2 + 14);
  }
}

function drawWheat(vx0, vy0, vx1, vy1) {
  for (const w of wheat) {
    if (w.x < vx0 || w.x > vx1 || w.y < vy0 || w.y > vy1) continue;
    if (w.dead && w.cutT <= 0) continue;
    const rg = REGIONS[w.region];
    const h = 11 + 17 * w.stage;
    if (w.dead) {
      const k = 1 - w.cutT / 0.32;
      ctx.save();
      ctx.translate(w.x, w.y);
      ctx.rotate(k * 1.25 * w.fallDir);
      ctx.globalAlpha = 1 - k;
      drawStalk(0, 0, h, 0, rg, w.stage);
      ctx.restore();
      ctx.globalAlpha = 1;
      continue;
    }
    const sway = Math.sin(time * 1.7 + w.phase) * 2.6 * w.stage;
    drawStalk(w.x, w.y, h, sway, rg, w.stage);
  }
}

function drawStalk(x, y, h, sway, rg, stage) {
  const tipX = x + sway, tipY = y - h;
  ctx.strokeStyle = rg.wheatStalk;
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(x, y);
  ctx.quadraticCurveTo(x + sway * 0.3, y - h * 0.6, tipX, tipY);
  ctx.stroke();
  if (stage > 0.45) {
    ctx.fillStyle = rg.wheatHead;
    ctx.beginPath();
    ctx.ellipse(tipX, tipY - 3, 2.6, 5.4, sway * 0.06, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = rg.wheatHead;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(tipX - 2, tipY - 5); ctx.lineTo(tipX - 4.5, tipY - 11);
    ctx.moveTo(tipX + 2, tipY - 5); ctx.lineTo(tipX + 4.5, tipY - 11);
    ctx.moveTo(tipX, tipY - 7); ctx.lineTo(tipX, tipY - 13);
    ctx.stroke();
  }
}

function drawBonuses() {
  for (const b of bonuses) {
    const fade = b.max - b.t < 2 ? (b.max - b.t) / 2 : 1;
    const pulse = 1 + Math.sin(time * 5 + b.x) * 0.12;
    const r = 13 * pulse;
    ctx.globalAlpha = fade;
    ctx.fillStyle = 'rgba(24,18,7,0.88)';
    ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.fill();
    ctx.strokeStyle = BONUS_COLOR[b.type];
    ctx.lineWidth = 2.5;
    ctx.beginPath(); ctx.arc(b.x, b.y, r, 0, Math.PI * 2); ctx.stroke();
    ctx.strokeStyle = '#f5e6b0';
    ctx.fillStyle = '#f5e6b0';
    ctx.lineWidth = 2;
    ctx.beginPath();
    switch (b.type) {
      case 'speed':
        ctx.moveTo(b.x - 5, b.y - 5); ctx.lineTo(b.x + 1, b.y); ctx.lineTo(b.x - 5, b.y + 5);
        ctx.moveTo(b.x, b.y - 5); ctx.lineTo(b.x + 6, b.y); ctx.lineTo(b.x, b.y + 5); break;
      case 'magnet':
        ctx.arc(b.x, b.y - 1, 5, Math.PI, 0);
        ctx.moveTo(b.x - 5, b.y - 1); ctx.lineTo(b.x - 5, b.y + 5);
        ctx.moveTo(b.x + 5, b.y - 1); ctx.lineTo(b.x + 5, b.y + 5); break;
      case 'shield':
        ctx.arc(b.x, b.y, 5, 0, Math.PI * 2); break;
      case 'rage':
        ctx.moveTo(b.x - 5, b.y + 4); ctx.lineTo(b.x - 1, b.y - 4);
        ctx.moveTo(b.x - 1, b.y + 4); ctx.lineTo(b.x + 3, b.y - 4);
        ctx.moveTo(b.x + 3, b.y + 4); ctx.lineTo(b.x + 7, b.y - 4); break;
      case 'coin':
        ctx.arc(b.x, b.y, 4.5, 0, Math.PI * 2); ctx.fill(); break;
      case 'heart':
        ctx.moveTo(b.x - 5, b.y); ctx.lineTo(b.x + 5, b.y);
        ctx.moveTo(b.x, b.y - 5); ctx.lineTo(b.x, b.y + 5); break;
    }
    ctx.stroke();
    ctx.globalAlpha = 1;
  }
}

function drawCats(vx0, vy0, vx1, vy1) {
  for (const c of cats) {
    if (!c.alive || c.x < vx0 || c.x > vx1 || c.y < vy0 || c.y > vy1) continue;
    const col = REGIONS[c.region].catColor;
    for (let i = 3; i >= 0; i--) {
      const off = i * 6;
      const wob = Math.sin(c.wig - i * 0.9) * 2.4;
      const px = c.x - Math.cos(c.dir) * off + Math.cos(c.dir + Math.PI / 2) * wob;
      const py = c.y - Math.sin(c.dir) * off + Math.sin(c.dir + Math.PI / 2) * wob;
      ctx.fillStyle = col;
      ctx.beginPath();
      ctx.arc(px, py, 5 - i * 0.8, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = '#171208';
    const ex = Math.cos(c.dir + Math.PI / 2) * 2, ey = Math.sin(c.dir + Math.PI / 2) * 2;
    ctx.beginPath();
    ctx.arc(c.x + Math.cos(c.dir) * 2 + ex, c.y + Math.sin(c.dir) * 2 + ey, 1, 0, Math.PI * 2);
    ctx.arc(c.x + Math.cos(c.dir) * 2 - ex, c.y + Math.sin(c.dir) * 2 - ey, 1, 0, Math.PI * 2);
    ctx.fill();
  }
}

function drawReaper(r) {
  ctx.fillStyle = 'rgba(0,0,0,0.22)';
  ctx.beginPath();
  ctx.ellipse(r.x, r.y + r.radius * 0.75, r.radius * 0.95, r.radius * 0.45, 0, 0, Math.PI * 2);
  ctx.fill();

  const weapon = SCYTHES[r.scytheId] || SCYTHES.field;
  const ux = Math.cos(r.theta), uy = Math.sin(r.theta);
  const bladeNx = -uy, bladeNy = ux;
  const startX = r.x + ux * r.radius * 0.5;
  const startY = r.y + uy * r.radius * 0.5;
  const hx = r.x + ux * r.pickLen, hy = r.y + uy * r.pickLen;

  ctx.save();
  ctx.lineCap = 'round';
  ctx.strokeStyle = '#4a3a18';
  ctx.lineWidth = weapon.shaftWidth + 1.1;
  ctx.beginPath();
  ctx.moveTo(startX, startY);
  ctx.lineTo(hx, hy);
  ctx.stroke();
  ctx.strokeStyle = weapon.accent;
  ctx.lineWidth = 1.8;
  ctx.beginPath();
  const gripAt = 0.42;
  ctx.moveTo(r.x + ux * (r.radius * 0.5 + r.pickLen * gripAt) + bladeNx * 3, r.y + uy * (r.radius * 0.5 + r.pickLen * gripAt) + bladeNy * 3);
  ctx.lineTo(r.x + ux * (r.radius * 0.5 + r.pickLen * gripAt) - bladeNx * 3, r.y + uy * (r.radius * 0.5 + r.pickLen * gripAt) - bladeNy * 3);
  ctx.stroke();

  const bladeWidth = weapon.bladeWidth + Math.min(3, r.level * 0.12);
  const p1x = hx + bladeNx * bladeWidth;
  const p1y = hy + bladeNy * bladeWidth;
  const p2x = hx - bladeNx * bladeWidth;
  const p2y = hy - bladeNy * bladeWidth;
  const controlX = hx + ux * weapon.bladeCurve;
  const controlY = hy + uy * weapon.bladeCurve;

  ctx.shadowColor = weapon.accent;
  ctx.shadowBlur = r.isPlayer ? 5 : 1.5;
  ctx.strokeStyle = weapon.metal;
  ctx.lineWidth = 4.4;
  ctx.beginPath();
  ctx.moveTo(p1x, p1y);
  ctx.quadraticCurveTo(controlX, controlY, p2x, p2y);
  ctx.stroke();
  ctx.shadowBlur = 0;
  ctx.strokeStyle = weapon.edge;
  ctx.lineWidth = 1.25;
  ctx.beginPath();
  ctx.moveTo(p1x + ux * 1.5, p1y + uy * 1.5);
  ctx.quadraticCurveTo(controlX + ux * 1.5, controlY + uy * 1.5, p2x + ux * 1.5, p2y + uy * 1.5);
  ctx.stroke();

  // Small pommel and model-specific head detail help distinguish the silhouettes at a glance.
  ctx.fillStyle = weapon.accent;
  ctx.beginPath();
  ctx.arc(startX - ux * 2, startY - uy * 2, 2.5, 0, Math.PI * 2);
  ctx.fill();
  if (weapon.id === 'long') {
    ctx.strokeStyle = weapon.accent;
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(hx - ux * 4 + bladeNx * 3, hy - uy * 4 + bladeNy * 3);
    ctx.lineTo(hx - ux * 4 - bladeNx * 3, hy - uy * 4 - bladeNy * 3);
    ctx.stroke();
  } else if (weapon.id === 'hook') {
    ctx.strokeStyle = weapon.accent;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(hx + bladeNx * 3, hy + bladeNy * 3);
    ctx.lineTo(hx + ux * 5, hy + uy * 5);
    ctx.stroke();
  }
  ctx.restore();

  if (r.rageT > 0) { ctx.strokeStyle = 'rgba(224,96,72,0.7)'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(r.x, r.y, r.radius + 6, 0, Math.PI * 2); ctx.stroke(); }
  if (r.shieldT > 0) {
    ctx.strokeStyle = 'rgba(143,184,232,0.8)'; ctx.lineWidth = 2.5;
    ctx.setLineDash([6, 5]);
    ctx.beginPath(); ctx.arc(r.x, r.y, r.radius + 9, time * 2, time * 2 + Math.PI * 2); ctx.stroke();
    ctx.setLineDash([]);
  }
  if (r.blockT > 0) {
    const ba = time * 7;
    ctx.strokeStyle = 'rgba(240,216,120,0.95)'; ctx.lineWidth = 4;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.radius + 7, ba, ba + Math.PI * 0.7); ctx.stroke();
    ctx.beginPath(); ctx.arc(r.x, r.y, r.radius + 7, ba + Math.PI, ba + Math.PI * 1.7); ctx.stroke();
  }

  ctx.fillStyle = r.skin;
  ctx.beginPath();
  ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = 'rgba(23,18,8,0.55)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2);
  ctx.stroke();

  if (r.stunT > 0) {
    ctx.fillStyle = 'rgba(23,18,8,0.3)';
    ctx.beginPath(); ctx.arc(r.x, r.y, r.radius, 0, Math.PI * 2); ctx.fill();
    for (let i = 0; i < 3; i++) {
      const sa = time * 4.5 + i * (Math.PI * 2 / 3);
      const sx = r.x + Math.cos(sa) * (r.radius + 8), sy = r.y - r.radius - 6 + Math.sin(sa) * 5;
      ctx.save();
      ctx.translate(sx, sy); ctx.rotate(sa);
      ctx.fillStyle = '#f0d878';
      ctx.fillRect(-3.4, -1.1, 6.8, 2.2);
      ctx.fillRect(-1.1, -3.4, 2.2, 6.8);
      ctx.restore();
    }
  }

  const ex = Math.cos(r.dir) * r.radius * 0.45, ey = Math.sin(r.dir) * r.radius * 0.45;
  const px = Math.cos(r.dir + Math.PI / 2) * r.radius * 0.32, py = Math.sin(r.dir + Math.PI / 2) * r.radius * 0.32;
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(r.x + ex + px, r.y + ey + py, r.radius * 0.2, 0, Math.PI * 2);
  ctx.arc(r.x + ex - px, r.y + ey - py, r.radius * 0.2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = '#1d1708';
  ctx.beginPath();
  ctx.arc(r.x + ex * 1.25 + px, r.y + ey * 1.25 + py, r.radius * 0.1, 0, Math.PI * 2);
  ctx.arc(r.x + ex * 1.25 - px, r.y + ey * 1.25 - py, r.radius * 0.1, 0, Math.PI * 2);
  ctx.fill();

  ctx.textAlign = 'center';
  const label = r.isPlayer ? 'ТЫ' : r.name;
  ctx.font = r.isPlayer ? '13px "Segoe UI", sans-serif' : '600 11px "Segoe UI", sans-serif';
  const ty = r.y - r.radius - 14;
  ctx.lineWidth = 3;
  ctx.strokeStyle = 'rgba(23,18,8,0.75)';
  ctx.strokeText(label + ' · ' + r.level, r.x, ty);
  ctx.fillStyle = r.isPlayer ? '#e8c547' : '#f5e6b0';
  ctx.fillText(label + ' · ' + r.level, r.x, ty);

  if (r.hp < r.maxHp) {
    const w = Math.max(30, r.radius * 2);
    ctx.fillStyle = 'rgba(23,18,8,0.7)';
    ctx.fillRect(r.x - w / 2, ty - 14, w, 4);
    ctx.fillStyle = r.isPlayer ? '#7dc95e' : '#d96a4a';
    ctx.fillRect(r.x - w / 2, ty - 14, w * clamp(r.hp / r.maxHp, 0, 1), 4);
  }
  if (r.isPlayer) {
    ctx.fillStyle = '#e8c547';
    ctx.beginPath();
    ctx.moveTo(r.x, r.y - r.radius - 24);
    ctx.lineTo(r.x - 5, r.y - r.radius - 31);
    ctx.lineTo(r.x + 5, r.y - r.radius - 31);
    ctx.closePath();
    ctx.fill();
  }
}

function drawParticles() {
  for (const p of particles) {
    const k = 1 - p.t / p.max;
    if (p.kind === 'ring') {
      ctx.strokeStyle = p.color; ctx.globalAlpha = Math.max(0, k); ctx.lineWidth = 3;
      ctx.beginPath(); ctx.arc(p.x, p.y, p.size + (1 - k) * 60, 0, Math.PI * 2); ctx.stroke();
    } else {
      ctx.fillStyle = p.color; ctx.globalAlpha = Math.max(0, k);
      ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
    }
  }
  ctx.globalAlpha = 1;
}

function drawTexts() {
  ctx.textAlign = 'center';
  for (const t of texts) {
    const k = 1 - t.t / 1.2;
    ctx.globalAlpha = Math.min(1, k * 2);
    ctx.font = t.big ? '20px "Segoe UI", sans-serif' : '700 13px "Segoe UI", sans-serif';
    ctx.lineWidth = 4;
    ctx.strokeStyle = 'rgba(23,18,8,0.8)';
    const y = t.y - t.t * 34;
    ctx.strokeText(t.txt, t.x, y);
    ctx.fillStyle = t.color;
    ctx.fillText(t.txt, t.x, y);
  }
  ctx.globalAlpha = 1;
}

// ═══════════════════════════════════════════════════════════════════════════════
// HUD
// ═══════════════════════════════════════════════════════════════════════════════
function updateHUD() {
  document.getElementById('hud-level').textContent = player.level;
  document.getElementById('hud-xp').style.width = clamp(player.xp / xpNeed(player.level) * 100, 0, 100) + '%';
  const hpPct = clamp(player.hp / player.maxHp, 0, 1);
  document.getElementById('hud-hp').style.width = (hpPct * 100) + '%';
  document.getElementById('hud-hp').style.background = hpPct > 0.4 ? '#7dc95e' : '#d9534a';
  document.getElementById('hud-score').textContent = player.score >= 1000 ? (player.score / 1000).toFixed(1).replace('.', ',') + 'к' : player.score;
  document.getElementById('hud-coins').textContent = player.coinsRun;
  document.getElementById('hud-kills').textContent = player.kills;
  document.getElementById('hud-alive').textContent = reapers.filter(r => r.alive).length;
  document.getElementById('dash-fill').style.height = (player.dashCd <= 0 ? 100 : clamp((1 - player.dashCd / BALANCE.dashCooldown) * 100, 0, 100)) + '%';
  document.getElementById('block-fill').style.height = (player.blockCd <= 0 ? 100 : clamp((1 - player.blockCd / BALANCE.blockCooldown) * 100, 0, 100)) + '%';

  const board = reapers.filter(r => r.alive || r.isPlayer).sort((a, b) => b.score - a.score).slice(0, 5);
  document.getElementById('hud-board-rows').innerHTML = board.map((b, i) => {
    const sc = b.score >= 1000 ? (b.score / 1000).toFixed(1).replace('.', ',') + 'к' : b.score;
    return `<div class="hud-board-row${b.isPlayer ? ' you' : ''}"><span>${i + 1}. ${b.name}</span><span>${sc}</span></div>`;
  }).join('');

  // Buffs
  const buffList = document.getElementById('hud-buffs');
  buffList.innerHTML = '';
  const active = [];
  if (player.speedT > 0) active.push({ id: 'speed', t: player.speedT });
  if (player.magnetT > 0) active.push({ id: 'magnet', t: player.magnetT });
  if (player.shieldT > 0) active.push({ id: 'shield', t: player.shieldT });
  if (player.rageT > 0) active.push({ id: 'rage', t: player.rageT });
  for (const b of active) {
    const meta = BUFF_META[b.id];
    const el = document.createElement('div');
    el.className = 'hud-buff hud-panel';
    el.style.borderColor = meta.color;
    el.style.color = meta.color;
    el.textContent = meta.label + ' ' + Math.ceil(b.t) + 'с';
    buffList.appendChild(el);
  }

  // Region banner (dt-based flash)
  const cx = Math.floor(player.x / CELL), cy = Math.floor(player.y / CELL);
  const ri = (cx < 0 || cx >= GRID || cy < 0 || cy >= GRID) ? -1 : cellRegion(cx, cy);
  if (ri !== lastRegion) {
    lastRegion = ri;
    if (ri >= 0) {
      regionFlashT = 2.2;
      document.getElementById('hud-region-name').textContent = REGIONS[ri].name.toUpperCase();
      document.getElementById('hud-region').style.display = 'block';
    }
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// GAME LOOP
// ═══════════════════════════════════════════════════════════════════════════════
let raf = 0;
function loop(t) {
  if (!running) return;
  const dt = clamp((t - lastT) / 1000, 0, 0.05);
  lastT = t;
  if (!paused) update(dt);
  draw();
  updateHUD();
  raf = requestAnimationFrame(loop);
}

function startGame() {
  audio.ensure();
  audio.click();
  cancelAnimationFrame(raf);          // FIX: не давать двум циклам работать одновременно
  document.getElementById('menu').classList.add('hidden');
  document.getElementById('hud').style.display = 'block';
  document.getElementById('gameover').classList.remove('show');
  running = true; paused = false; gameOver = false; time = 0; lastT = performance.now();
  particles = []; texts = []; bonuses = []; bonusSpawnT = 0; flash = 0; shakeT = 0;
  lastRegion = -2; regionFlashT = 0;
  buildWorld(); spawnAll();
  camX = player.x; camY = player.y; zoom = zoomFor(player.level);
  raf = requestAnimationFrame(loop);
}

function restartGame() {
  audio.ensure();
  audio.click();
  cancelAnimationFrame(raf);          // FIX
  document.getElementById('gameover').classList.remove('show');
  running = true; paused = false; gameOver = false; time = 0; lastT = performance.now();
  particles = []; texts = []; bonuses = []; bonusSpawnT = 0; flash = 0; shakeT = 0;
  lastRegion = -2; regionFlashT = 0;
  buildWorld(); spawnAll();
  camX = player.x; camY = player.y; zoom = zoomFor(player.level);
  raf = requestAnimationFrame(loop);
}

function exitToMenu() {
  audio.click();
  running = false;
  cancelAnimationFrame(raf);
  document.getElementById('menu').classList.remove('hidden');
  document.getElementById('hud').style.display = 'none';
  document.getElementById('gameover').classList.remove('show');
}

function showGameOver() {
  const sc = player.score >= 1000 ? (player.score / 1000).toFixed(1).replace('.', ',') + 'к' : player.score;
  document.getElementById('go-score').textContent = sc;
  document.getElementById('go-level').textContent = player.level;
  document.getElementById('go-harvests').textContent = player.harvests;
  document.getElementById('go-kills').textContent = player.kills;
  const mins = Math.floor(time / 60), secs = Math.floor(time % 60);
  document.getElementById('go-time').textContent = mins + ':' + (secs < 10 ? '0' : '') + secs;
  document.getElementById('go-best').textContent = sc;
  document.getElementById('go-coins').textContent = '+' + player.coinsRun;
  document.getElementById('gameover').classList.add('show');
}
