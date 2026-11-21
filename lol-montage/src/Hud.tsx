import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Swords, Zap, Shield, Flame, Skull, Coins } from "lucide-react";
import { FONTS, SKILL_COLORS, SkillKey, THEME } from "./theme";

const ICONS: Record<SkillKey, React.ReactNode> = {
  Q: <Swords size={46} />,
  W: <Zap size={46} />,
  E: <Shield size={46} />,
  R: <Flame size={50} />,
};
const COOLDOWN: Record<SkillKey, number> = { Q: 40, W: 55, E: 45, R: 95 };

export type Casts = Partial<Record<SkillKey, number>>;

const clampOpts = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const GoldFrame: React.FC<{ children: React.ReactNode; style?: React.CSSProperties }> = ({ children, style }) => (
  <div
    style={{
      border: `3px solid ${THEME.accent}`,
      boxShadow: `0 0 0 2px #0a0e24, 0 0 30px rgba(99,102,241,0.6), inset 0 0 20px rgba(0,0,0,0.6)`,
      background: "linear-gradient(180deg, rgba(16,22,60,0.92), rgba(6,8,30,0.95))",
      ...style,
    }}
  >
    {children}
  </div>
);

export const SkillBar: React.FC<{ casts: Casts }> = ({ casts }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const keys: SkillKey[] = ["Q", "W", "E", "R"];
  const enter = spring({ frame, fps, config: { damping: 18, stiffness: 160, mass: 0.8 } });
  return (
    <div
      style={{
        position: "absolute",
        left: "50%",
        bottom: 36,
        display: "flex",
        gap: 22,
        translate: `-50% ${(1 - enter) * 160}px`,
      }}
    >
      {keys.map((k) => {
        const color = SKILL_COLORS[k];
        const castAt = casts[k];
        const t = castAt === undefined ? -1 : frame - castAt;
        const cd = COOLDOWN[k];
        const onCd = t >= 0 && t < cd;
        const pct = onCd ? (1 - t / cd) * 100 : 0;
        const pressed = t >= 0 && t < 6 ? 1 - Math.sin((t / 6) * Math.PI) * 0.14 : 1;
        const flash = t >= 0 ? interpolate(t, [0, 4, 14], [0, 1, 0], clampOpts) : 0;
        const readyGlow = !onCd ? 0.5 + 0.5 * Math.sin(frame / 7) : 0;
        const readyPop = castAt !== undefined && t === cd ? 1 : 0;
        return (
          <div key={k} style={{ width: 112, textAlign: "center", scale: String(pressed) }}>
            <GoldFrame
              style={{
                width: 112,
                height: 112,
                position: "relative",
                display: "grid",
                placeItems: "center",
                color,
                boxShadow: `0 0 ${20 + flash * 70 + readyGlow * 16}px ${flash * 14 + readyGlow * 3}px ${color}, inset 0 0 22px rgba(0,0,0,0.7)`,
                borderColor: onCd ? "#5b6490" : THEME.accent,
              }}
            >
              <div style={{ opacity: onCd ? 0.45 : 1, filter: `drop-shadow(0 0 10px ${color})` }}>{ICONS[k]}</div>
              {onCd && (
                <>
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: `conic-gradient(from 0deg, rgba(5,6,24,0.82) ${pct}%, transparent ${pct}%)`,
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "grid",
                      placeItems: "center",
                      fontFamily: FONTS.tech,
                      fontWeight: 900,
                      fontSize: 38,
                      color: "#fff",
                      textShadow: `0 0 12px ${color}`,
                    }}
                  >
                    {((cd - t) / 30).toFixed(1)}
                  </div>
                </>
              )}
              {readyPop === 1 && <div style={{ position: "absolute", inset: -8, background: color, opacity: 0.6 }} />}
            </GoldFrame>
            <div
              style={{
                marginTop: 8,
                fontFamily: FONTS.display,
                fontWeight: 900,
                fontSize: 34,
                color: THEME.accent,
                letterSpacing: 2,
              }}
            >
              {k}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export const StatBars: React.FC<{ hitAt?: number[] }> = ({ hitAt = [] }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 4, fps, config: { damping: 200 } });
  // HP dips on hits, mana drains on casts
  let hp = 1;
  for (const h of hitAt) hp -= interpolate(frame, [h, h + 6], [0, 0.12], clampOpts);
  hp = Math.max(0.35, hp + 0.0008 * frame);
  const mana = 0.85 - (frame / 170) * 0.35 + Math.sin(frame / 12) * 0.02;
  const Bar = ({ v, a, b, label, val }: { v: number; a: string; b: string; label: string; val: string }) => (
    <GoldFrame style={{ width: 560, height: 38, position: "relative", overflow: "hidden" }}>
      <div
        style={{
          width: `${v * 100 * enter}%`,
          height: "100%",
          background: `linear-gradient(90deg, ${a}, ${b})`,
          boxShadow: `0 0 18px ${b}`,
        }}
      />
      <div
        style={{
          position: "absolute",
          inset: 0,
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          padding: "0 14px",
          fontFamily: FONTS.ui,
          fontWeight: 700,
          fontSize: 26,
          color: "#fff",
          textShadow: "0 2px 4px #000",
          letterSpacing: 1,
        }}
      >
        <span>{label}</span>
        <span>{val}</span>
      </div>
    </GoldFrame>
  );
  return (
    <div style={{ position: "absolute", left: 40, bottom: 44, display: "flex", flexDirection: "column", gap: 10, opacity: enter }}>
      <Bar v={hp} a="#0ea5e9" b="#67e8f9" label="HP" val={`${Math.round(hp * 2480)} / 2480`} />
      <Bar v={mana} a="#7c3aed" b="#c084fc" label="MANA" val={`${Math.round(mana * 1650)} / 1650`} />
    </div>
  );
};

export const Portrait: React.FC<{ name: string; level: number }> = ({ name, level }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame, fps, config: { damping: 14, stiffness: 160 } });
  return (
    <div style={{ position: "absolute", left: 40, top: 36, display: "flex", alignItems: "center", gap: 18, scale: String(enter), transformOrigin: "left top" }}>
      <div style={{ position: "relative", width: 116, height: 116 }}>
        <div
          style={{
            width: 116,
            height: 116,
            borderRadius: "50%",
            border: `5px solid ${THEME.accent}`,
            background: `conic-gradient(from ${frame * 3}deg, ${THEME.primary}, ${THEME.secondary}, ${THEME.glow}, ${THEME.primary})`,
            boxShadow: `0 0 36px ${THEME.glow}`,
            display: "grid",
            placeItems: "center",
          }}
        >
          <div style={{ width: 84, height: 84, borderRadius: "50%", background: "#070a24", display: "grid", placeItems: "center" }}>
            <Skull size={46} color={THEME.text} />
          </div>
        </div>
        <div
          style={{
            position: "absolute",
            right: -6,
            bottom: -6,
            width: 46,
            height: 46,
            borderRadius: "50%",
            background: "#070a24",
            border: `3px solid ${THEME.accent}`,
            fontFamily: FONTS.tech,
            fontWeight: 900,
            fontSize: 22,
            color: THEME.accent,
            display: "grid",
            placeItems: "center",
          }}
        >
          {level}
        </div>
      </div>
      <div>
        <div style={{ fontFamily: FONTS.display, fontWeight: 900, fontSize: 40, color: THEME.text, textShadow: `0 0 18px ${THEME.glow}`, letterSpacing: 3 }}>
          {name}
        </div>
        <div style={{ fontFamily: FONTS.ui, fontWeight: 700, fontSize: 26, color: THEME.muted, letterSpacing: 4 }}>
          THE SUMMONER
        </div>
      </div>
    </div>
  );
};

