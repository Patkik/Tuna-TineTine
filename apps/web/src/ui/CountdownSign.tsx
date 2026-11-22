/** @jsxImportSource preact */
import { useEffect, useState } from 'preact/hooks';
import { calculateRemainingTime, TARGET_DATE_MS } from '../core/timeGate';

interface CountdownSignProps {
  serverNowMs: number;
}

export function CountdownSign({ serverNowMs }: CountdownSignProps) {
  const [parts, setParts] = useState(() =>
    calculateRemainingTime(TARGET_DATE_MS, serverNowMs),
  );

  useEffect(() => {
    const drift = Date.now() - serverNowMs;
    const interval = setInterval(() => {
      setParts(calculateRemainingTime(TARGET_DATE_MS, Date.now() - drift));
    }, 1000);
    return () => clearInterval(interval);
  }, [serverNowMs]);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div class="countdown-wrapper">
      <div class="countdown-sign" aria-label="Birthday countdown to February 5, 2027">
        <div class="countdown-label">🌊 Opens Feb 5, 2027 • Kristine</div>
        <div class="countdown-digits">
          <div class="countdown-unit">
            <span class="countdown-num">{pad(parts.days)}</span>
            <span class="countdown-unit-label">DAYS</span>
          </div>
          <span class="countdown-sep">:</span>
          <div class="countdown-unit">
            <span class="countdown-num">{pad(parts.hours)}</span>
            <span class="countdown-unit-label">HRS</span>
          </div>
          <span class="countdown-sep">:</span>
          <div class="countdown-unit">
            <span class="countdown-num">{pad(parts.minutes)}</span>
            <span class="countdown-unit-label">MIN</span>
          </div>
          <span class="countdown-sep">:</span>
          <div class="countdown-unit">
            <span class="countdown-num">{pad(parts.seconds)}</span>
            <span class="countdown-unit-label">SEC</span>
          </div>
        </div>
      </div>
      <div class="countdown-post" />
      <div class="teaser-tip">Tap Rilakkuma, crabs, or the bear cloud ✨</div>
    </div>
  );
}
