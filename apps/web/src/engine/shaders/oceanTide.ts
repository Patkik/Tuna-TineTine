/**
 * oceanTide.ts — PixiJS v8 GLSL 300 es fragment shader for stylized cel-shaded ocean waves:
 * - Soft pastel turquoise horizon gradient (#8CD4EC -> #D6F0F9)
 * - Staggered horizontal cel-shaded white shimmer streaks
 * - 8-second tide breath pushing a scalloped white foam line onto warm sand (#F0E1B3)
 * - Soft wet-sand tint along the shore edge that fades smoothly as waves retreat
 */
import { Filter, GlProgram, UniformGroup } from 'pixi.js';

const OCEAN_VERTEX_GLSL = `
in vec2 aPosition;
out vec2 vTextureCoord;
out vec2 vLocalUv;

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
  vLocalUv = aPosition;
}
`;

const OCEAN_FRAGMENT_GLSL = `
in vec2 vTextureCoord;
in vec2 vLocalUv;
out vec4 finalColor;

uniform sampler2D uTexture;
uniform float uTime;
uniform float uWind;
uniform float uTide;
uniform float uShoreFrac;

float shimmerBand(float x, float y, float targetY, float halfH, float freq, float speed, float threshold) {
  float dy = abs(y - targetY);
  if (dy > halfH) return 0.0;
  float wave = sin(x * freq + speed) + 0.5 * sin(x * freq * 1.9 - speed * 1.3);
  return step(threshold, wave) * (1.0 - smoothstep(0.0, halfH, dy) * 0.35);
}

void main(void)
{
  vec4 base = texture(uTexture, vTextureCoord);
  if (base.a <= 0.001) {
    finalColor = vec4(0.0);
    return;
  }

  float x = clamp(vLocalUv.x, 0.0, 1.0);
  float y = clamp(vLocalUv.y, 0.0, 1.0);

  // Scalloped 8-second tide shoreline
  float scallop = sin(x * 18.0 + uTime * 1.35 + uWind * 0.45) * 0.014
                + sin(x * 33.0 - uTime * 0.95) * 0.007;
  float shoreLine = clamp(uShoreFrac + uTide * 0.075 + scallop, 0.38, 0.90);
  float highWater = clamp(uShoreFrac + 0.088 + scallop * 0.55, 0.42, 0.95);

  vec3 skyAqua = vec3(0.345, 0.769, 0.965);   // #58C4F6
  vec3 midAqua = vec3(0.490, 0.827, 0.988);   // #7DD3FC
  vec3 paleAqua = vec3(0.729, 0.902, 0.992);  // #BAE6FD
  vec3 drySand = vec3(0.953, 0.898, 0.671);   // #F3E5AB
  vec3 wetSand = vec3(0.910, 0.839, 0.608);   // #E8D69B
  vec3 foamWhite = vec3(1.0);

  vec3 col;
  float windShift = uTime * (0.28 + max(0.0, uWind) * 0.14);

  if (y < shoreLine) {
    // Cel-shaded turquoise ocean gradient + subtle pastel wave bands
    float depthT = clamp(y / max(0.001, shoreLine), 0.0, 1.0);
    col = mix(skyAqua, midAqua, smoothstep(0.0, 0.5, depthT));
    col = mix(col, paleAqua, smoothstep(0.5, 1.0, depthT));

    // Crisp horizon glint
    float horizonLine = 1.0 - smoothstep(0.0, 0.02, y);
    col = mix(col, foamWhite, horizonLine * 0.35);

    // Subtle soft horizontal water glints (crisp rounded streaks drawn by OceanLayer)
    float s1 = shimmerBand(x, y, shoreLine * 0.28, 0.011, 13.0, -windShift * 0.95, 0.28);
    float s2 = shimmerBand(x, y, shoreLine * 0.62, 0.011, 17.0, windShift * 0.75 + 2.4, 0.34);
    float shimmer = clamp(s1 + s2, 0.0, 1.0);
    col = mix(col, paleAqua, shimmer * 0.42);

    // Crisp scalloped white tide foam hugging shoreLine
    float foamDist = shoreLine - y;
    float foamMask = 1.0 - smoothstep(0.018, 0.038, foamDist);
    col = mix(col, foamWhite, foamMask * 0.92);
  } else {
    // Retreating wet-sand tint inside the high-water band
    float distFromShore = y - shoreLine;
    float foamLip = 1.0 - smoothstep(0.0, 0.014, distFromShore);

    float wetZoneMask = 1.0 - smoothstep(0.0, max(0.01, highWater - shoreLine + 0.025), distFromShore);
    // Wetness peaks as wave retreats (uTide falling / low) and stays soft & warm
    float wetness = wetZoneMask * (0.42 + 0.45 * clamp(0.5 - uTide * 0.5, 0.0, 1.0));
    col = mix(drySand, wetSand, clamp(wetness, 0.0, 0.78));
    col = mix(col, foamWhite, foamLip * 0.85);
  }

  finalColor = vec4(col * base.a, base.a);
}
`;

export interface OceanTideController {
  filter: Filter;
  setUniforms: (time: number, wind: number, tide: number, shoreFrac?: number) => void;
}

export function createOceanTideFilter(): OceanTideController {
  const uniforms = new UniformGroup({
    uTime: { value: 0, type: 'f32' },
    uWind: { value: 0.25, type: 'f32' },
    uTide: { value: 0, type: 'f32' },
    uShoreFrac: { value: 0.72, type: 'f32' },
  });

  const glProgram = GlProgram.from({
    vertex: OCEAN_VERTEX_GLSL,
    fragment: OCEAN_FRAGMENT_GLSL,
    name: 'ocean-tide-filter',
  });

  const filter = new Filter({
    glProgram,
    resources: { oceanUniforms: uniforms },
    resolution: 'inherit',
    padding: 0,
  });

  return {
    filter,
    setUniforms: (time: number, wind: number, tide: number, shoreFrac = 0.72) => {
      uniforms.uniforms.uTime = time;
      uniforms.uniforms.uWind = wind;
      uniforms.uniforms.uTide = tide;
      uniforms.uniforms.uShoreFrac = shoreFrac;
    },
  };
}
