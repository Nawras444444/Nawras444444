import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { Video } from "@remotion/media";
import { staticFile } from "remotion";
import { Crystal3D } from "./Crystal3D";
import { Banner, Casts, KillFeed, Minimap, Portrait, Scoreboard, SkillBar, StatBars } from "./Hud";
import { Flash, Grade, Grain, HexGrid, Particles, Scanlines, SpellBurst, Vignette, useShake } from "./fx";
import { FONTS, SKILL_COLORS, THEME } from "./theme";

const clampOpts = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

/* ---------------- INTRO ---------------- */
export const Intro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const title = "RIFT OF MOMENTS";
  const load = Math.round(interpolate(frame, [4, 80], [0, 100], clampOpts));
  const sub = "A HEXTECH MONTAGE".slice(0, Math.max(0, Math.floor((frame - 50) / 1.6)));
  const shake = useShake([2, 62], 10);
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 45%, #1b1f6b 0%, ${THEME.bg} 70%)` }}>
      <AbsoluteFill style={{ translate: `${shake.x}px ${shake.y}px` }}>
        <HexGrid opacity={0.35} />
        <Particles count={70} seed="intro" />
        <Crystal3D width={width} height={height} scale={0.78} x={0} y={1.35} />
        <AbsoluteFill style={{ perspective: 1200, display: "grid", placeItems: "center", alignContent: "center" }}>
          <div style={{ display: "flex", gap: 6, marginTop: 420 }}>
            {title.split("").map((ch, i) => {
              const p = spring({ frame: frame - 14 - i * 2, fps, config: { damping: 11, stiffness: 170, mass: 0.9 } });
              return (
                <span
                  key={i}
                  style={{
                    display: "inline-block",
                    width: ch === " " ? 40 : undefined,
                    fontFamily: FONTS.display,
                    fontWeight: 900,
                    fontSize: 138,
                    letterSpacing: -1,
                    color: "transparent",
                    background: `linear-gradient(180deg, #ffffff, ${THEME.primary} 50%, ${THEME.secondary})`,
                    WebkitBackgroundClip: "text",
                    backgroundClip: "text",
                    opacity: p,
                    transform: `rotateX(${(1 - p) * -90}deg) translateZ(${(1 - p) * 200}px)`,
                    filter: `drop-shadow(0 8px 0 #160d4a) drop-shadow(0 0 28px ${THEME.glow})`,
                  }}
                >
                  {ch}
                </span>
              );
            })}
          </div>
          <div
            style={{
              fontFamily: FONTS.tech,
              fontWeight: 700,
              fontSize: 38,
              color: THEME.text,
              letterSpacing: 14,
              marginTop: 18,
              height: 50,
              textShadow: `0 0 20px ${THEME.primary}`,
            }}
          >
            {sub}
            <span style={{ opacity: Math.floor(frame / 8) % 2 }}>_</span>
          </div>
        </AbsoluteFill>
        {/* loading bar */}
        <div style={{ position: "absolute", left: 360, right: 360, bottom: 86 }}>
          <div style={{ display: "flex", justifyContent: "space-between", fontFamily: FONTS.ui, fontWeight: 700, fontSize: 30, color: THEME.muted, letterSpacing: 6, marginBottom: 10 }}>
            <span>{load < 100 ? "LOADING SUMMONER'S RIFT" : "READY"}</span>
            <span>{load}%</span>
          </div>
          <div style={{ height: 14, border: `2px solid ${THEME.accent}`, background: "#070a24", padding: 2 }}>
            <div style={{ width: `${load}%`, height: "100%", background: `linear-gradient(90deg, ${THEME.primary}, ${THEME.secondary})`, boxShadow: `0 0 18px ${THEME.secondary}` }} />
          </div>
        </div>
      </AbsoluteFill>
      <Flash at={0} len={12} />
      <Vignette />
      <Scanlines />
      <Grain />
    </AbsoluteFill>
  );
};

