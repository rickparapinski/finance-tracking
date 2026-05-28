/**
 * Nah — the mascot for the finance app.
 *
 * Drop this file into your components/ directory and use it like:
 *   import { Nah } from '@/components/Nah';
 *   <Nah expression="disappointed" size={48} />
 *
 * Expressions: 'default' | 'skeptical' | 'disappointed' | 'approving' | 'hyped'
 *
 * Design notes:
 *   - Pixel art on a 16x16 grid, rendered at 8 SVG units per pixel (128x128 viewBox).
 *   - Always uses crispEdges shape-rendering — never anti-alias pixel art.
 *   - Hardcoded character colors. Do NOT theme these via CSS variables.
 *   - Minimum size: 48px. Below that the face becomes unreadable.
 *
 * For full character bible (voice, when to use which expression), see
 * .claude/skills/finance-app-design/references/nah-character.md
 */

import React from 'react';

export type NahExpression =
  | 'default'
  | 'skeptical'
  | 'disappointed'
  | 'approving'
  | 'hyped';

export interface NahProps {
  expression?: NahExpression;
  size?: number;
  className?: string;
}

const FILL = '#6BAA8E';
const HIGHLIGHT = '#ABDABF';
const SHADE = '#3D7A66';
const CHEEK = '#FF8FAB';
const INK = '#1F1F1F';
const SHINE = '#FAF7EC';
const SPARKLE = '#F5C842';

function Body() {
  return (
    <g>
      {/* body fill */}
      <rect x={40} y={8} width={48} height={8} fill={FILL} />
      <rect x={24} y={16} width={80} height={8} fill={FILL} />
      <rect x={16} y={24} width={96} height={8} fill={FILL} />
      <rect x={8} y={32} width={112} height={8} fill={FILL} />
      <rect x={8} y={40} width={112} height={8} fill={FILL} />
      <rect x={8} y={48} width={112} height={8} fill={FILL} />
      <rect x={8} y={56} width={112} height={8} fill={FILL} />
      <rect x={8} y={64} width={112} height={8} fill={FILL} />
      <rect x={8} y={72} width={112} height={8} fill={FILL} />
      <rect x={16} y={80} width={96} height={8} fill={FILL} />
      <rect x={24} y={88} width={80} height={8} fill={FILL} />
      <rect x={32} y={96} width={64} height={8} fill={FILL} />

      {/* highlight (top-left light source) */}
      <rect x={40} y={8} width={16} height={8} fill={HIGHLIGHT} />
      <rect x={24} y={16} width={16} height={8} fill={HIGHLIGHT} />
      <rect x={16} y={24} width={16} height={8} fill={HIGHLIGHT} />
      <rect x={8} y={32} width={16} height={8} fill={HIGHLIGHT} />
      <rect x={8} y={40} width={8} height={8} fill={HIGHLIGHT} />

      {/* cheeks */}
      <rect x={24} y={56} width={8} height={8} fill={CHEEK} />
      <rect x={96} y={56} width={8} height={8} fill={CHEEK} />

      {/* outline */}
      <rect x={40} y={0} width={48} height={8} fill={SHADE} />
      <rect x={24} y={8} width={16} height={8} fill={SHADE} />
      <rect x={88} y={8} width={16} height={8} fill={SHADE} />
      <rect x={16} y={16} width={8} height={8} fill={SHADE} />
      <rect x={104} y={16} width={8} height={8} fill={SHADE} />
      <rect x={8} y={24} width={8} height={8} fill={SHADE} />
      <rect x={112} y={24} width={8} height={8} fill={SHADE} />
      <rect x={0} y={32} width={8} height={8} fill={SHADE} />
      <rect x={120} y={32} width={8} height={8} fill={SHADE} />
      <rect x={0} y={40} width={8} height={8} fill={SHADE} />
      <rect x={120} y={40} width={8} height={8} fill={SHADE} />
      <rect x={0} y={48} width={8} height={8} fill={SHADE} />
      <rect x={120} y={48} width={8} height={8} fill={SHADE} />
      <rect x={0} y={56} width={8} height={8} fill={SHADE} />
      <rect x={120} y={56} width={8} height={8} fill={SHADE} />
      <rect x={0} y={64} width={8} height={8} fill={SHADE} />
      <rect x={120} y={64} width={8} height={8} fill={SHADE} />
      <rect x={0} y={72} width={8} height={8} fill={SHADE} />
      <rect x={120} y={72} width={8} height={8} fill={SHADE} />
      <rect x={8} y={80} width={8} height={8} fill={SHADE} />
      <rect x={112} y={80} width={8} height={8} fill={SHADE} />
      <rect x={16} y={88} width={8} height={8} fill={SHADE} />
      <rect x={104} y={88} width={8} height={8} fill={SHADE} />
      <rect x={24} y={96} width={8} height={8} fill={SHADE} />
      <rect x={96} y={96} width={8} height={8} fill={SHADE} />
      <rect x={32} y={104} width={64} height={8} fill={SHADE} />

      {/* feet */}
      <rect x={32} y={112} width={24} height={16} fill={SHADE} />
      <rect x={72} y={112} width={24} height={16} fill={SHADE} />
    </g>
  );
}

