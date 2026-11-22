/** @jsxImportSource preact */
/**
 * ScrollModal.tsx — Beat 4 wide landscape unfurled parchment scroll inside native <dialog>.
 * Follows modern-web-guidance `dialog` + `prevent-page-scroll-under-modal-dialog` patterns.
 */
import { useEffect, useId, useRef } from 'preact/hooks';
import type { BottleScrollContent } from '../../../edge-gate/src/content';
import { closeTopLayerDialog } from '../core/topLayer';

export interface ScrollModalProps {
  scroll: BottleScrollContent;
  onClose: () => void;
}

export function ScrollModal({ scroll, onClose }: ScrollModalProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const titleId = useId();

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

  return (
    <dialog
      ref={dialogRef}
      class="beach-dialog scroll-dialog interactive"
      aria-labelledby={titleId}
      closedby="any"
    >
      <div class="scroll-dowel scroll-dowel--left" aria-hidden="true" />
      <div class="scroll-dowel scroll-dowel--right" aria-hidden="true" />

      <div class="scroll-inner">
        <div class="scroll-header">
          <span class="scroll-seal" aria-hidden="true">🍾</span>
          <h2 id={titleId} class="scroll-heading">
            {scroll.heading}
          </h2>
        </div>

        <div class="scroll-copy">
          {scroll.paragraphs.map((p, idx) => (
            <p key={idx} class="scroll-paragraph">
              {p}
            </p>
          ))}
          <p class="scroll-footer">{scroll.footer}</p>
        </div>

        <div class="scroll-actions">
          <button
            type="button"
            class="beach-btn beach-btn--cream"
            autofocus
            onClick={() => dialogRef.current && void closeTopLayerDialog(dialogRef.current)}
          >
            Close
          </button>
        </div>
      </div>
    </dialog>
  );
}
