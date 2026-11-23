import React from 'react';
import {
  AbsoluteFill,
  Audio,
  Sequence,
  staticFile,
  interpolate,
  spring,
  useCurrentFrame,
  useVideoConfig,
} from 'remotion';
import {COLORS} from './theme';
import {headingFont, bodyFont} from './fonts';
import {SCENES, Scene, TOTAL_FRAMES, VO_DELAY} from './script';

/* ---------- helpers ---------- */

// Deterministic random so every render tears paper the same way.
const rng = (seed: number) => () => {
  seed |= 0;
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};

// Torn-paper clip-path: jagged top and bottom edges, slightly ragged sides.
const torn = (seed: number, amp = 14, steps = 28) => {
  const r = rng(seed);
  const top: string[] = [];
  const bottom: string[] = [];
  for (let i = 0; i <= steps; i++) {
    const x = (i / steps) * 100;
    top.push(`${x}% ${(r() * amp).toFixed(1)}px`);
    bottom.push(`${(100 - x).toFixed(2)}% calc(100% - ${(r() * amp).toFixed(1)}px)`);
  }
  return `polygon(${top.join(',')},${bottom.join(',')})`;
};

// Spring "slap": lands with overshoot, like a sticker pressed onto paper.
const slap = (frame: number, fps: number, delay = 0) =>
  spring({
    frame: Math.max(0, frame - delay),
    fps,
    config: {damping: 11, stiffness: 200, mass: 0.7},
  });

const starPoints = (n: number, outer: number, inner: number, c: number) =>
  Array.from({length: n * 2}, (_, i) => {
    const rad = i % 2 ? inner : outer;
    const a = (Math.PI / n) * i - Math.PI / 2;
    return `${(c + rad * Math.cos(a)).toFixed(1)},${(c + rad * Math.sin(a)).toFixed(1)}`;
  }).join(' ');

const sticker = 'drop-shadow(0 0 0 #fff) drop-shadow(5px 0 0 #fff) drop-shadow(-5px 0 0 #fff) drop-shadow(0 5px 0 #fff) drop-shadow(0 -5px 0 #fff) drop-shadow(0 10px 14px rgba(0,0,0,.25))';

/* ---------- background: crinkled paper collage ---------- */

const Star: React.FC<{size: number; fill: string; style?: React.CSSProperties}> = ({size, fill, style}) => (
  <svg width={size} height={size} viewBox="0 0 100 100" style={{position: 'absolute', filter: sticker, ...style}}>
    <polygon points={starPoints(5, 46, 20, 50)} fill={fill} stroke={COLORS.ink} strokeWidth={5} strokeLinejoin="round" />
  </svg>
);

const PaperBackground: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = Math.sin(frame / 40) * 6;
  return (
    <AbsoluteFill style={{background: COLORS.paper}}>
      {/* crinkle texture */}
      <svg width="100%" height="100%" style={{position: 'absolute', opacity: 0.55}}>
        <filter id="crinkle">
          <feTurbulence type="fractalNoise" baseFrequency="0.012" numOctaves={4} seed={7} />
          <feDiffuseLighting lightingColor="#fff" surfaceScale={3}>
            <feDistantLight azimuth={45} elevation={55} />
          </feDiffuseLighting>
        </filter>
        <rect width="100%" height="100%" filter="url(#crinkle)" />
      </svg>
      {/* torn strips like the poster's corners */}
      <div style={{position: 'absolute', top: -40, left: -60, width: 520, height: 150, background: COLORS.yellow, transform: 'rotate(-8deg)', clipPath: torn(3, 22)}} />
      <div style={{position: 'absolute', bottom: -30, left: -80, right: -80, height: 230, background: COLORS.ink, transform: 'rotate(-3deg)', clipPath: torn(11, 30)}} />
      <div style={{position: 'absolute', bottom: 150, right: -60, width: 420, height: 130, background: COLORS.paperLight, transform: 'rotate(6deg)', clipPath: torn(21, 20)}} />
      {/* doodle stars */}
      <Star size={110} fill={COLORS.ink} style={{top: 210 + drift, left: 70, transform: 'rotate(-12deg)'}} />
      <Star size={90} fill={COLORS.yellow} style={{top: 330 - drift, right: 90, transform: 'rotate(18deg)'}} />
      <Star size={70} fill={COLORS.yellow} style={{bottom: 330 + drift, left: 60, transform: 'rotate(8deg)'}} />
    </AbsoluteFill>
  );
};

/* ---------- pieces ---------- */

// Blue tilted tape, like "أفضل" on the poster. Slides in from the side.
const LabelTape: React.FC<{text: string; frame: number; fps: number; side: 1 | -1}> = ({text, frame, fps, side}) => {
  const s = slap(frame, fps);
  return (
    <div
      style={{
        alignSelf: side === 1 ? 'flex-end' : 'flex-start',
        margin: '0 90px',
        background: COLORS.blue,
        color: COLORS.white,
        fontFamily: headingFont,
        fontWeight: 900,
        fontSize: 64,
        padding: '18px 54px 22px',
        textTransform: 'uppercase',
        letterSpacing: 2,
        clipPath: torn(text.length * 7, 10, 14),
        transform: `translateX(${(1 - s) * side * 700}px) rotate(${side * -4}deg)`,
      }}
    >
      {text}
    </div>
  );
};

