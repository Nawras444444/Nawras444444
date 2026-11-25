import React, { useMemo } from "react";
import { AbsoluteFill, Easing, Img, interpolate, random, staticFile, useCurrentFrame } from "remotion";
import { HEIGHT, WIDTH, lightningFlashes, storyData, type HudOverlay } from "../data/storyData";
import { clamp } from "../lib/motion";
import { cairo, mono } from "../lib/fonts";

const C = {
  slate: "#0D131A",
  steel: "#263545",
  mist: "#8FA3B8",
  crimson: "#E63946",
  amber: "#F4A261",
  ice: "#F1F5F9",
};

/* ────────────────────────────────────────────── weather */

type Drop = { x: number; y: number; len: number; speed: number; w: number; o: number };

const makeDrops = (n: number, seed: string, near: boolean): Drop[] =>
  new Array(n).fill(0).map((_, i) => ({
    x: random(`${seed}x${i}`) * (WIDTH + 600) - 300,
    y: random(`${seed}y${i}`) * HEIGHT,
    len: near ? 70 + random(`${seed}l${i}`) * 90 : 30 + random(`${seed}l${i}`) * 40,
    speed: near ? 85 + random(`${seed}v${i}`) * 40 : 48 + random(`${seed}v${i}`) * 20,
    w: near ? 2.2 + random(`${seed}w${i}`) * 1.5 : 1 + random(`${seed}w${i}`) * 0.8,
    o: near ? 0.35 + random(`${seed}o${i}`) * 0.3 : 0.18 + random(`${seed}o${i}`) * 0.2,
  }));

/** Procedural diagonal rain streaks (two depth layers). */
export const RainOverlay: React.FC<{ frame: number; intensity: number; speed: number }> = React.memo(
  ({ frame, intensity, speed }) => {
    const far = useMemo(() => makeDrops(120, "far", false), []);
    const near = useMemo(() => makeDrops(45, "near", true), []);
    const slant = 0.32;
    const render = (drops: Drop[], key: string) =>
      drops.map((d, i) => {
        const travel = HEIGHT + d.len;
        const y = ((d.y + frame * d.speed * speed) % travel) - d.len;
        const x = d.x + y * slant;
        return (
          <line
            key={key + i}
            x1={x}
            y1={y}
            x2={x + d.len * slant * speed}
            y2={y + d.len * speed}
            stroke={`rgba(190,208,226,${d.o * intensity})`}
            strokeWidth={d.w}
            strokeLinecap="round"
          />
        );
      });
    return (
      <svg width={WIDTH} height={HEIGHT} style={{ position: "absolute", inset: 0 }}>
        {render(far, "f")}
        {render(near, "n")}
      </svg>
    );
  },
);

