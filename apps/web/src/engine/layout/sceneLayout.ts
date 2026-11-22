/**
 * sceneLayout.ts — Computes exact coordinates, scales, rotations, and clean dune curves
 * locked to the fixed 16:9 widescreen landscape stage (with portrait fallback framing).
 * Contains ZERO sand mounds — clean pastel sand dunes only.
 */
import { isPortraitViewport } from '../../core/orientationGuard';

export const FIXED_ASPECT_RATIO = 16 / 9;

export interface StageFrameMetrics {
  width: number;
  height: number;
  aspectRatio: number;
  isPortraitViewport: boolean;
}

export function computeFixedStageSize(
  availableWidth: number,
  availableHeight: number,
): StageFrameMetrics {
  const safeW = Math.max(1, Math.round(Number.isFinite(availableWidth) ? availableWidth : 1024));
  const safeH = Math.max(1, Math.round(Number.isFinite(availableHeight) ? availableHeight : 576));
  const viewportAspect = safeW / safeH;

  return {
    width: safeW,
    height: safeH,
    aspectRatio: viewportAspect,
    isPortraitViewport: isPortraitViewport(safeW, safeH) || viewportAspect < 1.05,
  };
}

export interface PlacedItem {
  x: number;
  y: number;
  scale: number;
  rotation?: number;
}

export interface DuneGeometry {
  horizonY: number;
  oceanBottomY: number;
  backSandY: number;
  frontDunePoints: {
    startY: number;
    leftCrestX: number;
    leftCrestY: number;
    valleyX: number;
    valleyY: number;
    peakX: number;
    peakY: number;
    rilakkumaClipX: number;
    rilakkumaClipY: number;
    endX: number;
    endY: number;
    rightEdgeY: number;
  };
}

export interface SceneLayout {
  width: number;
  height: number;
  isPortrait: boolean;
  unitScale: number;
  dunes: DuneGeometry;

  // Sky layer
  bearCloud: PlacedItem;
  chickCloud: PlacedItem;
  seagulls: PlacedItem[];

  // Foreground characters & clean coastal props (NO sand mounds)
  korilakkuma: PlacedItem;
  rilakkumaHead: PlacedItem;
  umbrella: PlacedItem;
  bucket: PlacedItem;
  kiiroitoriBuried: PlacedItem;
  sailboat: PlacedItem;
  chickToy: PlacedItem;
  octopus: PlacedItem;
  bearBeachToy: PlacedItem;
  rilakkumaFeet: [PlacedItem, PlacedItem];
  crabs: PlacedItem[];
  starfishMain: PlacedItem;
  whiteShellMain: PlacedItem;
  pinkShells: PlacedItem[];
  coralTwigs: PlacedItem[];
  flipFlops: [PlacedItem, PlacedItem];
}

