import React from "react";
import {
  AbsoluteFill,
  Img,
  Sequence,
  interpolate,
  spring,
  staticFile,
  useCurrentFrame,
  useVideoConfig,
  Easing,
} from "remotion";
import { Audio } from "@remotion/media";
import { loadFont } from "@remotion/fonts";
import wordsData from "./words.json";

const fontFamily = "Montserrat";
loadFont({ family: fontFamily, url: staticFile("fonts/montserrat-900.woff2"), weight: "900" });

const FPS = 30;
const s = (sec: number) => Math.round(sec * FPS);
export const TOTAL_FRAMES = s(78.4);

const W = 1080;
const H = 1920;
const YELLOW = "#FFD60A";
const RED = "#E5202E";
const GREEN = "#22C55E";

// ---------------------------------------------------------------- helpers

/** Path to frame `i` (0..8) of an uploaded animated GIF, pre-extracted & upscaled to public/frames. */
const fr = (name: string, i: number) => `frames/${name}/${Math.max(0, Math.min(8, Math.floor(i)))}.jpg`;
/** Play the 9 GIF frames once between local frames a..b (holds first/last outside). */
const play = (name: string, a: number, b: number, reverse = false) => (f: number) => {
  const i = interpolate(f, [a, b], [0, 8.999], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return fr(name, reverse ? 8 - i : i);
};
/** Loop the GIF frames at a given seconds-per-frame cadence. */
const loop = (name: string, spf = 0.18) => (f: number) => fr(name, Math.floor(f / (spf * 30)) % 9);
type Src = string | ((f: number) => string);

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/** Camera shake that decays after an impact frame. */
const useShake = (impacts: number[], strength = 26) => {
  const frame = useCurrentFrame();
  let x = 0;
  let y = 0;
  for (const f of impacts) {
    const d = frame - f;
    if (d >= 0 && d < 12) {
      const k = (1 - d / 12) * strength;
      x += Math.sin(d * 2.7) * k;
      y += Math.cos(d * 3.3) * k;
    }
  }
  return `translate(${x}px, ${y}px)`;
};

const Pic: React.FC<{ src: string; style?: React.CSSProperties; blur?: boolean; pos?: string }> = ({
  pos,
  src,
  style,
  blur,
}) => {
  const filter = blur ? "blur(40px) brightness(0.55) saturate(1.2)" : "contrast(1.06) saturate(1.1)";
  const common: React.CSSProperties = { width: "100%", height: "100%", objectFit: "cover", objectPosition: pos ?? "50% 50%", filter, ...style };
  return <Img src={staticFile(src)} style={{ position: "absolute", inset: 0, ...common }} />;
};

/** Full-screen picture with Ken Burns motion. */
const FullPic: React.FC<{
  src: Src;
  dur: number;
  from?: number;
  to?: number;
  panX?: [number, number];
  panY?: [number, number];
  rotate?: (f: number) => number;
  originX?: string;
  /** objectPosition X (%) start/end – pans inside the cover-crop without exposing edges */
  posX?: [number, number];
}> = ({ src, dur, from = 1, to = 1.1, panX = [0, 0], panY = [0, 0], rotate, originX = "50%", posX = [50, 50] }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [0, dur], [0, 1], clamp);
  const sc = interpolate(p, [0, 1], [from, to]);
  const x = interpolate(p, [0, 1], panX);
  const y = interpolate(p, [0, 1], panY);
  const pos = `${interpolate(p, [0, 1], posX)}% 50%`;
  const r = rotate ? rotate(frame) : 0;
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
      <AbsoluteFill
        style={{
          transform: `translate(${x}px, ${y}px) scale(${sc}) rotate(${r}deg)`,
          transformOrigin: `${originX} 50%`,
        }}
      >
        <Pic src={typeof src === "function" ? src(frame) : src} pos={pos} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
};

