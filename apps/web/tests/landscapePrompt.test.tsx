/** @jsxImportSource preact */
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render } from 'preact';
import { LandscapeGuardOverlay } from '../src/ui/LandscapeGuardOverlay';

describe('LandscapeGuardOverlay portrait-to-landscape guard', () => {
  afterEach(() => {
    document.body.innerHTML = '';
  });

  it('renders nothing when visible is false', () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    render(<LandscapeGuardOverlay visible={false} onDismiss={() => {}} />, host);

    expect(host.querySelector('.landscape-guard-overlay')).toBeNull();
  });

  it('renders cel-shaded landscape prompt, handles unsupported orientation lock gracefully, and dismisses cleanly', async () => {
    const host = document.createElement('div');
    document.body.appendChild(host);
    const onDismiss = vi.fn();

    render(<LandscapeGuardOverlay visible={true} onDismiss={onDismiss} />, host);

    expect(host.textContent).toContain('Turn your phone sideways to visit the beach!');
    const switchBtn = Array.from(host.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Enter Landscape'),
    );
    const continueBtn = Array.from(host.querySelectorAll('button')).find((b) =>
      b.textContent?.includes('Continue Anyway'),
    );

    expect(switchBtn).toBeTruthy();
    expect(continueBtn).toBeTruthy();

    switchBtn?.click();
    await new Promise((r) => setTimeout(r, 20));
    expect(host.querySelector('.landscape-prompt-hint')?.textContent).toContain(
      'Turn your phone sideways',
    );

    continueBtn?.click();
    expect(onDismiss).toHaveBeenCalledTimes(1);
  });
});