function FaceDefault() {
  return (
    <g>
      <rect x={48} y={40} width={8} height={8} fill={INK} />
      <rect x={72} y={40} width={8} height={8} fill={INK} />
      <rect x={56} y={64} width={16} height={8} fill={INK} />
    </g>
  );
}

function FaceSkeptical() {
  return (
    <g>
      <rect x={40} y={32} width={8} height={8} fill={INK} />
      <rect x={80} y={32} width={8} height={8} fill={INK} />
      <rect x={40} y={40} width={16} height={8} fill={INK} />
      <rect x={72} y={40} width={16} height={8} fill={INK} />
      <rect x={56} y={64} width={16} height={8} fill={INK} />
    </g>
  );
}

function FaceDisappointed() {
  return (
    <g>
      <rect x={40} y={48} width={16} height={8} fill={INK} />
      <rect x={72} y={48} width={16} height={8} fill={INK} />
      <rect x={56} y={64} width={16} height={8} fill={INK} />
      <rect x={48} y={72} width={8} height={8} fill={INK} />
      <rect x={72} y={72} width={8} height={8} fill={INK} />
    </g>
  );
}

function FaceApproving() {
  return (
    <g>
      <rect x={40} y={32} width={8} height={8} fill={INK} />
      <rect x={32} y={40} width={8} height={8} fill={INK} />
      <rect x={48} y={40} width={8} height={8} fill={INK} />
      <rect x={80} y={32} width={8} height={8} fill={INK} />
      <rect x={72} y={40} width={8} height={8} fill={INK} />
      <rect x={88} y={40} width={8} height={8} fill={INK} />
      <rect x={48} y={64} width={8} height={8} fill={INK} />
      <rect x={72} y={64} width={8} height={8} fill={INK} />
      <rect x={56} y={72} width={16} height={8} fill={INK} />
    </g>
  );
}

function FaceHyped() {
  return (
    <g>
      <rect x={40} y={32} width={16} height={16} fill={INK} />
      <rect x={48} y={32} width={8} height={8} fill={SHINE} />
      <rect x={72} y={32} width={16} height={16} fill={INK} />
      <rect x={80} y={32} width={8} height={8} fill={SHINE} />
      <rect x={40} y={64} width={8} height={8} fill={INK} />
      <rect x={80} y={64} width={8} height={8} fill={INK} />
      <rect x={48} y={72} width={32} height={8} fill={INK} />
      <rect x={8} y={8} width={8} height={8} fill={SPARKLE} />
      <rect x={112} y={8} width={8} height={8} fill={SPARKLE} />
      <rect x={8} y={96} width={8} height={8} fill={SPARKLE} />
      <rect x={112} y={96} width={8} height={8} fill={SPARKLE} />
    </g>
  );
}

const FACES: Record<NahExpression, () => JSX.Element> = {
  default: FaceDefault,
  skeptical: FaceSkeptical,
  disappointed: FaceDisappointed,
  approving: FaceApproving,
  hyped: FaceHyped,
};

export function Nah({
  expression = 'default',
  size = 64,
  className,
}: NahProps) {
  const Face = FACES[expression];
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 128 128"
      xmlns="http://www.w3.org/2000/svg"
      shapeRendering="crispEdges"
      className={className}
      role="img"
      aria-label={`Nah looking ${expression}`}
    >
      <Body />
      <Face />
    </svg>
  );
}

export default Nah;
