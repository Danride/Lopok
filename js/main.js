// Точка входа. Системы загружаются по порядку и разделяют одно глобальное игровое состояние.
// Такой подход сохраняет прежнюю логику без npm и без риска сломать её при рефакторинге.
import * as ThreeLibrary from 'three';
import { GLTFLoader as ModelLoader } from 'three/addons/loaders/GLTFLoader.js';

globalThis.THREE = ThreeLibrary;
globalThis.GLTFLoader = ModelLoader;

const scripts = [
  'scene', 'models', 'buildings', 'pathfinding', 'residents',
  'ui', 'camera', 'input', 'save', 'startup'
];

try {
  for (const name of scripts) {
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = `./js/${name}.js`;
      script.async = false;
      script.onload = resolve;
      script.onerror = () => reject(new Error(`Не загрузился js/${name}.js`));
      document.head.appendChild(script);
    });
  }
} catch (error) {
  console.error('Ошибка загрузки игры', error);
  const element = document.getElementById('err');
  element.textContent = `Не удалось запустить игру: ${error.message}. Запускай через локальный сервер или GitHub Pages.`;
  element.style.display = 'block';
}
