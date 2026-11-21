/**
 * keepsakeGenerator.ts — On-device high-res PNG compositing
 * Generates a commemorative birthday postcard downloaded straight to Android gallery
 */

export function formatKeepsakeFilename(name: string, date: string): string {
  return `${name}-Beach-Birthday-${date}.png`;
}

export async function generateKeepsakeBlob(
  stageCanvas: HTMLCanvasElement
): Promise<Blob> {
  // Compose offscreen canvas with watermark
  const offscreen = document.createElement('canvas');
  offscreen.width = 1080;
  offscreen.height = 1920;
  const ctx = offscreen.getContext('2d')!;

  // Draw the stage as background
  ctx.drawImage(stageCanvas, 0, 0, 1080, 1920);

  // Watermark overlay
  ctx.fillStyle = 'rgba(255,251,245,0.85)';
  ctx.roundRect(40, 1740, 1000, 140, 20);
  ctx.fill();

  ctx.fillStyle = '#4A2C1D';
  ctx.font = 'bold 48px Fredoka, sans-serif';
  ctx.textAlign = 'center';
  ctx.fillText('Kristine 🐻 February 5, 2027', 540, 1800);

  ctx.font = '32px Fredoka, sans-serif';
  ctx.fillStyle = '#F472B6';
  ctx.fillText('Happy Birthday from the Beach! 🌊', 540, 1850);

  return new Promise<Blob>((resolve, reject) => {
    offscreen.toBlob(
      (blob) => {
        if (blob) resolve(blob);
        else reject(new Error('toBlob returned null'));
      },
      'image/png',
      1.0
    );
  });
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 2000);
}
