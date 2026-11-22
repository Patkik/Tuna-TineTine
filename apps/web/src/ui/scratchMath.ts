/**
 * scratchMath.ts — Fast zero-GC grid coverage estimator & swipe flick physics for Beat 2–3 tickets.
 */

export const SCRATCH_AUTO_CLEAR_THRESHOLD = 0.58;

export class ScratchCoverageGrid {
  public readonly cols: number;
  public readonly rows: number;
  private readonly cells: Uint8Array;
  private clearedCount = 0;

  constructor(cols = 24, rows = 12) {
    this.cols = Math.max(4, cols);
    this.rows = Math.max(4, rows);
    this.cells = new Uint8Array(this.cols * this.rows);
  }

  stamp(normX: number, normY: number, normRadiusX = 0.1, normRadiusY = 0.18): number {
    const cx = Math.max(0, Math.min(1, normX)) * (this.cols - 1);
    const cy = Math.max(0, Math.min(1, normY)) * (this.rows - 1);
    const rx = Math.max(0.5, normRadiusX * this.cols);
    const ry = Math.max(0.5, normRadiusY * this.rows);

    const minC = Math.max(0, Math.floor(cx - rx));
    const maxC = Math.min(this.cols - 1, Math.ceil(cx + rx));
    const minR = Math.max(0, Math.floor(cy - ry));
    const maxR = Math.min(this.rows - 1, Math.ceil(cy + ry));

    for (let r = minR; r <= maxR; r++) {
      for (let c = minC; c <= maxC; c++) {
        const dx = (c - cx) / rx;
        const dy = (r - cy) / ry;
        if (dx * dx + dy * dy <= 1.05) {
          const idx = r * this.cols + c;
          if (this.cells[idx] === 0) {
            this.cells[idx] = 1;
            this.clearedCount++;
          }
        }
      }
    }

    return this.getProgress();
  }

  getProgress(): number {
    return this.clearedCount / this.cells.length;
  }

  reset(): void {
    this.cells.fill(0);
    this.clearedCount = 0;
  }
}

export function shouldDismissSwipe(
  dx: number,
  dy: number,
  velocityX: number,
  cardWidth: number,
): boolean {
  const safeW = Math.max(120, cardWidth);
  return Math.abs(dx) >= safeW * 0.32 || dy <= -safeW * 0.28 || Math.abs(velocityX) >= 0.48;
}
