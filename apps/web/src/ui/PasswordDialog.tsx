/** @jsxImportSource preact */
import { useEffect, useId, useRef, useState } from 'preact/hooks';
import { closeTopLayerDialog } from '../core/topLayer';

interface PasswordDialogProps {
  onClose: () => void;
  onSubmitPassword: (password: string) => Promise<boolean>;
}

export function PasswordDialog({ onClose, onSubmitPassword }: PasswordDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const titleId = useId();
  const hintId = useId();
  const inputId = useId();
  const errorId = useId();

  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;

    if (!dialog.open) {
      dialog.showModal?.();
    }

    const handleCancel = (e: Event) => {
      e.preventDefault();
      void closeTopLayerDialog(dialog);
    };

    const handleClose = () => {
      dialog.returnValue = '';
      onClose();
    };

    let cleanupLightDismiss: (() => void) | undefined;
    if (!('closedBy' in HTMLDialogElement.prototype)) {
      const outside = (e: PointerEvent) => {
        const r = dialog.getBoundingClientRect();
        return (
          e.clientX < r.left ||
          e.clientX > r.right ||
          e.clientY < r.top ||
          e.clientY > r.bottom
        );
      };
      let pressedOutside = false;
      const onPointerDown = (e: PointerEvent) => {
        pressedOutside = outside(e);
      };
      const onPointerUp = (e: PointerEvent) => {
        if (pressedOutside && outside(e)) {
          void closeTopLayerDialog(dialog);
        }
        pressedOutside = false;
      };
      dialog.addEventListener('pointerdown', onPointerDown);
      dialog.addEventListener('pointerup', onPointerUp);
      cleanupLightDismiss = () => {
        dialog.removeEventListener('pointerdown', onPointerDown);
        dialog.removeEventListener('pointerup', onPointerUp);
      };
    }

    dialog.addEventListener('cancel', handleCancel);
    dialog.addEventListener('close', handleClose);
    return () => {
      cleanupLightDismiss?.();
      dialog.removeEventListener('cancel', handleCancel);
      dialog.removeEventListener('close', handleClose);
    };
  }, [onClose]);

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    if (submitting) return;

    if (!password.trim()) {
      setError('Please enter the password.');
      inputRef.current?.focus();
      return;
    }

    setSubmitting(true);
    try {
      const ok = await onSubmitPassword(password);
      if (ok) {
        if (dialogRef.current) {
          void closeTopLayerDialog(dialogRef.current);
        }
      } else {
        setError('Wrong password — try again! 🐙');
        inputRef.current?.focus();
        inputRef.current?.select();
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <dialog
      ref={dialogRef}
      class="beach-dialog password-dialog interactive"
      aria-labelledby={titleId}
      closedby="any"
    >
      <div class="treasure-icon-wrap" aria-hidden="true">
        <svg width="52" height="52" viewBox="0 0 72 76">
          <path
            d="M 16 44 C 12 22, 22 10, 36 10 C 50 10, 60 22, 56 44 C 64 50, 64 62, 54 62 C 49 62, 47 56, 46 62 C 45 69, 37 69, 36 62 C 35 69, 27 69, 26 62 C 25 56, 23 62, 18 62 C 8 62, 8 50, 16 44 Z"
            fill="#D93829"
            stroke="#4A2C1D"
            strokeWidth="4"
            strokeLinejoin="round"
          />
          <circle cx="26" cy="29" r="4.5" fill="#FFFFFF" stroke="#4A2C1D" strokeWidth="2.2" />
          <circle cx="46" cy="29" r="4.5" fill="#FFFFFF" stroke="#4A2C1D" strokeWidth="2.2" />
          <circle cx="26.5" cy="29" r="2.1" fill="#4A2C1D" />
          <circle cx="45.5" cy="29" r="2.1" fill="#4A2C1D" />
          <circle cx="36" cy="39" r="3.2" fill="#7A1C14" stroke="#4A2C1D" strokeWidth="2" />
        </svg>
      </div>

      <h2 id={titleId} class="treasure-title">
        Secret Beach Pass
      </h2>
      <p id={hintId} class="password-hint">
        Enter the password to test the full birthday surprise.
      </p>

      <form class="password-form" onSubmit={handleSubmit} noValidate>
        <label htmlFor={inputId} class="password-label">
          Password
        </label>
        <div class="password-input-row">
          <input
            ref={inputRef}
            id={inputId}
            name="password"
            type={showPassword ? 'text' : 'password'}
            class="password-input"
            value={password}
            onInput={(e) => {
              setPassword((e.currentTarget as HTMLInputElement).value);
              if (error) setError('');
            }}
            autoComplete="current-password"
            autocorrect="off"
            autoCapitalize="none"
            spellcheck={false}
            enterKeyHint="done"
            required
            autoFocus
            aria-invalid={error ? 'true' : undefined}
            aria-describedby={error ? `${hintId} ${errorId}` : hintId}
          />
          <button
            type="button"
            class="password-toggle"
            aria-pressed={showPassword}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? 'Hide' : 'Show'}
          </button>
        </div>

        <p id={errorId} class="password-error" aria-live="polite">
          {error}
        </p>

        <div class="password-actions">
          <button
            type="button"
            class="beach-btn beach-btn--cream"
            onClick={() => dialogRef.current && void closeTopLayerDialog(dialogRef.current)}
          >
            Cancel
          </button>
          <button type="submit" class="beach-btn" disabled={submitting}>
            {submitting ? 'Checking…' : 'Unlock ✨'}
          </button>
        </div>
      </form>
    </dialog>
  );
}
