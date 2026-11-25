import React from "react";
import { Easing, interpolate, useCurrentFrame, useVideoConfig } from "remotion";
import { cairo, C } from "./theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const ease = Easing.bezier(0.16, 1, 0.3, 1);
const TEXT = "#F8FAFC";
const MUTED = "rgba(226,232,240,0.72)";

/**
 * Glassmorphism data card with real CSS 3D: it swings in on the Y axis,
 * then idles with a slow tilt so the layers (translateZ) show parallax.
 */
export const GlassCard: React.FC<{
  at: number;
  left: number; // px
  top: number; // px
  width: number;
  height: number;
  children: React.ReactNode;
}> = ({ at, left, top, width, height, children }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const p = interpolate(frame, [at, at + 0.6 * fps], [0, 1], { ...clamp, easing: ease });
  const out = interpolate(frame, [durationInFrames - 10, durationInFrames - 2], [1, 0], clamp);
  const idle = (frame - at) / fps;
  return (
    <div style={{ position: "absolute", left, top, width, height, perspective: 1100, opacity: Math.min(1, p * 1.6) * out }}>
      <div
        style={{
          position: "absolute",
          inset: 0,
          transformStyle: "preserve-3d",
          transform: `rotateY(${(1 - p) * 70 + Math.sin(idle * 1.3) * 6}deg) rotateX(${8 + Math.cos(idle * 1.1) * 3}deg) scale(${0.85 + 0.15 * p})`,
          borderRadius: 34,
          background: "linear-gradient(145deg, rgba(255,255,255,0.16), rgba(255,255,255,0.05))",
          border: "1.5px solid rgba(255,255,255,0.22)",
          boxShadow: "0 30px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.25)",
          backdropFilter: "blur(14px)",
          WebkitBackdropFilter: "blur(14px)",
          fontFamily: cairo,
          color: TEXT,
          direction: "rtl",
        }}
      >
        <div style={{ position: "absolute", inset: 0, transform: "translateZ(40px)", transformStyle: "preserve-3d" }}>{children}</div>
      </div>
    </div>
  );
};

const count = (frame: number, a: number, b: number, from: number, to: number) =>
  Math.round(interpolate(frame, [a, b], [from, to], { ...clamp, easing: ease }));

/** 2A — working hours climbing (effort up). */
export const HoursCard: React.FC<{ at: number; grow: number }> = ({ at, grow }) => {
  const frame = useCurrentFrame();
  const h = count(frame, grow, grow + 40, 8, 12);
  return (
    <GlassCard at={at} left={390} top={70} width={300} height={190}>
      <div style={{ position: "absolute", top: 20, width: "100%", textAlign: "center", fontSize: 30, fontWeight: 700, color: MUTED }}>ساعات العمل</div>
      <div style={{ position: "absolute", top: 58, width: "100%", textAlign: "center", fontSize: 84, fontWeight: 900, lineHeight: 1 }}>
        <span style={{ fontSize: 40, color: C.coral, marginLeft: 8 }}>▲</span>
        {h}
      </div>
    </GlassCard>
  );
};