export function computeSceneLayout(width: number, height: number): SceneLayout {
  const w = Math.max(160, width);
  const h = Math.max(90, height);
  const isPortrait = w / h < 1.05;

  if (!isPortrait) {
    const u = Math.min(w / 1024, h / 576);
    const horizonY = h * 0.548;
    const oceanBottomY = h * 0.66;

    return {
      width: w,
      height: h,
      isPortrait: false,
      unitScale: u,
      dunes: {
        horizonY,
        oceanBottomY,
        backSandY: h * 0.655,
        frontDunePoints: {
          startY: h * 0.72,
          leftCrestX: w * 0.25,
          leftCrestY: h * 0.675,
          valleyX: w * 0.44,
          valleyY: h * 0.725,
          peakX: w * 0.635,
          peakY: h * 0.56,
          rilakkumaClipX: w * 0.765,
          rilakkumaClipY: h * 0.68,
          endX: w * 0.835,
          endY: h * 0.825,
          rightEdgeY: h * 0.835,
        },
      },

      bearCloud: { x: w * 0.995, y: horizonY + 4 * u, scale: u * 0.9 },
      chickCloud: { x: -w * 0.015, y: horizonY + 4 * u, scale: u * 0.86 },
      seagulls: [
        { x: w * 0.068, y: h * 0.095, scale: u * 0.85 },
        { x: w * 0.533, y: h * 0.415, scale: u * 0.76 },
        { x: w * 0.96, y: h * 0.115, scale: u * 0.82 },
      ],

      korilakkuma: { x: w * 0.268, y: h * 0.665, scale: u * 0.78, rotation: -0.14 },
      rilakkumaHead: { x: w * 0.808, y: h * 0.642, scale: u * 1.0, rotation: 0.62 },
      umbrella: { x: w * 0.638, y: h * 0.582, scale: u * 0.86, rotation: -0.22 },

      bucket: { x: w * 0.168, y: h * 0.865, scale: u * 0.82, rotation: -0.1 },
      kiiroitoriBuried: { x: w * 0.362, y: h * 0.755, scale: u * 0.78 },
      sailboat: { x: w * 0.478, y: h * 0.708, scale: u * 0.78, rotation: -0.06 },
      chickToy: { x: w * 0.365, y: h * 0.885, scale: u * 0.82 },
      octopus: { x: w * 0.252, y: h * 0.885, scale: u * 0.8 },
      bearBeachToy: { x: w * 0.105, y: h * 0.935, scale: u * 0.78 },
      rilakkumaFeet: [
        { x: w * 0.585, y: h * 0.862, scale: u * 0.85, rotation: -0.22 },
        { x: w * 0.658, y: h * 0.935, scale: u * 0.85, rotation: -0.16 },
      ],
      crabs: [
        { x: w * 0.295, y: h * 0.82, scale: u * 0.78, rotation: 0.12 },
        { x: w * 0.735, y: h * 0.695, scale: u * 0.72 },
        { x: w * 0.865, y: h * 0.925, scale: u * 0.78, rotation: -0.06 },
      ],
      starfishMain: { x: w * 0.625, y: h * 0.675, scale: u * 0.82 },
      whiteShellMain: { x: w * 0.752, y: h * 0.785, scale: u * 0.82 },
      pinkShells: [
        { x: w * 0.682, y: h * 0.74, scale: u * 0.7, rotation: -0.15 },
        { x: w * 0.205, y: h * 0.94, scale: u * 0.68, rotation: 0.2 },
        { x: w * 0.932, y: h * 0.88, scale: u * 0.72, rotation: -0.1 },
      ],
      coralTwigs: [
        { x: w * 0.47, y: h * 0.925, scale: u * 0.72 },
        { x: w * 0.515, y: h * 0.91, scale: u * 0.66, rotation: 0.2 },
      ],
      flipFlops: [
        { x: w * 0.935, y: h * 0.845, scale: u * 0.78, rotation: 0.12 },
        { x: w * 0.975, y: h * 0.805, scale: u * 0.76, rotation: 0.28 },
      ],
    };
  }

  const u = Math.min(w / 390, h / 844);
  const horizonY = h * 0.46;
  const oceanBottomY = h * 0.565;

  return {
    width: w,
    height: h,
    isPortrait: true,
    unitScale: u,
    dunes: {
      horizonY,
      oceanBottomY,
      backSandY: h * 0.56,
      frontDunePoints: {
        startY: h * 0.625,
        leftCrestX: w * 0.24,
        leftCrestY: h * 0.595,
        valleyX: w * 0.43,
        valleyY: h * 0.625,
        peakX: w * 0.60,
        peakY: h * 0.562,
        rilakkumaClipX: w * 0.74,
        rilakkumaClipY: h * 0.605,
        endX: w * 0.84,
        endY: h * 0.685,
        rightEdgeY: h * 0.695,
      },
    },

    bearCloud: { x: w * 1.03, y: horizonY + 3 * u, scale: u * 0.54 },
    chickCloud: { x: -w * 0.04, y: horizonY + 3 * u, scale: u * 0.52 },
    seagulls: [
      { x: w * 0.11, y: h * 0.065, scale: u * 0.55 },
      { x: w * 0.51, y: h * 0.37, scale: u * 0.5 },
      { x: w * 0.92, y: h * 0.11, scale: u * 0.52 },
    ],

    korilakkuma: { x: w * 0.23, y: h * 0.568, scale: u * 0.56, rotation: -0.14 },
    rilakkumaHead: { x: w * 0.79, y: h * 0.582, scale: u * 0.64, rotation: 0.62 },
    umbrella: { x: w * 0.59, y: h * 0.562, scale: u * 0.58, rotation: -0.22 },

    bucket: { x: w * 0.31, y: h * 0.73, scale: u * 0.52, rotation: -0.1 },
    kiiroitoriBuried: { x: w * 0.39, y: h * 0.648, scale: u * 0.52 },
    sailboat: { x: w * 0.50, y: h * 0.635, scale: u * 0.5, rotation: -0.06 },
    chickToy: { x: w * 0.44, y: h * 0.735, scale: u * 0.48 },
    octopus: { x: w * 0.53, y: h * 0.678, scale: u * 0.54 },
    bearBeachToy: { x: w * 0.14, y: h * 0.768, scale: u * 0.5 },
    rilakkumaFeet: [
      { x: w * 0.66, y: h * 0.705, scale: u * 0.54, rotation: -0.22 },
      { x: w * 0.76, y: h * 0.752, scale: u * 0.54, rotation: -0.16 },
    ],
    crabs: [
      { x: w * 0.26, y: h * 0.665, scale: u * 0.52, rotation: 0.12 },
      { x: w * 0.71, y: h * 0.635, scale: u * 0.48 },
      { x: w * 0.89, y: h * 0.74, scale: u * 0.52, rotation: -0.06 },
    ],
    starfishMain: { x: w * 0.58, y: h * 0.605, scale: u * 0.52 },
    whiteShellMain: { x: w * 0.80, y: h * 0.68, scale: u * 0.54 },
    pinkShells: [
      { x: w * 0.68, y: h * 0.65, scale: u * 0.46, rotation: -0.15 },
      { x: w * 0.35, y: h * 0.765, scale: u * 0.44, rotation: 0.2 },
      { x: w * 0.93, y: h * 0.715, scale: u * 0.46, rotation: -0.1 },
    ],
    coralTwigs: [
      { x: w * 0.59, y: h * 0.758, scale: u * 0.46 },
      { x: w * 0.65, y: h * 0.765, scale: u * 0.42, rotation: 0.2 },
    ],
    flipFlops: [
      { x: w * 0.90, y: h * 0.685, scale: u * 0.5, rotation: 0.12 },
      { x: w * 0.955, y: h * 0.66, scale: u * 0.48, rotation: 0.28 },
    ],
  };
}
