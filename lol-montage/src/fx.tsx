import React from "react";
import { AbsoluteFill, interpolate, random, useCurrentFrame, useVideoConfig } from "remotion";
import { THEME } from "./theme";

/** Deterministic camera shake, decays after `at` */
export const useShake = (hits: number[], amp = 14, len = 14) => {
  const frame = useCurrentFrame();
  let x = 0;
  let y = 0;
  let r = 0;
  for (const at of hits) {
    const t = frame - at;
    if (t >= 0 && t < len) {
      const k = 1 - t / len;
      x += Math.sin(t * 5.3 + at) * amp * k * k;
      y += Math.cos(t * 6.7 + at * 2) * amp * k * k;
      r += Math.sin(t * 4.1 + at) * 0.4 * k;
    }
  }
  return { x, y, r };
};

/** Rising ember / magic particles in blue-purple */
export const Particles: React.FC<{ count?: number; seed?: string; opacity?: number }> = ({
  count = 60,
  seed = "p",
  opacity = 0.9,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", overflow: "hidden", opacity }}>
      {Array.from({ length: count }).map((_, i) => {
        const x0 = random(`${seed}x${i}`) * width;
        const speed = 0.6 + random(`${seed}s${i}`) * 2.2;
        const size = 3 + random(`${seed}z${i}`) * 9;
        const phase = random(`${seed}ph${i}`) * height;
        const y = (((height + 80) - ((frame * speed * 2.2 + phase) % (height + 80))) + height) % (height + 80) - 40;
        const sway = Math.sin(frame / 18 + i) * 30;
        const hue = i % 2 === 0 ? THEME.primary : THEME.secondary;
        const tw = 0.4 + 0.6 * Math.abs(Math.sin(frame / 9 + i));
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x0 + sway,
              top: y,
              width: size,
              height: size,
              borderRadius: "50%",
              background: hue,
              boxShadow: `0 0 ${size * 3}px ${size}px ${hue}`,
              opacity: tw,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};

/** Hextech hexagon grid, pulsing */
export const HexGrid: React.FC<{ opacity?: number; color?: string; size?: number }> = ({
  opacity = 0.25,
  color = THEME.primary,
  size = 70,
}) => {
  const frame = useCurrentFrame();
  const { width, height } = useVideoConfig();
  const hexW = size * 1.732;
  const rows = Math.ceil(height / (size * 1.5)) + 2;
  const cols = Math.ceil(width / hexW) + 2;
  const pts = Array.from({ length: 6 }, (_, k) => {
    const a = (Math.PI / 3) * k + Math.PI / 6;
    return `${Math.cos(a) * size * 0.95},${Math.sin(a) * size * 0.95}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ position: "absolute", inset: 0, opacity }}>
      {Array.from({ length: rows }).map((_, r) =>
        Array.from({ length: cols }).map((__, c) => {
          const cx = c * hexW + (r % 2 ? hexW / 2 : 0);
          const cy = r * size * 1.5;
          const wave = Math.sin((cx + cy) / 220 - frame / 14) * 0.5 + 0.5;
          return (
            <polygon
              key={`${r}-${c}`}
              points={pts}
              transform={`translate(${cx} ${cy})`}
              fill="none"
              stroke={color}
              strokeWidth={2}
              opacity={0.12 + wave * 0.7}
            />
          );
        }),
      )}
    </svg>
  );
};

export const Vignette: React.FC<{ strength?: number }> = ({ strength = 0.75 }) => (
  <AbsoluteFill
    style={{
      pointerEvents: "none",
      background: `radial-gradient(ellipse at center, rgba(0,0,0,0) 45%, rgba(4,6,26,${strength}) 100%)`,
    }}
  />
);

export const Scanlines: React.FC<{ opacity?: number }> = ({ opacity = 0.12 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill
      style={{
        pointerEvents: "none",
        opacity,
        backgroundImage:
          "repeating-linear-gradient(0deg, rgba(255,255,255,0.9) 0px, rgba(255,255,255,0.9) 1px, transparent 1px, transparent 4px)",
        backgroundPositionY: (frame * 2) % 4,
        mixBlendMode: "overlay",
      }}
    />
  );
};

/** Film grain (deterministic: seed = frame) */
export const Grain: React.FC<{ opacity?: number }> = ({ opacity = 0.12 }) => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill style={{ pointerEvents: "none", opacity, mixBlendMode: "overlay" }}>
      <svg width="100%" height="100%" viewBox="0 0 480 270" preserveAspectRatio="none">
        <filter id="grainf">
          <feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2" seed={frame % 24} />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="480" height="270" filter="url(#grainf)" />
      </svg>
    </AbsoluteFill>
  );
};

/** Blue/purple colour grade over footage */
export const Grade: React.FC<{ tint?: number }> = ({ tint = 1 }) => (
  <>
    <AbsoluteFill
      style={{
        background: "linear-gradient(135deg, #1d4ed8 0%, #6d28d9 55%, #a21caf 100%)",
        mixBlendMode: "soft-light",
        opacity: 0.85 * tint,
      }}
    />
    <AbsoluteFill
      style={{
        background: "linear-gradient(180deg, rgba(56,189,248,0.35) 0%, rgba(99,60,200,0.45) 100%)",
        mixBlendMode: "color",
        opacity: 0.55 * tint,
      }}
    />
  </>
);

/** Full-screen flash, 0..1 envelope around `at` */
export const Flash: React.FC<{ at: number; len?: number; color?: string }> = ({
  at,
  len = 10,
  color = "#cfe9ff",
}) => {
  const frame = useCurrentFrame();
  const o = interpolate(frame, [at, at + 2, at + len], [0, 0.9, 0], {
    extrapolateLeft: "clamp",
    extrapolateRight: "clamp",
  });
  return <AbsoluteFill style={{ background: color, opacity: o, pointerEvents: "none" }} />;
};

/** Expanding ring + rays for a spell cast */
export const SpellBurst: React.FC<{
  at: number;
  x: number;
  y: number;
  color: string;
  big?: boolean;
}> = ({ at, x, y, color, big }) => {
  const frame = useCurrentFrame();
  const t = frame - at;
  if (t < 0 || t > 28) return null;
  const e = interpolate(t, [0, 28], [0, 1], { extrapolateRight: "clamp" });
  const ease = 1 - Math.pow(1 - e, 3);
  const R = (big ? 640 : 380) * ease;
  const op = 1 - e;
  const rays = big ? 18 : 12;
  return (
    <AbsoluteFill style={{ pointerEvents: "none", mixBlendMode: "screen" }}>
      <div
        style={{
          position: "absolute",
          left: x - R,
          top: y - R,
          width: R * 2,
          height: R * 2,
          borderRadius: "50%",
          border: `${12 * (1 - e) + 2}px solid ${color}`,
          boxShadow: `0 0 80px 20px ${color}, inset 0 0 80px 10px ${color}`,
          opacity: op,
        }}
      />
      <div
        style={{
          position: "absolute",
          left: x - 160 * (1 - e),
          top: y - 160 * (1 - e),
          width: 320 * (1 - e),
          height: 320 * (1 - e),
          borderRadius: "50%",
          background: `radial-gradient(circle, #fff 0%, ${color} 45%, transparent 70%)`,
          opacity: op * 1.2,
        }}
      />
      {Array.from({ length: rays }).map((_, i) => {
        const a = (i / rays) * 360 + t * 3;
        const len = (big ? 520 : 300) * ease * (0.6 + random(`ray${at}${i}`) * 0.6);
        return (
          <div
            key={i}
            style={{
              position: "absolute",
              left: x,
              top: y - 3,
              width: len,
              height: 6,
              transformOrigin: "0 50%",
              transform: `rotate(${a}deg) translateX(${40 * ease}px)`,
              background: `linear-gradient(90deg, ${color}, transparent)`,
              opacity: op,
              borderRadius: 3,
            }}
          />
        );
      })}
    </AbsoluteFill>
  );
};