/* ---------------- GAMEPLAY CLIP SCENES ---------------- */
type ClipSceneProps = {
  src: string;
  trimBefore?: number;
  hero: string;
  level: number;
  casts: Casts;
  bursts: { at: number; x: number; y: number; key: keyof typeof SKILL_COLORS }[];
  banner: { at: number; text: string; sub: string; color?: string };
  kills: number;
  feed: { at: number; text: string }[];
  gameStartSec: number;
  gold: [number, number];
  zoomFrom: number;
  zoomTo: number;
  panX: number;
  seed: number;
};

export const ClipScene: React.FC<ClipSceneProps> = (p) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const hitFrames = [...p.bursts.map((b) => b.at), p.banner.at];
  const shake = useShake(hitFrames, 12, 12);
  const punch = interpolate(frame - p.banner.at, [0, 3, 16], [0, 0.07, 0], clampOpts);
  const zoom = interpolate(frame, [0, 160], [p.zoomFrom, p.zoomTo], clampOpts) + punch;
  const enter = spring({ frame, fps, config: { damping: 200 } });
  return (
    <AbsoluteFill style={{ background: THEME.bg, overflow: "hidden" }}>
      <AbsoluteFill
        style={{
          translate: `${shake.x + interpolate(frame, [0, 160], [0, p.panX], clampOpts)}px ${shake.y}px`,
          rotate: `${shake.r}deg`,
          scale: String(zoom),
        }}
      >
        {/* blurred fill layer so the portrait phone footage fills the 16:9 frame */}
        <AbsoluteFill style={{ scale: "1.25" }}>
          <Video
            src={staticFile(p.src)}
            trimBefore={p.trimBefore ?? 0}
            muted
            objectFit="cover"
            style={{ width: "100%", height: "100%", filter: "blur(38px) saturate(1.3) brightness(0.55)" }}
          />
        </AbsoluteFill>
        {/* framed hero panel with the sharp footage */}
        <AbsoluteFill style={{ display: "grid", placeItems: "center" }}>
          <div
            style={{
              width: 760,
              height: 1080,
              position: "relative",
              borderLeft: `4px solid ${THEME.accent}`,
              borderRight: `4px solid ${THEME.accent}`,
              boxShadow: `0 0 90px 10px ${THEME.glow}, 0 0 220px 40px rgba(168,85,247,0.35)`,
            }}
          >
            <Video
              src={staticFile(p.src)}
              trimBefore={p.trimBefore ?? 0}
              objectFit="cover"
              style={{ width: "100%", height: "100%", filter: "saturate(1.15) contrast(1.12) brightness(0.98)" }}
              volume={(f) => interpolate(f, [0, 12], [0, 0.5], clampOpts)}
            />
          </div>
        </AbsoluteFill>
        <Grade tint={enter} />
      </AbsoluteFill>
      <AbsoluteFill style={{ translate: `${shake.x * 0.4}px ${shake.y * 0.4}px` }}>
        {p.bursts.map((b, i) => (
          <SpellBurst key={i} at={b.at} x={b.x} y={b.y} color={SKILL_COLORS[b.key]} big={b.key === "R"} />
        ))}
        <Particles count={34} seed={`clip${p.seed}`} opacity={0.7} />
      </AbsoluteFill>
      <Vignette strength={0.85} />
      <Scanlines opacity={0.08} />
      <Grain opacity={0.14} />
      {p.bursts.map((b, i) => (
        <Flash key={i} at={b.at} len={b.key === "R" ? 14 : 7} color={SKILL_COLORS[b.key]} />
      ))}
      {/* HUD */}
      <Portrait name={p.hero} level={p.level} />
      <Scoreboard kills={p.kills} killAt={p.banner.at} gameStartSec={p.gameStartSec} gold={p.gold[0]} goldTo={p.gold[1]} />
      <KillFeed entries={p.feed} />
      <StatBars hitAt={[p.banner.at - 6, p.banner.at + 30]} />
      <SkillBar casts={p.casts} />
      <Minimap seed={p.seed} />
      <Banner {...p.banner} />
    </AbsoluteFill>
  );
};