// Black torn band with white text and a yellow keyword: the "Claude AI" band.
const HeadlineBand: React.FC<{scene: Scene; frame: number; fps: number; tilt: number}> = ({scene, frame, fps, tilt}) => {
  const s = slap(frame, fps, 6);
  const hl = scene.highlight ?? '';
  const at = hl ? scene.headline.lastIndexOf(hl) : -1;
  const before = at >= 0 ? scene.headline.slice(0, at) : scene.headline;
  const after = at >= 0 ? scene.headline.slice(at + hl.length) : '';
  return (
    <div
      style={{
        width: '112%',
        background: COLORS.ink,
        padding: '64px 120px 72px',
        clipPath: torn(scene.id.length * 13, 22),
        transform: `rotate(${tilt}deg) scale(${interpolate(s, [0, 1], [1.25, 1])})`,
        opacity: Math.min(1, s * 2),
      }}
    >
      <div
        style={{
          fontFamily: headingFont,
          fontWeight: 900,
          fontSize: 104,
          lineHeight: 1.02,
          letterSpacing: -2,
          color: COLORS.white,
          textAlign: 'center',
        }}
      >
        {before}
        {at >= 0 && <span style={{color: COLORS.yellow, whiteSpace: 'nowrap'}}>{hl}</span>}
        {after}
      </div>
    </div>
  );
};

