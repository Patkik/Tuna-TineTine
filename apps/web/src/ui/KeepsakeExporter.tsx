/** @jsxImportSource preact */
/**
 * KeepsakeExporter.tsx — Beat 9b bottom-right landscape keepsake & sandbox action buttons.
 */
import { useState } from 'preact/hooks';
import {
  formatKeepsakeFilename,
  generateKeepsakeBlob,
  triggerDownload,
} from '../core/keepsakeGenerator';
import { triggerHaptic } from '../core/haptics';

interface KeepsakeExporterProps {
  onCaptureStage: () => HTMLCanvasElement | null;
  onEnterSandbox: () => void;
  onSaved: () => void;
}

export function KeepsakeExporter({
  onCaptureStage,
  onEnterSandbox,
  onSaved,
}: KeepsakeExporterProps) {
  const [saving, setSaving] = useState(false);
  const [statusMsg, setStatusMsg] = useState<string | null>(null);

  const handleSave = async () => {
    const snapshot = onCaptureStage();
    if (!snapshot) return;

    setSaving(true);
    triggerHaptic(18);
    try {
      const blob = await generateKeepsakeBlob(snapshot, 'Kristine', 'February 5, 2027');
      triggerDownload(blob, formatKeepsakeFilename('2027-02-05'));
      setStatusMsg('Saved 1920×1080 Keepsake! 📸✨');
      onSaved();
    } catch {
      setStatusMsg('Unable to generate keepsake right now.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div class="keepsake-corner-actions interactive">
      {statusMsg && <p class="keepsake-status-pill">{statusMsg}</p>}
      <div class="keepsake-btn-row">
        <button
          type="button"
          class="beach-btn beach-btn--cream"
          onClick={onEnterSandbox}
        >
          🏖️ Play on the Beach
        </button>
        <button
          type="button"
          class="beach-btn beach-btn--yellow"
          disabled={saving}
          onClick={handleSave}
        >
          {saving ? 'Preparing...' : '📸 Save Keepsake Card'}
        </button>
      </div>
    </div>
  );
}