const pad = (n: number) => String(n).padStart(2, "0");

export const Scoreboard: React.FC<{
  kills: number;
  killAt?: number;
  gameStartSec: number;
  gold: number;
  goldTo: number;
}> = ({ kills, killAt, gameStartSec, gold, goldTo }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 2, fps, config: { damping: 18, stiffness: 180 } });
  const sec = gameStartSec + Math.floor(frame / fps);
  const k = killAt !== undefined && frame >= killAt ? kills : kills - 1;
  const g = Math.round(interpolate(frame, [0, 150], [gold, goldTo], clampOpts));
  const pop = killAt !== undefined ? interpolate(frame - killAt, [0, 4, 14], [1, 1.35, 1], clampOpts) : 1;
  return (
    <div style={{ position: "absolute", right: 40, top: 36, translate: `${(1 - enter) * 300}px 0`, display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 10 }}>
      <GoldFrame style={{ padding: "10px 26px", display: "flex", gap: 28, alignItems: "center" }}>
        <span style={{ fontFamily: FONTS.tech, fontWeight: 900, fontSize: 40, color: THEME.primary, scale: String(pop), textShadow: `0 0 16px ${THEME.primary}` }}>
          {k}
        </span>
        <span style={{ fontFamily: FONTS.ui, fontWeight: 700, fontSize: 28, color: THEME.muted }}>/ 0 / 7</span>
        <span style={{ fontFamily: FONTS.tech, fontWeight: 700, fontSize: 34, color: THEME.text }}>
          {pad(Math.floor(sec / 60))}:{pad(sec % 60)}
        </span>
      </GoldFrame>
      <GoldFrame style={{ padding: "8px 22px", display: "flex", gap: 12, alignItems: "center" }}>
        <Coins size={30} color={THEME.accent} />
        <span style={{ fontFamily: FONTS.tech, fontWeight: 700, fontSize: 30, color: THEME.accent }}>{g.toLocaleString()}</span>
      </GoldFrame>
    </div>
  );
};