/** Drifting low-opacity fog banks. */
export const FogLayer: React.FC<{ frame: number; density: number }> = React.memo(({ frame, density }) => {
  const banks = [
    { y: 1000, h: 520, speed: 1.1, off: 0, o: 0.22 },
    { y: 640, h: 420, speed: -0.7, off: 700, o: 0.14 },
    { y: 1180, h: 380, speed: 1.8, off: 1400, o: 0.18 },
  ];
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      {banks.map((b, i) => {
        const span = WIDTH * 3;
        const x = (((b.off + frame * b.speed) % span) + span) % span - WIDTH;
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x - WIDTH * 0.5,
              top: b.y - b.h / 2,
              width: WIDTH * 2,
              height: b.h,
              borderRadius: "50%",
              background: `radial-gradient(ellipse at center, rgba(143,163,184,${b.o * density}) 0%, rgba(143,163,184,0) 70%)`,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
});

/** 3-frame lightning flashes synced with thunder SFX. */
export const LightningFlash: React.FC = () => {
  const frame = useCurrentFrame();
  let v = 0;
  for (const [f, s] of lightningFlashes) {
    const d = frame - f;
    if (d >= 0 && d < 3) v = Math.max(v, s * [1, 0.55, 0.2][d]);
  }
  if (v === 0) return null;
  return <AbsoluteFill style={{ background: "#e4eefa", opacity: v * 0.75, mixBlendMode: "screen" }} />;
};

/** Weather for the current panel: rain everywhere outside, fog on exterior shots. */
export const Weather: React.FC = () => {
  const frame = useCurrentFrame();
  const panel = storyData.find((p) => frame >= p.startFrame && frame < p.startFrame + p.durationInFrames);
  if (!panel) return null;
  const speedy = panel.sceneNumber === 4 || panel.sceneNumber === 5;
  const calm = panel.id === "07_4";
  const rainI = panel.exterior ? (calm ? 0.55 : 1) : panel.sceneNumber === 3 || panel.sceneNumber === 8 ? 0.25 : 0.35;
  const fog = panel.exterior ? (panel.id === "02_4" || panel.id === "05_1" ? 1.8 : 1) : 0;
  return (
    <>
      <RainOverlay frame={frame} intensity={rainI} speed={speedy ? 1.45 : calm ? 0.75 : 1} />
      {fog > 0 && <FogLayer frame={frame} density={fog} />}
    </>
  );
};

/* ────────────────────────────────────────────── HUD */

const Panel: React.FC<{ children: React.ReactNode; top: number; accent: string; opacity?: number }> = ({
  children,
  top,
  accent,
  opacity = 1,
}) => (
  <div
    style={{
      position: "absolute",
      left: 90,
      right: 90,
      top,
      padding: "22px 34px",
      borderRadius: 20,
      background: "rgba(13,19,26,0.72)",
      border: `2px solid ${accent}55`,
      boxShadow: `0 0 40px ${accent}22, inset 0 0 30px rgba(0,0,0,0.4)`,
      opacity,
    }}
  >
    {children}
  </div>
);

/** "2.0m TO EDGE" telemetry (scene 1) and the expo-decelerating halt counter (scene 7). */
const DistanceHud: React.FC<{ frame: number; mode: "edge" | "halt" }> = ({ frame, mode }) => {
  const halt = mode === "halt";
  const value = halt
    ? interpolate(frame, [1260, 1290], [38, 0.04], { ...clamp, easing: Easing.out(Easing.exp) })
    : interpolate(frame, [54, 210], [2.0, 1.86], clamp);
  const stopped = halt && frame >= 1290;
  const enter = interpolate(frame, [halt ? 1260 : 54, (halt ? 1260 : 54) + 8], [0, 1], clamp);
  const blink = Math.floor(frame / 8) % 2 === 0;
  const accent = stopped ? C.amber : C.crimson;
  const fill = halt ? interpolate(value, [0, 38], [0.995, 0.2], clamp) : interpolate(value, [0, 2], [1, 0.84], clamp);
  return (
    <Panel top={170} accent={accent} opacity={enter}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
        <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 30, letterSpacing: 4, color: C.mist }}>
          {stopped ? "TRAIN HALTED" : "DISTANCE TO EDGE"}
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ width: 18, height: 18, borderRadius: 9, background: accent, opacity: blink || stopped ? 1 : 0.2, boxShadow: `0 0 16px ${accent}` }} />
          <div style={{ fontFamily: mono, fontWeight: 800, fontSize: 30, color: accent }}>{stopped ? "SAFE?" : "WARNING"}</div>
        </div>
      </div>
      <div style={{ display: "flex", alignItems: "baseline", gap: 18, marginTop: 4 }}>
        <div style={{ fontFamily: mono, fontWeight: 800, fontSize: 104, color: C.ice, lineHeight: 1.05, textShadow: `0 0 30px ${accent}66` }}>
          {value.toFixed(2)}
          <span style={{ fontSize: 54, color: accent }}> m</span>
        </div>
        <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 34, color: C.mist }}>TO EDGE</div>
      </div>
      <div style={{ position: "relative", height: 14, borderRadius: 7, background: "#1b2633", marginTop: 14, overflow: "hidden" }}>
        <div style={{ position: "absolute", left: 0, top: 0, bottom: 0, width: `${fill * 100}%`, background: `linear-gradient(90deg, ${C.steel}, ${accent})` }} />
        <div style={{ position: "absolute", right: 0, top: 0, bottom: 0, width: 6, background: C.crimson }} />
      </div>
    </Panel>
  );
};

