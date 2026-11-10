// Pointer and touch input. Kept separate from gameplay rules.
(() => {
  'use strict';

  const input = {
    x: 0,
    y: 0,
    pointerId: -1,
    startX: 0,
    startY: 0,
    lastTapTime: 0,
    lastTapX: 0,
    lastTapY: 0,

    attach(canvas, onDoubleTap) {
      canvas.addEventListener('pointerdown', (event) => {
        if (window.LopokAudio) window.LopokAudio.ensure();

        this.pointerId = event.pointerId;
        this.startX = event.clientX;
        this.startY = event.clientY;

        try {
          canvas.setPointerCapture(event.pointerId);
        } catch (_) {
          // Pointer capture is not available in every embedded browser.
        }

        const now = performance.now();
        const isDoubleTap =
          now - this.lastTapTime < 320 &&
          (event.clientX - this.lastTapX) ** 2 + (event.clientY - this.lastTapY) ** 2 < 60 ** 2;

        this.lastTapTime = now;
        this.lastTapX = event.clientX;
        this.lastTapY = event.clientY;

        this.x = 0;
        this.y = 0;

        if (isDoubleTap && typeof onDoubleTap === 'function') {
          onDoubleTap();
        }
      });

      canvas.addEventListener('pointermove', (event) => {
        if (event.pointerId !== this.pointerId) return;

        const dx = event.clientX - this.startX;
        const dy = event.clientY - this.startY;
        const length = Math.hypot(dx, dy);
        const magnitude = Math.min(1, Math.max(0, length / 56));

        if (length > 6) {
          this.x = (dx / length) * magnitude;
          this.y = (dy / length) * magnitude;
        } else {
          this.x = 0;
          this.y = 0;
        }
      });

      const reset = (event) => {
        if (event && event.pointerId !== this.pointerId) return;
        this.pointerId = -1;
        this.x = 0;
        this.y = 0;
      };

      canvas.addEventListener('pointerup', reset);
      canvas.addEventListener('pointercancel', reset);
      window.addEventListener('blur', () => reset());
    }
  };

  window.LopokInput = input;
})();