/** 2B — efficiency meter falling from 100% into the red. */
export const GaugeCard: React.FC<{ at: number; drop: number }> = ({ at, drop }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const v = interpolate(frame, [drop, drop + 1.6 * fps], [1, 0.4], { ...clamp, easing: Easing.bezier(0.45, 0, 0.2, 1) });
  const R = 110;
  const cx = 190, cy = 200;
  const arc = (t: number) => {
    const a = Math.PI * (1 - t);
    return [cx + R * Math.cos(a), cy - R * Math.sin(a)];
  };
  const [ex, ey] = arc(v);
  const needleA = Math.PI * (1 - v);
  const color = v > 0.66 ? C.emerald : v > 0.5 ? C.gold : C.coral;
  return (
    <GlassCard at={at} left={44} top={60} width={380} height={310}>
      <div style={{ position: "absolute", top: 16, width: "100%", textAlign: "center", fontSize: 30, fontWeight: 700, color: MUTED }}>الكفاءة</div>
      <svg width={380} height={310} style={{ position: "absolute", inset: 0 }}>
        <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${cx + R} ${cy}`} stroke="rgba(255,255,255,0.16)" strokeWidth={26} fill="none" strokeLinecap="round" />
        <path d={`M ${cx - R} ${cy} A ${R} ${R} 0 0 1 ${ex} ${ey}`} stroke={color} strokeWidth={26} fill="none" strokeLinecap="round" />
        <line x1={cx} y1={cy} x2={cx + (R - 34) * Math.cos(needleA)} y2={cy - (R - 34) * Math.sin(needleA)} stroke={TEXT} strokeWidth={8} strokeLinecap="round" />
        <circle cx={cx} cy={cy} r={14} fill={TEXT} />
      </svg>
      <div style={{ position: "absolute", top: 218, width: "100%", textAlign: "center", fontSize: 62, fontWeight: 900, direction: "ltr" }}>{Math.round(v * 100)}%</div>
    </GlassCard>
  );
};

/** A 3D column: front, top and side faces. */
const Bar3D: React.FC<{ h: number; w: number; color: string; x: number; base: number }> = ({ h, w, color, x, base }) => {
  const d = 26;
  return (
    <div style={{ position: "absolute", left: x, top: base - h, width: w, height: h, transformStyle: "preserve-3d" }}>
      <div style={{ position: "absolute", inset: 0, background: `linear-gradient(to top, ${color}cc, ${color})`, borderRadius: "6px 6px 0 0" }} />
      <div style={{ position: "absolute", left: 0, top: 0, width: w, height: d, background: color, filter: "brightness(1.35)", transformOrigin: "top", transform: "rotateX(90deg)" }} />
      <div style={{ position: "absolute", right: 0, top: 0, width: d, height: h, background: color, filter: "brightness(0.65)", transformOrigin: "right", transform: "rotateY(90deg)" }} />
    </div>
  );
};

/** 4B — trees per day before vs after sharpening (4 → 8, ×2). */
export const ResultsCard: React.FC<{ at: number; grow: number }> = ({ at, grow }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const unit = 22; // px per tree
  const before = 4, after = 8;
  const hb = interpolate(frame, [at + 8, at + 8 + 0.6 * fps], [0, before * unit], { ...clamp, easing: ease });
  const ha = interpolate(frame, [grow, grow + 0.9 * fps], [before * unit, after * unit], { ...clamp, easing: ease });
  const shownA = Math.round(ha / unit);
  const base = 330;
  return (
    <GlassCard at={at} left={590} top={60} width={440} height={420}>
      <div style={{ position: "absolute", top: 16, width: "100%", textAlign: "center", fontSize: 30, fontWeight: 700, color: MUTED, paddingLeft: 60 }}>أشجار في اليوم</div>
      <div style={{ position: "absolute", inset: 0, transformStyle: "preserve-3d" }}>
        {/* baseline */}
        <div style={{ position: "absolute", left: 50, top: base, width: 320, height: 2, background: "rgba(255,255,255,0.3)" }} />
        <Bar3D x={250} w={80} h={hb} color={C.coral} base={base} />
        <Bar3D x={90} w={80} h={ha} color={C.emerald} base={base} />
        <div style={{ position: "absolute", left: 250, width: 80, top: base - hb - 54, textAlign: "center", fontSize: 40, fontWeight: 900 }}>{Math.round(hb / unit)}</div>
        <div style={{ position: "absolute", left: 90, width: 80, top: base - ha - 54, textAlign: "center", fontSize: 40, fontWeight: 900 }}>{shownA}</div>
        <div style={{ position: "absolute", left: 210, width: 160, top: base + 12, textAlign: "center", whiteSpace: "nowrap", fontSize: 28, fontWeight: 700, color: MUTED }}>قبل</div>
        <div style={{ position: "absolute", left: 50, width: 160, top: base + 12, textAlign: "center", whiteSpace: "nowrap", fontSize: 28, fontWeight: 700, color: MUTED }}>بعد الشحذ</div>
      </div>
      <div
        style={{
          position: "absolute",
          top: 12,
          left: 26,
          fontSize: 40,
          fontWeight: 900,
          color: TEXT,
          direction: "ltr",
          opacity: interpolate(frame, [grow + 0.9 * fps, grow + 1.2 * fps], [0, 1], clamp),
        }}
      >
        <span style={{ color: C.emerald }}>▲</span> ×2
      </div>
    </GlassCard>
  );
};