/** Blurred full-bleed copy behind a large contained picture (for images whose text must stay visible). */
const FramedPic: React.FC<{ src: Src; dur: number; swing?: boolean; aspect: number }> = ({
  src: srcIn,
  dur,
  swing,
  aspect,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const src = typeof srcIn === "function" ? srcIn(frame) : srcIn;
  const enter = spring({ frame, fps, config: { damping: 12 } });
  const sc = interpolate(frame, [0, dur], [1, 1.08], clamp) * interpolate(enter, [0, 1], [0.6, 1]);
  const rot = swing ? Math.sin(frame / 9) * 4 * Math.exp(-frame / 90) : 0;
  const w = 1080 * 1.18;
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: "#000" }}>
      <AbsoluteFill style={{ transform: "scale(1.3)" }}>
        <Pic src={src} blur />
      </AbsoluteFill>
      <div
        style={{
          position: "absolute",
          left: (W - w) / 2,
          top: 640 - w / aspect / 2,
          width: w,
          height: w / aspect,
          transform: `scale(${sc}) rotate(${rot}deg)`,
          transformOrigin: "50% 0%",
          boxShadow: "0 30px 80px rgba(0,0,0,0.7)",
          overflow: "hidden",
        }}
      >
        <Img src={staticFile(src)} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
      </div>
    </AbsoluteFill>
  );
};

const stroke = (px: number, color = "#000") =>
  ({ WebkitTextStroke: `${px}px ${color}`, paintOrder: "stroke fill" }) as React.CSSProperties;

/** Big pop-in headline. Parts wrapped in [ ] are highlighted. */
const Title: React.FC<{
  text: string;
  at: number;
  top?: number;
  size?: number;
  color?: string;
  hl?: string;
  until?: number;
}> = ({ text, at, top = 330, size = 96, color = "#fff", hl = YELLOW, until }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - at;
  if (f < 0 || (until !== undefined && frame >= until)) return null;
  const sp = spring({ frame: f, fps, config: { damping: 9, stiffness: 180 } });
  const parts = text.split(/(\[[^\]]+\])/g);
  return (
    <div
      style={{
        position: "absolute",
        left: 70,
        right: 70,
        top,
        textAlign: "center",
        fontFamily,
        fontWeight: 900,
        fontSize: size,
        lineHeight: 1.05,
        color,
        textTransform: "uppercase",
        transform: `scale(${interpolate(sp, [0, 1], [0.3, 1])}) rotate(${interpolate(sp, [0, 1], [-6, 0])}deg)`,
        opacity: interpolate(f, [0, 4], [0, 1], clamp),
        textShadow: "0 8px 0 rgba(0,0,0,0.55), 0 0 40px rgba(0,0,0,0.6)",
        ...stroke(size / 6),
      }}
    >
      {parts.map((p, i) =>
        p.startsWith("[") ? (
          <span key={i} style={{ color: hl }}>
            {p.slice(1, -1)}
          </span>
        ) : (
          <span key={i}>{p}</span>
        ),
      )}
    </div>
  );
};

