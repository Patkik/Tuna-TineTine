/** @jsxImportSource preact */
import { h } from 'preact';
import { useState, useRef } from 'preact/hooks';
import gsap from 'gsap';

export function getNextCardIndex(
  current: number,
  direction: 'left' | 'right',
  total: number
): number {
  if (direction === 'left') return Math.min(current + 1, total - 1);
  return Math.max(current - 1, 0);
}

export interface PolaroidData {
  emoji: string;
  caption: string;
}

interface PolaroidStackProps {
  cards: PolaroidData[];
  onAllSeen: () => void;
}

export function PolaroidStack({ cards, onAllSeen }: PolaroidStackProps) {
  const [current, setCurrent] = useState(cards.length - 1);
  const [seen, setSeen] = useState(new Set<number>());
  const cardRef = useRef<HTMLDivElement>(null);
  const startX = useRef(0);
  const isDragging = useRef(false);

  const handlePointerDown = (e: PointerEvent) => {
    startX.current = e.clientX;
    isDragging.current = true;
    if (cardRef.current) cardRef.current.setPointerCapture(e.pointerId);
  };

  const handlePointerMove = (e: PointerEvent) => {
    if (!isDragging.current || !cardRef.current) return;
    const dx = e.clientX - startX.current;
    cardRef.current.style.transform = `rotate(${dx * 0.03}deg) translateX(${dx}px)`;
  };

  const handlePointerUp = (e: PointerEvent) => {
    if (!isDragging.current) return;
    isDragging.current = false;
    const dx = e.clientX - startX.current;

    if (Math.abs(dx) > 60) {
      // Flick away
      const dir = dx < 0 ? 'left' : 'right';
      const next = getNextCardIndex(current, dir, cards.length);

      if (cardRef.current) {
        gsap.to(cardRef.current, {
          x: dx < 0 ? -400 : 400,
          rotation: dx < 0 ? -20 : 20,
          alpha: 0,
          duration: 0.3,
          onComplete: () => {
            const newSeen = new Set(seen).add(current);
            setSeen(newSeen);
            setCurrent(next);
            if (newSeen.size >= cards.length) onAllSeen();
          },
        });
      }
    } else {
      // Snap back
      if (cardRef.current) {
        gsap.to(cardRef.current, {
          x: 0,
          rotation: 0,
          duration: 0.3,
          ease: 'back.out(2)',
        });
      }
    }
  };

  const card = cards[current];
  if (!card) return null;

  return (
    <div class="polaroid-stack interactive">
      {/* Stack shadow cards behind */}
      {current > 0 && (
        <div
          class="polaroid"
          style={{
            transform: 'rotate(-4deg) translateY(8px)',
            opacity: 0.7,
            pointerEvents: 'none',
          }}
        >
          <div class="polaroid-img">🐻</div>
        </div>
      )}
      {current > 1 && (
        <div
          class="polaroid"
          style={{
            transform: 'rotate(3deg) translateY(16px)',
            opacity: 0.4,
            pointerEvents: 'none',
          }}
        >
          <div class="polaroid-img">🌊</div>
        </div>
      )}

      {/* Active top card */}
      <div
        ref={cardRef}
        class="polaroid interactive"
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        style={{ touchAction: 'none', userSelect: 'none' }}
      >
        <div class="polaroid-img" style={{ fontSize: '4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          {card.emoji}
        </div>
        <p class="polaroid-caption">{card.caption}</p>
      </div>

      <p style={{
        position: 'absolute',
        bottom: '12%',
        left: 0,
        right: 0,
        textAlign: 'center',
        fontSize: '0.75rem',
        color: '#4A2C1D',
        opacity: 0.6,
        fontFamily: 'Fredoka, sans-serif',
      }}>
        Swipe to explore ({seen.size + 1}/{cards.length})
      </p>
    </div>
  );
}
