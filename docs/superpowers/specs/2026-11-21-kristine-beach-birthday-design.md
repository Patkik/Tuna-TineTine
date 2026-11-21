# Design Document: Kristine's Beach Birthday Experience

**Date:** 2026-11-21  
**Target Release:** February 5, 2027 (00:00 UTC+8 / Asia/Manila)  
**Target Platform:** Mobile Android Browsers (Chrome 120+, portrait orientation, one-handed thumb zone)

---

## 1. Intent & Purpose

A lightweight, zero-jank, storybook-style 2D interactive birthday experience for Kristine, themed around San-X beach aesthetic (Rilakkuma, Korilakkuma, character clouds, pastel sand dunes, warm chocolate-brown ink outlines). 

The application behaves like a lightweight 2D mobile game wrapped in an ultra-crisp UI shell. It must run at a solid 60–120 fps with <16 ms touch-to-paint latency on mid-range Android devices, while enforcing an edge-gated time lock until February 5, 2027.

---

## 2. Goals, Non-Goals & Anti-Goals

### Goals
- **60–120 fps animation** with zero garbage-collection stutter or layout thrashing during continuous touch gestures.
- **Stage 1 initial bundle under 150 KB (compressed)** for sub-second FCP even on constrained 4G mobile connections.
- **Single GPU Context:** Prevent WebGL context loss (`webglcontextlost`) on memory-constrained mobile devices.
- **Safe Viewport Handling:** Absolute immunity to Android Chrome address bar collapse (100dvh) and pull-to-refresh gesture hijacking (`touch-action: none`).
- **Cryptographic / Server-authoritative Time Lock:** Client cannot bypass the Feb 5, 2027 gate by tampering with phone clock.

### Non-Goals
- Full 3D rendering or heavy WebGL scene graphs (Three.js/Babylon.js).
- Desktop keyboard/mouse-centric layouts (the primary UX is 100% portrait Android touch).
- Complex server-side database requirements beyond Cloudflare Worker edge functions.

### Anti-Goals
- DOM-heavy animations that cause reflows and frame drops on Android Chrome.
- Multi-megabyte Lottie animations or uncompressed PNG sprite dumps that bloat cold start.
- Blocking initial render on network time checks (causing white-screen freezes).

---

## 3. Approaches Considered & Trade-Offs

| Dimension | Approach A: Pure Spec (React 19 + PixiJS WebGPU + Rive Canvas) | Approach B: Ultra-Lean Mobile (Preact + PixiJS WebGL2 + Sprite Atlases) [RECOMMENDED] | Approach C: Hybrid (Preact + PixiJS + Offscreen Rive) |
|---|---|---|---|
| **UI Framework** | React 19 (~45 KB gzip) | Preact 10 (~4 KB gzip) via Vite alias | Preact 10 (~4 KB gzip) |
| **Renderer Engine** | PixiJS v8 with WebGPU auto-detection | PixiJS v8 forced to WebGL2 primary | PixiJS v8 WebGL2 primary |
| **Character Rigging** | Rive WASM runtime (~200 KB) + separate canvas elements | Packed WebP texture atlases + Pixi `AnimatedSprite` (<80 KB) | Rive WASM rendered into OffscreenCanvas texture |
| **GPU Contexts** | 2+ WebGL/Canvas contexts (High crash risk on Android) | **1 single WebGL2 context** (Zero context collisions) | 1 single WebGL2 context |
| **Cold Start Bundle** | ~420 KB compressed JS/WASM | **~115 KB compressed JS** | ~280 KB compressed JS/WASM |
| **Verdict** | High risk of shader compilation freeze & Android context loss | **Cleanest, fastest, zero-jank guarantee** | Feasible if Rive vector source files are mandatory |

**Selection:** **Approach B** is selected as the primary architecture. Preact provides standard React JSX ergonomics for HUD overlays without runtime bloat. WebGL2 delivers instant shader compilation without WebGPU mobile driver stalls. Spritesheet animation batches all characters and props into 1–2 draw calls on a single WebGL context.

---

## 4. Architectural Decisions & Key Components

### 4.1 Monorepo Structure (`pnpm` workspace)
```
kristine-beach-birthday/
├── apps/
│   ├── web/                         # Vite + Preact + TypeScript + PixiJS v8
│   │   ├── public/assets/           # Atlases, audio sprites, web fonts
│   │   └── src/
│   │       ├── core/                # TimeGate, AudioManager, Haptics, AssetLoader
│   │       ├── store/               # Zustand FSM (LOCKED -> INTRO -> DIG -> BOTTLE -> CAKE -> LETTER)
│   │       ├── engine/              # PixiJS v8 Canvas Stage, DPR clamp (<=2), Ticker
│   │       │   ├── layers/          # SkyLayer, OceanLayer, SandLayer
│   │       │   ├── shaders/         # sandScratch.frag, sunsetTint.frag
│   │       │   └── scenes/          # LockScene, DigScene, BottleScene, CakeScene
│   │       └── ui/                  # Preact Overlays (Countdown, Cards, Letter, Keepsake)
│   └── edge-gate/                   # Cloudflare Worker
│       ├── wrangler.toml
│       └── src/                     # /api/status, AES-GCM decryption key release
└── package.json
```

### 4.2 Ticker & Animation Synchronization
To eliminate micro-stutters caused by uncoupled `requestAnimationFrame` loops on 90Hz/120Hz LTPO screens:
- Pixi's `app.ticker` acts as the master clock.
- GSAP's internal ticker is disabled (`gsap.ticker.remove(gsap.updateRoot)`), and driven explicitly inside `app.ticker.add((ticker) => gsap.updateRoot(ticker.lastTime / 1000))`.

### 4.3 Viewport & Touch Protection
- Root container: `height: 100dvh; width: 100vw; overflow: hidden; overscroll-behavior: none;`.
- Canvas element: `touch-action: none;` to prevent browser pull-to-refresh or back-swipe triggers.
- DPR clamp: `Math.min(window.devicePixelRatio, 2)` to protect battery and thermal limits on 3.0+ DPR displays.

### 4.4 Tamper-Proof Time-Lock Flow
1. App boots immediately into Act 0 ("Sleepy Tide Countdown") with client placeholder time.
2. Background request to Cloudflare Worker `/api/status`.
3. If authoritative `serverNow >= 1801756800000` (Feb 5, 2027 00:00 UTC+8) or signed `?preview=` token is present:
   - Worker returns `{ unlocked: true, key: "..." }`.
   - Client imports Act 1–6 scene chunks asynchronously via `import('./scenes/BirthdayExperience')`.
4. Sensitive letters and personal assets are never exposed in the public initial bundle.

---

## 5. What is Left to the Builder

- Creating or packing vector asset frames into WebP sprite atlases (Rilakkuma snoozing/wiggling, Korilakkuma digging, beach umbrella, crabs).
- Implementing the custom fragment shader `sandScratch.frag` for GPU alpha-mask thumb digging.
- Tuning audio sprite cues for wave ambience, sand crunch, and chimes.
- Implementing on-device canvas capture (`canvas.toBlob()`) for the keepsake postcard download.