/** Location badge at the top. */
const Badge: React.FC<{ text: string; at?: number }> = ({ text, at = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sp = spring({ frame: frame - at, fps, config: { damping: 14 } });
  if (frame < at) return null;
  return (
    <div style={{ position: "absolute", top: 150, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          fontFamily,
          fontWeight: 900,
          fontSize: 54,
          letterSpacing: 4,
          color: "#111",
          background: YELLOW,
          padding: "16px 40px",
          borderRadius: 16,
          border: "5px solid #111",
          transform: `translateY(${interpolate(sp, [0, 1], [-220, 0])}px) rotate(-2deg)`,
          boxShadow: "0 10px 0 #111",
        }}
      >
        📍 {text}
      </div>
    </div>
  );
};

/** Rubber stamp slam. */
const Stamp: React.FC<{ text: string; at: number; top?: number; size?: number; color?: string; rot?: number }> = ({
  text,
  at,
  top = 760,
  size = 150,
  color = RED,
  rot = -12,
}) => {
  const frame = useCurrentFrame();
  const f = frame - at;
  if (f < 0) return null;
  const sc = interpolate(f, [0, 5, 8], [3, 0.92, 1], { ...clamp, easing: Easing.out(Easing.quad) });
  return (
    <div style={{ position: "absolute", top, left: 0, right: 0, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          fontFamily,
          fontWeight: 900,
          fontSize: size,
          color,
          border: `${size / 11}px solid ${color}`,
          borderRadius: 24,
          padding: "6px 40px",
          transform: `rotate(${rot}deg) scale(${sc})`,
          opacity: interpolate(f, [0, 3], [0, 0.95], clamp),
          background: "rgba(255,255,255,0.12)",
          textShadow: "0 0 2px rgba(0,0,0,0.4)",
          boxShadow: `0 0 0 6px rgba(0,0,0,0.25)`,
          letterSpacing: 6,
        }}
      >
        {text}
      </div>
    </div>
  );
};

const Flash: React.FC<{ at: number; color?: string }> = ({ at, color = "#fff" }) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame - at, [0, 1, 6], [0, 0.8, 0], clamp);
  return <AbsoluteFill style={{ backgroundColor: color, opacity: o, pointerEvents: "none" }} />;
};

const Vignette: React.FC = () => (
  <AbsoluteFill
    style={{
      background:
        "radial-gradient(ellipse at 50% 45%, rgba(0,0,0,0) 45%, rgba(0,0,0,0.55) 100%), linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0) 22%, rgba(0,0,0,0) 60%, rgba(0,0,0,0.65) 100%)",
    }}
  />
);

// ---------------------------------------------------------------- special scenes

