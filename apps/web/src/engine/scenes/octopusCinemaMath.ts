/**
 * octopusCinemaMath.ts — Pure frame & easing helpers for the 5-frame Octopus Bottle Retrieval cinema.
 */

export const OCTOPUS_CINEMA_DURATION = 9.6;

export type OctopusCinemaFrame =
  | 'discovery'
  | 'swimming'
  | 'ashore'
  | 'placement'
  | 'mission_complete';

export interface OctopusCinemaShot {
  frame: OctopusCinemaFrame;
  frameIndex: number;
  localProgress: number;
  elapsed: number;
}

export function easeOutBack(t: number): number {
  const x = Math.max(0, Math.min(1, t));
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * Math.pow(x - 1, 3) + c1 * Math.pow(x - 1, 2);
}

export function getOctopusCinemaShot(elapsedSec: number): OctopusCinemaShot {
  const elapsed = Math.max(0, elapsedSec);

  if (elapsed < 1.5) {
    return {
      frame: 'discovery',
      frameIndex: 1,
      localProgress: Math.min(1, elapsed / 1.5),
      elapsed,
    };
  }
  if (elapsed < 3.5) {
    return {
      frame: 'swimming',
      frameIndex: 2,
      localProgress: Math.min(1, (elapsed - 1.5) / 2.0),
      elapsed,
    };
  }
  if (elapsed < 5.5) {
    return {
      frame: 'ashore',
      frameIndex: 3,
      localProgress: Math.min(1, (elapsed - 3.5) / 2.0),
      elapsed,
    };
  }
  if (elapsed < 7.5) {
    return {
      frame: 'placement',
      frameIndex: 4,
      localProgress: Math.min(1, (elapsed - 5.5) / 2.0),
      elapsed,
    };
  }

  return {
    frame: 'mission_complete',
    frameIndex: 5,
    localProgress: Math.min(1, (elapsed - 7.5) / 2.1),
    elapsed,
  };
}
