/**
 * sunsetTint.ts — PixiJS v8 GLSL 300 es color-grading filter.
 * Smoothly transitions daytime cerulean noon (0.0) -> pastel sunset (0.5) -> starry twilight (1.0).
 */
import { Filter, GlProgram, UniformGroup } from 'pixi.js';

const VERTEX_GLSL = `
in vec2 aPosition;
out vec2 vTextureCoord;

uniform vec4 uInputSize;
uniform vec4 uOutputFrame;
uniform vec4 uOutputTexture;

vec4 filterVertexPosition( void )
{
  vec2 position = aPosition * uOutputFrame.zw + uOutputFrame.xy;
  position.x = position.x * (2.0 / uOutputTexture.x) - 1.0;
  position.y = position.y * (2.0 * uOutputTexture.z / uOutputTexture.y) - uOutputTexture.z;
  return vec4(position, 0.0, 1.0);
}

vec2 filterTextureCoord( void )
{
  return aPosition * (uOutputFrame.zw * uInputSize.zw);
}

void main(void)
{
  gl_Position = filterVertexPosition();
  vTextureCoord = filterTextureCoord();
}
`;

const FRAGMENT_GLSL = `
in vec2 vTextureCoord;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uProgress;

void main(void)
{
  vec4 src = texture(uTexture, vTextureCoord);
  if (uProgress <= 0.001) {
    finalColor = src;
    return;
  }

  float a = src.a;
  vec3 rgb = a > 0.0 ? src.rgb / a : src.rgb;

  // Sunset warmth (peaks around uProgress = 0.5)
  float sunsetWeight = sin(clamp(uProgress, 0.0, 1.0) * 3.14159265);
  float twilightWeight = smoothstep(0.35, 1.0, uProgress);

  // Upper sky shifts toward golden coral-peach at sunset and deep starry indigo at twilight
  float vertical = 1.0 - clamp(vTextureCoord.y, 0.0, 1.0);
  vec3 sunsetTint = mix(vec3(1.06, 0.90, 0.80), vec3(1.12, 0.66, 0.62), vertical);
  vec3 twilightTint = mix(vec3(0.68, 0.64, 0.80), vec3(0.20, 0.22, 0.56), vertical);

  vec3 graded = mix(rgb, rgb * sunsetTint, sunsetWeight * 0.82);
  graded = mix(graded, graded * twilightTint, twilightWeight * 0.88);

  finalColor = vec4(clamp(graded, 0.0, 1.0) * a, a);
}
`;

export interface SunsetTintController {
  filter: Filter;
  setProgress: (progress: number) => void;
  getProgress: () => number;
}

export function createSunsetTintFilter(): SunsetTintController {
  const uniforms = new UniformGroup({
    uProgress: { value: 0, type: 'f32' },
  });

  const glProgram = GlProgram.from({
    vertex: VERTEX_GLSL,
    fragment: FRAGMENT_GLSL,
    name: 'sunset-tint-filter',
  });

  const filter = new Filter({
    glProgram,
    resources: { tintUniforms: uniforms },
    resolution: 'inherit',
  });

  return {
    filter,
    setProgress: (progress: number) => {
      uniforms.uniforms.uProgress = Math.max(0, Math.min(1, progress));
    },
    getProgress: () => uniforms.uniforms.uProgress as number,
  };
}
