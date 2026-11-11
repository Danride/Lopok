// Persistent local cosmetics and progression. No real-money purchases.
(() => {
  'use strict';
  const STORAGE_KEY = 'lopok.player.v2';
  const SKINS = [
    { id: 'harvest', name: 'Золотой колос', desc: 'Классический цвет жатвы', color: '#e3b93d', accent: '#fff0a6', pattern: 'sun', price: 0 },
    { id: 'moss', name: 'Мшистый', desc: 'Тихий цвет старого луга', color: '#4f9e4f', accent: '#b9e58a', pattern: 'leaf', price: 0 },
    { id: 'berry', name: 'Рябина', desc: 'Тёплый красный оттенок', color: '#c9503f', accent: '#ffc0a8', pattern: 'spots', price: 0 },
    { id: 'sky', name: 'Ясное небо', desc: 'Холодный синий цвет', color: '#4a7fbf', accent: '#b6e0ff', pattern: 'rings', price: 0 },
    { id: 'copper', name: 'Медный лист', desc: 'Медный цвет с полосами', color: '#b96f3b', accent: '#ffe0a0', pattern: 'stripes', price: 65 },
    { id: 'plum', name: 'Сумеречная слива', desc: 'Фиолетовый с россыпью точек', color: '#8057a8', accent: '#e0c2ff', pattern: 'spots', price: 90 },
    { id: 'frost', name: 'Иней', desc: 'Светлый ледяной узор', color: '#d8e4e8', accent: '#6a9bad', pattern: 'rings', price: 120 },
    { id: 'night', name: 'Ночная рожь', desc: 'Тёмный цвет с золотым знаком', color: '#303644', accent: '#e8c547', pattern: 'sun', price: 150 },
    { id: 'mint', name: 'Мята', desc: 'Мятный цвет с листьями', color: '#3fb8a8', accent: '#c4fff0', pattern: 'leaf', price: 180 },
    { id: 'rose', name: 'Шиповник', desc: 'Розовый редкий окрас', color: '#c36d91', accent: '#ffe0ee', pattern: 'stripes', price: 210 }
  ];
  const DEFAULT = {
    coins: 0,
    unlockedSkins: ['harvest', 'moss', 'berry', 'sky'],
    selectedSkin: 'harvest',
    selectedScythe: 'field',
    muted: false,
    bestScore: 0
  };

  function readState() {
    try {
      const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
      const state = { ...DEFAULT, ...parsed };
      state.coins = Math.max(0, Math.floor(Number(state.coins) || 0));
      state.bestScore = Math.max(0, Math.floor(Number(state.bestScore) || 0));
      state.unlockedSkins = Array.isArray(state.unlockedSkins) ? state.unlockedSkins : [...DEFAULT.unlockedSkins];
      for (const id of DEFAULT.unlockedSkins) if (!state.unlockedSkins.includes(id)) state.unlockedSkins.push(id);
      if (!SKINS.some(s => s.id === state.selectedSkin) || !state.unlockedSkins.includes(state.selectedSkin)) state.selectedSkin = DEFAULT.selectedSkin;
      if (!['sickle', 'field', 'long', 'hook'].includes(state.selectedScythe)) state.selectedScythe = DEFAULT.selectedScythe;
      state.muted = Boolean(state.muted);
      return state;
    } catch (_) {
      return { ...DEFAULT, unlockedSkins: [...DEFAULT.unlockedSkins] };
    }
  }

  let state = readState();
  function save() {
    try { localStorage.setItem(STORAGE_KEY, JSON.stringify(state)); } catch (_) { /* private mode may block storage */ }
  }
  function getSkin(id = state.selectedSkin) { return SKINS.find(s => s.id === id) || SKINS[0]; }
  function equipSkin(id) {
    if (!state.unlockedSkins.includes(id) || !SKINS.some(s => s.id === id)) return { ok: false, reason: 'locked' };
    state.selectedSkin = id; save(); return { ok: true, skin: getSkin(id) };
  }
  function unlockOrEquipSkin(id) {
    const skin = getSkin(id);
    if (state.unlockedSkins.includes(id)) return equipSkin(id);
    if (state.coins < skin.price) return { ok: false, reason: 'coins', missing: skin.price - state.coins };
    state.coins -= skin.price;
    state.unlockedSkins.push(id);
    state.selectedSkin = id;
    save();
    return { ok: true, purchased: true, skin };
  }
  function addCoins(amount) {
    const gained = Math.max(0, Math.floor(Number(amount) || 0));
    state.coins += gained; save(); return state.coins;
  }
  function setScythe(id) {
    if (!['sickle', 'field', 'long', 'hook'].includes(id)) return false;
    state.selectedScythe = id; save(); return true;
  }
  function setMuted(value) { state.muted = Boolean(value); save(); }
  function saveBest(score) {
    state.bestScore = Math.max(state.bestScore, Math.floor(Number(score) || 0)); save(); return state.bestScore;
  }
  window.LopokCosmetics = Object.freeze({
    skins: Object.freeze(SKINS.map(s => Object.freeze(s))),
    getState: () => ({ ...state, unlockedSkins: [...state.unlockedSkins] }),
    getSkin,
    equipSkin,
    unlockOrEquipSkin,
    addCoins,
    setScythe,
    setMuted,
    saveBest
  });
})();
