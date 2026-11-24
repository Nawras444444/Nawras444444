import React from 'react';
import {
  AbsoluteFill,
  Easing,
  Img,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {loadFont} from '@remotion/google-fonts/Cairo';

export const {fontFamily} = loadFont('normal', {weights: ['700', '900'], subsets: ['arabic']});

export const C = {
  black: '#0D0D0D',
  ink: '#000000',
  orange: '#FF6A00',
  orange2: '#FF8A2A',
  red: '#E10600',
  cream: '#FFF4E6',
  grid: '#1E1E1E',
  white: '#FFFFFF',
};

export const FPS = 30;
export const f = (sec: number) => Math.round(sec * FPS);

/** Seconds -> frame, relative to the start of the current Sequence. */
export const useT = () => useCurrentFrame() / FPS;

export type Anim = 'pop' | 'zoom' | 'slideL' | 'slideR' | 'slideUp' | 'fade' | 'drop' | 'bounce' | 'none';

/** Entry transform for an element that appears at `at` seconds (sequence-relative). */
export const useEntry = (at: number, anim: Anim, exitAt?: number) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const local = frame - at * fps;
  const sp = spring({frame: local, fps, config: {damping: 11, stiffness: 170, mass: 0.7}});
  const soft = spring({frame: local, fps, config: {damping: 200}, durationInFrames: 14});
  let opacity = local < 0 ? 0 : 1;
  let tf = '';
  switch (anim) {
    case 'pop':
      tf = `scale(${sp})`;
      break;
    case 'bounce':
      tf = `scale(${interpolate(sp, [0, 1], [0.6, 1])}) translateY(${(1 - sp) * 60}px)`;
      opacity = local < 0 ? 0 : Math.min(1, soft * 1.5);
      break;
    case 'zoom':
      tf = `scale(${interpolate(soft, [0, 1], [1.6, 1])})`;
      opacity = local < 0 ? 0 : soft;
      break;
    case 'slideL':
      tf = `translateX(${(1 - soft) * -1100}px)`;
      break;
    case 'slideR':
      tf = `translateX(${(1 - soft) * 1100}px)`;
      break;
    case 'slideUp':
      tf = `translateY(${(1 - soft) * 160}px)`;
      opacity = local < 0 ? 0 : soft;
      break;
    case 'drop':
      tf = `translateY(${(1 - sp) * -500}px)`;
      break;
    case 'fade':
      opacity = local < 0 ? 0 : soft;
      break;
    default:
      break;
  }
  if (exitAt !== undefined) {
    const e = interpolate(frame, [exitAt * fps, exitAt * fps + 6], [1, 0], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    });
    opacity *= e;
    tf += ` scale(${interpolate(e, [0, 1], [0.7, 1])})`;
  }
  return {opacity, transform: tf, local};
};

/** Small shake after `at` seconds. */
export const shakeAt = (frame: number, times: number[], amp = 14) => {
  let x = 0;
  let y = 0;
  for (const t of times) {
    const d = frame - t * FPS;
    if (d >= 0 && d < 14) {
      const k = Math.exp(-d / 4) * amp;
      x += Math.sin(d * 2.7) * k;
      y += Math.cos(d * 3.3) * k * 0.6;
    }
  }
  return `translate(${x}px, ${y}px)`;
};

type BoxVariant = 'cream' | 'red' | 'black' | 'orange';
const VARIANTS: Record<BoxVariant, {bg: string; fg: string; shadow: string; border: string; mark: string}> = {
  cream: {bg: C.cream, fg: C.ink, shadow: C.red, border: C.ink, mark: C.red},
  red: {bg: C.red, fg: C.white, shadow: C.ink, border: C.ink, mark: C.ink},
  black: {bg: C.ink, fg: C.white, shadow: C.orange, border: C.white, mark: C.red},
  orange: {bg: C.orange, fg: C.ink, shadow: C.ink, border: C.ink, mark: C.red},
};

/**
 * Square text frame: sharp corners, thick black border, offset red block shadow.
 * Words wrapped in [brackets] get a red underline that draws right-to-left.
 */
