import React from 'react';
import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {C, FPS} from './ui';

/** Black grid paper with orange ribbons, zigzags, a half sun and clouds (after the grid template). */
export const Background: React.FC<{tone?: 'dark' | 'orange'; calm?: boolean}> = ({tone = 'dark', calm}) => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const base = tone === 'dark' ? C.black : C.orange;
  const line = tone === 'dark' ? C.grid : 'rgba(0,0,0,0.13)';
  const accent = tone === 'dark' ? C.orange : C.ink;
  const drift = Math.sin(t * (calm ? 0.6 : 1.4)) * 12;
  const gridShift = (t * (calm ? 8 : 22)) % 90;
  return (
    <AbsoluteFill style={{background: base, overflow: 'hidden'}}>
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${line} 3px, transparent 3px), linear-gradient(90deg, ${line} 3px, transparent 3px)`,
          backgroundSize: '90px 90px',
          backgroundPosition: `${gridShift}px ${gridShift}px`,
        }}
      />
      <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
        {/* half sun top-right */}
        <circle cx={1010} cy={110 + drift * 0.4} r={190} fill={tone === 'dark' ? C.orange : C.cream} opacity={0.95} />
        {/* cloud on the sun */}
        <g transform={`translate(${820 + drift} ${150})`}>
          <path d="M20 90 a40 40 0 0 1 40-55 a55 55 0 0 1 100 10 a35 35 0 0 1 30 45 z" fill={C.ink} transform="translate(10 10)" />
          <path d="M20 90 a40 40 0 0 1 40-55 a55 55 0 0 1 100 10 a35 35 0 0 1 30 45 z" fill={C.cream} stroke={C.ink} strokeWidth={6} />
        </g>
        {/* ribbon top-left */}
        <g transform={`translate(0 ${drift})`}>
          <path d="M-40 150 C 60 60, 160 210, 260 110 S 400 -20, 420 -40" stroke={C.ink} strokeWidth={70} fill="none" transform="translate(10 14)" />
          <path d="M-40 150 C 60 60, 160 210, 260 110 S 400 -20, 420 -40" stroke={accent} strokeWidth={60} fill="none" />
          <path d="M150 105 h40 M170 85 v40" stroke={C.red} strokeWidth={12} strokeLinecap="square" />
        </g>
        {/* zigzags left */}
        <g transform={`translate(${-10 + drift * 0.5} 270)`}>
          {[0, 50].map((dy) => (
            <g key={dy}>
              <path d={`M0 ${dy + 30} l30 -25 l30 25 l30 -25 l30 25`} stroke={C.ink} strokeWidth={18} fill="none" transform="translate(6 8)" />
              <path d={`M0 ${dy + 30} l30 -25 l30 25 l30 -25 l30 25`} stroke={accent} strokeWidth={14} fill="none" />
            </g>
          ))}
        </g>
        {/* zigzags right */}
        <g transform={`translate(${940 - drift * 0.5} 1640)`}>
          {[0, 50].map((dy) => (
            <g key={dy}>
              <path d={`M0 ${dy + 30} l30 -25 l30 25 l30 -25 l30 25`} stroke={C.ink} strokeWidth={18} fill="none" transform="translate(6 8)" />
              <path d={`M0 ${dy + 30} l30 -25 l30 25 l30 -25 l30 25`} stroke={accent} strokeWidth={14} fill="none" />
            </g>
          ))}
        </g>
        {/* half sun bottom-left */}
        <circle cx={40} cy={1880 - drift * 0.4} r={170} fill={tone === 'dark' ? C.orange : C.cream} opacity={0.95} />
        {/* ribbon bottom-right */}
        <g transform={`translate(0 ${-drift})`}>
          <path d="M640 1960 C 720 1820, 820 1900, 900 1800 S 1060 1760, 1120 1700" stroke={C.ink} strokeWidth={70} fill="none" transform="translate(10 14)" />
          <path d="M640 1960 C 720 1820, 820 1900, 900 1800 S 1060 1760, 1120 1700" stroke={accent} strokeWidth={60} fill="none" />
          <path d="M880 1810 h40 M900 1790 v40" stroke={C.red} strokeWidth={12} strokeLinecap="square" />
        </g>
      </svg>
      {/* vignette */}
      <AbsoluteFill style={{background: 'radial-gradient(ellipse at center, transparent 55%, rgba(0,0,0,0.45) 100%)'}} />
    </AbsoluteFill>
  );
};
