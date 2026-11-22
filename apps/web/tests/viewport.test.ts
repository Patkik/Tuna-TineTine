import { describe, it, expect } from 'vitest';
import html from '../index.html?raw';

function readLocalFile(relativePath: string): string {
  const proc = (
    globalThis as unknown as {
      process?: {
        getBuiltinModule?: (name: string) => {
          readFileSync: (url: URL, encoding: string) => string;
        };
      };
    }
  ).process;
  const fsMod = proc?.getBuiltinModule?.('node:fs');
  if (!fsMod) {
    throw new Error('Node builtin fs module unavailable');
  }
  return fsMod.readFileSync(new URL(relativePath, import.meta.url), 'utf-8');
}

describe('Android Viewport, Safe-Area & Modern Web Guidance CSS', () => {
  const css = readLocalFile('../src/styles/shell.css');

  it('configures viewport-fit=cover in index.html', () => {
    expect(html).toContain('viewport-fit=cover');
    expect(html).toContain('#0EA5E9');
  });

  it('locks #app to 100dvw x 100dvh, sets full-bleed .stage-frame container query, and blocks swipe-back', () => {
    expect(css).toContain('width: 100dvw');
    expect(css).toContain('height: 100dvh');
    expect(css).toContain('width: 100%');
    expect(css).toContain('height: 100%');
    expect(css).toContain('container: beach-stage / size');
    expect(css).toContain('overscroll-behavior: none');
    expect(css).toContain('touch-action: none');
  });

  it('enforces all 4 safe-area insets, CSS containment, and >= 44px touch targets on coarse pointers', () => {
    expect(css).toContain('env(safe-area-inset-top');
    expect(css).toContain('env(safe-area-inset-bottom');
    expect(css).toContain('env(safe-area-inset-left');
    expect(css).toContain('env(safe-area-inset-right');
    expect(css).toContain('contain: layout style paint');
    expect(css).toContain('@media (pointer: coarse)');
    expect(css).toContain('--target-size: 44px');
  });

  it('uses native top-layer dialog scroll containment and discrete exit rules', () => {
    expect(css).toContain('dialog.beach-dialog:modal');
    expect(css).toContain('dialog.beach-dialog::backdrop');
    expect(css).toContain('overscroll-behavior: contain');
    expect(css).toContain('transition-behavior: allow-discrete');
    expect(css).toContain('@starting-style');
  });
});