/** "-04:00 | قبل أربع دقائق" rewind badge. */
const RewindBadge: React.FC<{ frame: number }> = ({ frame }) => {
  const local = frame - 420;
  const pop = interpolate(local, [0, 6, 10], [0.6, 1.08, 1], clamp);
  // big badge first, then it docks into a small corner tag
  const dock = interpolate(local, [46, 58], [0, 1], { ...clamp, easing: Easing.inOut(Easing.cubic) });
  const counter = Math.max(0, Math.round(interpolate(local, [0, 14], [0, 240], clamp)));
  const mm = String(Math.floor(counter / 60)).padStart(2, "0");
  const ss = String(counter % 60).padStart(2, "0");
  const scale = interpolate(dock, [0, 1], [1, 0.48]) * pop;
  return (
    <div
      style={{
        position: "absolute",
        left: interpolate(dock, [0, 1], [WIDTH / 2, 60]),
        top: interpolate(dock, [0, 1], [250, 70]),
        translate: `${interpolate(dock, [0, 1], [-50, 0])}% 0`,
        scale: String(scale),
        transformOrigin: "left top",
        display: "flex",
        alignItems: "center",
        gap: 22,
        padding: "18px 34px",
        borderRadius: 18,
        background: "rgba(13,19,26,0.8)",
        border: `3px solid ${C.amber}`,
        boxShadow: `0 0 50px ${C.amber}55`,
        whiteSpace: "nowrap",
      }}
    >
      <div style={{ fontFamily: mono, fontWeight: 800, fontSize: 62, color: C.amber }}>◀◀ -{mm}:{ss}</div>
      <div style={{ width: 3, height: 60, background: `${C.amber}88` }} />
      <div dir="rtl" style={{ fontFamily: cairo, fontWeight: 800, fontSize: 56, color: C.ice }}>
        قبل أربع دقائق
      </div>
    </div>
  );
};

const Gauge: React.FC<{ label: string; unit: string; value: number; max: number; redFrom: number; accent: string }> = ({
  label,
  unit,
  value,
  max,
  redFrom,
  accent,
}) => {
  const a0 = -225;
  const sweep = 270;
  const ang = a0 + (Math.min(max, Math.max(0, value)) / max) * sweep;
  const r = 96;
  const arc = (from: number, to: number) => {
    const p = (deg: number) => [120 + r * Math.cos((deg * Math.PI) / 180), 120 + r * Math.sin((deg * Math.PI) / 180)];
    const [x1, y1] = p(from);
    const [x2, y2] = p(to);
    return `M ${x1} ${y1} A ${r} ${r} 0 ${to - from > 180 ? 1 : 0} 1 ${x2} ${y2}`;
  };
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
      <svg width={240} height={210} viewBox="0 0 240 210">
        <path d={arc(a0, a0 + sweep)} stroke="#2b3a4c" strokeWidth={14} fill="none" strokeLinecap="round" />
        <path d={arc(a0 + (redFrom / max) * sweep, a0 + sweep)} stroke={C.crimson} strokeWidth={14} fill="none" strokeLinecap="round" />
        {new Array(10).fill(0).map((_, i) => {
          const d = ((a0 + (i / 9) * sweep) * Math.PI) / 180;
          return <line key={i} x1={120 + 72 * Math.cos(d)} y1={120 + 72 * Math.sin(d)} x2={120 + 82 * Math.cos(d)} y2={120 + 82 * Math.sin(d)} stroke={C.mist} strokeWidth={3} />;
        })}
        <line x1={120} y1={120} x2={120 + 86 * Math.cos((ang * Math.PI) / 180)} y2={120 + 86 * Math.sin((ang * Math.PI) / 180)} stroke={accent} strokeWidth={6} strokeLinecap="round" />
        <circle cx={120} cy={120} r={12} fill={accent} />
        <text x={120} y={182} textAnchor="middle" fontFamily={mono} fontWeight={800} fontSize={40} fill={C.ice}>
          {Math.round(value)}
        </text>
      </svg>
      <div style={{ fontFamily: mono, fontWeight: 700, fontSize: 24, letterSpacing: 3, color: C.mist, marginTop: -6 }}>
        {label} <span style={{ color: accent }}>{unit}</span>
      </div>
    </div>
  );
};

