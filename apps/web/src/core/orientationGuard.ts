/**
 * orientationGuard.ts — Portrait-to-landscape detection & Android fullscreen orientation lock.
 */

export function isPortraitViewport(width: number, height: number): boolean {
  if (typeof window !== 'undefined' && typeof window.matchMedia === 'function') {
    const mql = window.matchMedia('(orientation: portrait)');
    if (mql && typeof mql.matches === 'boolean' && mql.media === '(orientation: portrait)') {
      if (width > 0 && height > 0) {
        return width < height || mql.matches;
      }
      return mql.matches;
    }
  }
  return width < height;
}

export async function requestLandscapeFullscreen(): Promise<boolean> {
  try {
    const rootEl = document.documentElement;
    if (!document.fullscreenElement && typeof rootEl.requestFullscreen === 'function') {
      await rootEl.requestFullscreen().catch(() => undefined);
    }
    const orientationApi = screen.orientation as ScreenOrientation & {
      lock?: (orientation: 'landscape' | 'landscape-primary') => Promise<void>;
    };
    if (orientationApi && typeof orientationApi.lock === 'function') {
      await orientationApi.lock('landscape');
      return true;
    }
  } catch {
    // Browsers outside fullscreen or iOS Safari reject lock() — fall back gracefully
  }
  return false;
}

export async function toggleBrowserFullscreen(): Promise<boolean> {
  try {
    if (document.fullscreenElement) {
      if (typeof document.exitFullscreen === 'function') {
        await document.exitFullscreen().catch(() => undefined);
      }
      return false;
    }
    await requestLandscapeFullscreen();
    return Boolean(document.fullscreenElement);
  } catch {
    return false;
  }
}
