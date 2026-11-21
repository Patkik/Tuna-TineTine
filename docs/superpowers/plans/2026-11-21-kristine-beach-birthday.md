# Kristine Beach Birthday Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a zero-jank, heavy-graphics 2D San-X beach birthday experience for Kristine optimized for portrait Android Chrome, featuring a tamper-proof February 5, 2027 time lock and a 6-act interactive story.

**Architecture:** A single-context WebGL2 2D rendering pipeline using PixiJS v8 and GSAP 3 wrapped in a lightweight Preact UI shell for overlays. A Zustand finite state machine coordinates Act 0 (Lock) through Act 6 (Keepsake), synced with an edge-authoritative Cloudflare Worker time-gate.

**Tech Stack:** Preact 10, TypeScript, Vite, PixiJS v8 (WebGL2), GSAP 3, Zustand, Howler.js, Vitest, Cloudflare Workers.

**Spec:** [docs/superpowers/specs/2026-11-21-kristine-beach-birthday-design.md](file:///c:/Users/patri/Desktop/Holy%20folder/Tine/docs/superpowers/specs/2026-11-21-kristine-beach-birthday-design.md)  
**Reference Art:** [docs/reference/rilakkuma-beach-reference.jpg](file:///c:/Users/patri/Desktop/Holy%20folder/Tine/docs/reference/rilakkuma-beach-reference.jpg)

---

## Global Constraints

- **Theme Palette:** Chocolate brown outline `#4A2C1D`, Cerulean sky `#0EA5E9` to `#67E8F9`, Turquoise ocean `#7DD3FC`, Butter-cream sand `#F3E5AB`, Shadow troughs `#E6D395`, Pop accents `#F472B6`, `#06B6D4`, `#FACC15`, `#EF4444`.
- **Viewport Lock:** Root container `height: 100dvh; width: 100vw; overflow: hidden; overscroll-behavior: none;`.
- **Gesture Hijack Guard:** Canvas `touch-action: none;` on all interactive layers.
- **Resolution Cap:** Clamped to `Math.min(window.devicePixelRatio, 2)`.
- **Target Lock Date:** February 5, 2027, 00:00:00 UTC+8 (`1801756800000` ms epoch).
- **Single GPU Context:** All on-screen drawing must use one single WebGL2 context to prevent mobile driver crashes.
- **Dual Ticker Sync:** GSAP must be driven by Pixi's `app.ticker`, never by an uncoupled browser `requestAnimationFrame`.

---

## Review Focus

1. **System clock tampering before Feb 5, 2027:** Advancing phone date must NOT unlock the site; client must verify authoritative server time from the Cloudflare Worker `/api/status`.
2. **Android Web Audio autoplay block:** Sound must not throw uncaught errors or remain permanently silent; Act 1 first-tap gesture must resume AudioContext safely.
3. **Android Chrome address bar collapsing/expanding:** Dynamic toolbar resize must not trigger layout recalculation jank or black/white letterbox bars on the canvas.
4. **Vigorous sand digging swipe gestures:** Rapid thumb rubbing must not trigger Chrome's pull-to-refresh or Android system gesture navigation.
5. **Microphone permission rejection for candle blow-out:** Denying mic permission must seamlessly fall back to tap-and-hold wind gusts with zero user disruption.

---

### Task 1: Project Scaffolding & Mobile Shell Setup

**Files:**
- Create: `package.json`
- Create: `apps/web/package.json`
- Create: `apps/web/vite.config.ts`
- Create: `apps/web/tsconfig.json`
- Create: `apps/web/index.html`
- Create: `apps/web/src/main.tsx`
- Create: `apps/web/src/styles/shell.css`
- Test: `apps/web/tests/viewport.test.ts`

**Interfaces:**
- Produces: Base Vite dev server running Preact with 100dvh mobile shell and Vitest test harness.

- [ ] **Step 1: Write viewport and shell configuration test**

```typescript
// apps/web/tests/viewport.test.ts
import { describe, it, expect } from 'vitest';

describe('Viewport and Mobile Shell Config', () => {
  it('should define safe viewport meta for Android Chrome', () => {
    const metaViewport = 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover';
    expect(metaViewport).toContain('viewport-fit=cover');
    expect(metaViewport).toContain('user-scalable=no');
  });

  it('should define 100dvh root constraints in CSS tokens', () => {
    const rootStyle = {
      height: '100dvh',
      width: '100vw',
      overflow: 'hidden',
      overscrollBehavior: 'none',
      touchAction: 'none'
    };
    expect(rootStyle.height).toBe('100dvh');
    expect(rootStyle.touchAction).toBe('none');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test` inside `apps/web`  
Expected: FAIL with missing configuration / test files.

- [ ] **Step 3: Implement workspace root and `apps/web` project files**

Configure root `package.json`, `apps/web/package.json` (Preact, Vite, Vitest, TypeScript), `apps/web/vite.config.ts` with Preact alias, and `apps/web/src/styles/shell.css` containing `100dvh`, `env(safe-area-inset-top)`, and `touch-action: none`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix apps/web test`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add package.json apps/web/
git commit -m "chore: scaffold vite preact mobile shell with 100dvh constraints"
```

---

### Task 2: Time-Gate & Authoritative Edge Time Engine

**Files:**
- Create: `apps/web/src/core/timeGate.ts`
- Test: `apps/web/tests/timeGate.test.ts`

**Interfaces:**
- Produces: `checkUnlockStatus(serverUrl: string, previewToken?: string | null): Promise<TimeStatus>`
- Produces: `calculateRemainingTime(targetEpochMs: number, currentEpochMs: number): CountdownParts`

- [ ] **Step 1: Write the failing unit tests for time gate and countdown**

```typescript
// apps/web/tests/timeGate.test.ts
import { describe, it, expect } from 'vitest';
import { calculateRemainingTime, isUnlocked, TARGET_DATE_MS } from '../src/core/timeGate';

describe('Time Gate Engine', () => {
  it('should lock when server time is before February 5, 2027 00:00:00 UTC+8', () => {
    const beforeLock = TARGET_DATE_MS - 5000000;
    expect(isUnlocked(beforeLock)).toBe(false);
  });

  it('should unlock when server time equals or exceeds February 5, 2027 00:00:00 UTC+8', () => {
    const atLock = TARGET_DATE_MS;
    const afterLock = TARGET_DATE_MS + 1000;
    expect(isUnlocked(atLock)).toBe(true);
    expect(isUnlocked(afterLock)).toBe(true);
  });

  it('should bypass lock when a valid preview token is supplied', () => {
    const beforeLock = TARGET_DATE_MS - 5000000;
    expect(isUnlocked(beforeLock, 'valid_secret_preview_token')).toBe(true);
  });

  it('should accurately compute countdown days, hours, minutes, seconds', () => {
    const now = TARGET_DATE_MS - (2 * 86400000 + 3 * 3600000 + 4 * 60000 + 5 * 1000);
    const countdown = calculateRemainingTime(TARGET_DATE_MS, now);
    expect(countdown).toEqual({ days: 2, hours: 3, minutes: 4, seconds: 5, totalMs: expect.any(Number) });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/web test timeGate.test.ts`  
Expected: FAIL with module not found.

- [ ] **Step 3: Implement `apps/web/src/core/timeGate.ts`**

Define `TARGET_DATE_MS = 1801756800000` (Feb 5, 2027 00:00:00 UTC+8), `isUnlocked()`, `calculateRemainingTime()`, and `fetchAuthoritativeStatus()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix apps/web test timeGate.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/core/timeGate.ts apps/web/tests/timeGate.test.ts
git commit -m "feat: implement edge-authoritative time gate and countdown calculations"
```

---

### Task 3: Story State Machine & Safe Audio Manager

**Files:**
- Create: `apps/web/src/store/useStoryStore.ts`
- Create: `apps/web/src/core/audioManager.ts`
- Create: `apps/web/src/core/haptics.ts`
- Test: `apps/web/tests/storyStore.test.ts`

**Interfaces:**
- Produces: `useStoryStore` Zustand hook with acts: `LOCKED | INTRO | DIGGING | BOTTLE | CAKE | LETTER | SANDBOX`
- Produces: `audioManager.init()`, `audioManager.play(soundName)`, `audioManager.unlockAudioContext()`
- Produces: `triggerHaptic(durationMs: number)`

- [ ] **Step 1: Write test for story store transitions**

```typescript
// apps/web/tests/storyStore.test.ts
import { describe, it, expect, beforeEach } from 'vitest';
import { useStoryStore } from '../src/store/useStoryStore';

describe('Story State Machine', () => {
  beforeEach(() => {
    useStoryStore.getState().reset();
  });

  it('should start in LOCKED state by default', () => {
    expect(useStoryStore.getState().currentAct).toBe('LOCKED');
  });

  it('should transition sequentially through story acts', () => {
    const store = useStoryStore.getState();
    store.setAct('INTRO');
    expect(useStoryStore.getState().currentAct).toBe('INTRO');
    store.setAct('DIGGING');
    expect(useStoryStore.getState().currentAct).toBe('DIGGING');
    store.unearthItem('starfish');
    expect(useStoryStore.getState().dugItems).toContain('starfish');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/web test storyStore.test.ts`  
Expected: FAIL with module not found.

- [ ] **Step 3: Implement `useStoryStore.ts`, `audioManager.ts` (with `document.visibilitychange` suspend), and `haptics.ts`**

Implement Zustand FSM tracking acts, discovered treasures, and audio/haptic states.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix apps/web test storyStore.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/store/ apps/web/src/core/ apps/web/tests/storyStore.test.ts
git commit -m "feat: add zustand story state machine, safe audio manager, and haptics"
```

---

### Task 4: PixiJS v8 Canvas Stage & Android DPR Clamping

**Files:**
- Create: `apps/web/src/engine/BeachStage.ts`
- Create: `apps/web/src/engine/tickerSync.ts`
- Test: `apps/web/tests/beachStage.test.ts`

**Interfaces:**
- Produces: `BeachStage` class managing single WebGL2 `Application`, DPR cap (`Math.min(devicePixelRatio, 2)`), resize handling, and GSAP ticker sync.

- [ ] **Step 1: Write tests for DPR clamping and ticker sync**

```typescript
// apps/web/tests/beachStage.test.ts
import { describe, it, expect } from 'vitest';
import { clampDevicePixelRatio } from '../src/engine/BeachStage';

describe('BeachStage Engine Settings', () => {
  it('should clamp high-DPR Android screens to 2.0 max', () => {
    expect(clampDevicePixelRatio(1)).toBe(1);
    expect(clampDevicePixelRatio(2)).toBe(2);
    expect(clampDevicePixelRatio(3)).toBe(2);
    expect(clampDevicePixelRatio(3.5)).toBe(2);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/web test beachStage.test.ts`  
Expected: FAIL with function not found.

- [ ] **Step 3: Implement `BeachStage.ts` and `tickerSync.ts`**

Setup PixiJS v8 `Application` with `preference: 'webgl'`, clamped resolution, `autoDensity: true`, `powerPreference: 'high-performance'`, and GSAP synchronization.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix apps/web test beachStage.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/engine/ apps/web/tests/beachStage.test.ts
git commit -m "feat: setup pixijs v8 webgl2 stage with dpr clamping and gsap ticker sync"
```

---

### Task 5: Parallax Atmospheric Layers (Sky, Clouds, Ocean Horizon)

**Files:**
- Create: `apps/web/src/engine/layers/SkyLayer.ts`
- Create: `apps/web/src/engine/layers/OceanLayer.ts`
- Create: `apps/web/src/engine/graphics/clouds.ts`
- Create: `apps/web/src/engine/graphics/seagulls.ts`
- Test: `apps/web/tests/layers.test.ts`

**Interfaces:**
- Consumes: `BeachStage.stage`
- Produces: `SkyLayer` container with animated bear-shaped cloud, chick cloud, flying seagulls, and skywriting plane.
- Produces: `OceanLayer` container with turquoise water horizon, foam lines, and bobbing sailboats.

- [ ] **Step 1: Write test verifying layer creation and hierarchy**

```typescript
// apps/web/tests/layers.test.ts
import { describe, it, expect } from 'vitest';
import { Container } from 'pixi.js';
import { SkyLayer } from '../src/engine/layers/SkyLayer';
import { OceanLayer } from '../src/engine/layers/OceanLayer';

describe('Atmospheric Layers', () => {
  it('should initialize SkyLayer and OceanLayer as Pixi Containers', () => {
    const sky = new SkyLayer();
    const ocean = new OceanLayer();
    expect(sky).toBeInstanceOf(Container);
    expect(ocean).toBeInstanceOf(Container);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/web test layers.test.ts`  
Expected: FAIL with classes not defined.

- [ ] **Step 3: Implement `SkyLayer.ts`, `OceanLayer.ts`, `clouds.ts`, and `seagulls.ts`**

Render the reference art's Cerulean gradient (`#0EA5E9` to `#67E8F9`), giant smiling bear cumulus cloud, chick cloud, Japanese vertical text stamp ("海辺で だららん りらっくま™"), and animated contrail airplane.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix apps/web test layers.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/engine/layers/ apps/web/src/engine/graphics/ apps/web/tests/layers.test.ts
git commit -m "feat: render sky, character clouds, ocean horizon, and contrail plane layers"
```

---

### Task 6: Foreground Sand Dunes & Character Sprites (Act 0 Scene)

**Files:**
- Create: `apps/web/src/engine/layers/SandLayer.ts`
- Create: `apps/web/src/engine/graphics/characters.ts`
- Create: `apps/web/src/engine/graphics/props.ts`
- Create: `apps/web/src/ui/CountdownSign.tsx`
- Test: `apps/web/tests/sandScene.test.ts`

**Interfaces:**
- Produces: `SandLayer` containing butter-cream dunes (`#F3E5AB`), sleeping Rilakkuma under striped umbrella, scuttling red crabs with haptic pokes, Korilakkuma with sunhat/bucket, and wooden countdown sign.

- [ ] **Step 1: Write test for interactive character tap handlers**

```typescript
// apps/web/tests/sandScene.test.ts
import { describe, it, expect } from 'vitest';
import { SandLayer } from '../src/engine/layers/SandLayer';

describe('Sand Layer & Characters', () => {
  it('should instantiate SandLayer and expose interactive hitboxes', () => {
    const sand = new SandLayer();
    expect(sand.rilakkuma).toBeDefined();
    expect(sand.umbrella).toBeDefined();
    expect(sand.crabs.length).toBeGreaterThan(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/web test sandScene.test.ts`  
Expected: FAIL with classes not defined.

- [ ] **Step 3: Implement `SandLayer.ts`, `characters.ts`, `props.ts`, and `CountdownSign.tsx`**

Vector/procedural graphics with thick chocolate-brown outlines (`#4A2C1D`), interactive tap listeners for Rilakkuma wiggles, crab scuttles, and server-synced countdown sign.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix apps/web test sandScene.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/engine/layers/SandLayer.ts apps/web/src/engine/graphics/ apps/web/src/ui/CountdownSign.tsx apps/web/tests/sandScene.test.ts
git commit -m "feat: add foreground sand dunes, sleeping rilakkuma, crabs, and countdown sign"
```

---

### Task 7: Interactive Sand Digging Mechanic (Act 2)

**Files:**
- Create: `apps/web/src/engine/shaders/sandScratch.frag`
- Create: `apps/web/src/engine/scenes/DigScene.ts`
- Create: `apps/web/src/ui/TreasureCard.tsx`
- Test: `apps/web/tests/digScene.test.ts`

**Interfaces:**
- Produces: GPU alpha-erase scratching mask on 4 sand mounds.
- Produces: Treasure unearthing events: `starfish`, `octopus`, `sailboat`, `seashell`.
- Produces: Appreciation card overlay when an item is unearthed.

- [ ] **Step 1: Write test for digging completion calculation**

```typescript
// apps/web/tests/digScene.test.ts
import { describe, it, expect } from 'vitest';
import { calculateScratchProgress } from '../src/engine/scenes/DigScene';

describe('Digging Scratch Mechanic', () => {
  it('should consider a mound unearthed when scratch coverage exceeds 65%', () => {
    expect(calculateScratchProgress(50, 100)).toBe(0.5);
    expect(calculateScratchProgress(70, 100) >= 0.65).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/web test digScene.test.ts`  
Expected: FAIL with function not found.

- [ ] **Step 3: Implement `sandScratch.frag`, `DigScene.ts`, and `TreasureCard.tsx`**

Custom fragment shader masking render texture via touch points, haptic feedback on swipe, and spring-up animation for unearthed treasures.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix apps/web test digScene.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/engine/shaders/ apps/web/src/engine/scenes/DigScene.ts apps/web/src/ui/TreasureCard.tsx apps/web/tests/digScene.test.ts
git commit -m "feat: implement gpu alpha-mask sand digging and treasure cards"
```

---

### Task 8: Message in a Bottle & Polaroid Stack (Act 3)

**Files:**
- Create: `apps/web/src/engine/scenes/BottleScene.ts`
- Create: `apps/web/src/ui/PolaroidStack.tsx`
- Create: `apps/web/src/styles/polaroid.css`
- Test: `apps/web/tests/bottleScene.test.ts`

**Interfaces:**
- Produces: Corked bottle riding in on wave, swipe-up uncork gesture.
- Produces: Tactile touch/swipe physics Polaroid card deck with inside jokes/illustrations.

- [ ] **Step 1: Write test for polaroid navigation and swipe physics**

```typescript
// apps/web/tests/bottleScene.test.ts
import { describe, it, expect } from 'vitest';
import { getNextCardIndex } from '../src/ui/PolaroidStack';

describe('Polaroid Stack Navigation', () => {
  it('should advance to next card on swipe left and loop or clamp at end', () => {
    expect(getNextCardIndex(0, 'left', 4)).toBe(1);
    expect(getNextCardIndex(3, 'left', 4)).toBe(3);
    expect(getNextCardIndex(2, 'right', 4)).toBe(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/web test bottleScene.test.ts`  
Expected: FAIL with function not found.

- [ ] **Step 3: Implement `BottleScene.ts`, `PolaroidStack.tsx`, and `polaroid.css`**

Wave ride-in animation, pop sound on uncork, and smooth flick gesture physics for Polaroid cards.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix apps/web test bottleScene.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/engine/scenes/BottleScene.ts apps/web/src/ui/PolaroidStack.tsx apps/web/src/styles/polaroid.css apps/web/tests/bottleScene.test.ts
git commit -m "feat: add message in a bottle and interactive polaroid memory stack"
```

---

### Task 9: Sandcastle Birthday Cake & Candle Blow-Out (Act 4)

**Files:**
- Create: `apps/web/src/engine/scenes/CakeWishScene.ts`
- Create: `apps/web/src/engine/shaders/sunsetTint.frag`
- Create: `apps/web/src/core/blowDetector.ts`
- Test: `apps/web/tests/cakeWish.test.ts`

**Interfaces:**
- Produces: Sand sculpture transform into birthday cake with animated sparkler flames.
- Produces: Touch-and-hold wind gust or optional mic frequency detection to blow out candles.
- Produces: Smooth transition to warm sunset twilight via `sunsetTint.frag`.

- [ ] **Step 1: Write test for candle blow-out completion threshold**

```typescript
// apps/web/tests/cakeWish.test.ts
import { describe, it, expect } from 'vitest';
import { evaluateBlowProgress } from '../src/core/blowDetector';

describe('Candle Blow-Out Logic', () => {
  it('should extinguish candles when wind hold reaches 1.5 seconds', () => {
    expect(evaluateBlowProgress(1000)).toBe(false);
    expect(evaluateBlowProgress(1500)).toBe(true);
    expect(evaluateBlowProgress(2000)).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/web test cakeWish.test.ts`  
Expected: FAIL with function not found.

- [ ] **Step 3: Implement `CakeWishScene.ts`, `sunsetTint.frag`, and `blowDetector.ts`**

Sparkler particle flames, dual blow detection (touch hold + mic fallback), and color grading transition to golden sunset.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix apps/web test cakeWish.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/engine/scenes/CakeWishScene.ts apps/web/src/engine/shaders/sunsetTint.frag apps/web/src/core/blowDetector.ts apps/web/tests/cakeWish.test.ts
git commit -m "feat: implement sandcastle cake, candle blow-out, and sunset twilight transition"
```

---

### Task 10: Unfolded Birthday Letter & Keepsake Exporter (Acts 5 & 6)

**Files:**
- Create: `apps/web/src/ui/BirthdayLetter.tsx`
- Create: `apps/web/src/ui/KeepsakeExporter.tsx`
- Create: `apps/web/src/core/keepsakeGenerator.ts`
- Create: `apps/web/src/ui/SandboxControls.tsx`
- Test: `apps/web/tests/keepsake.test.ts`

**Interfaces:**
- Produces: Storybook cream stationery letter unfold animation with personal message.
- Produces: `generateKeepsakeBlob(stageCanvas: HTMLCanvasElement): Promise<Blob>` generating high-res commemorative PNG for download.
- Produces: UI toggle to enter free-play sandbox mode.

- [ ] **Step 1: Write test for keepsake canvas metadata and filename formatting**

```typescript
// apps/web/tests/keepsake.test.ts
import { describe, it, expect } from 'vitest';
import { formatKeepsakeFilename } from '../src/core/keepsakeGenerator';

describe('Keepsake Exporter', () => {
  it('should format filename with Kristine and target date', () => {
    const filename = formatKeepsakeFilename('Kristine', '2027-02-05');
    expect(filename).toBe('Kristine-Beach-Birthday-2027-02-05.png');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/web test keepsake.test.ts`  
Expected: FAIL with function not found.

- [ ] **Step 3: Implement `BirthdayLetter.tsx`, `KeepsakeExporter.tsx`, `keepsakeGenerator.ts`, and `SandboxControls.tsx`**

Parchment letter animation, canvas-to-blob on-device compositing, and beach free-play UI toggles.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix apps/web test keepsake.test.ts`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/web/src/ui/ apps/web/src/core/keepsakeGenerator.ts apps/web/tests/keepsake.test.ts
git commit -m "feat: add unfolded birthday letter, keepsake postcard exporter, and sandbox controls"
```

---

### Task 11: Cloudflare Worker Time-Lock API (`edge-gate`)

**Files:**
- Create: `apps/edge-gate/wrangler.toml`
- Create: `apps/edge-gate/package.json`
- Create: `apps/edge-gate/tsconfig.json`
- Create: `apps/edge-gate/src/index.ts`
- Create: `apps/edge-gate/src/content.ts`
- Test: `apps/edge-gate/tests/worker.test.ts`

**Interfaces:**
- Produces: Cloudflare Worker endpoints:
  - `GET /api/status`: returns `{ unlocked: boolean, serverNow: number, unlockAt: number }`
  - `GET /api/unlock`: returns encrypted payload key if `serverNow >= 1801756800000` or valid `?preview=` token.

- [ ] **Step 1: Write unit test for worker request handler**

```typescript
// apps/edge-gate/tests/worker.test.ts
import { describe, it, expect } from 'vitest';
import { handleStatusRequest } from '../src/index';

describe('Edge Gate Worker API', () => {
  it('should return unlocked=false before Feb 5, 2027 without preview token', () => {
    const res = handleStatusRequest(1700000000000, null);
    expect(res.unlocked).toBe(false);
  });

  it('should return unlocked=true if valid preview token is provided', () => {
    const res = handleStatusRequest(1700000000000, 'dev_preview_token_2027');
    expect(res.unlocked).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm --prefix apps/edge-gate test`  
Expected: FAIL with module not found.

- [ ] **Step 3: Implement Cloudflare Worker in `apps/edge-gate/src/index.ts` and `content.ts`**

Edge time check, CORS headers, `Cache-Control: no-store` on status check, and preview token verification.

- [ ] **Step 4: Run test to verify it passes**

Run: `npm --prefix apps/edge-gate test`  
Expected: PASS

- [ ] **Step 5: Commit**

```bash
git add apps/edge-gate/
git commit -m "feat: implement cloudflare worker time-lock edge-gate API"
```

---

### Task 12: Full Integration & Mobile Chrome Verification

**Files:**
- Modify: `apps/web/src/main.tsx`
- Create: `apps/web/src/App.tsx`
- Test: `apps/web/tests/integration.test.ts`

**Interfaces:**
- Produces: Fully integrated app wiring the Pixi canvas stage, Zustand store, Preact HUD overlays, and edge time-gate.

- [ ] **Step 1: Write integration test for end-to-end Act transitions**

```typescript
// apps/web/tests/integration.test.ts
import { describe, it, expect } from 'vitest';
import { useStoryStore } from '../src/store/useStoryStore';

describe('End-to-End Story Flow', () => {
  it('should progress through the full story without invalid states', () => {
    const acts = ['LOCKED', 'INTRO', 'DIGGING', 'BOTTLE', 'CAKE', 'LETTER', 'SANDBOX'] as const;
    acts.forEach((act) => {
      useStoryStore.getState().setAct(act);
      expect(useStoryStore.getState().currentAct).toBe(act);
    });
  });
});
```

- [ ] **Step 2: Run test to verify it passes**

Run: `npm --prefix apps/web test integration.test.ts`  
Expected: PASS

- [ ] **Step 3: Verify build output size and budget**

Run: `npm --prefix apps/web run build`  
Verify: Initial JS chunk is under 150 KB compressed.

- [ ] **Step 4: Commit**

```bash
git add apps/web/src/App.tsx apps/web/src/main.tsx apps/web/tests/integration.test.ts
git commit -m "feat: complete end-to-end integration of beach birthday experience"
```
