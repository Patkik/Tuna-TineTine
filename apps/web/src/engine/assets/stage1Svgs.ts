/**
 * stage1Svgs.ts — Stage 1 cel-shaded sunlit beach SVG sprites (packed into a 2x GPU atlas).
 * Clean pastel sand dunes with ZERO sand mounds, thick #4A2C1D outlines, and zero spoilers.
 */

export interface SvgAssetSpec {
  width: number;
  height: number;
  svg: string;
}

export const STAGE1_SVGS = {
  bearCloud: {
    width: 460,
    height: 390,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="460" height="390" viewBox="0 0 460 390">
  <path d="M 12 390
    C 6 355, 22 332, 46 326
    C 34 294, 52 262, 82 254
    C 72 220, 92 190, 120 182
    C 116 146, 134 116, 158 106
    C 154 78, 174 52, 200 50
    C 214 36, 244 36, 260 50
    C 286 52, 306 78, 302 106
    C 332 118, 354 148, 348 182
    C 384 190, 408 220, 400 256
    C 430 264, 448 296, 436 330
    C 456 340, 460 368, 454 390 Z"
    fill="#FFFFFF" />
  <circle cx="158" cy="54" r="34" fill="#FFFFFF" />
  <circle cx="304" cy="54" r="34" fill="#FFFFFF" />
  <path d="M 146 60 C 144 43, 165 40, 168 56" fill="none" stroke="#AEDEF5" stroke-width="5.8" stroke-linecap="round" />
  <path d="M 294 56 C 297 40, 318 43, 316 60" fill="none" stroke="#AEDEF5" stroke-width="5.8" stroke-linecap="round" />
  <ellipse cx="192" cy="112" rx="8" ry="6.8" fill="#AEDEF5" />
  <ellipse cx="270" cy="112" rx="8" ry="6.8" fill="#AEDEF5" />
  <ellipse cx="231" cy="126" rx="7.5" ry="5.5" fill="#AEDEF5" />
  <path d="M 231 130 L 231 138 M 231 136 Q 221 146, 211 143 M 231 136 Q 241 146, 251 143"
    fill="none" stroke="#AEDEF5" stroke-width="5.2" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
  },

  chickCloud: {
    width: 260,
    height: 230,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="260" height="230" viewBox="0 0 260 230">
  <path d="M 4 230
    C 0 194, 18 166, 46 156
    C 36 120, 60 88, 92 84
    C 110 72, 148 72, 166 84
    C 202 88, 224 120, 214 156
    C 242 164, 258 192, 254 230 Z"
    fill="#FFFFFF" />
  <path d="M 122 80 L 106 52 Q 112 46, 120 56 L 130 78" fill="#FFFFFF" />
  <path d="M 134 80 L 152 50 Q 158 56, 148 68 L 138 82" fill="#FFFFFF" />
  <circle cx="80" cy="146" r="7.5" fill="#BFE6F7" />
  <circle cx="176" cy="146" r="7.5" fill="#BFE6F7" />
  <ellipse cx="128" cy="168" rx="34" ry="22" fill="none" stroke="#BFE6F7" stroke-width="5.5" />
  <ellipse cx="128" cy="171" rx="22" ry="12" fill="none" stroke="#BFE6F7" stroke-width="4" />
  <circle cx="122" cy="158" r="2.8" fill="#BFE6F7" />
  <circle cx="134" cy="158" r="2.8" fill="#BFE6F7" />
</svg>`,
  },

  seagull: {
    width: 60,
    height: 28,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="60" height="28" viewBox="0 0 60 28">
  <path d="M 4 16 Q 17 2, 30 14 Q 43 2, 56 16 Q 43 9, 30 21 Q 17 9, 4 16 Z" fill="#FFFFFF" />
</svg>`,
  },

  seagullFlapUp: {
    width: 60,
    height: 32,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="60" height="32" viewBox="0 0 60 32">
  <path d="M 7 6 Q 19 4, 30 19 Q 41 4, 53 6 Q 42 13, 30 26 Q 18 13, 7 6 Z" fill="#FFFFFF" />
</svg>`,
  },

  seagullFlapDown: {
    width: 60,
    height: 32,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="60" height="32" viewBox="0 0 60 32">
  <path d="M 6 24 Q 18 7, 30 14 Q 42 7, 54 24 Q 42 15, 30 21 Q 18 15, 6 24 Z" fill="#FFFFFF" />
</svg>`,
  },

  feather: {
    width: 26,
    height: 18,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="26" height="18" viewBox="0 0 26 18">
  <path d="M 3 13 C 8 5, 17 3, 23 5 C 20 12, 11 15, 3 13 Z" fill="#FFFFFF" />
  <path d="M 4 12 Q 13 8, 22 6" fill="none" stroke="#E0F2FE" stroke-width="1.5" stroke-linecap="round" />
</svg>`,
  },

  cloudWisp: {
    width: 180,
    height: 56,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="180" height="56" viewBox="0 0 180 56">
  <path d="M 18 44 C 6 44, 4 30, 18 26 C 22 14, 44 10, 58 20 C 70 6, 102 6, 116 18 C 132 10, 156 14, 162 28 C 174 30, 174 44, 160 44 Z"
    fill="#FFFFFF" fill-opacity="0.45" />
</svg>`,
  },

  bearBadge: {
    width: 44,
    height: 44,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="44" viewBox="0 0 44 44">
  <rect x="4" y="4" width="36" height="36" rx="8" fill="#E87A45" stroke="#4A2C1D" stroke-width="2.5" />
  <circle cx="14" cy="14.5" r="4" fill="#FFFDF7" />
  <circle cx="30" cy="14.5" r="4" fill="#FFFDF7" />
  <ellipse cx="22" cy="23" rx="10.5" ry="8.5" fill="#FFFDF7" />
  <circle cx="18" cy="21" r="1.4" fill="#4A2C1D" />
  <circle cx="26" cy="21" r="1.4" fill="#4A2C1D" />
  <ellipse cx="22" cy="25" rx="3" ry="2.2" fill="#E87A45" />
</svg>`,
  },

  rilakkumaHead: {
    width: 240,
    height: 220,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="240" height="220" viewBox="0 0 240 220">
  <circle cx="52" cy="58" r="30" fill="#A86E1E" stroke="#4A2C1D" stroke-width="5.5" />
  <circle cx="54" cy="60" r="17" fill="#FACC15" />
  <circle cx="188" cy="58" r="30" fill="#A86E1E" stroke="#4A2C1D" stroke-width="5.5" />
  <circle cx="186" cy="60" r="17" fill="#FACC15" />
  <ellipse cx="120" cy="126" rx="98" ry="84" fill="#A86E1E" stroke="#4A2C1D" stroke-width="5.5" />
  <path d="M 65 117 Q 76 122, 87 117" fill="none" stroke="#4A2C1D" stroke-width="6.5" stroke-linecap="round" />
  <path d="M 153 117 Q 164 122, 175 117" fill="none" stroke="#4A2C1D" stroke-width="6.5" stroke-linecap="round" />
  <ellipse cx="120" cy="144" rx="28" ry="22" fill="#FFFDF7" />
  <ellipse cx="120" cy="134" rx="7" ry="5" fill="#4A2C1D" />
  <line x1="120" y1="138" x2="120" y2="144" stroke="#4A2C1D" stroke-width="3.5" stroke-linecap="round" />
  <path d="M 108 145 Q 120 140, 132 145 Q 129 158, 120 158 Q 111 158, 108 145 Z"
    fill="#B83227" stroke="#4A2C1D" stroke-width="3.5" stroke-linejoin="round" />
</svg>`,
  },

  rilakkumaFoot: {
    width: 72,
    height: 70,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="72" height="70" viewBox="0 0 72 70">
  <g transform="rotate(14, 36, 35)">
    <path d="M 14 20 L 42 12 C 54 10, 62 22, 60 36 C 58 50, 48 58, 36 58 L 12 52 Z"
      fill="#A86E1E" stroke="#4A2C1D" stroke-width="4.5" stroke-linejoin="round" />
    <ellipse cx="20" cy="36" rx="14" ry="20" fill="#FACC15" stroke="#4A2C1D" stroke-width="4" />
  </g>
</svg>`,
  },

  korilakkuma: {
    width: 230,
    height: 255,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="230" height="255" viewBox="0 0 230 255">
  <defs>
    <clipPath id="kori-swimsuit-clip">
      <path d="M 62 174 C 54 198, 52 228, 54 248 L 166 248 C 168 228, 166 198, 158 174 Z" />
    </clipPath>
  </defs>
  <g clip-path="url(#kori-swimsuit-clip)">
    <rect x="46" y="170" width="130" height="86" fill="#FFFDF7" />
    <rect x="46" y="182" width="130" height="11" fill="#F472B6" />
    <rect x="46" y="204" width="130" height="11" fill="#F472B6" />
    <rect x="46" y="226" width="130" height="11" fill="#F472B6" />
  </g>
  <path d="M 62 174 C 54 198, 52 228, 54 248 L 166 248 C 168 228, 166 198, 158 174 Z"
    fill="none" stroke="#4A2C1D" stroke-width="4.5" stroke-linejoin="round" />
  <circle cx="48" cy="48" r="24" fill="#FEF0CB" stroke="#4A2C1D" stroke-width="4.5" />
  <circle cx="50" cy="50" r="13" fill="#F7C5D0" />
  <circle cx="172" cy="48" r="24" fill="#FEF0CB" stroke="#4A2C1D" stroke-width="4.5" />
  <circle cx="170" cy="50" r="13" fill="#F7C5D0" />
  <ellipse cx="110" cy="116" rx="74" ry="62" fill="#FEF0CB" stroke="#4A2C1D" stroke-width="4.5" />
  <ellipse cx="110" cy="140" rx="22" ry="17" fill="#FFFDF7" />
  <ellipse cx="110" cy="133" rx="5.5" ry="4" fill="#4A2C1D" />
  <path d="M 110 137 L 110 142 M 110 142 L 103 148 M 110 142 L 117 148"
    fill="none" stroke="#4A2C1D" stroke-width="3" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M 66 176 C 58 198, 72 220, 96 218 C 108 216, 112 204, 102 195 C 94 188, 86 192, 82 198"
    fill="#FEF0CB" stroke="#4A2C1D" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
  <path d="M 24 94 C 42 74, 72 68, 110 68 C 148 68, 178 74, 196 94
    C 178 96, 152 86, 110 86 C 68 86, 42 96, 24 94 Z"
    fill="#E2B95F" stroke="#4A2C1D" stroke-width="4" stroke-linejoin="round" />
  <path d="M 46 84 C 52 50, 78 38, 110 38 C 142 38, 168 50, 174 84
    C 152 75, 132 73, 110 73 C 88 73, 68 75, 46 84 Z"
    fill="#F3CF83" stroke="#4A2C1D" stroke-width="4" stroke-linejoin="round" />
  <path d="M 74 52 Q 110 48, 146 52 M 60 66 Q 110 60, 160 66 M 44 84 Q 76 76, 108 76 M 114 76 Q 146 76, 176 84"
    fill="none" stroke="#D9AE5B" stroke-width="2.2" stroke-linecap="round" stroke-dasharray="7 6" />
  <g transform="translate(174, 102) rotate(12)">
    <rect x="11" y="42" width="12" height="62" rx="5" fill="#E75582" stroke="#4A2C1D" stroke-width="4" />
    <path d="M 17 0 C 31 0, 38 22, 34 45 C 31 51, 24 53, 17 53 C 10 53, 3 51, 0 45 C -4 22, 3 0, 17 0 Z"
      fill="#FBDBE8" stroke="#4A2C1D" stroke-width="4" stroke-linejoin="round" />
    <path d="M 17 9 L 17 44" stroke="#F4A8C0" stroke-width="2.5" stroke-linecap="round" />
  </g>
  <path d="M 156 184 C 178 182, 194 194, 188 210 C 180 220, 162 214, 152 200"
    fill="#FEF0CB" stroke="#4A2C1D" stroke-width="4.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
  },

  korilakkumaBow: {
    width: 64,
    height: 44,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="64" height="44" viewBox="0 0 64 44">
  <g transform="translate(32, 22)">
    <path d="M 0 0 L -22 -14 C -28 -6, -28 8, -20 14 Z" fill="#F472B6" stroke="#4A2C1D" stroke-width="3.5" stroke-linejoin="round" />
    <path d="M 0 0 L 22 -14 C 28 -6, 28 8, 20 14 Z" fill="#F472B6" stroke="#4A2C1D" stroke-width="3.5" stroke-linejoin="round" />
    <circle cx="-13" cy="-2" r="2.6" fill="#FFFFFF" />
    <circle cx="-18" cy="5" r="2" fill="#FFFFFF" />
    <circle cx="13" cy="-2" r="2.6" fill="#FFFFFF" />
    <circle cx="18" cy="5" r="2" fill="#FFFFFF" />
    <circle cx="0" cy="0" r="6.5" fill="#F9A8D4" stroke="#4A2C1D" stroke-width="3.5" />
  </g>
</svg>`,
  },

  umbrella: {
    width: 150,
    height: 165,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="150" height="165" viewBox="0 0 150 165">
  <line x1="75" y1="68" x2="75" y2="160" stroke="#4A2C1D" stroke-width="8" stroke-linecap="round" />
  <line x1="75" y1="68" x2="75" y2="160" stroke="#C9A679" stroke-width="3.5" stroke-linecap="round" />
  <path d="M 75 18 C 36 18, 12 46, 10 82 Q 30 72, 48 80 C 48 50, 60 28, 75 18 Z"
    fill="#06B6D4" stroke="#4A2C1D" stroke-width="4" stroke-linejoin="round" />
  <path d="M 75 18 C 60 28, 48 50, 48 80 Q 75 70, 102 80 C 102 50, 90 28, 75 18 Z"
    fill="#FFFDF7" stroke="#4A2C1D" stroke-width="4" stroke-linejoin="round" />
  <path d="M 75 18 C 90 28, 102 50, 102 80 Q 120 72, 140 82 C 138 46, 114 18, 75 18 Z"
    fill="#F472B6" stroke="#4A2C1D" stroke-width="4" stroke-linejoin="round" />
  <circle cx="75" cy="14" r="5" fill="#4A2C1D" />
</svg>`,
  },

  bucket: {
    width: 80,
    height: 92,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="80" height="92" viewBox="0 0 80 92">
  <path d="M 14 26 C 14 4, 66 4, 66 26" fill="none" stroke="#4A2C1D" stroke-width="4.5" stroke-linecap="round" />
  <path d="M 12 28 L 20 82 C 20 86, 60 86, 60 82 L 68 28 Z"
    fill="#F472B6" stroke="#4A2C1D" stroke-width="4" stroke-linejoin="round" />
  <circle cx="29" cy="48" r="6" fill="#FFFDF7" />
  <circle cx="51" cy="46" r="5.5" fill="#FFFDF7" />
  <circle cx="38" cy="68" r="6.5" fill="#FFFDF7" />
  <circle cx="55" cy="69" r="4" fill="#FFFDF7" />
  <ellipse cx="40" cy="28" rx="29" ry="7" fill="#FFFDF7" stroke="#4A2C1D" stroke-width="4" />
  <ellipse cx="40" cy="29" rx="22" ry="3.5" fill="#E6E1D5" />
</svg>`,
  },

  kiiroitoriBuried: {
    width: 68,
    height: 64,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="68" height="64" viewBox="0 0 68 64">
  <g transform="rotate(14, 34, 34)">
    <path d="M 32 10 Q 28 2, 24 4 M 36 10 Q 40 2, 44 4" fill="none" stroke="#4A2C1D" stroke-width="3.5" stroke-linecap="round" />
    <circle cx="34" cy="36" r="24" fill="#FACC15" stroke="#4A2C1D" stroke-width="4" />
    <circle cx="23" cy="31" r="3" fill="#4A2C1D" />
    <circle cx="45" cy="31" r="3" fill="#4A2C1D" />
    <ellipse cx="34" cy="42" rx="13" ry="8.5" fill="#E87A45" stroke="#4A2C1D" stroke-width="3.2" />
    <ellipse cx="34" cy="42" rx="8.5" ry="4" fill="#C4612E" stroke="#4A2C1D" stroke-width="2" />
    <circle cx="31.5" cy="37" r="1.4" fill="#4A2C1D" />
    <circle cx="36.5" cy="37" r="1.4" fill="#4A2C1D" />
  </g>
</svg>`,
  },

  sailboat: {
    width: 78,
    height: 76,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="78" height="76" viewBox="0 0 78 76">
  <defs>
    <clipPath id="hull-clip">
      <path d="M 10 52 L 68 52 C 64 66, 52 72, 39 72 C 26 72, 14 66, 10 52 Z" />
    </clipPath>
  </defs>
  <line x1="40" y1="10" x2="40" y2="54" stroke="#4A2C1D" stroke-width="4" stroke-linecap="round" />
  <path d="M 38 11 L 12 46 L 38 46 Z" fill="#E87A45" stroke="#4A2C1D" stroke-width="3.5" stroke-linejoin="round" />
  <path d="M 41 16 L 62 46 L 41 46 Z" fill="#FFFDF7" stroke="#4A2C1D" stroke-width="3.5" stroke-linejoin="round" />
  <g clip-path="url(#hull-clip)">
    <rect x="8" y="50" width="64" height="26" fill="#FFFDF7" />
    <rect x="8" y="57" width="64" height="6" fill="#7DD3FC" />
    <rect x="8" y="66" width="64" height="7" fill="#0EA5E9" />
  </g>
  <path d="M 10 52 L 68 52 C 64 66, 52 72, 39 72 C 26 72, 14 66, 10 52 Z"
    fill="none" stroke="#4A2C1D" stroke-width="3.8" stroke-linejoin="round" />
</svg>`,
  },

  chickToy: {
    width: 74,
    height: 74,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="74" height="74" viewBox="0 0 74 74">
  <g transform="rotate(14, 37, 37)">
    <circle cx="37" cy="36" r="24" fill="#FFFDF7" stroke="#4A2C1D" stroke-width="4" />
    <ellipse cx="26" cy="59" rx="7" ry="4" fill="#FFFDF7" stroke="#4A2C1D" stroke-width="3" />
    <ellipse cx="48" cy="59" rx="7" ry="4" fill="#FFFDF7" stroke="#4A2C1D" stroke-width="3" />
    <circle cx="24" cy="33" r="3" fill="#4A2C1D" />
    <circle cx="50" cy="33" r="3" fill="#4A2C1D" />
    <ellipse cx="37" cy="40" rx="10" ry="8" fill="#E87A45" stroke="#4A2C1D" stroke-width="3.2" />
    <ellipse cx="37" cy="40" rx="6" ry="3.5" fill="#C4612E" stroke="#4A2C1D" stroke-width="2" />
  </g>
</svg>`,
  },

  octopus: {
    width: 72,
    height: 76,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="72" height="76" viewBox="0 0 72 76">
  <path d="M 16 44 C 12 22, 22 10, 36 10 C 50 10, 60 22, 56 44
    C 64 50, 64 62, 54 62 C 49 62, 47 56, 46 62
    C 45 69, 37 69, 36 62
    C 35 69, 27 69, 26 62
    C 25 56, 23 62, 18 62
    C 8 62, 8 50, 16 44 Z"
    fill="#EE6348" stroke="#4A2C1D" stroke-width="4" stroke-linejoin="round" stroke-linecap="round" />
  <ellipse cx="22" cy="22" rx="4.2" ry="6.2" transform="rotate(-24 22 22)" fill="#F79B86" />
  <circle cx="26" cy="30" r="4.8" fill="#F7D1BA" />
  <circle cx="46" cy="30" r="4.8" fill="#F7D1BA" />
  <circle cx="26.2" cy="30" r="2.6" fill="#4A2C1D" />
  <circle cx="45.8" cy="30" r="2.6" fill="#4A2C1D" />
  <ellipse cx="20" cy="36" rx="3.4" ry="1.8" fill="#F472B6" opacity="0.65" />
  <ellipse cx="52" cy="36" rx="3.4" ry="1.8" fill="#F472B6" opacity="0.65" />
  <circle cx="36" cy="39" r="3.4" fill="#B83227" stroke="#4A2C1D" stroke-width="2" />
</svg>`,
  },

  bearBeachToy: {
    width: 108,
    height: 72,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="108" height="72" viewBox="0 0 108 72">
  <g transform="rotate(-12, 54, 38)">
    <circle cx="24" cy="40" r="14" fill="#FFFDF7" stroke="#4A2C1D" stroke-width="3.5" />
    <circle cx="24" cy="40" r="7.5" fill="#7DD3FC" stroke="#4A2C1D" stroke-width="2.5" />
    <circle cx="84" cy="40" r="14" fill="#FFFDF7" stroke="#4A2C1D" stroke-width="3.5" />
    <circle cx="84" cy="40" r="7.5" fill="#7DD3FC" stroke="#4A2C1D" stroke-width="2.5" />
    <circle cx="38" cy="22" r="10" fill="#FFFDF7" stroke="#4A2C1D" stroke-width="3.5" />
    <circle cx="70" cy="22" r="10" fill="#FFFDF7" stroke="#4A2C1D" stroke-width="3.5" />
    <ellipse cx="54" cy="36" rx="22" ry="18" fill="#FFFDF7" stroke="#4A2C1D" stroke-width="3.5" />
    <circle cx="45" cy="33" r="2.5" fill="#4A2C1D" />
    <circle cx="63" cy="33" r="2.5" fill="#4A2C1D" />
    <ellipse cx="54" cy="40" rx="5" ry="3.8" fill="#E87A45" />
  </g>
</svg>`,
  },

  crab: {
    width: 54,
    height: 38,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="54" height="38" viewBox="0 0 54 38">
  <path d="M 16 14 C 8 10, 6 2, 12 2 C 15 2, 16 7, 13 9 C 17 8, 19 12, 17 15" fill="#E87A45" stroke="#4A2C1D" stroke-width="2" stroke-linejoin="round" />
  <path d="M 38 14 C 46 10, 48 2, 42 2 C 39 2, 38 7, 41 9 C 37 8, 35 12, 37 15" fill="#E87A45" stroke="#4A2C1D" stroke-width="2" stroke-linejoin="round" />
  <path d="M 13 21 L 4 22 M 13 25 L 5 29 M 16 29 L 10 35" stroke="#4A2C1D" stroke-width="3" stroke-linecap="round" />
  <path d="M 41 21 L 50 22 M 41 25 L 49 29 M 38 29 L 44 35" stroke="#4A2C1D" stroke-width="3" stroke-linecap="round" />
  <ellipse cx="27" cy="23" rx="15" ry="10.5" fill="#E87A45" stroke="#4A2C1D" stroke-width="2.5" />
  <circle cx="21" cy="20" r="2.2" fill="#FFFDF7" />
  <circle cx="33" cy="20" r="2.2" fill="#FFFDF7" />
</svg>`,
  },

  starfish: {
    width: 54,
    height: 54,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="54" height="54" viewBox="0 0 54 54">
  <path d="M 27 4 L 33 19 L 49 20 L 37 30 L 41 46 L 27 37 L 13 46 L 17 30 L 5 20 L 21 19 Z"
    fill="#FACC15" stroke="#4A2C1D" stroke-width="2.5" stroke-linejoin="round" />
  <circle cx="27" cy="25" r="2" fill="#E87A45" />
  <circle cx="23" cy="29" r="1.5" fill="#E87A45" />
  <circle cx="31" cy="29" r="1.5" fill="#E87A45" />
</svg>`,
  },

  whiteShell: {
    width: 72,
    height: 62,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="72" height="62" viewBox="0 0 72 62">
  <path d="M 36 56 L 24 54 C 12 44, 6 30, 8 18 C 12 8, 22 5, 36 5 C 50 5, 60 8, 64 18 C 66 30, 60 44, 48 54 Z"
    fill="#FFFDF7" stroke="#4A2C1D" stroke-width="2.5" stroke-linejoin="round" />
  <path d="M 36 54 L 18 14 M 36 54 L 27 10 M 36 54 L 36 8 M 36 54 L 45 10 M 36 54 L 54 14"
    fill="none" stroke="#E4D29E" stroke-width="2.2" stroke-linecap="round" />
  <path d="M 24 54 Q 36 59, 48 54" fill="none" stroke="#4A2C1D" stroke-width="2.5" stroke-linecap="round" />
</svg>`,
  },

  pinkShell: {
    width: 34,
    height: 30,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="34" height="30" viewBox="0 0 34 30">
  <path d="M 17 27 C 6 27, 3 17, 6 9 C 9 3, 25 3, 28 9 C 31 17, 28 27, 17 27 Z"
    fill="#F9A8D4" stroke="#4A2C1D" stroke-width="2" />
  <path d="M 17 25 L 11 8 M 17 25 L 17 7 M 17 25 L 23 8"
    stroke="#FFFDF7" stroke-width="1.6" stroke-linecap="round" />
</svg>`,
  },

  coralTwig: {
    width: 50,
    height: 44,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="50" height="44" viewBox="0 0 50 44">
  <path d="M 24 40 L 24 22 L 10 10 M 24 26 L 38 12 M 16 16 L 16 6 M 32 18 L 40 22"
    fill="none" stroke="#FFFDF7" stroke-width="6.5" stroke-linecap="round" stroke-linejoin="round" />
</svg>`,
  },

  flipFlop: {
    width: 44,
    height: 60,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="44" height="60" viewBox="0 0 44 60">
  <g transform="rotate(-18, 22, 30)">
    <ellipse cx="22" cy="30" rx="14" ry="24" fill="#7DD3FC" stroke="#4A2C1D" stroke-width="3.2" />
    <ellipse cx="22" cy="30" rx="9" ry="18" fill="#FDE6EE" opacity="0.65" />
    <path d="M 22 14 L 11 32 M 22 14 L 33 32" fill="none" stroke="#4A2C1D" stroke-width="3.2" stroke-linecap="round" />
  </g>
</svg>`,
  },

  heartPuff: {
    width: 32,
    height: 30,
    svg: `
<svg xmlns="http://www.w3.org/2000/svg" width="32" height="30" viewBox="0 0 32 30">
  <path d="M 16 26 C 6 19, 3 13, 3 8.5 C 3 5, 6 2.5, 9.5 2.5 C 12.2 2.5, 14.5 4, 16 6.2
    C 17.5 4, 19.8 2.5, 22.5 2.5 C 26 2.5, 29 5, 29 8.5 C 29 13, 26 19, 16 26 Z"
    fill="#F472B6" stroke="#4A2C1D" stroke-width="2.5" stroke-linejoin="round" />
  <circle cx="9.5" cy="7.5" r="1.8" fill="#FFFDF7" />
</svg>`,
  },
} as const satisfies Record<string, SvgAssetSpec>;

export type Stage1AssetKey = keyof typeof STAGE1_SVGS;