/** Speed + brake pressure gauges (scene 3 throttle-up, scene 6 brake dump). */
const GaugeCluster: React.FC<{ frame: number; mode: "throttle" | "brake" }> = ({ frame, mode }) => {
  const jitter = (amt: number) => (random(`g${frame}`) - 0.5) * amt;
  let speed: number;
  let psi: number;
  let start: number;
  if (mode === "throttle") {
    start = 525;
    speed = interpolate(frame, [529, 630], [74, 121], { ...clamp, easing: Easing.out(Easing.quad) }) + jitter(1.5);
    psi = 88 + jitter(1);
  } else {
    start = 1050;
    speed = interpolate(frame, [1050, 1100, 1260], [138, 132, 22], { ...clamp, easing: Easing.inOut(Easing.quad) }) + jitter(frame > 1206 ? 9 : 3);
    psi = interpolate(frame, [1050, 1104, 1124], [90, 88, 6], { ...clamp, easing: Easing.out(Easing.cubic) }) + jitter(frame > 1124 ? 3 : 1);
  }
  const enter = interpolate(frame, [start, start + 8], [0, 1], clamp);
  const lamp = Math.floor(frame / 6) % 2 === 0;
  const warn = mode === "brake" ? "REVERSE THRUST · AIR DUMP" : "STORM WARNING IGNORED";
  return (
    <Panel top={mode === "throttle" ? 150 : 130} accent={mode === "brake" ? C.crimson : C.amber} opacity={enter}>
      <div style={{ display: "flex", justifyContent: "space-around" }}>
        <Gauge label="SPEED" unit="KM/H" value={speed} max={160} redFrom={110} accent={C.amber} />
        <Gauge label="BRAKE" unit="PSI" value={psi} max={110} redFrom={95} accent={mode === "brake" ? C.crimson : C.mist} />
      </div>
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", gap: 14, marginTop: 6 }}>
        <div style={{ width: 16, height: 16, borderRadius: 8, background: C.crimson, opacity: lamp ? 1 : 0.2, boxShadow: `0 0 14px ${C.crimson}` }} />
        <div style={{ fontFamily: mono, fontWeight: 800, fontSize: 26, letterSpacing: 3, color: mode === "brake" ? C.crimson : C.amber }}>{warn}</div>
      </div>
    </Panel>
  );
};

/** Flashing crimson alert label (scene 5). */
const RedAlert: React.FC<{ frame: number }> = ({ frame }) => {
  const on = Math.floor(frame / 6) % 2 === 0;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 210, display: "flex", justifyContent: "center" }}>
      <div
        style={{
          display: "flex",
          alignItems: "center",
          gap: 24,
          padding: "16px 40px",
          borderRadius: 16,
          background: on ? "rgba(230,57,70,0.9)" : "rgba(13,19,26,0.85)",
          border: `3px solid ${C.crimson}`,
          boxShadow: `0 0 60px ${C.crimson}${on ? "aa" : "33"}`,
        }}
      >
        <div style={{ fontFamily: mono, fontWeight: 800, fontSize: 56, color: C.ice, letterSpacing: 4 }}>⚠ BRIDGE OUT</div>
        <div dir="rtl" style={{ fontFamily: cairo, fontWeight: 800, fontSize: 52, color: C.ice }}>الجسر منهار</div>
      </div>
    </div>
  );
};

