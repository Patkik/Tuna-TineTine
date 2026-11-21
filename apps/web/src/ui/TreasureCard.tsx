/** @jsxImportSource preact */
import { h } from 'preact';
import type { Treasure } from '../engine/scenes/DigScene';

interface TreasureCardProps {
  treasure: Treasure;
  onDismiss: () => void;
}

export function TreasureCard({ treasure, onDismiss }: TreasureCardProps) {
  return (
    <div class="treasure-card interactive" style={{ bottom: '20%' }}>
      <span class="treasure-card-emoji" role="img" aria-label={treasure.label}>
        {treasure.emoji}
      </span>
      <p class="treasure-card-text">
        <strong>{treasure.label}</strong>
        <br />
        {treasure.message}
      </p>
      <button class="treasure-card-close interactive" onClick={onDismiss}>
        Close ✨
      </button>
    </div>
  );
}
