/** @jsxImportSource preact */
/**
 * StackedScratchDeck.tsx — Beats 2 & 3 interactive coastal scratch-off tickets:
 * - Beat 2a (WIND_INTRO): 4 coastal tickets sweep in with real aerodynamic 3D paper-flutter
 *   physics across a soft focus scrim, gently drift near center screen, and invite the user
 *   to tap/catch them ("We might get lucky — catch the tickets!") into the resting stack.
 * - Beat 2b (STACKED_SCRATCH): Metallic paw/starfish foil with holographic shimmer, pooled
 *   foil flakes, zero-react-rerender scratch jitter, under-card peek on drag, and silky
 *   momentum flick swipe-out (cards promote smoothly with zero snap).
 * - Beat 3 (ALL_CARDS_FAN -> BLOW_AWAY): Elastic 4-card fan above "Blow Tickets Away" pill,
 *   then staggered aerodynamic tumble flight off-screen right.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import gsap from 'gsap';
import type { ScratchTicketContent } from '../../../edge-gate/src/content';
import { audioManager } from '../core/audioManager';
import { triggerHaptic } from '../core/haptics';
import {
  SCRATCH_AUTO_CLEAR_THRESHOLD,
  ScratchCoverageGrid,
  shouldDismissSwipe,
} from './scratchMath';

export interface StackedScratchDeckProps {
  tickets: ScratchTicketContent[];
  currentState: 'WIND_INTRO' | 'STACKED_SCRATCH' | 'ALL_CARDS_FAN' | 'BLOW_AWAY';
  scratchedIds: string[];
  swipedIds: string[];
  onTicketsCaught: () => void;
  onTicketScratched: (id: string) => void;
  onTicketSwiped: (id: string) => void;
  onBlowTicketsAway: () => void;
  onBlowAwayComplete: () => void;
}

interface FoilFlake {
  active: boolean;
  x: number;
  y: number;
  vx: number;
  vy: number;
  rot: number;
  vRot: number;
  size: number;
  color: string;
  age: number;
  life: number;
}

interface FloatingCardSpec {
  startX: number;
  startY: number;
  hoverX: number;
  hoverY: number;
  hoverRot: number;
  delay: number;
  flutterFreq: number;
  flutterAmp: number;
}

const UNDER_TILTS = [0, -3.5, 3, -2];
const FLAKE_POOL_SIZE = 56;
const FLAKE_COLORS = ['#E5D8BF', '#FACC15', '#FFFDF7', '#E87A45', '#F472B6'];

const FLOATING_SPECS: readonly FloatingCardSpec[] = [
  { startX: -620, startY: -120, hoverX: -48, hoverY: -18, hoverRot: -9, delay: 0.0, flutterFreq: 5.2, flutterAmp: 13 },
  { startX: -720, startY: 50, hoverX: 44, hoverY: -8, hoverRot: 8, delay: 0.14, flutterFreq: 4.7, flutterAmp: 15 },
  { startX: -660, startY: -40, hoverX: -24, hoverY: 16, hoverRot: -4, delay: 0.28, flutterFreq: 5.6, flutterAmp: 11 },
  { startX: -780, startY: 110, hoverX: 32, hoverY: 20, hoverRot: 11, delay: 0.42, flutterFreq: 4.4, flutterAmp: 14 },
];

function stackPoseFor(stackIdx: number) {
  const clamped = Math.max(0, Math.min(3, stackIdx));
  return {
    x: clamped * 3,
    y: clamped * 5,
    rotation: UNDER_TILTS[clamped] ?? 0,
    rotationX: 0,
    rotationY: 0,
    scale: 1 - clamped * 0.035,
  };
}

function TicketGlyph({ icon }: { icon: ScratchTicketContent['icon'] }) {
  switch (icon) {
    case 'starfish':
      return (
        <svg viewBox="0 0 40 40" width="28" height="28" aria-hidden="true">
          <path
            d="M20 4 L24.5 14.5 L36 15.5 L27 23 L29.5 34.5 L20 28.5 L10.5 34.5 L13 23 L4 15.5 L15.5 14.5 Z"
            fill="#FACC15"
            stroke="#4A2C1D"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
        </svg>
      );
    case 'shell':
      return (
        <svg viewBox="0 0 40 40" width="28" height="28" aria-hidden="true">
          <path
            d="M20 33 L13 31 C7 25, 4 17, 6 11 C9 6, 31 6, 34 11 C36 17, 33 25, 27 31 Z"
            fill="#F9A8D4"
            stroke="#4A2C1D"
            strokeWidth="2.4"
            strokeLinejoin="round"
          />
          <path d="M20 31 L14 11 M20 31 L20 9 M20 31 L26 11" stroke="#FFFDF7" strokeWidth="1.6" />
        </svg>
      );
    case 'sailboat':
      return (
        <svg viewBox="0 0 40 40" width="28" height="28" aria-hidden="true">
          <path d="M19 6 L7 25 L19 25 Z" fill="#E87A45" stroke="#4A2C1D" strokeWidth="2.2" />
          <path d="M21 9 L31 25 L21 25 Z" fill="#FFFDF7" stroke="#4A2C1D" strokeWidth="2.2" />
          <path d="M6 27 L34 27 C31 34, 9 34, 6 27 Z" fill="#7DD3FC" stroke="#4A2C1D" strokeWidth="2.2" />
        </svg>
      );
    case 'heart':
      return (
        <svg viewBox="0 0 40 40" width="28" height="28" aria-hidden="true">
          <path
            d="M20 33 C9 25, 5 18, 5 13 C5 8.5, 8.5 5.5, 13 5.5 C16.2 5.5, 18.6 7.5, 20 10 C21.4 7.5, 23.8 5.5, 27 5.5 C31.5 5.5, 35 8.5, 35 13 C35 18, 31 25, 20 33 Z"
            fill="#F472B6"
            stroke="#4A2C1D"
            strokeWidth="2.4"
          />
        </svg>
      );
  }
}

function paintMetallicFoil(canvas: HTMLCanvasElement): void {
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  const { width: w, height: h } = canvas;
  ctx.clearRect(0, 0, w, h);

  const grad = ctx.createLinearGradient(0, 0, w, h);
  grad.addColorStop(0, '#DCD3C0');
  grad.addColorStop(0.48, '#EFE9DA');
  grad.addColorStop(1, '#CFC5B1');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);

  ctx.fillStyle = 'rgba(74, 44, 29, 0.14)';
  for (let row = 0; row < 4; row++) {
    for (let col = 0; col < 6; col++) {
      const px = 22 + col * 52 + (row % 2) * 24;
      const py = 18 + row * 34;
      ctx.beginPath();
      ctx.arc(px, py + 3, 4.5, 0, Math.PI * 2);
      ctx.arc(px - 5, py - 3, 2, 0, Math.PI * 2);
      ctx.arc(px, py - 5, 2, 0, Math.PI * 2);
      ctx.arc(px + 5, py - 3, 2, 0, Math.PI * 2);
      ctx.fill();
    }
  }

  ctx.fillStyle = 'rgba(74, 44, 29, 0.56)';
  ctx.font = '700 16px Fredoka, system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('✨ Rub to Scratch ✨', w / 2, h / 2);
}

export function StackedScratchDeck({
  tickets,
  currentState,
  scratchedIds,
  swipedIds,
  onTicketsCaught,
  onTicketScratched,
  onTicketSwiped,
  onBlowTicketsAway,
  onBlowAwayComplete,
}: StackedScratchDeckProps) {
  const cardRefs = useRef(new Map<string, HTMLDivElement>());
  const fanCardRefs = useRef<Array<HTMLDivElement | null>>([]);
  const foilCanvasRef = useRef<HTMLCanvasElement>(null);
  const flakeCanvasRef = useRef<HTMLCanvasElement>(null);
  const coverageRef = useRef(new ScratchCoverageGrid(24, 12));
  const lastPointRef = useRef<{ x: number; y: number } | null>(null);
  const scratchingRef = useRef(false);
  const autoClearedRef = useRef(false);

  const [catchPromptVisible, setCatchPromptVisible] = useState(false);
  const [catchingIntro, setCatchingIntro] = useState(false);
  const [scrimFadingOut, setScrimFadingOut] = useState(false);
  const [swipingOutIds, setSwipingOutIds] = useState<string[]>([]);

  const introRafRef = useRef<number | null>(null);
  const catchingRef = useRef(false);
  const prevStateRef = useRef(currentState);

  const swipeDragRef = useRef<{
    active: boolean;
    cardId: string;
    pointerId: number;
    startX: number;
    startY: number;
    lastX: number;
    lastTime: number;
    vx: number;
  } | null>(null);

  const flakesRef = useRef<FoilFlake[]>(
    Array.from({ length: FLAKE_POOL_SIZE }, () => ({
      active: false,
      x: 0,
      y: 0,
      vx: 0,
      vy: 0,
      rot: 0,
      vRot: 0,
      size: 4,
      color: FLAKE_COLORS[0],
      age: 0,
      life: 0.7,
    })),
  );
  const flakeRafRef = useRef<number | null>(null);

  const visibleStack = tickets.filter(
    (t) => !swipedIds.includes(t.id) && !swipingOutIds.includes(t.id),
  );
  const renderedDeckCards = tickets.filter((t) => !swipedIds.includes(t.id));
  const activeTicket = visibleStack[0] ?? null;
  const activeScratched = activeTicket ? scratchedIds.includes(activeTicket.id) : false;

  // Pooled foil/sparkle flake renderer (runs rAF ONLY while particles are airborne)
  const ensureFlakeLoop = () => {
    if (flakeRafRef.current !== null) return;
    let lastTs = performance.now();

    const step = (now: number) => {
      const dt = Math.min(0.05, Math.max(0.001, (now - lastTs) / 1000));
      lastTs = now;
      const canvas = flakeCanvasRef.current;
      const ctx = canvas?.getContext('2d');
      let anyAlive = false;

      if (canvas && ctx) {
        ctx.clearRect(0, 0, canvas.width, canvas.height);
        const pool = flakesRef.current;
        for (let i = 0; i < pool.length; i++) {
          const f = pool[i];
          if (!f.active) continue;
          f.age += dt;
          const u = f.age / f.life;
          if (u >= 1) {
            f.active = false;
            continue;
          }
          anyAlive = true;
          f.vy += 310 * dt;
          f.x += f.vx * dt;
          f.y += f.vy * dt;
          f.rot += f.vRot * dt;

          ctx.save();
          ctx.globalAlpha = Math.max(0, 1 - u);
          ctx.translate(f.x, f.y);
          ctx.rotate(f.rot);
          ctx.fillStyle = f.color;
          ctx.fillRect(-f.size * 0.5, -f.size * 0.35, f.size, f.size * 0.7);
          ctx.restore();
        }
      }

      if (anyAlive) {
        flakeRafRef.current = requestAnimationFrame(step);
      } else {
        flakeRafRef.current = null;
      }
    };

    flakeRafRef.current = requestAnimationFrame(step);
  };

  useEffect(() => {
    return () => {
      if (flakeRafRef.current !== null) {
        cancelAnimationFrame(flakeRafRef.current);
      }
    };
  }, []);

  const spawnFoilFlakes = (clientX: number, clientY: number, count: number, burst = false) => {
    const canvas = flakeCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const lx = ((clientX - rect.left) / Math.max(1, rect.width)) * canvas.width;
    const ly = ((clientY - rect.top) / Math.max(1, rect.height)) * canvas.height;

    const pool = flakesRef.current;
    let spawned = 0;
    for (let i = 0; i < pool.length && spawned < count; i++) {
      const f = pool[i];
      if (f.active) continue;
      f.active = true;
      f.x = lx + (Math.random() - 0.5) * 16;
      f.y = ly + (Math.random() - 0.5) * 12;
      const ang = burst
        ? Math.random() * Math.PI * 2
        : -Math.PI / 2 + (Math.random() - 0.5) * 1.8;
      const spd = burst ? 95 + Math.random() * 145 : 35 + Math.random() * 75;
      f.vx = Math.cos(ang) * spd;
      f.vy = Math.sin(ang) * spd - 35;
      f.rot = Math.random() * Math.PI;
      f.vRot = (Math.random() - 0.5) * 12;
      f.size = 4 + Math.random() * 4.5;
      f.color = FLAKE_COLORS[(i + Math.floor(Math.random() * 5)) % FLAKE_COLORS.length];
      f.age = 0;
      f.life = burst ? 0.85 : 0.65;
      spawned++;
    }
    ensureFlakeLoop();
  };

  // Beat 2a (WIND_INTRO): Continuous aerodynamic 3D paper-flutter blow-in & slow mid-screen float
  useEffect(() => {
    const prev = prevStateRef.current;
    prevStateRef.current = currentState;

    if (currentState !== 'WIND_INTRO') {
      if (introRafRef.current !== null) {
        cancelAnimationFrame(introRafRef.current);
        introRafRef.current = null;
      }
      setCatchPromptVisible(false);
      setCatchingIntro(false);
      catchingRef.current = false;

      // If arriving directly at STACKED_SCRATCH without passing through WIND_INTRO catch (e.g. jump)
      if (currentState === 'STACKED_SCRATCH' && prev !== 'WIND_INTRO') {
        visibleStack.forEach((ticket, idx) => {
          const el = cardRefs.current.get(ticket.id);
          if (!el) return;
          const pose = stackPoseFor(idx);
          gsap.set(el, { ...pose, opacity: 1 });
        });
      }
      return;
    }

    setCatchPromptVisible(false);
    setCatchingIntro(false);
    catchingRef.current = false;
    setSwipingOutIds([]);

    // Ensure foil looks crisp even while flying in!
    if (foilCanvasRef.current) {
      paintMetallicFoil(foilCanvasRef.current);
    }

    const startTime = performance.now();
    let promptShown = false;

    const animateFlight = (now: number) => {
      if (catchingRef.current) return;
      const elapsed = (now - startTime) / 1000;

      if (!promptShown && elapsed >= 1.15) {
        promptShown = true;
        setCatchPromptVisible(true);
      }

      tickets.forEach((ticket, idx) => {
        const el = cardRefs.current.get(ticket.id);
        if (!el) return;

        const spec = FLOATING_SPECS[idx % FLOATING_SPECS.length];
        const flightDuration = 1.65;
        const rawT = Math.max(0, (elapsed - spec.delay) / flightDuration);

        if (rawT <= 0) {
          gsap.set(el, {
            x: spec.startX,
            y: spec.startY,
            rotation: -24,
            rotationX: 16,
            rotationY: -22,
            scale: 0.72,
            opacity: 0,
          });
          return;
        }

        // Smooth decelerating wind curve transitioning seamlessly into gentle mid-air hover
        const u = Math.min(1, rawT);
        const glide = 1 - Math.pow(1 - u, 3);
        const breezePhase = Math.max(0, elapsed - spec.delay);

        // Decaying flight flutter + continuous gentle sea-breeze float once centered
        const flightFlutter = (1 - u) * Math.sin(u * Math.PI * 2.4);
        const floatBobX = Math.sin(breezePhase * 1.45 + idx * 1.7) * (8 + (1 - u) * 14);
        const floatBobY =
          Math.cos(breezePhase * 1.85 + idx * 1.3) * (7 + (1 - u) * 12) +
          Math.sin(u * Math.PI) * -36;

        const curX = spec.startX + (spec.hoverX - spec.startX) * glide + floatBobX;
        const curY = spec.startY + (spec.hoverY - spec.startY) * glide + floatBobY;

        const rotZ =
          spec.hoverRot * glide +
          flightFlutter * spec.flutterAmp +
          Math.sin(breezePhase * 1.9 + idx) * 4.2;
        const rotX = Math.cos(breezePhase * spec.flutterFreq + idx) * (6 + (1 - u) * 14);
        const rotY = Math.sin(breezePhase * (spec.flutterFreq * 0.8) + idx * 2) * (7 + (1 - u) * 16);
        const curScale = 0.74 + 0.24 * glide;

        gsap.set(el, {
          x: curX,
          y: curY,
          rotation: rotZ,
          rotationX: rotX,
          rotationY: rotY,
          scale: curScale,
          opacity: Math.min(1, u * 3.6),
        });
      });

      introRafRef.current = requestAnimationFrame(animateFlight);
    };

    introRafRef.current = requestAnimationFrame(animateFlight);
    return () => {
      if (introRafRef.current !== null) {
        cancelAnimationFrame(introRafRef.current);
        introRafRef.current = null;
      }
    };
  }, [currentState, tickets]);

  // User taps/catches the floating tickets -> converge smoothly into center stack!
  const handleCatchTickets = () => {
    if (currentState !== 'WIND_INTRO' || catchingRef.current) return;
    catchingRef.current = true;
    setCatchingIntro(true);
    setCatchPromptVisible(false);

    if (introRafRef.current !== null) {
      cancelAnimationFrame(introRafRef.current);
      introRafRef.current = null;
    }

    audioManager.playSfx('paperWhoosh');
    audioManager.playSfx('chime');
    triggerHaptic([12, 24, 16]);

    const canvas = flakeCanvasRef.current;
    if (canvas) {
      const rect = canvas.getBoundingClientRect();
      spawnFoilFlakes(rect.left + rect.width * 0.5, rect.top + rect.height * 0.5, 18, true);
    }

    const tl = gsap.timeline({
      onComplete: () => {
        onTicketsCaught();
      },
    });

    visibleStack.forEach((ticket, stackIdx) => {
      const el = cardRefs.current.get(ticket.id);
      if (!el) return;
      const pose = stackPoseFor(stackIdx);
      tl.to(
        el,
        {
          ...pose,
          opacity: 1,
          duration: 0.48,
          ease: 'back.out(1.28)',
          overwrite: 'auto',
        },
        stackIdx * 0.04,
      );
    });
  };

  // Position all visible stack cards smoothly whenever active stack order changes
  useEffect(() => {
    if (currentState !== 'STACKED_SCRATCH') return;
    visibleStack.forEach((ticket, idx) => {
      const el = cardRefs.current.get(ticket.id);
      if (!el) return;
      const pose = stackPoseFor(idx);
      gsap.to(el, {
        ...pose,
        opacity: 1,
        duration: 0.38,
        ease: 'back.out(1.22)',
        overwrite: 'auto',
      });
    });
  }, [currentState, swipedIds.join(','), swipingOutIds.join(',')]);

  // Reset foil & coverage cleanly whenever top ticket advances
  useEffect(() => {
    if ((currentState !== 'STACKED_SCRATCH' && currentState !== 'WIND_INTRO') || !activeTicket) {
      return;
    }
    coverageRef.current.reset();
    autoClearedRef.current = scratchedIds.includes(activeTicket.id);
    const canvas = foilCanvasRef.current;
    if (canvas && !autoClearedRef.current) {
      paintMetallicFoil(canvas);
    }
  }, [currentState, activeTicket?.id, scratchedIds]);

  // Beat 3 (ALL_CARDS_FAN -> BLOW_AWAY): smooth fan spread & aerodynamic off-screen gust
  useEffect(() => {
    if (currentState !== 'ALL_CARDS_FAN') return;
    setScrimFadingOut(false);
    const els = fanCardRefs.current.filter(Boolean) as HTMLDivElement[];
    if (els.length === 0) return;

    gsap.killTweensOf(els);
    gsap.fromTo(
      els,
      { y: 38, scale: 0.84, opacity: 0 },
      {
        y: 0,
        scale: 1,
        opacity: 1,
        duration: 0.48,
        stagger: 0.06,
        ease: 'back.out(1.3)',
        clearProps: 'y,scale,opacity',
      },
    );
    return () => {
      gsap.killTweensOf(els);
    };
  }, [currentState]);

  useEffect(() => {
    if (currentState !== 'BLOW_AWAY') return;
    const els = fanCardRefs.current.filter(Boolean) as HTMLDivElement[];
    if (els.length === 0) {
      onBlowAwayComplete();
      return;
    }

    gsap.killTweensOf(els);
    const tl = gsap.timeline({
      onComplete: () => {
        onBlowAwayComplete();
      },
    });
    els.forEach((el, idx) => {
      tl.to(
        el,
        {
          x: 1120,
          y: -150 - idx * 36,
          rotation: 28 + idx * 10,
          rotationY: 36,
          scale: 0.68,
          opacity: 0,
          duration: 1.02,
          ease: 'power2.in',
        },
        idx * 0.085,
      );
    });
    tl.add(() => setScrimFadingOut(true), 0.72);

    return () => {
      tl.kill();
    };
  }, [currentState, onBlowAwayComplete]);

  const eraseFoilAt = (clientX: number, clientY: number) => {
    if (currentState !== 'STACKED_SCRATCH' || !activeTicket || autoClearedRef.current) return;
    const canvas = foilCanvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = ((clientX - rect.left) / Math.max(1, rect.width)) * canvas.width;
    const y = ((clientY - rect.top) / Math.max(1, rect.height)) * canvas.height;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    ctx.lineWidth = 34;

    ctx.beginPath();
    if (lastPointRef.current) {
      ctx.moveTo(lastPointRef.current.x, lastPointRef.current.y);
      ctx.lineTo(x, y);
      ctx.stroke();
    } else {
      ctx.arc(x, y, 17, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
    lastPointRef.current = { x, y };

    // Tactile micro-jiggle directly via GSAP (zero React re-renders!)
    const topEl = cardRefs.current.get(activeTicket.id);
    if (topEl) {
      gsap.set(topEl, {
        x: (Math.random() - 0.5) * 2.4,
        y: (Math.random() - 0.5) * 2.0,
      });
    }

    audioManager.playSfx('foilScratch');
    triggerHaptic(8);
    spawnFoilFlakes(clientX, clientY, 3);

    const progress = coverageRef.current.stamp(x / canvas.width, y / canvas.height, 0.1, 0.18);
    if (progress >= SCRATCH_AUTO_CLEAR_THRESHOLD) {
      autoClearedRef.current = true;
      scratchingRef.current = false;
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      if (topEl) {
        gsap.fromTo(
          topEl,
          { scale: 1.05, x: 0, y: 0 },
          { scale: 1, x: 0, y: 0, duration: 0.36, ease: 'back.out(1.6)' },
        );
      }
      spawnFoilFlakes(rect.left + rect.width / 2, rect.top + rect.height / 2, 18, true);
      audioManager.playSfx('chime');
      triggerHaptic([12, 30, 16]);
      onTicketScratched(activeTicket.id);
    }
  };

  const dismissCardWithFlick = (cardId: string, vx = 0.85, curDx = 0, curDy = 0) => {
    if (swipingOutIds.includes(cardId)) return;
    const el = cardRefs.current.get(cardId);
    audioManager.playSfx('paperWhoosh');
    triggerHaptic(10);

    // Promote remaining cards immediately while this card glides cleanly off screen
    setSwipingOutIds((prev) => (prev.includes(cardId) ? prev : [...prev, cardId]));

    if (el) {
      const dirX = curDx !== 0 ? Math.sign(curDx) : vx >= 0 ? 1 : -1;
      const w = el.getBoundingClientRect().width || 320;
      const targetX = dirX * Math.max(540, w * 1.9);
      const targetY = curDy * 1.25 - 80;
      const targetRot = dirX * (20 + Math.min(18, Math.abs(vx) * 14));

      gsap.killTweensOf(el);
      gsap.to(el, {
        x: targetX,
        y: targetY,
        rotation: targetRot,
        rotationY: dirX * 26,
        scale: 0.9,
        opacity: 0,
        duration: 0.42,
        ease: 'power2.out',
        onComplete: () => {
          setSwipingOutIds((prev) => prev.filter((id) => id !== cardId));
          onTicketSwiped(cardId);
        },
      });
    } else {
      onTicketSwiped(cardId);
    }
  };

  const isDeckMode = currentState === 'WIND_INTRO' || currentState === 'STACKED_SCRATCH';

  return (
    <div
      class={`scratch-scrim interactive ${catchingIntro ? 'is-catching-intro' : ''} ${scrimFadingOut ? 'is-blowing-away' : ''}`}
    >
      {isDeckMode && renderedDeckCards.length > 0 && (
        <div class="scratch-stage">
          {currentState === 'WIND_INTRO' ? (
            <div class="scratch-header-pill" role="status">
              🍃 Look! The warm sea breeze blew in 4 birthday tickets!
            </div>
          ) : (
            activeTicket && (
              <div class="scratch-header-pill">
                <span>🎟️ {activeTicket.badge}</span>
                <span>
                  {activeScratched ? 'Swipe card →' : 'Scratch the starfish foil!'}
                </span>
              </div>
            )
          )}

          <div
            class={`scratch-deck-wrap ${currentState === 'WIND_INTRO' ? 'is-drifting' : ''}`}
            onClick={() => {
              if (currentState === 'WIND_INTRO') {
                handleCatchTickets();
              }
            }}
          >
            {renderedDeckCards
              .slice()
              .reverse()
              .map((ticket) => {
                const isExiting = swipingOutIds.includes(ticket.id);
                const visibleIdx = visibleStack.findIndex((t) => t.id === ticket.id);
                const isTop = currentState === 'STACKED_SCRATCH' && !isExiting && visibleIdx === 0;
                const zIndex = isExiting ? 40 : Math.max(1, 20 - (visibleIdx === -1 ? 0 : visibleIdx));

                return (
                  <div
                    key={ticket.id}
                    ref={(el) => {
                      if (el) cardRefs.current.set(ticket.id, el);
                      else cardRefs.current.delete(ticket.id);
                    }}
                    class={`scratch-ticket ${isTop ? 'is-top' : 'is-under'} ${isExiting ? 'is-exiting' : ''}`}
                    style={{ zIndex }}
                    onPointerDown={(e) => {
                      if (currentState === 'WIND_INTRO') {
                        e.stopPropagation();
                        handleCatchTickets();
                        return;
                      }
                      if (!isTop || !activeScratched) return;
                      e.currentTarget.setPointerCapture(e.pointerId);
                      gsap.killTweensOf(e.currentTarget);
                      swipeDragRef.current = {
                        active: true,
                        cardId: ticket.id,
                        pointerId: e.pointerId,
                        startX: e.clientX,
                        startY: e.clientY,
                        lastX: e.clientX,
                        lastTime: performance.now(),
                        vx: 0,
                      };
                    }}
                    onPointerMove={(e) => {
                      if (!isTop || !activeScratched) return;
                      const st = swipeDragRef.current;
                      if (!st || !st.active || st.pointerId !== e.pointerId) return;
                      const now = performance.now();
                      const dt = Math.max(8, now - st.lastTime);
                      st.vx = (e.clientX - st.lastX) / dt;
                      st.lastX = e.clientX;
                      st.lastTime = now;

                      const dx = e.clientX - st.startX;
                      const dy = Math.min(34, (e.clientY - st.startY) * 0.6);
                      gsap.set(e.currentTarget, {
                        x: dx,
                        y: dy,
                        rotation: dx * 0.042,
                        rotationY: dx * 0.025,
                        scale: 1.02,
                      });

                      // Underneath cards smoothly peek toward the foreground!
                      const progress = Math.min(1, Math.hypot(dx, dy) / 210);
                      for (let i = 1; i < visibleStack.length; i++) {
                        const underEl = cardRefs.current.get(visibleStack[i].id);
                        if (!underEl) continue;
                        const fromPose = stackPoseFor(i);
                        const toPose = stackPoseFor(i - 1);
                        gsap.set(underEl, {
                          x: fromPose.x + (toPose.x - fromPose.x) * progress,
                          y: fromPose.y + (toPose.y - fromPose.y) * progress,
                          rotation:
                            fromPose.rotation + (toPose.rotation - fromPose.rotation) * progress,
                          scale: fromPose.scale + (toPose.scale - fromPose.scale) * progress,
                        });
                      }
                    }}
                    onPointerUp={(e) => {
                      if (!isTop || !activeScratched) return;
                      const st = swipeDragRef.current;
                      swipeDragRef.current = null;
                      if (!st || st.cardId !== ticket.id) return;
                      const dx = e.clientX - st.startX;
                      const dy = e.clientY - st.startY;
                      const w = e.currentTarget.getBoundingClientRect().width || 300;
                      if (shouldDismissSwipe(dx, dy, st.vx, w)) {
                        dismissCardWithFlick(ticket.id, st.vx || Math.sign(dx || 1) * 0.9, dx, dy);
                      } else {
                        gsap.to(e.currentTarget, {
                          x: 0,
                          y: 0,
                          rotation: 0,
                          rotationY: 0,
                          scale: 1,
                          duration: 0.44,
                          ease: 'elastic.out(1.0, 0.55)',
                          overwrite: 'auto',
                        });
                        for (let i = 1; i < visibleStack.length; i++) {
                          const underEl = cardRefs.current.get(visibleStack[i].id);
                          if (!underEl) continue;
                          gsap.to(underEl, {
                            ...stackPoseFor(i),
                            duration: 0.34,
                            ease: 'power2.out',
                            overwrite: 'auto',
                          });
                        }
                      }
                    }}
                    onPointerCancel={(e) => {
                      swipeDragRef.current = null;
                      if (isTop) {
                        gsap.to(e.currentTarget, {
                          x: 0,
                          y: 0,
                          rotation: 0,
                          rotationY: 0,
                          scale: 1,
                          duration: 0.35,
                          ease: 'power2.out',
                        });
                      }
                    }}
                  >
                    <div class="scratch-ticket-inner">
                      <div class="scratch-ticket-top">
                        <span class="scratch-badge">{ticket.badge}</span>
                        <span class="scratch-title">{ticket.title}</span>
                      </div>

                      <div class="scratch-window">
                        <div class="scratch-revealed-body">
                          <TicketGlyph icon={ticket.icon} />
                          <p class="scratch-message">{ticket.message}</p>
                        </div>

                        {(currentState === 'WIND_INTRO' || (isTop && !activeScratched)) && (
                          <div class="scratch-foil-wrap">
                            <canvas
                              ref={
                                isTop ||
                                (currentState === 'WIND_INTRO' && ticket.id === renderedDeckCards[0]?.id)
                                  ? foilCanvasRef
                                  : undefined
                              }
                              width={310}
                              height={138}
                              class="scratch-foil-canvas"
                              onPointerDown={(e) => {
                                if (currentState === 'WIND_INTRO') {
                                  e.stopPropagation();
                                  handleCatchTickets();
                                  return;
                                }
                                e.stopPropagation();
                                e.currentTarget.setPointerCapture(e.pointerId);
                                scratchingRef.current = true;
                                lastPointRef.current = null;
                                eraseFoilAt(e.clientX, e.clientY);
                              }}
                              onPointerMove={(e) => {
                                if (currentState !== 'STACKED_SCRATCH' || !scratchingRef.current) return;
                                e.stopPropagation();
                                eraseFoilAt(e.clientX, e.clientY);
                              }}
                              onPointerUp={(e) => {
                                if (currentState !== 'STACKED_SCRATCH') return;
                                e.stopPropagation();
                                scratchingRef.current = false;
                                lastPointRef.current = null;
                                const topEl = cardRefs.current.get(ticket.id);
                                if (topEl) {
                                  gsap.to(topEl, { x: 0, y: 0, duration: 0.2, ease: 'power2.out' });
                                }
                              }}
                              onPointerCancel={() => {
                                scratchingRef.current = false;
                                lastPointRef.current = null;
                                const topEl = cardRefs.current.get(ticket.id);
                                if (topEl) {
                                  gsap.to(topEl, { x: 0, y: 0, duration: 0.2, ease: 'power2.out' });
                                }
                              }}
                            />
                            <div class="scratch-holo-sweep" aria-hidden="true" />
                          </div>
                        )}
                      </div>

                      {isTop && activeScratched && (
                        <button
                          type="button"
                          class="scratch-swipe-cue"
                          onClick={(e) => {
                            e.stopPropagation();
                            dismissCardWithFlick(ticket.id, 1.1, 40, -10);
                          }}
                        >
                          <svg viewBox="0 0 60 18" width="44" height="14" aria-hidden="true">
                            <path
                              d="M4 13 Q 28 3, 52 10 M 46 5 L 54 10 L 47 15"
                              fill="none"
                              stroke="#E87A45"
                              strokeWidth="2.6"
                              strokeLinecap="round"
                              strokeLinejoin="round"
                            />
                          </svg>
                          <span>Swipe card →</span>
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}

            <canvas
              ref={flakeCanvasRef}
              width={460}
              height={320}
              class="scratch-flakes-overlay"
              aria-hidden="true"
            />
          </div>

          {currentState === 'WIND_INTRO' && (
            <button
              type="button"
              class={`scratch-catch-pill ${catchPromptVisible ? 'is-visible' : ''}`}
              onClick={handleCatchTickets}
            >
              ✨ We might get lucky — catch the tickets! ✨
            </button>
          )}
        </div>
      )}

      {(currentState === 'ALL_CARDS_FAN' || currentState === 'BLOW_AWAY') && (
        <div class="scratch-fan-stage">
          <div class="scratch-fan-row">
            {tickets.map((ticket, idx) => {
              const fanTilt = [-3, 2, -1.5, 3][idx % 4];
              return (
                <div
                  key={ticket.id}
                  ref={(el) => {
                    fanCardRefs.current[idx] = el;
                  }}
                  class="scratch-fan-card"
                  style={{ transform: `rotate(${fanTilt}deg)` }}
                >
                  <div class="scratch-ticket-inner is-fan">
                    <div class="scratch-ticket-top">
                      <span class="scratch-badge">{ticket.badge}</span>
                      <span class="scratch-title">{ticket.title}</span>
                    </div>
                    <div class="scratch-fan-body">
                      <TicketGlyph icon={ticket.icon} />
                      <p class="scratch-fan-message">{ticket.message}</p>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {currentState === 'ALL_CARDS_FAN' && (
            <button
              type="button"
              class="beach-btn beach-btn--cream"
              onClick={onBlowTicketsAway}
            >
              🍃 Blow Tickets Away
            </button>
          )}
        </div>
      )}
    </div>
  );
}