export const Box: React.FC<{
  text: string;
  at: number;
  x?: number;
  y: number;
  size?: number;
  anim?: Anim;
  variant?: BoxVariant;
  rotate?: number;
  maxW?: number;
  exitAt?: number;
  strikeAt?: number;
}> = ({text, at, x = 540, y, size = 72, anim = 'pop', variant = 'cream', rotate = 0, maxW = 920, exitAt, strikeAt}) => {
  const frame = useCurrentFrame();
  const {opacity, transform, local} = useEntry(at, anim, exitAt);
  const v = VARIANTS[variant];
  const draw = interpolate(local, [8, 20], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.cubic),
  });
  const strike =
    strikeAt === undefined
      ? 0
      : interpolate(frame, [strikeAt * FPS, strikeAt * FPS + 7], [0, 1], {
          extrapolateLeft: 'clamp',
          extrapolateRight: 'clamp',
        });
  const parts = text.split(/(\[[^\]]+\])/g).filter(Boolean);
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        transform: `translate(-50%, -50%) rotate(${rotate}deg)`,
        opacity,
      }}
    >
      <div style={{transform, transformOrigin: 'center'}}>
        <div
          style={{
            direction: 'rtl',
            fontFamily,
            fontWeight: 900,
            fontSize: size,
            lineHeight: 1.25,
            color: v.fg,
            background: v.bg,
            border: `8px solid ${v.border}`,
            boxShadow: `14px 14px 0 ${v.shadow}`,
            padding: `${size * 0.18}px ${size * 0.42}px ${size * 0.26}px`,
            maxWidth: maxW,
            width: 'max-content',
            textAlign: 'center',
            position: 'relative',
            isolation: 'isolate',
          }}
        >
          {/* black top rule: the "line" of the frame */}
          <div style={{position: 'absolute', top: 10, right: 14, width: size * 1.1, height: 8, background: v.mark}} />
          {parts.map((p, i) =>
            p.startsWith('[') ? (
              <span key={i} style={{position: 'relative', display: 'inline-block'}}>
                {p.slice(1, -1)}
                <span
                  style={{
                    position: 'absolute',
                    right: 0,
                    bottom: size * 0.02,
                    height: Math.max(8, size * 0.13),
                    width: `${draw * 100}%`,
                    background: v.mark,
                    zIndex: -1,
                  }}
                />
              </span>
            ) : (
              <span key={i}>{p}</span>
            ),
          )}
          {strikeAt !== undefined ? (
            <div
              style={{
                position: 'absolute',
                right: 0,
                top: '52%',
                height: 12,
                width: `${strike * 104}%`,
                background: C.red,
                transform: 'rotate(-3deg)',
                transformOrigin: 'right',
              }}
            />
          ) : null}
        </div>
      </div>
    </div>
  );
};

/** A sticker image (transparent PNG) or a framed card. Floats gently after landing. */
export const Sticker: React.FC<{
  src: string;
  at: number;
  x: number;
  y: number;
  w: number;
  h?: number;
  anim?: Anim;
  rotate?: number;
  float?: number;
  framed?: boolean;
  cover?: string;
  exitAt?: number;
  flip?: boolean;
  kenBurns?: boolean;
  style?: React.CSSProperties;
}> = ({src, at, x, y, w, h, anim = 'pop', rotate = 0, float = 10, framed, cover, exitAt, flip, kenBurns, style}) => {
  const frame = useCurrentFrame();
  const {opacity, transform, local} = useEntry(at, anim, exitAt);
  const bob = Math.sin((frame / FPS) * 2.2 + x) * float;
  const tilt = Math.sin((frame / FPS) * 1.6 + y) * (float / 8);
  const kb = kenBurns ? interpolate(Math.max(local, 0), [0, 150], [1.0, 1.12]) : 1;
  const img = (
    <Img
      src={staticFile(src)}
      style={{
        width: '100%',
        height: h && framed ? '100%' : undefined,
        objectFit: framed ? 'cover' : undefined,
        objectPosition: cover ?? 'center',
        display: 'block',
        transform: `scale(${kb}) ${flip ? 'scaleX(-1)' : ''}`,
        filter: framed ? undefined : 'drop-shadow(10px 12px 0 rgba(0,0,0,0.55))',
      }}
    />
  );
  return (
    <div
      style={{
        position: 'absolute',
        left: x,
        top: y,
        width: w,
        transform: `translate(-50%, -50%) rotate(${rotate + tilt}deg) translateY(${bob}px)`,
        opacity,
        ...style,
      }}
    >
      <div style={{transform}}>
        {framed ? (
          <div
            style={{
              width: w,
              height: h,
              overflow: 'hidden',
              border: `10px solid ${C.ink}`,
              boxShadow: `18px 18px 0 ${C.red}`,
              background: C.cream,
              outline: `6px solid ${C.cream}`,
              outlineOffset: -16,
            }}
          >
            {img}
          </div>
        ) : (
          img
        )}
      </div>
    </div>
  );
};

/** Square icon tile (red/black frame) with a simple drawn glyph. */
export const IconTile: React.FC<{at: number; x: number; y: number; s?: number; glyph: React.ReactNode; bg?: string}> = ({
  at,
  x,
  y,
  s = 170,
  glyph,
  bg = C.cream,
}) => {
  const {opacity, transform} = useEntry(at, 'pop');
  return (
    <div style={{position: 'absolute', left: x - s / 2, top: y - s / 2, width: s, height: s, opacity}}>
      <div
        style={{
          transform,
          width: s,
          height: s,
          background: bg,
          border: `8px solid ${C.ink}`,
          boxShadow: `10px 10px 0 ${C.red}`,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
        }}
      >
        <svg viewBox="0 0 100 100" width={s * 0.7} height={s * 0.7}>
          {glyph}
        </svg>
      </div>
    </div>
  );
};

export const Flash: React.FC<{at: number; color?: string; dur?: number}> = ({at, color = '#fff', dur = 0.3}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at * FPS, at * FPS + 2, at * FPS + dur * FPS], [0, 0.95, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  return <AbsoluteFill style={{background: color, opacity: o, pointerEvents: 'none'}} />;
};
