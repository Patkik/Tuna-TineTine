/** @jsxImportSource preact */
import { h } from 'preact';

interface BirthdayLetterProps {
  onComplete: () => void;
}

const LETTER_CONTENT = `Dear Kristine, 🐻

Today, the whole beach woke up just for you.
The waves have been practicing their happiest
crash all morning, and even the crabs stopped
scuttling just to wave hello.

You are one of the most genuinely kind, brilliantly
creative, and wonderfully warm people I know.
Watching you light up a room — or a beach — is
one of my favorite things in this world.

Thank you for every laugh, every late-night
conversation, every inside joke that only
makes sense to us.

This little beach will always be here, waiting
for whenever you need a quiet, sunny place
to come back to.

Happy Birthday, Kristine. 🌊⭐🐚

You make the world softer and better
just by being in it.

With so much love,`;

const SIGNATURE = `Your biggest fan 🐻💛`;

export function BirthdayLetter({ onComplete }: BirthdayLetterProps) {
  return (
    <div class="birthday-letter">
      <div class="letter-paper">
        <div class="letter-greeting">🌸 Happy Birthday, Kristine!</div>
        <p class="letter-body">{LETTER_CONTENT}</p>
        <p class="letter-sign">{SIGNATURE}</p>
        <button
          class="keepsake-btn interactive"
          style={{ marginTop: '1.5rem' }}
          onClick={onComplete}
        >
          🎁 Collect your keepsake
        </button>
      </div>
    </div>
  );
}