/** Three panels of the plank / guinea pig / pigeon image stacked vertically. */
const ThreePanels: React.FC<{ src: string; reveal: number[]; imgW: number; imgH: number; panels?: Src[] }> = ({
  src,
  reveal,
  imgW,
  imgH,
  panels,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const bandH = H / 3;
  return (
    <AbsoluteFill style={{ backgroundColor: "#111" }}>
      {[0, 1, 2].map((i) => {
        const sp = spring({ frame: frame - reveal[i], fps, config: { damping: 10, stiffness: 160 } });
        const own = panels?.[i];
        let inner: React.ReactNode;
        if (own) {
          inner = <Pic src={typeof own === "function" ? own(frame) : own} />;
        } else {
          const pw = imgW / 3;
          const k = Math.max(W / pw, bandH / imgH);
          const iw = imgW * k;
          const ih = imgH * k;
          inner = (
            <Img
              src={staticFile(src)}
              style={{
                position: "absolute",
                width: iw,
                height: ih,
                left: -i * pw * k + (W - pw * k) / 2,
                top: (bandH - ih) / 2,
              }}
            />
          );
        }
        const drift = interpolate(frame, [0, 200], [1.05, 1.15]);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: 0,
              top: i * bandH,
              width: W,
              height: bandH,
              overflow: "hidden",
              transform: `scale(${interpolate(sp, [0, 1], [0, 1])})`,
              opacity: interpolate(sp, [0, 0.2], [0, 1], clamp),
              borderTop: i ? "10px solid #fff" : undefined,
              boxSizing: "border-box",
            }}
          >
            <div style={{ position: "absolute", inset: 0, transform: `scale(${drift})` }}>{inner}</div>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};


const Shield: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const f = frame - at;
  if (f < 0) return null;
  const sp = spring({ frame: f, fps, config: { damping: 9 } });
  const pulse = 1 + Math.sin(f / 4) * 0.03;
  return (
    <div
      style={{
        position: "absolute",
        top: 1010,
        left: 0,
        right: 0,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        transform: `scale(${sp * pulse})`,
      }}
    >
      <svg width="180" height="200" viewBox="0 0 24 26" style={{ filter: "drop-shadow(0 0 30px rgba(34,197,94,0.9))" }}>
        <path d="M12 1l10 4v7c0 6.5-4.3 11.4-10 13C6.3 23.4 2 18.5 2 12V5z" fill={GREEN} stroke="#fff" strokeWidth="1.4" />
        <path d="M7 13l3.3 3.3L17 9.5" stroke="#fff" strokeWidth="2.4" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <div
        style={{
          marginTop: 10,
          fontFamily,
          fontWeight: 900,
          fontSize: 70,
          color: "#fff",
          background: GREEN,
          padding: "10px 34px",
          borderRadius: 18,
          border: "5px solid #fff",
        }}
      >
        100% LEGAL COMPANION
      </div>
    </div>
  );
};



const MoneyCounter: React.FC<{ at: number; dur: number }> = ({ at, dur }) => {
  const frame = useCurrentFrame();
  const f = frame - at;
  if (f < 0) return null;
  const v = Math.round(interpolate(f, [0, dur], [0, 1000000], { ...clamp, easing: Easing.out(Easing.cubic) }));
  return (
    <div
      style={{
        position: "absolute",
        top: 700,
        left: 0,
        right: 0,
        textAlign: "center",
        fontFamily,
        fontWeight: 900,
        color: RED,
        ...stroke(14),
        textShadow: "0 0 50px rgba(229,32,46,0.7)",
      }}
    >
      <div style={{ fontSize: 132 }}>-€{v.toLocaleString("en-US")}+</div>
      <div style={{ fontSize: 80, color: "#fff" }}>/ YEAR</div>
    </div>
  );
};

const Glitch: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const f = frame - at;
  if (f < -3 || f > 4) return null;
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {[0, 1, 2, 3, 4].map((i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: ((i * 397 + f * 211) % 1800 + 1800) % 1800,
            height: 40 + i * 18,
            background: i % 2 ? "rgba(255,0,80,0.55)" : "rgba(0,240,255,0.5)",
            transform: `translateX(${(i % 2 ? 1 : -1) * 60}px)`,
            mixBlendMode: "screen",
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

const CTA: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const sp = spring({ frame: frame - 3, fps, config: { damping: 9 } });
  return (
    <>
      <div
        style={{
          position: "absolute",
          top: 1160,
          left: 70,
          right: 70,
          textAlign: "center",
          fontFamily,
          fontWeight: 900,
          fontSize: 100,
          lineHeight: 1.05,
          color: "#fff",
          transform: `scale(${sp})`,
          ...stroke(16),
        }}
      >
        WHICH ONE <span style={{ color: YELLOW }}>SURPRISED</span> YOU MOST? <span style={{ color: YELLOW }}>↓</span>
      </div>
    </>
  );
};

// ---------------------------------------------------------------- captions

type Word = { text: string; start: number; end: number };
const WORDS = wordsData as Word[];

const KEYWORDS = new Set(
  [
    "laws", "joke", "ridiculous", "government", "london", "illegal", "plank", "wood", "1839", "20-foot", "planks",
    "pedestrians", "speeding", "carriages", "parliament", "banned", "switzerland", "one", "guinea", "pig", "law",
    "pairs", "social", "stress", "depression", "dies", "swiss", '"rent-a-', "guinea-", 'pig"', "legal", "venice",
    "pigeons", "700", "euro", "fine", "save", "city", "millions", "marble", "acidic", "droppings", "dissolved",
    "taxpayers", "weird", "monument", "ruining", "everybody",
  ].map((k) => k.toLowerCase()),
);
const norm = (t: string) => t.toLowerCase().replace(/[.,?!]+$/g, "");

type Page = { words: Word[]; start: number; end: number };
const PAGES: Page[] = (() => {
  const pages: Page[] = [];
  let cur: Word[] = [];
  const flush = () => {
    if (cur.length) pages.push({ words: cur, start: cur[0].start, end: cur[cur.length - 1].end });
    cur = [];
  };
  WORDS.forEach((w, i) => {
    const prev = WORDS[i - 1];
    if (cur.length && (cur.length >= 3 || /[.?!,]$/.test(prev.text) || w.start - prev.end > 450)) {
      if (!prev.text.endsWith("-")) flush();
    }
    cur.push(w);
  });
  flush();
  for (let i = 0; i < pages.length - 1; i++) pages[i].end = Math.min(pages[i].end + 400, pages[i + 1].start);
  return pages;
})();

const CAPTIONS_OFF_FROM_MS = 75500;

const Captions: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ms = (frame / fps) * 1000;
  if (ms >= CAPTIONS_OFF_FROM_MS) return null;
  const page = PAGES.find((p) => ms >= p.start && ms < p.end);
  if (!page) return null;
  const pf = Math.round((page.start / 1000) * fps);
  const enter = spring({ frame: frame - pf, fps, config: { damping: 12, stiffness: 220 } });
  return (
    <div
      style={{
        position: "absolute",
        top: 1380,
        left: 60,
        right: 60,
        display: "flex",
        flexWrap: "wrap",
        justifyContent: "center",
        alignItems: "center",
        fontFamily,
        fontWeight: 900,
        fontSize: 92,
        lineHeight: 1.1,
        textTransform: "uppercase",
        transform: `scale(${interpolate(enter, [0, 1], [0.7, 1])})`,
      }}
    >
      {page.words.map((w, i) => {
        const active = ms >= w.start && (ms < w.end || i === page.words.length - 1);
        const spoken = ms >= w.start;
        const key = KEYWORDS.has(norm(w.text));
        const wf = Math.round((w.start / 1000) * fps);
        const pop = active ? spring({ frame: frame - wf, fps, config: { damping: 8, stiffness: 260 } }) : 0;
        const color = key ? YELLOW : "#fff";
        return (
          <span
            key={i}
            style={{
              display: "inline-block",
              marginLeft: i === 0 || page.words[i - 1].text.endsWith("-") ? 0 : 22,
              marginRight: w.text.endsWith("-") ? 0 : 22,
              transformOrigin: "50% 60%",
              color,
              opacity: spoken ? 1 : 0.8,
              transform: `scale(${1 + pop * 0.08}) translateY(${-pop * 8}px)`,
              ...stroke(16),
              textShadow: "0 6px 0 rgba(0,0,0,0.6)",
              background: active ? "rgba(229,32,46,0.0)" : undefined,
            }}
          >
            {w.text}
          </span>
        );
      })}
    </div>
  );
};

// ---------------------------------------------------------------- SFX

const SFX: [string, number, number?][] = [
  ["riser", 0, 0.5],
  ["thud", 0.25, 1],
  ["pop", 2.6], ["pop", 3.0], ["pop", 3.4],
  ["tick", 4.0, 0.6], ["tick", 4.5, 0.6], ["tick", 5.0, 0.6], ["tick", 5.5, 0.6], ["tick", 6.0, 0.6], ["tick", 6.5, 0.6],
  ["whoosh", 6.95, 0.8],
  ["stamp", 8.85, 1],
  ["pop", 11.8, 0.7],
  ["whoosh", 16.2, 0.9], ["whoosh", 18.0, 0.8],
  ["thud", 19.55, 0.8],
  ["clatter", 21.2, 0.7],
  ["whoosh", 26.25, 0.6],
  ["ding", 27.25, 0.6],
  ["scratch", 29.5, 0.8],
  ["sad", 31.4, 0.45],
  ["pop", 33.6], ["chime", 34.55, 0.6],
  ["heartbeat", 38.9, 0.9], ["heartbeat", 39.9, 0.9], ["heartbeat", 40.7, 1],
  ["whoosh", 42.15, 0.6],
  ["chaching", 45.45, 0.7],
  ["blip", 47.7, 0.6],
  ["whoosh", 50.25, 0.7],
  ["whistle", 55.45, 0.5],
  ["whoosh", 59.5, 0.6],
  ["fizz", 63.6, 0.45],
  ["coins", 67.0, 0.6],
  ["whoosh", 69.35, 0.8], ["bass", 69.45, 1], ["whoosh", 72.95, 0.7], ["bass", 73.05, 0.9],
  ["pop", 75.6, 0.9],
];

// ---------------------------------------------------------------- timeline

type Scene = { from: number; to: number; render: (dur: number) => React.ReactNode };

const SceneShake: React.FC<{ impacts: number[]; children: React.ReactNode; strength?: number }> = ({
  impacts,
  children,
  strength,
}) => {
  const t = useShake(impacts, strength);
  return <AbsoluteFill style={{ transform: t }}>{children}</AbsoluteFill>;
};

const rel = (abs: number, sceneFrom: number) => s(abs - sceneFrom);

const SCENES: Scene[] = [
  {
    from: 0,
    to: 2.45,
    render: (d) => (
      <SceneShake impacts={[s(0.25)]} strength={34}>
        <FullPic src="img/s01_gavel.png" dur={d} from={1.0} to={1.15} />
        <Vignette />
        <Flash at={s(0.25)} />
        <Title text="LAWS THAT [SOUND FAKE]" at={s(0.3)} top={300} size={110} />
      </SceneShake>
    ),
  },
  {
    from: 2.45,
    to: 7.25,
    render: () => (
      <>
        <ThreePanels src="img/s02_three.png" imgW={1717} imgH={916} reveal={[s(0.15), s(0.55), s(0.95)]} />
        <Vignette />
        <Title text="...ARE [100% REAL]" at={s(1.85)} top={560} size={112} />
      </>
    ),
  },
  {
    from: 7.25,
    to: 11.7,
    render: (d) => (
      <SceneShake impacts={[rel(8.85, 7.25)]}>
        <FullPic src="img/s03_london.png" dur={d} from={1.0} to={1.08} posX={[40, 46]} />
        <Vignette />
        <Badge text="LONDON, 1839" />
        <Stamp text="ILLEGAL" at={rel(8.85, 7.25)} />
      </SceneShake>
    ),
  },
  {
    from: 11.7,
    to: 19.45,
    render: (d) => (
      <>
        <FullPic
          src={(f) => (f < s(4.2) ? fr("s04_carpenter", 0) : loop("s04_carpenter", 0.22)(f - s(4.2)))}
          dur={d}
          from={1.05}
          to={1.3}
          originX="70%"
          rotate={(f) => (f > s(4.4) ? Math.sin((f - s(4.4)) / 3) * 3 * Math.exp(-(f - s(4.4)) / 40) : 0)}
        />
        <Vignette />
        <Title text="[WHY?]" at={0} until={s(1.7)} top={420} size={170} />
        <Title text="[20-FOOT] PLANKS" at={rel(16.8, 11.7)} top={330} size={118} />
      </>
    ),
  },
  {
    from: 19.45,
    to: 23.0,
    render: (d) => (
      <SceneShake impacts={[s(0.1)]} strength={30}>
        <FullPic src={play("s05_street", s(0.1), s(3.2))} dur={d} from={1.05} to={1.15} posX={[40, 60]} />
        <Vignette />
        <Flash at={s(0.1)} />
        <Title text="STRAIGHT INTO [TRAFFIC]" at={rel(20.7, 19.45)} top={330} size={110} hl={RED} />
      </SceneShake>
    ),
  },
  {
    from: 23.0,
    to: 26.2,
    render: (d) => (
      <>
        <FullPic src={fr("s06_parl_a", 0)} dur={d} from={1.0} to={1.12} />
        <Vignette />
        <Badge text="PARLIAMENT" />
      </>
    ),
  },
  {
    from: 26.2,
    to: 29.5,
    render: (d) => (
      <>
        <FullPic src={(f) => fr("s06_parl_b", Math.min(3, f / 8))} dur={d} from={1.1} to={1.2} />
        <Vignette />
        <Scroll at={s(0.15)} />
        <Glitch at={d} />
      </>
    ),
  },
  {
    from: 29.5,
    to: 33.6,
    render: (d) => (
      <>
        <FullPic src={play("s08_gp_swiss2", 0, d)} dur={d} from={1.0} to={1.12} />
        <Vignette />
        <Glitch at={0} />
        <Badge text="SWITZERLAND" />
        <Title text="[1 GUINEA PIG] = ILLEGAL" at={rel(31.4, 29.5)} top={420} size={104} hl={YELLOW} />
      </>
    ),
  },
  {
    from: 33.6,
    to: 38.85,
    render: (d) => (
      <>
        <FullPic src={play("s07_gp_swiss", 0, s(1.5))} dur={d} from={1.05} to={1.15} originX="62%" />
        <Vignette />
        <Title text="MUST BUY IN [PAIRS]" at={s(0.9)} top={250} size={108} />
      </>
    ),
  },
  {
    from: 38.85,
    to: 42.25,
    render: (d) => (
      <>
        <FullPic src={play("s08_gp_heart", s(0.2), s(2.4), true)} dur={d} from={1.0} to={1.18} originX="75%" />
        <Vignette />
        <Title text="SEVERE [STRESS]" at={rel(40.7, 38.85)} top={300} size={118} hl={RED} />
      </>
    ),
  },
  {
    from: 42.25,
    to: 50.4,
    render: (d) => (
      <>
        <FramedPic src={loop("s09_rent", 0.2)} dur={d} swing aspect={477 / 358} />
        <Stamp text="RENTAL" at={rel(45.45, 42.25)} top={250} size={110} rot={10} color={YELLOW} />
        <Shield at={rel(47.7, 42.25)} />
      </>
    ),
  },
  {
    from: 50.4,
    to: 59.6,
    render: (d) => (
      <SceneShake impacts={[rel(55.45, 50.4)]}>
        <FullPic src={play("s11_venice", rel(55.2, 50.4), rel(56.6, 50.4))} dur={d} from={1.0} to={1.1} posX={[30, 50]} />
        <Vignette />
        <Badge text="VENICE, ITALY" />
        <Title text="[€700] FINE" at={rel(55.45, 50.4)} top={1050} size={150} hl={YELLOW} color={RED} />
      </SceneShake>
    ),
  },
  {
    from: 59.6,
    to: 66.95,
    render: (d) => (
      <>
        <FullPic src={play("s12_marble", rel(63.4, 59.6), rel(66.6, 59.6))} dur={d} from={1.0} to={1.3} originX="60%" />
        <Vignette />
        <Title text="[ACIDIC] DROPPINGS" at={rel(63.65, 59.6)} top={330} size={112} hl="#7CFF4F" />
      </>
    ),
  },
  {
    from: 66.95,
    to: 69.45,
    render: (d) => (
      <>
        <FullPic src={play("s13_euro", 0, d)} dur={d} from={1.05} to={1.2} originX="30%" posX={[22, 28]} />
        <Vignette />
        <AbsoluteFill style={{ background: "rgba(120,0,0,0.25)" }} />
        <MoneyCounter at={s(0.1)} dur={s(2.0)} />
      </>
    ),
  },
  {
    from: 69.45,
    to: 73.0,
    render: (d) => (
      <>
        <FullPic src={(f) => fr("s06_parl_a", Math.floor(f / (d / 9)))} dur={d} from={1.0} to={1.1} />
        <Vignette />
      </>
    ),
  },
  {
    from: 73.0,
    to: 75.5,
    render: (d) => <CollageSnap dur={d} />,
  },
  {
    from: 75.5,
    to: 78.4,
    render: (d) => (
      <>
        <FramedPic src={loop("s15_comment", 0.16)} dur={d} aspect={478 / 358} />
        <CTA />
      </>
    ),
  },
];

function Scroll({ at }: { at: number }) {
  const frame = useCurrentFrame();
  const f = frame - at;
  if (f < 0) return null;
  const open = interpolate(f, [0, 22], [0, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  const banned = interpolate(f, [s(1.0), s(1.0) + 6], [3, 1], clamp);
  return (
    <div style={{ position: "absolute", top: 240, left: 150, width: 780 }}>
      <div style={{ height: 40, borderRadius: 20, background: "linear-gradient(#8a5a2b,#5b3716)", boxShadow: "0 8px 20px rgba(0,0,0,0.6)" }} />
      <div
        style={{
          height: 520 * open,
          overflow: "hidden",
          margin: "0 24px",
          background: "linear-gradient(90deg,#d9bf8c,#f3e2bb 20%,#f3e2bb 80%,#d4b680)",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          fontFamily,
          fontWeight: 900,
          color: "#3a2410",
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 46, letterSpacing: 2, padding: "0 30px" }}>METROPOLITAN</div>
        <div style={{ fontSize: 46, letterSpacing: 2 }}>POLICE ACT</div>
        <div style={{ fontSize: 40, marginTop: 4 }}>— 1839 —</div>
        <div
          style={{
            marginTop: 24,
            fontSize: 110,
            color: RED,
            border: `9px solid ${RED}`,
            borderRadius: 18,
            padding: "0 26px",
            transform: `rotate(-8deg) scale(${banned})`,
            opacity: f > s(1.0) ? 1 : 0,
          }}
        >
          BANNED
        </div>
      </div>
      <div style={{ height: 40, borderRadius: 20, background: "linear-gradient(#8a5a2b,#5b3716)", boxShadow: "0 8px 20px rgba(0,0,0,0.6)" }} />
    </div>
  );
}

function CollageSnap({ dur }: { dur: number }) {
  const frame = useCurrentFrame();
  const z = interpolate(frame, [0, 10], [1.7, 1], { ...clamp, easing: Easing.out(Easing.back(1.4)) });
  return (
    <AbsoluteFill style={{ transform: `scale(${z})`, backgroundColor: "#000" }}>
      <ThreePanels
        src=""
        imgW={0}
        imgH={0}
        reveal={[0, 3, 6]}
        panels={["img/s03_london.png", fr("s07_gp_swiss", 8), fr("s11_venice", 0)]}
      />
      <Vignette />
      <Title text="SOMEONE [RUINED IT] FOR EVERYONE" at={4} top={560} size={104} />
      <span style={{ display: "none" }}>{dur}</span>
    </AbsoluteFill>
  );
}

// ---------------------------------------------------------------- root

export const LawsVideo: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      {SCENES.map((sc, i) => {
        const from = s(sc.from);
        const dur = s(sc.to) - from;
        return (
          <Sequence key={i} from={from} durationInFrames={dur} name={`Scene ${String(i + 1).padStart(2, "0")}`}>
            {sc.render(dur)}
          </Sequence>
        );
      })}

      <Captions />

      {/* progress bar */}
      <div
        style={{
          position: "absolute",
          left: 0,
          bottom: 0,
          height: 10,
          width: (frame / TOTAL_FRAMES) * W,
          background: YELLOW,
        }}
      />

      <Audio src={staticFile("vo.wav")} volume={0.9} />
      <Audio
        src={staticFile("music.mp3")}
        volume={(f) => interpolate(f, [0, 15, TOTAL_FRAMES - 45, TOTAL_FRAMES], [0, 0.34, 0.34, 0], clamp)}
      />
      {SFX.map(([name, at, vol], i) => (
        <Sequence key={`sfx${i}`} from={s(at)} name={`sfx ${name}`} layout="none">
          <Audio src={staticFile(`sfx/${name}.wav`)} volume={(vol ?? 0.8) * 0.8} />
        </Sequence>
      ))}
    </AbsoluteFill>
  );
};