const WarningLabel: React.FC<{ frame: number }> = ({ frame }) => {
  const on = Math.floor(frame / 10) % 2 === 0;
  return (
    <div style={{ position: "absolute", left: 0, right: 0, top: 230, display: "flex", justifyContent: "center", opacity: interpolate(frame, [474, 478], [0, 1], clamp) }}>
      <div style={{ display: "flex", alignItems: "center", gap: 22, padding: "14px 36px", borderRadius: 16, background: "rgba(13,19,26,0.85)", border: `3px solid ${on ? C.crimson : C.amber}` }}>
        <div style={{ fontFamily: mono, fontWeight: 800, fontSize: 48, color: on ? C.crimson : C.amber, letterSpacing: 3 }}>⚠ STORM ALERT</div>
        <div dir="rtl" style={{ fontFamily: cairo, fontWeight: 800, fontSize: 46, color: C.ice }}>تحذير العاصفة</div>
      </div>
    </div>
  );
};

/** Global HUD: picks the overlay of the active panel. */
export const Hud: React.FC = () => {
  const frame = useCurrentFrame();
  const panel = storyData.find((p) => frame >= p.startFrame && frame < p.startFrame + p.durationInFrames);
  const mode: HudOverlay = panel?.hudOverlay ?? "none";
  return (
    <AbsoluteFill>
      {mode === "distance-edge" && <DistanceHud frame={frame} mode="edge" />}
      {mode === "distance-halt" && <DistanceHud frame={frame} mode="halt" />}
      {mode === "warning-blink" && <WarningLabel frame={frame} />}
      {mode === "gauges-throttle" && <GaugeCluster frame={frame} mode="throttle" />}
      {mode === "gauges-brake" && <GaugeCluster frame={frame} mode="brake" />}
      {mode === "red-alert" && <RedAlert frame={frame} />}
      {frame >= 420 && frame < 630 && <RewindBadge frame={frame} />}
    </AbsoluteFill>
  );
};

/* ────────────────────────────────────────────── scene transitions & finish */

/** 12-frame white/amber rewind flash with glitch bars (scene 2 → 3). */
export const RewindFlash: React.FC = () => {
  const frame = useCurrentFrame();
  if (frame < 410 || frame > 434) return null;
  const o = interpolate(frame, [410, 420, 432], [0, 1, 0], clamp);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "radial-gradient(circle, #fff7ea 0%, #F4A261 70%, #E07A3F 100%)", opacity: o * 0.92 }} />
      {new Array(7).fill(0).map((_, i) => (
        <div
          key={i}
          style={{
            position: "absolute",
            left: 0,
            right: 0,
            top: random(`rb${i}${frame}`) * HEIGHT,
            height: 8 + random(`rh${i}${frame}`) * 46,
            background: i % 2 ? "rgba(230,57,70,0.45)" : "rgba(143,220,255,0.35)",
            translate: `${(random(`rx${i}${frame}`) - 0.5) * 160}px 0`,
            opacity: o,
            mixBlendMode: "screen",
          }}
        />
      ))}
    </AbsoluteFill>
  );
};

/** Fade-through-black (scene 7 → 8) and final hard cut to black. */
export const BlackOverlays: React.FC<{ cutAt: number }> = ({ cutAt }) => {
  const frame = useCurrentFrame();
  const fade = interpolate(frame, [1455, 1470, 1485], [0, 1, 0], clamp);
  const o = frame >= cutAt ? 1 : fade;
  if (o <= 0) return null;
  return <AbsoluteFill style={{ background: "#000", opacity: o }} />;
};

/** Cinematic vignette + film grain that unifies all 32 panels. */
export const FilmFinish: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <>
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at 50% 45%, transparent 55%, rgba(5,8,12,0.65) 100%)" }} />
      <AbsoluteFill style={{ opacity: 0.06, mixBlendMode: "overlay", overflow: "hidden" }}>
        <Img
          src={staticFile("grain.png")}
          style={{
            position: "absolute",
            width: 1280,
            height: 2160,
            left: -Math.floor(random(`gx${frame}`) * 190),
            top: -Math.floor(random(`gy${frame}`) * 230),
          }}
        />
      </AbsoluteFill>
    </>
  );
};
