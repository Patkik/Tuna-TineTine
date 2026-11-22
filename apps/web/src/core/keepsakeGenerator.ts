/**
 * keepsakeGenerator.ts — On-device 1920x1080 widescreen landscape PNG keepsake compositor.
 */

export const KEEPSAKE_WIDTH = 1920;
export const KEEPSAKE_HEIGHT = 1080;

export function formatKeepsakeFilename(dateLabel = '2027-02-05'): string {
  return `kristine-beach-birthday-${dateLabel}.png`;
}

export async function generateKeepsakeBlob(
  stageSnapshot: HTMLCanvasElement,
  recipient = 'Kristine',
  dateText = 'February 5, 2027',
): Promise<Blob> {
  const width = KEEPSAKE_WIDTH;
  const height = KEEPSAKE_HEIGHT;

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    throw new Error('Could not initialize keepsake 2D canvas context');
  }

  // Warm cream cel-shaded postcard frame
  ctx.fillStyle = '#FFFDF7';
  ctx.fillRect(0, 0, width, height);

  ctx.strokeStyle = '#4A2C1D';
  ctx.lineWidth = 10;
  ctx.strokeRect(24, 24, width - 48, height - 48);

  // Inner widescreen beach window
  const artX = 56;
  const artY = 52;
  const artW = width - 112;
  const artH = 872;

  ctx.fillStyle = '#0EA5E9';
  ctx.fillRect(artX, artY, artW, artH);

  const srcW = stageSnapshot.width || 1;
  const srcH = stageSnapshot.height || 1;
  const scale = Math.max(artW / srcW, artH / srcH);
  const drawW = srcW * scale;
  const drawH = srcH * scale;
  const drawX = artX + (artW - drawW) / 2;
  const drawY = artY + (artH - drawH) / 2;

  ctx.save();
  ctx.beginPath();
  ctx.rect(artX, artY, artW, artH);
  ctx.clip();
  ctx.drawImage(stageSnapshot, drawX, drawY, drawW, drawH);
  ctx.restore();

  ctx.strokeStyle = '#4A2C1D';
  ctx.lineWidth = 6;
  ctx.strokeRect(artX, artY, artW, artH);

  // Keepsake stamp footer
  ctx.fillStyle = '#4A2C1D';
  ctx.textAlign = 'center';
  ctx.font = '700 44px Fredoka, system-ui, sans-serif';
  ctx.fillText(`${recipient} — ${dateText}`, width / 2, 992);

  ctx.fillStyle = '#E87A45';
  ctx.font = '600 26px Fredoka, system-ui, sans-serif';
  ctx.fillText('Sunny Beach Keepsake ★ Happy Birthday Tine Tine!', width / 2, 1036);

  drawStar(ctx, 180, 1002, 22, '#FACC15', '#4A2C1D');
  drawStar(ctx, width - 180, 1002, 22, '#FACC15', '#4A2C1D');

  return new Promise<Blob>((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to encode keepsake PNG blob'));
        }
      },
      'image/png',
      1,
    );
  });
}

function drawStar(
  ctx: CanvasRenderingContext2D,
  cx: number,
  cy: number,
  outerRadius: number,
  fill: string,
  stroke: string,
): void {
  const innerRadius = outerRadius * 0.45;
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? outerRadius : innerRadius;
    const angle = (Math.PI / 5) * i - Math.PI / 2;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 3;
  ctx.stroke();
}

export function triggerDownload(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
