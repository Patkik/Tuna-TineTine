/** @jsxImportSource preact */
import { h } from 'preact';
import { useState } from 'preact/hooks';
import {
  generateKeepsakeBlob,
  formatKeepsakeFilename,
  triggerDownload,
} from '../core/keepsakeGenerator';

interface KeepsakeExporterProps {
  stageCanvas: HTMLCanvasElement | null;
  onToggleSandbox: () => void;
}

export function KeepsakeExporter({ stageCanvas, onToggleSandbox }: KeepsakeExporterProps) {
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);

  const handleSave = async () => {
    if (!stageCanvas || loading) return;
    setLoading(true);
    try {
      const blob = await generateKeepsakeBlob(stageCanvas);
      const filename = formatKeepsakeFilename('Kristine', '2027-02-05');
      triggerDownload(blob, filename);
      setDone(true);
    } catch (err) {
      console.error('Keepsake export failed:', err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      style={{
        position: 'absolute',
        bottom: 'calc(env(safe-area-inset-bottom, 0px) + 1.5rem)',
        left: 0,
        right: 0,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '0.75rem',
        pointerEvents: 'none',
      }}
    >
      <button
        class="keepsake-btn interactive"
        onClick={handleSave}
        disabled={loading}
        aria-label="Save commemorative keepsake card"
      >
        {done ? '✅ Saved to Gallery!' : loading ? '📸 Compositing...' : '📸 Save Keepsake Card'}
      </button>

      <div class="sandbox-controls">
        <button class="sandbox-btn interactive" onClick={onToggleSandbox}>
          🏖️ Play on the Beach
        </button>
      </div>
    </div>
  );
}
