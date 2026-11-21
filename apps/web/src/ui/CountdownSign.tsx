/** @jsxImportSource preact */
import { h } from 'preact';
import { useEffect, useState } from 'preact/hooks';
import { calculateRemainingTime, TARGET_DATE_MS } from '../core/timeGate';

interface CountdownSignProps {
  serverNowMs: number;
}

export function CountdownSign({ serverNowMs }: CountdownSignProps) {
  const [parts, setParts] = useState(() =>
    calculateRemainingTime(TARGET_DATE_MS, serverNowMs)
  );

  useEffect(() => {
    const drift = Date.now() - serverNowMs;
    const interval = setInterval(() => {
      const clientNow = Date.now();
      setParts(calculateRemainingTime(TARGET_DATE_MS, clientNow - drift));
    }, 1000);
    return () => clearInterval(interval);
  }, [serverNowMs]);

  const pad = (n: number) => String(n).padStart(2, '0');

  return (
    <div class="countdown-sign interactive">
      <div class="countdown-label">🌊 Beach opens in...</div>
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
  );
}
