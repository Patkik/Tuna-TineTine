/**
 * yieldToMain.ts — Yields control back to the browser main thread using scheduler.yield()
 * when available (with setTimeout fallback) to keep INP crisp below 50ms during setup.
 */

export async function yieldToMain(): Promise<void> {
  if (typeof window !== 'undefined') {
    const win = window as unknown as {
      scheduler?: { yield?: () => Promise<void> };
    };
    if (typeof win.scheduler?.yield === 'function') {
      await win.scheduler.yield();
      return;
    }
  }
  await new Promise<void>((resolve) => setTimeout(resolve, 0));
}
