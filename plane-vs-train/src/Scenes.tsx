import React from 'react';
import {AbsoluteFill, Easing, interpolate, useCurrentFrame, useVideoConfig} from 'remotion';
import {Background} from './Background';
import {Box, C, Flash, FPS, IconTile, shakeAt, Sticker, fontFamily, useEntry} from './ui';

type Edge = 'cut' | 'whip' | 'slide' | 'fade';

/** Wraps a scene: enter/exit transitions + shake. Times inside scenes are scene-relative seconds. */
const Scene: React.FC<{
  children: React.ReactNode;
  enter?: Edge;
  exit?: Edge;
  shakes?: number[];
  tone?: 'dark' | 'orange';
  calm?: boolean;
  bg?: boolean;
}> = ({children, enter = 'cut', exit = 'cut', shakes = [], tone, calm, bg = true}) => {
  const frame = useCurrentFrame();
  const {durationInFrames} = useVideoConfig();
  let x = 0;
  let blur = 0;
  let opacity = 1;
  const ease = Easing.out(Easing.cubic);
  if (enter === 'whip' || enter === 'slide') {
    const n = enter === 'whip' ? 6 : 10;
    const p = interpolate(frame, [0, n], [0, 1], {extrapolateRight: 'clamp', easing: ease});
    x += (1 - p) * 1080;
    blur += (1 - p) * (enter === 'whip' ? 24 : 6);
  }
  if (enter === 'fade') opacity *= interpolate(frame, [0, 12], [0, 1], {extrapolateRight: 'clamp'});
  if (exit === 'whip' || exit === 'slide') {
    const n = exit === 'whip' ? 6 : 10;
    const p = interpolate(frame, [durationInFrames - n, durationInFrames], [0, 1], {
      extrapolateLeft: 'clamp',
      easing: Easing.in(Easing.cubic),
    });
    x -= p * 1080;
    blur += p * (exit === 'whip' ? 24 : 6);
  }
  return (
    <AbsoluteFill style={{transform: `translateX(${x}px)`, filter: blur > 0.5 ? `blur(${blur}px)` : undefined, opacity}}>
      <AbsoluteFill style={{transform: shakeAt(frame, shakes)}}>
        {bg ? <Background tone={tone} calm={calm} /> : null}
        {children}
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/* ---------- glyphs ---------- */
const Laptop = (
  <g fill="none" stroke={C.ink} strokeWidth={7} strokeLinejoin="miter">
    <rect x={18} y={22} width={64} height={42} fill={C.orange} />
    <path d="M6 76 h88 l-8 -10 h-72 z" fill={C.ink} />
  </g>
);
const Book = (
  <g stroke={C.ink} strokeWidth={7}>
    <path d="M50 26 C 38 16, 20 16, 10 20 v58 c10 -4 28 -4 40 6 c12 -10 30 -10 40 -6 v-58 c-10 -4 -28 -4 -40 6 z" fill={C.red} />
    <path d="M50 26 v58" />
  </g>
);
const Moon = (
  <g>
    <path d="M62 12 a38 38 0 1 0 28 56 a30 30 0 1 1 -28 -56 z" fill={C.orange} stroke={C.ink} strokeWidth={7} />
    <text x={58} y={44} fontSize={22} fontWeight={900} fill={C.ink} fontFamily="sans-serif">z</text>
    <text x={72} y={28} fontSize={16} fontWeight={900} fill={C.ink} fontFamily="sans-serif">z</text>
  </g>
);
const City = (
  <g stroke={C.ink} strokeWidth={6}>
    <rect x={8} y={44} width={22} height={46} fill={C.orange} />
    <rect x={34} y={16} width={28} height={74} fill={C.red} />
    <rect x={66} y={34} width={26} height={56} fill={C.orange} />
    {[26, 40, 54, 68].map((yy) => (
      <rect key={yy} x={42} y={yy} width={12} height={6} fill={C.cream} strokeWidth={0} />
    ))}
  </g>
);
const Bubble = (
  <g stroke={C.ink} strokeWidth={7}>
    <path d="M10 14 h80 v52 h-44 l-20 18 v-18 h-16 z" fill={C.orange} />
    <circle cx={32} cy={40} r={5} fill={C.ink} />
    <circle cx={50} cy={40} r={5} fill={C.ink} />
    <circle cx={68} cy={40} r={5} fill={C.ink} />
  </g>
);
const Check = <path d="M16 52 l22 22 l46 -50" stroke={C.white} strokeWidth={16} fill="none" strokeLinecap="square" />;

/** Clock face whose hand sweeps; `wedge` fills a portion (0..1) in a color. */
const DrawnClock: React.FC<{at: number; x: number; y: number; s: number; spin?: number; wedge?: number; wedgeColor?: string}> = ({
  at,
  x,
  y,
  s,
  spin = 0.4,
  wedge = 0,
  wedgeColor = '#19C37D',
}) => {
  const frame = useCurrentFrame();
  const {opacity, transform, local} = useEntry(at, 'pop');
  const t = Math.max(local, 0) / FPS;
  const w = interpolate(local, [6, 30], [0, wedge], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const a = w * Math.PI * 2;
  const wx = 50 + 40 * Math.sin(a);
  const wy = 50 - 40 * Math.cos(a);
  return (
    <div style={{position: 'absolute', left: x - s / 2, top: y - s / 2, width: s, height: s, opacity}}>
      <svg viewBox="0 0 100 100" width={s} height={s} style={{transform, overflow: 'visible'}}>
        <rect x={0} y={0} width={100} height={100} fill={C.cream} stroke={C.ink} strokeWidth={6} />
        <rect x={6} y={6} width={100} height={100} fill="none" stroke={C.red} strokeWidth={0} />
        <circle cx={50} cy={50} r={40} fill={C.white} stroke={C.ink} strokeWidth={6} />
        {w > 0.001 ? (
          <path d={`M50 50 L50 10 A40 40 0 ${w > 0.5 ? 1 : 0} 1 ${wx} ${wy} Z`} fill={wedgeColor} opacity={0.85} />
        ) : null}
        {[...Array(12)].map((_, i) => (
          <line key={i} x1={50} y1={14} x2={50} y2={20} stroke={C.ink} strokeWidth={4} transform={`rotate(${i * 30} 50 50)`} />
        ))}
        <line x1={50} y1={50} x2={50} y2={22} stroke={C.ink} strokeWidth={6} transform={`rotate(${t * 360 * spin} 50 50)`} />
        <line x1={50} y1={50} x2={50} y2={30} stroke={C.red} strokeWidth={6} transform={`rotate(${t * 30 * spin} 50 50)`} />
        <circle cx={50} cy={50} r={5} fill={C.ink} />
      </svg>
    </div>
  );
};

/* ================= SCENE 1 — hook (0 → 5.9) ================= */
export const S1: React.FC = () => (
  <Scene shakes={[1.3, 3.82]}>
    <Sticker src="img/plane.png" at={0} anim="slideUp" x={540} y={400} w={860} rotate={-4} float={12} />
    <Sticker src="img/train.png" at={0.35} anim="slideR" x={560} y={1170} w={600} float={6} />
    <Box text="الطائرة أم القطار؟" at={1.3} anim="zoom" y={760} size={96} />
    <Box text="أيهما يوفر [وقتك] فعليًا؟" at={2.4} anim="slideUp" y={915} size={58} variant="black" />
    <Sticker src="img/coins.png" at={3.82} anim="pop" x={870} y={1280} w={260} rotate={8} />
    <Flash at={5.6} />
  </Scene>
);

/* ================= SCENE 2 — airport (5.9 → 10.3) ================= */
export const S2: React.FC = () => {
  const S = 5.9;
  const frame = useCurrentFrame();
  const fly = interpolate(frame, [0, 4.4 * FPS], [1250, -250]);
  const cAt = 9.28 - S;
  const counter = interpolate(frame, [cAt * FPS + 4, cAt * FPS + 26], [0, 120], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const mins = Math.round(counter);
  const label = `${Math.floor(mins / 60)}:${String(mins % 60).padStart(2, '0')}`;
  const showCounter = frame >= cAt * FPS;
  return (
    <Scene shakes={[8.7 - S, cAt]} exit="whip">
      <Sticker src="img/plane.png" at={0} anim="none" x={fly} y={220} w={230} float={4} />
      <Sticker src="img/airport.png" at={0} anim="slideR" x={540} y={640} w={880} rotate={-2} exitAt={cAt} />
      <Box text="الطائرة تبدو أسرع…" at={6.36 - S} anim="slideL" y={1130} size={70} exitAt={cAt} />
      <Box text="لكن انتظر!" at={8.7 - S} anim="pop" x={430} y={1310} size={84} variant="red" rotate={-3} exitAt={cAt} />
      <Sticker src="img/bell.jpg" at={8.7 - S} anim="pop" x={850} y={1300} w={230} h={200} framed rotate={6} exitAt={cAt} />
      {showCounter ? (
        <>
          <Sticker src="img/clock.png" at={cAt} anim="pop" x={540} y={640} w={560} float={6} />
          <div
            style={{
              position: 'absolute',
              left: 540,
              top: 1080,
              transform: 'translate(-50%,-50%)',
              fontFamily,
              fontWeight: 900,
              fontSize: 150,
              color: C.orange,
              background: C.ink,
              border: `8px solid ${C.cream}`,
              boxShadow: `14px 14px 0 ${C.red}`,
              padding: '0 50px',
              fontVariantNumeric: 'tabular-nums',
              direction: 'ltr',
            }}
          >
            {label}
          </div>
          <Box text="قبل الرحلة [بساعتين]" at={cAt + 0.1} anim="slideUp" y={1290} size={70} />
        </>
      ) : null}
    </Scene>
  );
};

/* ================= SCENE 3 — airport steps (10.3 → 17.9) ================= */
const Shot: React.FC<{from: number; to: number; children: React.ReactNode}> = ({from, to, children}) => {
  const frame = useCurrentFrame();
  if (frame < from * FPS || frame >= to * FPS) return null;
  return <>{children}</>;
};

export const S3: React.FC = () => {
  const S = 10.3;
  const r = (t: number) => t - S;
  const frame = useCurrentFrame();
  const bar = interpolate(frame, [r(15.02) * FPS, r(17.4) * FPS], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Scene enter="whip" exit="slide" shakes={[r(10.38), r(11.52), r(12.22), r(13.24), r(16.66)]}>
      <Shot from={0} to={r(11.52)}>
        <Sticker src="img/runner.png" at={r(10.38)} anim="slideL" x={540} y={760} w={760} float={4} />
        <Box text="وصول مبكر" at={r(10.38)} anim="slideUp" x={700} y={330} size={84} variant="red" rotate={-4} />
      </Shot>
      <Shot from={r(11.52)} to={r(12.22)}>
        <Sticker src="img/security.png" at={r(11.52)} anim="pop" x={540} y={760} w={880} float={4} />
        <Box text="تفتيش أمني" at={r(11.52)} anim="slideUp" x={380} y={1300} size={84} variant="orange" rotate={3} />
      </Shot>
      <Shot from={r(12.22)} to={r(13.24)}>
        <Sticker src="img/waiting_card.jpg" at={r(12.22)} anim="pop" x={560} y={760} w={640} h={830} framed cover="center 40%" float={3} />
        <Box text="انتظار البوابة" at={r(12.22)} anim="slideUp" x={430} y={300} size={80} variant="red" rotate={-3} />
      </Shot>
      <Shot from={r(13.24)} to={r(15.02)}>
        <Sticker src="img/baggage_card.jpg" at={r(13.24)} anim="pop" x={520} y={740} w={660} h={860} framed cover="center 45%" float={3} />
        <Box text="استلام الحقيبة" at={r(13.24)} anim="slideUp" x={660} y={1290} size={80} variant="orange" rotate={3} />
      </Shot>
      <Shot from={r(15.02)} to={99}>
        <Box text="وصول مبكر" at={r(15.02)} anim="slideR" y={330} size={64} strikeAt={r(15.3)} />
        <Box text="تفتيش أمني" at={r(15.2)} anim="slideR" y={490} size={64} strikeAt={r(15.6)} />
        <Box text="انتظار البوابة" at={r(15.5)} anim="slideR" y={650} size={64} strikeAt={r(15.9)} />
        <Box text="استلام الحقيبة" at={r(15.7)} anim="slideR" y={810} size={64} strikeAt={r(16.2)} />
        {/* time bar */}
        <div style={{position: 'absolute', left: 120, top: 975, width: 840, height: 70, border: `8px solid ${C.cream}`, background: C.ink}}>
          <div style={{position: 'absolute', right: 0, top: 0, bottom: 0, width: `${bar * 100}%`, background: C.red}} />
        </div>
        <Sticker src="img/clock.png" at={r(15.02)} anim="pop" x={110} y={1010} w={150} float={4} />
        <Box text="تأخذ من [وقتك الحقيقي]" at={r(16.04)} anim="zoom" y={1220} size={74} variant="black" />
      </Shot>
    </Scene>
  );
};

/* ================= SCENE 4 — train station (17.9 → 22.9) ================= */
export const S4: React.FC = () => {
  const S = 17.9;
  const r = (t: number) => t - S;
  return (
    <Scene enter="slide" calm>
      <Sticker src="img/station_card.jpg" at={r(18.12)} anim="fade" x={540} y={640} w={660} h={800} framed kenBurns cover="center 55%" float={4} />
      <Box text="القطار" at={r(18.4)} anim="fade" x={540} y={1110} size={96} variant="orange" />
      <Box text="وصول قبل [20 دقيقة] فقط" at={r(21.4)} anim="zoom" x={600} y={1290} size={64} />
      <DrawnClock at={r(21.4)} x={130} y={1290} s={150} spin={0.15} wedge={1 / 3} />
    </Scene>
  );
};

/* ================= SCENE 5 — comfort (22.9 → 32.4) ================= */
export const S5: React.FC = () => {
  const S = 22.9;
  const r = (t: number) => t - S;
  const frame = useCurrentFrame();
  const x = interpolate(frame, [r(23.5) * FPS, r(23.5) * FPS + 8], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  const split = frame >= r(31.9) * FPS;
  const blink = Math.floor(frame / 3) % 2 === 0 ? 1 : 0.35;
  return (
    <Scene calm shakes={[r(31.9)]}>
      <Shot from={0} to={r(25.5)}>
        <Sticker src="img/okwoman.png" at={r(22.92)} anim="bounce" x={380} y={740} w={500} float={6} />
        <Sticker src="img/suitcases.png" at={r(22.92)} anim="pop" x={820} y={520} w={300} rotate={6} float={4} />
        <svg width={1080} height={1920} style={{position: 'absolute', inset: 0}}>
          <path d={`M690 370 L${690 + 260 * x} ${370 + 300 * x}`} stroke={C.red} strokeWidth={30} strokeLinecap="square" />
          <path d={`M950 370 L${950 - 260 * x} ${370 + 300 * x}`} stroke={C.red} strokeWidth={30} strokeLinecap="square" />
        </svg>
        <Box text="لا [أمتعة ثقيلة]" at={r(22.92)} anim="bounce" y={1270} size={86} />
      </Shot>
      <Shot from={r(25.5)} to={r(27.96)}>
        <Sticker src="img/station_card.jpg" at={r(25.5)} anim="bounce" x={540} y={680} w={820} h={760} framed kenBurns cover="center 30%" float={3} />
        <IconTile at={r(25.7)} x={890} y={330} glyph={City} />
        <Box text="المحطة في [وسط المدينة]" at={r(25.5)} anim="bounce" y={1250} size={72} variant="black" />
      </Shot>
      <Shot from={r(27.96)} to={r(31.9)}>
        <Sticker src="img/relax.png" at={r(27.96)} anim="bounce" x={540} y={760} w={860} float={5} />
        <IconTile at={r(29.68)} x={280} y={250} glyph={Laptop} />
        <IconTile at={r(30.26)} x={540} y={250} glyph={Book} />
        <IconTile at={r(31.08)} x={800} y={250} glyph={Moon} />
        <Box text="عمل أو [استرخاء] أثناء الرحلة" at={r(28.2)} anim="bounce" y={1260} size={58} variant="orange" />
      </Shot>
      {split ? (
        <AbsoluteFill>
          <div style={{position: 'absolute', left: 0, top: 0, width: 1080, height: 960, background: C.black}} />
          <div style={{position: 'absolute', left: 0, top: 960, width: 1080, height: 960, background: C.orange}} />
          <Sticker src="img/plane.png" at={r(31.9)} anim="slideL" x={540} y={480} w={760} float={4} />
          <Sticker src="img/train.png" at={r(31.9)} anim="slideR" x={540} y={1400} w={560} float={4} />
          <div style={{position: 'absolute', left: 0, top: 950, width: 1080, height: 20, background: C.red, opacity: blink}} />
        </AbsoluteFill>
      ) : null}
    </Scene>
  );
};

/* ================= SCENE 6 — long distance (32.4 → 38.8) ================= */
export const S6: React.FC = () => {
  const S = 32.4;
  const r = (t: number) => t - S;
  const frame = useCurrentFrame();
  const pan = interpolate(frame, [0, 6.4 * FPS], [320, -80]);
  const zip = interpolate(frame, [r(36.4) * FPS, r(37.3) * FPS], [1500, -700], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
  return (
    <Scene shakes={[r(35.26), r(38.35)]}>
      <Sticker src="img/map.png" at={0} anim="none" x={540 + pan} y={700} w={1000} float={3} />
      <DrawnClock at={r(32.6)} x={170} y={260} s={190} spin={6} />
      <Box text="للمسافات الطويلة" at={r(32.78)} anim="slideR" y={1150} size={76} variant="black" />
      <Box text="الطائرة [تفوز] غالبًا" at={r(35.26)} anim="zoom" y={1320} size={92} variant="red" rotate={-2} />
      <Sticker src="img/speedplane.png" at={r(36.4)} anim="none" x={zip} y={640} w={720} float={0} rotate={-6} />
      <Flash at={r(38.35)} />
    </Scene>
  );
};

/* ================= SCENE 7 — verdict split (38.8 → 47.0) ================= */
export const S7: React.FC = () => {
  const S = 38.8;
  const r = (t: number) => t - S;
  const frame = useCurrentFrame();
  const blink = Math.floor(frame / 4) % 2 === 0 ? 1 : 0.4;
  return (
    <Scene shakes={[r(41.08), r(45.66)]} bg={false}>
      <div style={{position: 'absolute', inset: 0, height: 900, overflow: 'hidden'}}>
        <Background tone="orange" />
      </div>
      <div style={{position: 'absolute', left: 0, top: 900, width: 1080, height: 1020, overflow: 'hidden'}}>
        <div style={{position: 'absolute', top: -900, width: 1080, height: 1920}}>
          <Background />
        </div>
      </div>
      <div style={{position: 'absolute', left: 0, top: 890, width: 1080, height: 20, background: C.red, opacity: blink}} />
      <Sticker src="img/train.png" at={0} anim="slideR" x={540} y={420} w={560} float={5} />
      <Box text="قصير أو متوسط؟ [القطار]" at={r(38.88)} anim="slideL" y={790} size={62} />
      <IconTile at={r(41.08)} x={880} y={230} s={150} glyph={Check} bg={C.red} />
      <Sticker src="img/plane.png" at={0.2} anim="slideL" x={540} y={1180} w={700} float={5} />
      <Box text="طويل أو بين الدول؟ [الطائرة]" at={r(43.3)} anim="slideR" y={1420} size={60} variant="orange" />
      <Crown at={r(45.66)} x={600} y={1000} />
    </Scene>
  );
};

const Crown: React.FC<{at: number; x: number; y: number}> = ({at, x, y}) => {
  const {opacity, transform} = useEntry(at, 'drop');
  return (
    <div style={{position: 'absolute', left: x - 110, top: y - 80, width: 220, height: 160, opacity}}>
      <svg viewBox="0 0 110 80" width={220} height={160} style={{transform, overflow: 'visible'}}>
        <path d="M8 70 L4 18 L32 42 L55 6 L78 42 L106 18 L102 70 Z" fill={C.ink} transform="translate(5 5)" />
        <path d="M8 70 L4 18 L32 42 L55 6 L78 42 L106 18 L102 70 Z" fill={C.orange} stroke={C.ink} strokeWidth={5} />
        <circle cx={55} cy={52} r={7} fill={C.red} stroke={C.ink} strokeWidth={3} />
      </svg>
    </div>
  );
};

/* ================= SCENE 8 — CTA (47.0 → 56) ================= */
export const S8: React.FC = () => {
  const S = 47.0;
  const r = (t: number) => t - S;
  const frame = useCurrentFrame();
  const t = frame / FPS;
  // toggle flips every 0.8s
  const phase = Math.floor(Math.max(t - 0.6, 0) / 0.8) % 2;
  const tg = useEntry(0.6, 'pop');
  const knobX = interpolate((Math.max(t - 0.6, 0) % 0.8) / 0.25, [0, 1], [phase ? 0 : 1, phase ? 1 : 0], {
    extrapolateRight: 'clamp',
    easing: Easing.out(Easing.back(2)),
  });
  const pulse = 1 + Math.max(0, Math.sin((t - r(50.9)) * 7)) * 0.07 * (t > r(50.9) ? 1 : 0);
  const btn = useEntry(r(50.9), 'pop');
  return (
    <Scene shakes={[0, r(52.6)]}>
      <Box text="أنت مع [أيهما]؟" at={0} anim="pop" y={470} size={110} variant="cream" />
      {/* CHOOSE-style toggle */}
      <div style={{position: 'absolute', left: 540, top: 800, transform: 'translate(-50%,-50%)', opacity: tg.opacity}}>
        <div
          style={{
            transform: tg.transform,
            width: 720,
            height: 260,
            borderRadius: 130,
            background: C.ink,
            border: `8px solid ${C.cream}`,
            boxShadow: `14px 14px 0 ${C.orange}`,
            position: 'relative',
          }}
        >
          <div
            style={{
              position: 'absolute',
              top: 14,
              left: 14 + knobX * 460,
              width: 216,
              height: 216,
              borderRadius: 108,
              background: C.orange,
              border: `6px solid ${C.cream}`,
            }}
          />
          <Sticker src="img/train.png" at={0.6} anim="none" x={135} y={124} w={190} float={2} />
          <Sticker src="img/plane.png" at={0.6} anim="none" x={585} y={124} w={210} float={2} />
        </div>
      </div>
      <Box text="اكتب في التعليقات: [طائرة] أم [قطار]؟" at={r(48.14)} anim="slideUp" y={1110} size={50} variant="black" />
      <IconTile at={r(48.3)} x={900} y={1000} s={130} glyph={Bubble} />
      <Box text="تابعنا لمزيد من المقارنات" at={r(50.66)} anim="pop" y={1260} size={60} variant="red" />
      <div style={{position: 'absolute', left: 540, top: 1420, transform: `translate(-50%,-50%) scale(${pulse})`, opacity: btn.opacity}}>
        <div
          style={{
            transform: btn.transform,
            fontFamily,
            fontWeight: 900,
            fontSize: 64,
            color: C.ink,
            background: C.orange,
            border: `8px solid ${C.ink}`,
            boxShadow: `10px 10px 0 ${C.cream}`,
            padding: '4px 60px 14px',
            direction: 'rtl',
          }}
        >
          + تابِع
        </div>
      </div>
      <Flash at={r(52.6)} color={C.orange} dur={0.4} />
    </Scene>
  );
};
