/** @jsxImportSource preact */
/**
 * BearChatCloud.tsx — Beat 8 widescreen split right-hand 58% panel inside safe-area insets:
 * - Rounded-square coral-orange bear icon badge (#E87A45, #4A2C1D border)
 * - Fluffy cream speech cloud (#FFFDF7) with speech tail pointing toward bear + cake
 * - Smooth native momentum scrolling with top/bottom scroll-fade gradients
 * - Exact verbatim Taglish letter & "Blow the Cake" CTA pill button
 */
import type { BirthdayLetterContent } from '../../../edge-gate/src/content';

export interface BearChatCloudProps {
  letter: BirthdayLetterContent;
  onBlowCake: () => void;
}

export function BearChatCloud({ letter, onBlowCake }: BearChatCloudProps) {
  return (
    <section
      class="split-letter-panel interactive"
      aria-label="Birthday letter from Josh"
    >
      <div class="chat-cloud-row">
        <div class="bear-square-badge" aria-label={letter.badgeLabel}>
          <svg viewBox="0 0 44 44" width="38" height="38" aria-hidden="true">
            <rect x="2" y="2" width="40" height="40" rx="9" fill="#E87A45" stroke="#4A2C1D" strokeWidth="2.5" />
            <circle cx="13.5" cy="14" r="4.2" fill="#FFFDF7" />
            <circle cx="30.5" cy="14" r="4.2" fill="#FFFDF7" />
            <ellipse cx="22" cy="23.5" rx="11" ry="8.8" fill="#FFFDF7" />
            <circle cx="18" cy="21.5" r="1.5" fill="#4A2C1D" />
            <circle cx="26" cy="21.5" r="1.5" fill="#4A2C1D" />
            <ellipse cx="22" cy="25.5" rx="3" ry="2.2" fill="#E87A45" />
          </svg>
        </div>

        <div class="bear-chat-cloud">
          <div class="bear-chat-tail" aria-hidden="true" />
          <div class="bear-chat-scroll">
            <p class="bear-chat-body">{letter.body}</p>
          </div>
        </div>
      </div>

      <button
        type="button"
        class="beach-btn beach-btn--cream blow-cake-cta"
        onClick={onBlowCake}
      >
        🎂 Blow the Cake
      </button>
    </section>
  );
}