export const KillFeed: React.FC<{ entries: { at: number; text: string }[] }> = ({ entries }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  return (
    <div style={{ position: "absolute", right: 40, top: 220, display: "flex", flexDirection: "column", gap: 10, alignItems: "flex-end" }}>
      {entries.map((e, i) => {
        const p = spring({ frame: frame - e.at, fps, config: { damping: 16, stiffness: 200 } });
        const out = interpolate(frame, [e.at + 70, e.at + 84], [1, 0], clampOpts);
        if (frame < e.at) return null;
        return (
          <div
            key={i}
            style={{
              translate: `${(1 - p) * 400}px 0`,
              opacity: out,
              fontFamily: FONTS.ui,
              fontWeight: 700,
              fontSize: 30,
              color: THEME.text,
              padding: "6px 20px",
              background: "linear-gradient(90deg, transparent, rgba(99,102,241,0.55))",
              borderRight: `5px solid ${THEME.secondary}`,
              letterSpacing: 1,
            }}
          >
            {e.text}
          </div>
        );
      })}
    </div>
  );
};

export const Minimap: React.FC<{ seed?: number }> = ({ seed = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const enter = spring({ frame: frame - 6, fps, config: { damping: 200 } });
  const dots = [0, 1, 2, 3].map((i) => ({
    x: 120 + Math.sin(frame / (22 + i * 5) + i + seed) * 80,
    y: 120 + Math.cos(frame / (26 + i * 4) + i * 2 + seed) * 80,
    c: i < 2 ? THEME.primary : THEME.secondary,
  }));
  return (
    <GoldFrame style={{ position: "absolute", right: 40, bottom: 44, width: 240, height: 240, opacity: enter, overflow: "hidden" }}>
      <svg width={240} height={240}>
        <path d="M0 240 L240 0" stroke="#3b4a8a" strokeWidth={26} opacity={0.5} />
        <path d="M0 0 L240 240" stroke="#3b4a8a" strokeWidth={8} opacity={0.35} />
        <circle cx={120} cy={120} r={26} fill="none" stroke={THEME.secondary} strokeWidth={3} opacity={0.7} />
        {dots.map((d, i) => (
          <circle key={i} cx={d.x} cy={d.y} r={9} fill={d.c} stroke="#fff" strokeWidth={2} />
        ))}
        <rect
          x={70 + Math.sin(frame / 30) * 20}
          y={80}
          width={110}
          height={72}
          fill="none"
          stroke="#fff"
          strokeWidth={2}
          opacity={0.8}
        />
      </svg>
    </GoldFrame>
  );
};

/** "FIRST BLOOD" / "PENTAKILL" style banner */
export const Banner: React.FC<{ at: number; text: string; sub: string; color?: string }> = ({
  at,
  text,
  sub,
  color = THEME.primary,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame - at;
  if (t < 0 || t > 80) return null;
  const slam = spring({ frame: t, fps, config: { damping: 9, stiffness: 220, mass: 0.9 } });
  const s = interpolate(slam, [0, 1], [3.2, 1]);
  const out = interpolate(t, [62, 80], [1, 0], clampOpts);
  const split = interpolate(t, [0, 16], [26, 0], clampOpts);
  const lineW = interpolate(t, [4, 24], [0, 1100], { ...clampOpts });
  const common: React.CSSProperties = {
    position: "absolute",
    fontFamily: FONTS.display,
    fontWeight: 900,
    fontSize: 150,
    letterSpacing: 8,
    whiteSpace: "nowrap",
  };
  return (
    <AbsoluteFill style={{ display: "grid", placeItems: "center", opacity: out, pointerEvents: "none" }}>
      <div style={{ position: "relative", scale: String(s), height: 190, width: 1500, display: "grid", placeItems: "center" }}>
        <div style={{ ...common, color: "#ff2bd6", translate: `${-split}px 0`, mixBlendMode: "screen", opacity: 0.9 }}>{text}</div>
        <div style={{ ...common, color: "#00e5ff", translate: `${split}px 0`, mixBlendMode: "screen", opacity: 0.9 }}>{text}</div>
        <div
          style={{
            ...common,
            background: `linear-gradient(180deg, #ffffff 0%, ${color} 45%, ${THEME.secondary} 100%)`,
            WebkitBackgroundClip: "text",
            backgroundClip: "text",
            color: "transparent",
            filter: `drop-shadow(0 6px 0 #1a1050) drop-shadow(0 0 30px ${color})`,
          }}
        >
          {text}
        </div>
      </div>
      <div style={{ position: "absolute", top: "50%", marginTop: 110, display: "flex", flexDirection: "column", alignItems: "center", gap: 18 }}>
        <div style={{ width: lineW, height: 5, background: `linear-gradient(90deg, transparent, ${THEME.accent}, transparent)` }} />
        <div style={{ fontFamily: FONTS.tech, fontWeight: 700, fontSize: 36, color: THEME.text, letterSpacing: 12, textShadow: `0 0 20px ${color}` }}>
          {sub}
        </div>
      </div>
    </AbsoluteFill>
  );
};
