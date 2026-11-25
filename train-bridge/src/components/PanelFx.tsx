import React, { useMemo } from "react";
import { AbsoluteFill, interpolate, random } from "remotion";
import { WIDTH, type Panel } from "../data/storyData";
import { clamp } from "../lib/motion";

/** Per-panel foreground effects drawn inside the picture window. */
export const PanelFx: React.FC<{ panel: Panel; frame: number }> = ({ panel, frame }) => {
  const h = panel.windowHeight;
  return (
    <>
      {panel.fx.includes("amber-pulse") && <AmberPulse frame={frame} />}
      {panel.fx.includes("amber-red-pulse") && <AmberRedPulse frame={frame} />}
      {panel.fx.includes("wiper") && <Wiper frame={frame} h={h} />}
      {panel.fx.includes("splash") && <Splash frame={frame} h={h} />}
      {panel.fx.includes("headlight-flare") && <HeadlightFlare frame={frame} />}
      {panel.fx.includes("speed-lines") && <SpeedLines frame={frame} h={h} />}
      {panel.fx.includes("sparks") && <Sparks frame={frame} h={h} heavy={panel.id === "06_4"} />}
      {panel.fx.includes("steam") && <Steam frame={frame} h={h} />}
      {panel.fx.includes("light-spill") && <LightSpill frame={frame} />}
      {panel.fx.includes("red-vignette") && <RedVignette frame={frame} />}
      {panel.hudOverlay === "warning-blink" && <WarningBlink frame={frame} />}
    </>
  );
};

const AmberPulse: React.FC<{ frame: number }> = ({ frame }) => (
  <AbsoluteFill
    style={{
      background: "radial-gradient(ellipse at 15% 25%, rgba(244,162,97,0.55), transparent 60%)",
      mixBlendMode: "screen",
      opacity: 0.25 + 0.2 * Math.sin(frame / 5),
    }}
  />
);

const AmberRedPulse: React.FC<{ frame: number }> = ({ frame }) => {
  const red = Math.floor(frame / 7) % 2 === 0;
  return (
    <AbsoluteFill
      style={{
        background: red
          ? "radial-gradient(ellipse at 50% 40%, rgba(230,57,70,0.55), transparent 70%)"
          : "radial-gradient(ellipse at 50% 40%, rgba(244,162,97,0.5), transparent 70%)",
        mixBlendMode: "screen",
        opacity: 0.35 + 0.15 * Math.sin(frame * 0.9),
      }}
    />
  );
};

const WarningBlink: React.FC<{ frame: number }> = ({ frame }) => {
  const on = Math.floor(frame / 10) % 2 === 0;
  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(ellipse at 50% 45%, rgba(230,57,70,0.75), rgba(230,57,70,0.15) 45%, transparent 75%)",
        mixBlendMode: "screen",
        opacity: on ? 0.55 : 0.08,
      }}
    />
  );
};

/** Animated windshield wiper sweeping across the glass. */
const Wiper: React.FC<{ frame: number; h: number }> = ({ frame, h }) => {
  // one full swipe (out and back) between frames 6 and 40
  const angle = interpolate(frame, [6, 22, 26, 42], [-8, -168, -168, -8], clamp);
  return (
    <div
      style={{
        position: "absolute",
        left: WIDTH * 0.5,
        top: h - 30,
        width: 0,
        height: 0,
        rotate: `${angle}deg`,
      }}
    >
      <div
        style={{
          position: "absolute",
          left: 0,
          top: -9,
          width: h * 0.95,
          height: 18,
          borderRadius: 9,
          background: "linear-gradient(#1a1f26, #05070a)",
          boxShadow: "0 0 18px rgba(0,0,0,0.6)",
        }}
      />
      {/* clean streak behind the blade */}
      <div
        style={{
          position: "absolute",
          left: 40,
          top: -50,
          width: h * 0.9,
          height: 100,
          background: "linear-gradient(rgba(143,163,184,0), rgba(143,163,184,0.16), rgba(143,163,184,0))",
        }}
      />
    </div>
  );
};

const Splash: React.FC<{ frame: number; h: number }> = ({ frame, h }) => {
  const drops = useMemo(
    () =>
      new Array(46).fill(0).map((_, i) => ({
        x: random(`sx${i}`) * WIDTH,
        y: random(`sy${i}`) * h,
        r: 8 + random(`sr${i}`) * 34,
        d: Math.floor(random(`sd${i}`) * 14),
      })),
    [h],
  );
  const burst = interpolate(frame, [0, 2, 10], [0, 0.55, 0], clamp);
  return (
    <AbsoluteFill>
      <AbsoluteFill style={{ background: "rgba(220,235,250,1)", opacity: burst, mixBlendMode: "screen" }} />
      <svg width={WIDTH} height={h} style={{ position: "absolute" }}>
        {drops.map((d, i) => {
          const t = frame - d.d;
          if (t < 0) return null;
          const s = interpolate(t, [0, 6], [0.2, 1], clamp);
          const o = interpolate(t, [0, 3, 30], [0, 0.85, 0.25], clamp);
          return (
            <g key={i} opacity={o}>
              <circle cx={d.x} cy={d.y + t * 1.5} r={d.r * s} fill="rgba(200,225,245,0.12)" stroke="rgba(235,245,255,0.7)" strokeWidth={2} />
              <circle cx={d.x - d.r * 0.3 * s} cy={d.y + t * 1.5 - d.r * 0.3 * s} r={d.r * 0.22 * s} fill="rgba(255,255,255,0.8)" />
            </g>
          );
        })}
      </svg>
    </AbsoluteFill>
  );
};