// Yellow star sticker carrying the tip number; pinned on the band's corner.
const NumberStar: React.FC<{n: string; frame: number; fps: number; side: 1 | -1}> = ({n, frame, fps, side}) => {
  const s = slap(frame, fps, 14);
  const wobble = Math.sin(frame / 12) * 4;
  return (
    <div
      style={{
        position: 'absolute',
        top: -110,
        [side === 1 ? 'left' : 'right']: 50,
        width: 230,
        height: 230,
        transform: `scale(${s}) rotate(${side * 14 + wobble}deg)`,
        filter: sticker,
      }}
    >
      <svg width={230} height={230} viewBox="0 0 100 100" style={{position: 'absolute'}}>
        <polygon points={starPoints(8, 49, 36, 50)} fill={COLORS.yellow} stroke={COLORS.ink} strokeWidth={3} strokeLinejoin="round" />
      </svg>
      <div style={{position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', fontFamily: headingFont, fontWeight: 900, fontSize: 104, color: COLORS.ink}}>
        {n}
      </div>
    </div>
  );
};

// Torn white note card with karaoke captions: spoken = ink, current = yellow marker, upcoming = muted.
const CaptionCard: React.FC<{text: string; frame: number; fps: number; voFrames: number; tilt: number}> = ({text, frame, fps, voFrames, tilt}) => {
  const s = slap(frame, fps, 10);
  const words = text.split(' ');
  // Weight each word by its length so the highlight tracks the voiceover more closely.
  const weights = words.map((w) => w.replace(/[^\w]/g, '').length + 2);
  const total = weights.reduce((a, b) => a + b, 0);
  const progress = ((frame - VO_DELAY) / voFrames) * total;
  let acc = 0;
  let current = -1;
  for (let i = 0; i < words.length; i++) {
    if (progress >= acc) current = i;
    acc += weights[i];
  }
  return (
    <div
      style={{
        width: 900,
        background: COLORS.paperLight,
        padding: '52px 60px 58px',
        clipPath: torn(text.length, 16),
        transform: `translateY(${(1 - s) * 500}px) rotate(${tilt}deg)`,
        boxShadow: '0 20px 40px rgba(0,0,0,.18)',
      }}
    >
      <div style={{fontFamily: bodyFont, fontWeight: 800, fontSize: 54, lineHeight: 1.4, textAlign: 'left'}}>
        {words.map((w, i) => (
          <span
            key={i}
            style={{
              color: i <= current ? COLORS.ink : COLORS.muted,
              background: i === current ? COLORS.yellow : 'transparent',
              padding: '0 8px',
              margin: '0 2px',
            }}
          >
            {w}
          </span>
        )).flatMap((el, i) => (i ? [' ', el] : [el]))}
      </div>
    </div>
  );
};

/* ---------- visuals ---------- */

const Counter: React.FC<{frame: number}> = ({frame}) => {
  const counting = Math.round(interpolate(frame, [0, 40], [0, 8421], {extrapolateRight: 'clamp'}));
  const value = frame < 45 ? counting : 0;
  const jitter = frame >= 45 && frame < 52 ? (frame % 2 ? 14 : -14) : 0;
  const zero = value === 0;
  return (
    <div
      style={{
        background: zero ? COLORS.yellow : COLORS.paperLight,
        padding: '10px 70px 0',
        clipPath: torn(5, 16),
        transform: `translateX(${jitter}px) rotate(${zero ? -5 : 3}deg)`,
        filter: 'drop-shadow(0 16px 24px rgba(0,0,0,.2))',
      }}
    >
      <div style={{fontFamily: headingFont, fontWeight: 900, fontSize: 230, color: COLORS.ink, fontVariantNumeric: 'tabular-nums', lineHeight: 1.15}}>
        {value.toLocaleString('en-US')}
        <span style={{fontSize: 70, marginLeft: 20}}>views</span>
      </div>
    </div>
  );
};

const SwipeCard: React.FC<{frame: number}> = ({frame}) => {
  const x = interpolate(frame, [40, 80], [0, -1300], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const rot = interpolate(frame, [40, 80], [4, -22], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <div style={{width: 380, height: 520, borderRadius: 40, background: '#1B1B1F', border: `10px solid ${COLORS.white}`, boxShadow: '0 20px 40px rgba(0,0,0,.3)', transform: `translateX(${x}px) rotate(${rot}deg)`, display: 'flex', alignItems: 'center', justifyContent: 'center'}}>
      <svg width={120} height={120} viewBox="0 0 24 24"><path d="M8 5v14l11-7z" fill={COLORS.yellow} /></svg>
    </div>
  );
};

const FollowButton: React.FC<{frame: number; fps: number}> = ({frame, fps}) => {
  const s = slap(frame, fps, 24);
  const pulse = 1 + Math.max(0, Math.sin((frame - 40) / 5)) * 0.04;
  return (
    <div style={{display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 34, transform: `scale(${s * pulse})`}}>
      <div style={{fontFamily: headingFont, fontWeight: 900, fontSize: 92, color: COLORS.ink, background: COLORS.yellow, padding: '26px 110px 32px', clipPath: torn(9, 12, 16), transform: 'rotate(-3deg)'}}>
        + Follow
      </div>
      <div style={{display: 'flex', alignItems: 'center', gap: 18, background: COLORS.white, borderRadius: 999, padding: '14px 36px', fontFamily: headingFont, fontWeight: 800, fontSize: 48, color: COLORS.ink, boxShadow: '0 10px 24px rgba(0,0,0,.15)'}}>
        @yourhandle
        <svg width={50} height={50} viewBox="0 0 24 24"><circle cx={12} cy={12} r={11} fill={COLORS.blue} /><path d="M7 12.5l3 3 7-7" stroke="#fff" strokeWidth={2.6} fill="none" strokeLinecap="round" strokeLinejoin="round" /></svg>
      </div>
    </div>
  );
};

/* ---------- scene ---------- */

const SceneView: React.FC<{scene: Scene; index: number}> = ({scene, index}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();
  const side: 1 | -1 = index % 2 ? 1 : -1; // alternate the collage left/right each scene
  const tipNumber = scene.label?.match(/Tip (\d)/)?.[1];

  // Exit: whole collage tears away upward on the last 8 frames.
  const out = interpolate(frame, [scene.dur - 8, scene.dur], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'center',
        alignItems: 'center',
        flexDirection: 'column',
        gap: 60,
        paddingTop: 140,
        paddingBottom: 300, // keep clear of TikTok's bottom UI
        transform: `translateY(${-out * 160}px) rotate(${out * side * 3}deg)`,
        opacity: 1 - out,
      }}
    >
      {/* New order: label tape → headline band → visual → caption card */}
      {scene.label && <LabelTape text={scene.label} frame={frame} fps={fps} side={side} />}
      <div style={{position: 'relative', width: '100%', display: 'flex', justifyContent: 'center'}}>
        <HeadlineBand scene={scene} frame={frame} fps={fps} tilt={side * -2} />
        {tipNumber && <NumberStar n={tipNumber} frame={frame} fps={fps} side={side} />}
      </div>
      <Sequence from={VO_DELAY} layout="none">
        <Audio src={staticFile(`vo/${scene.id}.wav`)} />
      </Sequence>
      {scene.visual === 'counter' && <Counter frame={frame} />}
      {scene.visual === 'swipe' && <SwipeCard frame={frame} />}
      {scene.visual === 'button' && <FollowButton frame={frame} fps={fps} />}
      <CaptionCard text={scene.vo} frame={frame} fps={fps} voFrames={scene.voFrames} tilt={side * 1.5} />
    </AbsoluteFill>
  );
};

export const TikTokTips: React.FC = () => {
  const frame = useCurrentFrame();

  return (
    <AbsoluteFill>
      <PaperBackground />

      {SCENES.map((scene, i) => (
        <Sequence key={scene.id} from={scene.from} durationInFrames={scene.dur}>
          <SceneView scene={scene} index={i} />
        </Sequence>
      ))}

      {/* Progress bar as yellow tape on a black strip, top of frame */}
      <div style={{position: 'absolute', top: 96, left: 80, right: 80, height: 22, background: COLORS.ink, clipPath: torn(99, 4, 40), transform: 'rotate(-1deg)'}}>
        <div style={{height: '100%', width: `${(frame / TOTAL_FRAMES) * 100}%`, background: COLORS.yellow}} />
      </div>

      {/* Beat + SFX bed, generated by scripts/make-soundtrack.py */}
      <Audio src={staticFile('soundtrack.wav')} />
    </AbsoluteFill>
  );
};
