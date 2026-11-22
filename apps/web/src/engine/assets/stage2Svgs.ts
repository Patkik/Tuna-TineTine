/**
 * stage2Svgs.ts — Dynamically imported Stage 2 cel-shaded SVG sprites (Beats 4–9).
 * Packed into a single 2x GPU atlas only after authoritative unlock.
 */
import type { SvgAssetSpec } from './stage1Svgs';

/**
 * Exact candle tip offsets relative to birthdayCake center-bottom anchor (0.5, 0.85).
 */
export const CAKE_CANDLE_OFFSETS = [
  { x: -28, y: -133 },
  { x: 0, y: -140 },
  { x: 28, y: -133 },
] as const;

export const STAGE2_SVGS = {
  bottleBody: {
    width: 96,
    height: 112,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="96" height="112" viewBox="0 0 96 112">
  <!-- Translucent turquoise glass bottle body -->
  <path d="M 40 28 L 56 28 L 56 44 C 72 50, 74 62, 74 88 C 74 100, 65 104, 48 104 C 31 104, 22 100, 22 88 C 22 62, 24 50, 40 44 Z"
    fill="#7DD3FC" fill-opacity="0.82" stroke="#4A2C1D" stroke-width="4" stroke-linejoin="round" />
  <!-- Bottle neck rim -->
  <rect x="35" y="24" width="26" height="8" rx="3.5" fill="#A5F3FC" stroke="#4A2C1D" stroke-width="3.2" />
  <!-- Cream rolled parchment resting inside bottle -->
  <rect x="37" y="51" width="22" height="43" rx="4" fill="#FFFDF7" stroke="#4A2C1D" stroke-width="2.5" />
  <rect x="37" y="69" width="22" height="6" fill="#F472B6" />
  <!-- Crisp cel-shaded specular glass highlight -->
  <path d="M 30 58 C 28 70, 28 82, 31 90" fill="none" stroke="#FFFFFF" stroke-width="3.8" stroke-linecap="round" opacity="0.88" />
  <circle cx="64" cy="60" r="2.6" fill="#FFFFFF" opacity="0.85" />
</svg>`,
  },

  bottleCork: {
    width: 36,
    height: 28,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="36" height="28" viewBox="0 0 36 28">
  <path d="M 6 4 L 30 4 L 27 24 L 9 24 Z" fill="#C98A53" stroke="#4A2C1D" stroke-width="3.5" stroke-linejoin="round" />
  <circle cx="14" cy="11" r="1.4" fill="#8C582D" />
  <circle cx="22" cy="15" r="1.3" fill="#8C582D" />
  <circle cx="16" cy="18" r="1.1" fill="#8C582D" />
</svg>`,
  },

  bottleScrollRolled: {
    width: 44,
    height: 68,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="68" viewBox="0 0 44 68">
  <rect x="10" y="8" width="24" height="52" rx="6" fill="#FFFDF7" stroke="#4A2C1D" stroke-width="3.5" />
  <ellipse cx="22" cy="10" rx="12" ry="4.5" fill="#F3E5AB" stroke="#4A2C1D" stroke-width="2.8" />
  <ellipse cx="22" cy="10" rx="5" ry="1.8" fill="#4A2C1D" />
  <rect x="9" y="30" width="26" height="7" rx="2" fill="#F472B6" stroke="#4A2C1D" stroke-width="2.4" />
</svg>`,
  },

  octopusHero: {
    width: 164,
    height: 144,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="164" height="144" viewBox="0 0 164 144">
  <!-- Back stubby tentacles -->
  <path d="M 38 96 C 18 98, 12 82, 22 76 C 30 72, 34 86, 46 86 Z"
    fill="#D9533B" stroke="#4A2C1D" stroke-width="4.2" stroke-linejoin="round" stroke-linecap="round" />
  <path d="M 126 96 C 146 98, 152 82, 142 76 C 134 72, 130 86, 118 86 Z"
    fill="#D9533B" stroke="#4A2C1D" stroke-width="4.2" stroke-linejoin="round" stroke-linecap="round" />
  <!-- Main terracotta dome head + curly suction-cup tentacles -->
  <path d="M 42 84 C 30 42, 48 16, 82 16 C 116 16, 134 42, 122 84
    C 138 90, 142 106, 128 112 C 118 116, 114 102, 108 106
    C 108 122, 92 126, 88 110 C 85 124, 73 124, 70 110
    C 66 126, 50 122, 50 106 C 44 102, 40 116, 30 112
    C 16 106, 20 90, 42 84 Z"
    fill="#EE6348" stroke="#4A2C1D" stroke-width="4.8" stroke-linejoin="round" stroke-linecap="round" />
  <!-- Crisp cel-shaded dome shine -->
  <ellipse cx="52" cy="40" rx="7" ry="12" transform="rotate(-24 52 40)" fill="#F79B86" />
  <circle cx="46" cy="56" r="3.6" fill="#F79B86" />
  <!-- Suction cup dots -->
  <ellipse cx="32" cy="107" rx="3.4" ry="2.3" fill="#F7D1BA" stroke="#4A2C1D" stroke-width="1.6" />
  <ellipse cx="58" cy="113" rx="3.4" ry="2.3" fill="#F7D1BA" stroke="#4A2C1D" stroke-width="1.6" />
  <ellipse cx="100" cy="113" rx="3.4" ry="2.3" fill="#F7D1BA" stroke="#4A2C1D" stroke-width="1.6" />
  <ellipse cx="128" cy="107" rx="3.4" ry="2.3" fill="#F7D1BA" stroke="#4A2C1D" stroke-width="1.6" />
  <!-- Light peach eye rings & dark pupils -->
  <circle cx="59" cy="61" r="7.5" fill="#F7D1BA" />
  <circle cx="105" cy="61" r="7.5" fill="#F7D1BA" />
  <circle cx="59" cy="61" r="4.6" fill="#4A2C1D" />
  <circle cx="105" cy="61" r="4.6" fill="#4A2C1D" />
  <!-- Rosy cheek blush dashes -->
  <path d="M 42 71 L 45 75 M 47 71 L 50 75 M 52 71 L 55 75" stroke="#4A2C1D" stroke-width="1.8" stroke-linecap="round" opacity="0.5" />
  <path d="M 109 71 L 112 75 M 114 71 L 117 75 M 119 71 L 122 75" stroke="#4A2C1D" stroke-width="1.8" stroke-linecap="round" opacity="0.5" />
  <!-- Happy small circular/D mouth -->
  <path d="M 74 68 Q 82 65, 90 68 C 90 78, 74 78, 74 68 Z"
    fill="#B83227" stroke="#4A2C1D" stroke-width="3" stroke-linejoin="round" />
</svg>`,
  },

  octopusArmHug: {
    width: 76,
    height: 56,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="76" height="56" viewBox="0 0 76 56">
  <path d="M 8 34 C 24 22, 46 20, 62 28 C 70 32, 68 42, 58 42 C 46 42, 28 38, 12 44 Z"
    fill="#EE6348" stroke="#4A2C1D" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" />
  <circle cx="58" cy="35" r="2.8" fill="#F7D1BA" stroke="#4A2C1D" stroke-width="1.5" />
  <circle cx="46" cy="33" r="2.6" fill="#F7D1BA" stroke="#4A2C1D" stroke-width="1.5" />
</svg>`,
  },

  octopusArmWave: {
    width: 56,
    height: 62,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="56" height="62" viewBox="0 0 56 62">
  <path d="M 16 54 C 12 36, 22 18, 34 10 C 44 4, 48 16, 40 24 C 32 32, 28 42, 28 54 Z"
    fill="#EE6348" stroke="#4A2C1D" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" />
  <circle cx="36" cy="17" r="2.8" fill="#F7D1BA" stroke="#4A2C1D" stroke-width="1.5" />
  <circle cx="29" cy="27" r="2.6" fill="#F7D1BA" stroke="#4A2C1D" stroke-width="1.5" />
</svg>`,
  },

  corkscrewTool: {
    width: 68,
    height: 86,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="68" height="86" viewBox="0 0 68 86">
  <!-- Twisted metal corkscrew helix -->
  <path d="M 34 26 L 34 38 C 44 41, 44 49, 34 51 C 24 53, 24 61, 34 63 C 44 65, 42 73, 34 78"
    fill="none" stroke="#4A2C1D" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M 34 26 L 34 38 C 44 41, 44 49, 34 51 C 24 53, 24 61, 34 63 C 44 65, 42 73, 34 78"
    fill="none" stroke="#E2E8F0" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
  <!-- Brass collar -->
  <rect x="27" y="21" width="14" height="9" rx="3" fill="#FACC15" stroke="#4A2C1D" stroke-width="3" />
  <!-- Rounded wooden T-handle -->
  <rect x="8" y="8" width="52" height="15" rx="7.5" fill="#B87B48" stroke="#4A2C1D" stroke-width="3.6" />
  <line x1="16" y1="12.5" x2="36" y2="12.5" stroke="#E5BA82" stroke-width="2.6" stroke-linecap="round" />
</svg>`,
  },

  crabCurious: {
    width: 64,
    height: 46,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="46" viewBox="0 0 64 46">
  <path d="M 18 18 C 9 12, 8 4, 15 4 C 18 4, 19 10, 15 12 C 20 11, 22 15, 20 19"
    fill="#EF4444" stroke="#4A2C1D" stroke-width="2.5" stroke-linejoin="round" />
  <path d="M 46 18 C 55 12, 56 4, 49 4 C 46 4, 45 10, 49 12 C 44 11, 42 15, 44 19"
    fill="#EF4444" stroke="#4A2C1D" stroke-width="2.5" stroke-linejoin="round" />
  <path d="M 15 26 L 6 28 M 16 31 L 7 35 M 19 35 L 13 42" stroke="#4A2C1D" stroke-width="3" stroke-linecap="round" />
  <path d="M 49 26 L 58 28 M 48 31 L 57 35 M 45 35 L 51 42" stroke="#4A2C1D" stroke-width="3" stroke-linecap="round" />
  <ellipse cx="32" cy="28" rx="17" ry="11.5" fill="#EF4444" stroke="#4A2C1D" stroke-width="3" />
  <circle cx="25" cy="24" r="2.5" fill="#4A2C1D" />
  <circle cx="39" cy="24" r="2.5" fill="#4A2C1D" />
  <path d="M 28 31 Q 32 34, 36 31" fill="none" stroke="#4A2C1D" stroke-width="2.2" stroke-linecap="round" />
</svg>`,
  },

  waterDrop: {
    width: 22,
    height: 28,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="22" height="28" viewBox="0 0 22 28">
  <path d="M 11 3 C 16 11, 18 16, 18 19 C 18 23, 15 25, 11 25 C 7 25, 4 23, 4 19 C 4 16, 6 11, 11 3 Z"
    fill="#7DD3FC" stroke="#4A2C1D" stroke-width="2.5" stroke-linejoin="round" />
  <circle cx="9" cy="18" r="1.8" fill="#FFFFFF" />
</svg>`,
  },

  bearPeekHead: {
    width: 260,
    height: 240,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="260" height="240" viewBox="0 0 260 240">
  <!-- Ears with golden yellow interiors -->
  <circle cx="56" cy="58" r="32" fill="#A86E1E" stroke="#4A2C1D" stroke-width="5.5" />
  <circle cx="58" cy="60" r="18" fill="#FACC15" />
  <circle cx="204" cy="58" r="32" fill="#A86E1E" stroke="#4A2C1D" stroke-width="5.5" />
  <circle cx="202" cy="60" r="18" fill="#FACC15" />
  <!-- Torso peeking up into lens -->
  <path d="M 46 238 C 46 184, 72 162, 130 162 C 188 162, 214 184, 214 238 Z"
    fill="#A86E1E" stroke="#4A2C1D" stroke-width="5.5" stroke-linejoin="round" />
  <ellipse cx="130" cy="214" rx="46" ry="38" fill="#FFFDF7" />
  <!-- Big curious round bear head -->
  <ellipse cx="130" cy="118" rx="94" ry="78" fill="#A86E1E" stroke="#4A2C1D" stroke-width="5.5" />
  <!-- Curious glossy dark eyes + rosy blush -->
  <circle cx="86" cy="112" r="9.5" fill="#4A2C1D" />
  <circle cx="83" cy="109" r="3" fill="#FFFDF7" />
  <circle cx="174" cy="112" r="9.5" fill="#4A2C1D" />
  <circle cx="171" cy="109" r="3" fill="#FFFDF7" />
  <ellipse cx="70" cy="130" rx="12" ry="7" fill="#F472B6" opacity="0.55" />
  <ellipse cx="190" cy="130" rx="12" ry="7" fill="#F472B6" opacity="0.55" />
  <!-- Un-stroked white muzzle + nose + cute inverted Y -->
  <ellipse cx="130" cy="136" rx="28" ry="22" fill="#FFFDF7" />
  <ellipse cx="130" cy="126" rx="7.5" ry="5.5" fill="#4A2C1D" />
  <path d="M 130 131 L 130 139 M 130 138 Q 121 146, 113 142 M 130 138 Q 139 146, 147 142"
    fill="none" stroke="#4A2C1D" stroke-width="4" stroke-linecap="round" />
</svg>`,
  },

  bearPaw: {
    width: 72,
    height: 76,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="72" height="76" viewBox="0 0 72 76">
  <path d="M 18 70 L 14 36 C 12 18, 22 8, 36 8 C 50 8, 60 18, 58 36 L 54 70 Z"
    fill="#A86E1E" stroke="#4A2C1D" stroke-width="4.5" stroke-linejoin="round" />
  <ellipse cx="36" cy="36" rx="12" ry="10" fill="#FACC15" opacity="0.88" />
  <circle cx="26" cy="22" r="4" fill="#FACC15" opacity="0.88" />
  <circle cx="36" cy="19" r="4" fill="#FACC15" opacity="0.88" />
  <circle cx="46" cy="22" r="4" fill="#FACC15" opacity="0.88" />
</svg>`,
  },

  bearShyBody: {
    width: 210,
    height: 260,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="210" height="260" viewBox="0 0 210 260">
  <!-- Little round tail peeking left -->
  <circle cx="62" cy="198" r="14" fill="#A86E1E" stroke="#4A2C1D" stroke-width="4.5" />
  <!-- Stubby standing bear legs -->
  <path d="M 68 194 L 68 232 C 68 244, 96 244, 96 232 L 96 196 Z"
    fill="#A86E1E" stroke="#4A2C1D" stroke-width="4.5" stroke-linejoin="round" />
  <path d="M 114 196 L 114 232 C 114 244, 142 244, 142 232 L 142 194 Z"
    fill="#A86E1E" stroke="#4A2C1D" stroke-width="4.5" stroke-linejoin="round" />
  <!-- Torso (shoulders sloped back so hands tuck behind back!) -->
  <path d="M 60 144 C 52 178, 58 214, 105 214 C 152 214, 158 178, 150 144 C 144 128, 66 128, 60 144 Z"
    fill="#A86E1E" stroke="#4A2C1D" stroke-width="4.5" stroke-linejoin="round" />
  <!-- Cream belly oval -->
  <ellipse cx="105" cy="178" rx="30" ry="27" fill="#FFFDF7" />
  <!-- Ears behind head -->
  <circle cx="52" cy="48" r="24" fill="#A86E1E" stroke="#4A2C1D" stroke-width="4.5" />
  <circle cx="54" cy="50" r="13.5" fill="#FACC15" />
  <circle cx="158" cy="48" r="24" fill="#A86E1E" stroke="#4A2C1D" stroke-width="4.5" />
  <circle cx="156" cy="50" r="13.5" fill="#FACC15" />
  <!-- Smooth round head -->
  <ellipse cx="105" cy="92" rx="68" ry="56" fill="#A86E1E" stroke="#4A2C1D" stroke-width="4.5" />
  <!-- Shy rosy blush cheeks -->
  <ellipse cx="62" cy="100" rx="10" ry="5.8" fill="#F472B6" opacity="0.68" />
  <ellipse cx="148" cy="100" rx="10" ry="5.8" fill="#F472B6" opacity="0.68" />
  <!-- Cream muzzle + dark nose & cute mouth -->
  <ellipse cx="105" cy="108" rx="22" ry="17" fill="#FFFDF7" />
  <ellipse cx="105" cy="101" rx="6" ry="4.4" fill="#4A2C1D" />
  <path d="M 105 105 L 105 111 M 105 110 L 96 116 M 105 110 L 114 116"
    fill="none" stroke="#4A2C1D" stroke-width="3.2" stroke-linecap="round" />
</svg>`,
  },

  bearWaistUp: {
    width: 240,
    height: 210,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="210" viewBox="0 0 240 210">
  <!-- Waist-up torso -->
  <path d="M 60 206 C 58 158, 76 138, 120 138 C 164 138, 182 158, 180 206 Z"
    fill="#A86E1E" stroke="#4A2C1D" stroke-width="5" stroke-linejoin="round" />
  <ellipse cx="120" cy="186" rx="34" ry="30" fill="#FFFDF7" />
  <!-- Ears -->
  <circle cx="56" cy="50" r="26" fill="#A86E1E" stroke="#4A2C1D" stroke-width="5" />
  <circle cx="58" cy="52" r="14.5" fill="#FACC15" />
  <circle cx="184" cy="50" r="26" fill="#A86E1E" stroke="#4A2C1D" stroke-width="5" />
  <circle cx="182" cy="52" r="14.5" fill="#FACC15" />
  <!-- Smiling head -->
  <ellipse cx="120" cy="96" rx="76" ry="62" fill="#A86E1E" stroke="#4A2C1D" stroke-width="5" />
  <!-- Warm happy blushing cheeks -->
  <ellipse cx="70" cy="106" rx="11" ry="6" fill="#F472B6" opacity="0.65" />
  <ellipse cx="170" cy="106" rx="11" ry="6" fill="#F472B6" opacity="0.65" />
  <!-- White muzzle + happy open mouth smile -->
  <ellipse cx="120" cy="112" rx="24" ry="18" fill="#FFFDF7" />
  <ellipse cx="120" cy="104" rx="6.5" ry="4.6" fill="#4A2C1D" />
  <path d="M 109 113 Q 120 109, 131 113 Q 128 124, 120 124 Q 112 124, 109 113 Z"
    fill="#B83227" stroke="#4A2C1D" stroke-width="3" stroke-linejoin="round" />
</svg>`,
  },

  bearArmLeft: {
    width: 66,
    height: 76,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="66" height="76" viewBox="0 0 66 76">
  <path d="M 18 10 C 4 24, 6 48, 22 60 C 34 68, 52 60, 52 44 C 52 34, 42 28, 36 16 Z"
    fill="#A86E1E" stroke="#4A2C1D" stroke-width="4.5" stroke-linejoin="round" />
</svg>`,
  },

  bearArmRight: {
    width: 66,
    height: 76,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="66" height="76" viewBox="0 0 66 76">
  <path d="M 48 10 C 62 24, 60 48, 44 60 C 32 68, 14 60, 14 44 C 14 34, 24 28, 30 16 Z"
    fill="#A86E1E" stroke="#4A2C1D" stroke-width="4.5" stroke-linejoin="round" />
</svg>`,
  },

  birthdayCake: {
    width: 184,
    height: 196,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="184" height="196" viewBox="0 0 184 196">
  <!-- Pale aqua-cream cake plate -->
  <ellipse cx="92" cy="166" rx="80" ry="17" fill="#E0F2FE" stroke="#4A2C1D" stroke-width="4.2" />
  <ellipse cx="92" cy="162" rx="68" ry="11" fill="#FFFDF7" />
  <!-- Three pastel striped candles (tips align with CAKE_CANDLE_OFFSETS) -->
  <rect x="59" y="34" width="10" height="36" rx="3" fill="#7DD3FC" stroke="#4A2C1D" stroke-width="3" />
  <line x1="59" y1="45" x2="69" y2="50" stroke="#FFFDF7" stroke-width="3" />
  <line x1="59" y1="57" x2="69" y2="62" stroke="#FFFDF7" stroke-width="3" />

  <rect x="87" y="27" width="10" height="42" rx="3" fill="#DDD6FE" stroke="#4A2C1D" stroke-width="3" />
  <line x1="87" y1="39" x2="97" y2="44" stroke="#FFFDF7" stroke-width="3" />
  <line x1="87" y1="51" x2="97" y2="56" stroke="#FFFDF7" stroke-width="3" />

  <rect x="115" y="34" width="10" height="36" rx="3" fill="#99F6E4" stroke="#4A2C1D" stroke-width="3" />
  <line x1="115" y1="45" x2="125" y2="50" stroke="#FFFDF7" stroke-width="3" />
  <line x1="115" y1="57" x2="125" y2="62" stroke="#FFFDF7" stroke-width="3" />

  <!-- Cream cake sponge tier -->
  <path d="M 28 158 L 28 104 C 28 74, 52 64, 92 64 C 132 64, 156 74, 156 104 L 156 158 C 156 170, 28 170, 28 158 Z"
    fill="#F3E5AB" stroke="#4A2C1D" stroke-width="4.5" stroke-linejoin="round" />
  <ellipse cx="92" cy="134" rx="64" ry="8" fill="#FFFDF7" opacity="0.65" />

  <!-- Strawberry pink glaze drip frosting -->
  <path d="M 28 104 C 28 74, 52 62, 92 62 C 132 62, 156 74, 156 104
    C 156 116, 144 118, 138 106
    C 134 96, 122 100, 118 114
    C 112 126, 98 122, 92 108
    C 86 96, 74 102, 70 116
    C 64 128, 52 120, 48 106
    C 42 96, 28 116, 28 104 Z"
    fill="#F472B6" stroke="#4A2C1D" stroke-width="4" stroke-linejoin="round" />

  <!-- Beach cake decorations: golden starfish & seashells -->
  <polygon points="52,78 55,86 64,86 57,91 59,99 52,94 45,99 47,91 40,86 49,86"
    fill="#FACC15" stroke="#4A2C1D" stroke-width="2.2" stroke-linejoin="round" />
  <path d="M 110 92 C 102 92, 100 84, 104 79 C 106 76, 114 76, 116 79 C 120 84, 118 92, 110 92 Z"
    fill="#E0F2FE" stroke="#4A2C1D" stroke-width="2.2" />
  <path d="M 134 94 C 126 94, 124 85, 128 80 C 130 77, 138 77, 140 80 C 144 85, 142 94, 134 94 Z"
    fill="#FDE68A" stroke="#4A2C1D" stroke-width="2.2" />
</svg>`,
  },

  goldStar: {
    width: 44,
    height: 44,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
  <path d="M 22 4 L 26.5 16.5 L 39 22 L 26.5 27.5 L 22 40 L 17.5 27.5 L 5 22 L 17.5 16.5 Z"
    fill="#FACC15" stroke="#4A2C1D" stroke-width="2.6" stroke-linejoin="round" />
  <circle cx="22" cy="22" r="3" fill="#FFFDF7" />
</svg>`,
  },

  smokeWisp: {
    width: 48,
    height: 96,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="48" height="96" viewBox="0 0 48 96">
  <path d="M 24 90 C 14 74, 34 58, 20 42 C 10 30, 32 16, 26 6"
    fill="none" stroke="#FFFDF7" stroke-width="6" stroke-linecap="round" opacity="0.82" />
  <circle cx="26" cy="10" r="6" fill="#FFFDF7" opacity="0.55" />
</svg>`,
  },
} as const satisfies Record<string, SvgAssetSpec>;

export type Stage2AssetKey = keyof typeof STAGE2_SVGS;
