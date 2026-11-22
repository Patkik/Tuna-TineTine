import { defineConfig } from 'vite';
import preact from '@preact/preset-vite';

export default defineConfig({
  plugins: [preact()],
  resolve: {
    alias: {
      react: 'preact/compat',
      'react-dom': 'preact/compat',
      'react-dom/test-utils': 'preact/test-utils',
      'react/jsx-runtime': 'preact/jsx-runtime',
    },
  },
  build: {
    target: 'es2022',
    cssCodeSplit: true,
    rollupOptions: {
      output: {
        manualChunks(id: string) {
          const norm = id.replace(/\\/g, '/');
          if (norm.includes('vite/preload-helper')) {
            return 'pixi-base';
          }
          if (!norm.includes('/node_modules/')) {
            return undefined;
          }

          if (norm.includes('/@mediapipe/tasks-vision/')) {
            return 'mediapipe';
          }
          if (norm.includes('/gsap/')) {
            return 'gsap';
          }
          if (norm.includes('/preact/') || norm.includes('/zustand/')) {
            return 'vendor';
          }

          if (
            norm.includes('/earcut/') ||
            norm.includes('/colord/') ||
            norm.includes('/eventemitter3/') ||
            norm.includes('/parse-svg-path/') ||
            norm.includes('/tiny-lru/') ||
            norm.includes('/ismobilejs/')
          ) {
            return 'pixi-base';
          }

          const pixiMarker = '/pixi.js/lib/';
          const pixiIdx = norm.indexOf(pixiMarker);
          if (pixiIdx !== -1) {
            const rel = norm.slice(pixiIdx + pixiMarker.length);

            // Layer 0 (pure leaves: zero upward imports)
            if (
              rel.startsWith('color/') ||
              rel.startsWith('extensions/') ||
              rel.startsWith('ticker/')
            ) {
              return 'pixi-base';
            }

            // Layer 2 (top-level barrel & subsystems: zero incoming edges from pixi-core)
            if (
              rel === 'index.mjs' ||
              rel === 'scene/index.mjs' ||
              rel === 'filters/index.mjs' ||
              rel.startsWith('app/') ||
              rel.startsWith('events/') ||
              rel.startsWith('accessibility/') ||
              rel.startsWith('dom/') ||
              rel.startsWith('advanced-blend-modes/') ||
              rel.startsWith('compressed-textures/') ||
              rel.startsWith('prepare/') ||
              rel.startsWith('spritesheet/') ||
              rel.startsWith('unsafe-eval/') ||
              (rel.startsWith('environment-browser/') && !rel.endsWith('BrowserAdapter.mjs')) ||
              rel.startsWith('environment-webworker/') ||
              rel.startsWith('scene/particle-container/') ||
              rel.startsWith('scene/sprite-nine-slice/') ||
              rel.startsWith('scene/sprite-tiling/') ||
              rel.startsWith('scene/text-html/') ||
              rel.startsWith('scene/layers/') ||
              (rel.startsWith('filters/defaults/') &&
                !rel.startsWith('filters/defaults/passthrough/') &&
                !rel.endsWith('defaultFilter.vert.mjs'))
            ) {
              return 'pixi-extras';
            }

            // Layer 1 (core rendering + scene graph)
            return 'pixi-core';
          }

          if (norm.includes('/pixi.js/')) {
            return 'pixi-core';
          }

          return undefined;
        },
      },
    },
  },
  test: {
    environment: 'jsdom',
    globals: true,
    setupFiles: ['./tests/setup.ts'],
  },
});