/* ---------------- OUTRO ---------------- */
export const Outro: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const p = spring({ frame: frame - 6, fps, config: { damping: 10, stiffness: 150, mass: 1.1 } });
  const split = interpolate(frame, [6, 26], [30, 0], clampOpts);
  const stat = (to: number, a = 24, b = 70) => Math.round(interpolate(frame, [a, b], [0, to], clampOpts));
  const shake = useShake([6], 18, 16);
  const common: React.CSSProperties = {
    position: "absolute",
    fontFamily: FONTS.display,
    fontWeight: 900,
    fontSize: 230,
    letterSpacing: 14,
  };
  const stats: [string, string][] = [
    ["KDA", `${stat(5)} / 0 / ${stat(7)}`],
    ["GOLD", `${(stat(18200, 24, 80) / 1000).toFixed(1)}K`],
    ["CLIPS", `${stat(3, 24, 50)}`],
  ];
  return (
    <AbsoluteFill style={{ background: `radial-gradient(circle at 50% 50%, #2a1b7a 0%, ${THEME.bg} 72%)` }}>
      <AbsoluteFill style={{ translate: `${shake.x}px ${shake.y}px` }}>
        <HexGrid opacity={0.3} color={THEME.secondary} />
        <Particles count={80} seed="outro" />
        <Crystal3D width={width} height={height} scale={0.85} explodeAt={4} />
        <AbsoluteFill style={{ display: "grid", placeItems: "center" }}>
          <div style={{ position: "relative", width: 1600, height: 260, display: "grid", placeItems: "center", scale: String(0.4 + p * 0.6), opacity: Math.min(1, p * 1.5), marginTop: -80 }}>
            <div style={{ ...common, color: "#ff2bd6", translate: `${-split}px 0`, mixBlendMode: "screen" }}>VICTORY</div>
            <div style={{ ...common, color: "#00e5ff", translate: `${split}px 0`, mixBlendMode: "screen" }}>VICTORY</div>
            <div
              style={{
                ...common,
                color: "transparent",
                background: `linear-gradient(180deg, #fff 0%, ${THEME.primary} 45%, ${THEME.secondary} 100%)`,
                WebkitBackgroundClip: "text",
                backgroundClip: "text",
                filter: `drop-shadow(0 10px 0 #160d4a) drop-shadow(0 0 40px ${THEME.glow})`,
              }}
            >
              VICTORY
            </div>
          </div>
        </AbsoluteFill>
        <div style={{ position: "absolute", left: 0, right: 0, bottom: 130, display: "flex", justifyContent: "center", gap: 90 }}>
          {stats.map(([k, v], i) => {
            const s = spring({ frame: frame - 20 - i * 6, fps, config: { damping: 16, stiffness: 180 } });
            return (
              <div key={k} style={{ textAlign: "center", opacity: s, translate: `0 ${(1 - s) * 60}px` }}>
                <div style={{ fontFamily: FONTS.ui, fontWeight: 700, fontSize: 32, color: THEME.muted, letterSpacing: 8 }}>{k}</div>
                <div style={{ fontFamily: FONTS.tech, fontWeight: 900, fontSize: 64, color: THEME.text, textShadow: `0 0 24px ${THEME.primary}` }}>{v}</div>
              </div>
            );
          })}
        </div>
        <div
          style={{
            position: "absolute",
            bottom: 44,
            width: "100%",
            textAlign: "center",
            fontFamily: FONTS.tech,
            fontWeight: 700,
            fontSize: 30,
            letterSpacing: 14,
            color: THEME.accent,
            opacity: interpolate(frame, [60, 75], [0, 1], clampOpts) * (0.55 + 0.45 * Math.abs(Math.sin(frame / 10))),
          }}
        >
          PLAY AGAIN?
        </div>
      </AbsoluteFill>
      <Flash at={4} len={16} />
      <Vignette />
      <Scanlines />
      <Grain />
    </AbsoluteFill>
  );
};
