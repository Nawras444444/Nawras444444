import React from 'react';
import {AbsoluteFill, Audio, Sequence, staticFile, useCurrentFrame} from 'remotion';
import {CAPTIONS} from './captions';
import {S1, S2, S3, S4, S5, S6, S7, S8} from './Scenes';
import {C, f, FPS, fontFamily} from './ui';

const SCENES: [number, number, React.FC][] = [
  [0, 5.9, S1],
  [5.9, 10.3, S2],
  [10.3, 17.9, S3],
  [17.9, 22.9, S4],
  [22.9, 32.4, S5],
  [32.4, 38.8, S6],
  [38.8, 47.0, S7],
  [47.0, 56.0, S8],
];

export const DURATION = 56;

/** Word-by-word subtitle bar: black strip, red frame, the spoken word turns orange. */
const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const t = frame / FPS;
  const idx = CAPTIONS.findIndex((line, i) => {
    const start = line[0][1];
    const next = CAPTIONS[i + 1]?.[0][1] ?? 52.9;
    return t >= start - 0.05 && t < Math.min(next, line[line.length - 1][1] + 1.6);
  });
  if (idx < 0) return null;
  const line = CAPTIONS[idx];
  return (
    <div style={{position: 'absolute', left: 0, right: 0, top: 1545, display: 'flex', justifyContent: 'center'}}>
      <div
        style={{
          direction: 'rtl',
          fontFamily,
          fontWeight: 900,
          fontSize: 50,
          lineHeight: 1.3,
          background: 'rgba(0,0,0,0.88)',
          border: `5px solid ${C.red}`,
          padding: '8px 28px 14px',
          maxWidth: 940,
          textAlign: 'center',
          color: C.white,
        }}
      >
        {line.map(([w, s], i) => (
          <React.Fragment key={i}>
            {/* a real space between spans keeps Arabic letters from joining across words */}
            {i > 0 ? ' ' : null}
            <span style={{color: t >= s ? C.orange : 'rgba(255,255,255,0.55)'}}>{w}</span>
          </React.Fragment>
        ))}
      </div>
    </div>
  );
};

export const PlaneVsTrain: React.FC = () => (
  <AbsoluteFill style={{background: C.black}}>
    {SCENES.map(([a, b, Comp]) => (
      <Sequence key={a} from={f(a)} durationInFrames={f(b) - f(a)}>
        <Comp />
      </Sequence>
    ))}
    <Captions />
    <Audio src={staticFile('audio/score.wav')} volume={0.55} />
    <Audio src={staticFile('audio/vo.wav')} volume={1} />
  </AbsoluteFill>
);