const HeadlightFlare: React.FC<{ frame: number }> = ({ frame }) => {
  const flicker = 0.55 + 0.45 * random(`flare-${frame}`);
  return (
    <AbsoluteFill
      style={{
        background:
          "radial-gradient(circle at 18% 30%, rgba(255,214,150,0.9), rgba(244,162,97,0.35) 18%, transparent 45%)",
        mixBlendMode: "screen",
        opacity: 0.55 * flicker,
      }}
    />
  );
};

const SpeedLines: React.FC<{ frame: number; h: number }> = ({ frame, h }) => {
  const lines = useMemo(
    () =>
      new Array(34).fill(0).map((_, i) => ({
        y: random(`ly${i}`) * h,
        len: 160 + random(`ll${i}`) * 420,
        speed: 70 + random(`lv${i}`) * 90,
        off: random(`lo${i}`) * 3000,
        w: 1 + random(`lw${i}`) * 3,
      })),
    [h],
  );
  return (
    <svg width={WIDTH} height={h} style={{ position: "absolute", mixBlendMode: "screen" }}>
      {lines.map((l, i) => {
        const span = WIDTH + l.len * 2;
        const x = span - ((l.off + frame * l.speed) % span) - l.len;
        return (
          <line key={i} x1={x} y1={l.y} x2={x + l.len} y2={l.y} stroke="rgba(210,225,240,0.35)" strokeWidth={l.w} strokeLinecap="round" />
        );
      })}
    </svg>
  );
};

const Sparks: React.FC<{ frame: number; h: number; heavy: boolean }> = ({ frame, h, heavy }) => {
  const n = heavy ? 70 : 45;
  const sparks = useMemo(
    () =>
      new Array(n).fill(0).map((_, i) => ({
        born: Math.floor(random(`kb${i}`) * 48),
        vx: (random(`kx${i}`) - 0.5) * 38,
        vy: -12 - random(`ky${i}`) * 26,
        x0: WIDTH * (0.25 + random(`k0${i}`) * 0.5),
        life: 8 + random(`kl${i}`) * 12,
      })),
    [n],
  );
  return (
    <svg width={WIDTH} height={h} style={{ position: "absolute", mixBlendMode: "screen" }}>
      {sparks.map((s, i) => {
        const t = frame - s.born;
        if (t < 0 || t > s.life) return null;
        const x = s.x0 + s.vx * t;
        const y = h * 0.92 + s.vy * t + 1.6 * t * t;
        const o = 1 - t / s.life;
        return (
          <line key={i} x1={x} y1={y} x2={x - s.vx * 0.9} y2={y - (s.vy + 3.2 * t) * 0.9} stroke={`rgba(255,${170 + Math.floor(60 * o)},90,${o})`} strokeWidth={3.5} strokeLinecap="round" />
        );
      })}
    </svg>
  );
};

const Steam: React.FC<{ frame: number; h: number }> = ({ frame, h }) => {
  const puffs = useMemo(
    () =>
      new Array(16).fill(0).map((_, i) => ({
        x: WIDTH * (0.2 + random(`px${i}`) * 0.45),
        born: -30 + random(`pb${i}`) * 70,
        drift: (random(`pd${i}`) - 0.5) * 1.2,
        size: 120 + random(`ps${i}`) * 160,
      })),
    [],
  );
  return (
    <AbsoluteFill>
      {puffs.map((p, i) => {
        const t = frame - p.born;
        if (t < 0) return null;
        const o = interpolate(t, [0, 12, 60], [0, 0.4, 0], clamp);
        const size = p.size * (1 + t / 40);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: p.x + p.drift * t - size / 2,
              top: h * 0.85 - t * 5 - size / 2,
              width: size,
              height: size,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(235,240,245,0.85), rgba(235,240,245,0) 65%)",
              opacity: o,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

const LightSpill: React.FC<{ frame: number }> = ({ frame }) => {
  const w = interpolate(frame, [8, 50], [2, 24], clamp);
  return (
    <AbsoluteFill
      style={{
        background: "linear-gradient(100deg, rgba(190,215,240,0) 0%, rgba(190,215,240,0.4) 50%, rgba(190,215,240,0) 100%)",
        clipPath: `polygon(${34 - w / 2}% 0%, ${34 + w / 2}% 0%, ${50 + w}% 100%, ${18 - w}% 100%)`,
        mixBlendMode: "screen",
        opacity: 0.55,
      }}
    />
  );
};

const RedVignette: React.FC<{ frame: number }> = ({ frame }) => {
  const hit = interpolate(frame, [0, 2, 12], [1, 1, 0.35], clamp);
  const pulse = 0.25 * (0.5 + 0.5 * Math.sin(frame / 4));
  return (
    <AbsoluteFill
      style={{
        background: "radial-gradient(ellipse at center, transparent 35%, rgba(230,57,70,0.85) 100%)",
        opacity: Math.max(hit, pulse),
      }}
    />
  );
};
