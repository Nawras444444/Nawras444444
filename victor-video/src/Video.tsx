import React from "react";
import { AbsoluteFill, Audio, Easing, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { loadFont } from "@remotion/fonts";
import * as THREE from "three";
import { World } from "./World";

const fontFamily = "Outfit";
loadFont({ family: fontFamily, url: staticFile("fonts/Outfit.woff2"), weight: "100 900" });

// on-screen text, timed with the narration
const CAPTIONS: { from: number; to: number; text: string }[] = [
  { from: 0.6, to: 4.6, text: "Tout commence par une lumière." },
  { from: 5.6, to: 9.7, text: "Une lumière qui cherche une forme." },
  { from: 15.6, to: 17.8, text: "Victor ouvre les yeux." },
  { from: 18.6, to: 24.6, text: "Un monde géométrique naît." },
  { from: 25.6, to: 31.6, text: "Il avance, curieux et calme." },
  { from: 32.7, to: 35.2, text: "Devant lui, un vide." },
  { from: 35.4, to: 39.6, text: "Autour de lui, des formes." },
  { from: 42.0, to: 47.6, text: "Il transforme le vide en passage." },
  { from: 49.4, to: 54.6, text: "Au cœur de la tour, une étincelle." },
  { from: 55.6, to: 58.0, text: "Et le monde redevient lumière." },
];

const clampOpts = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const Caption: React.FC<{ t: number; from: number; to: number; text: string }> = ({ t, from, to, text }) => {
  if (t < from - 0.1 || t > to + 0.1) return null;
  return (
    <div
      style={{
        position: "absolute",
        left: 0,
        right: 0,
        bottom: 110,
        textAlign: "center",
        fontFamily,
        fontWeight: 300,
        fontSize: 54,
        letterSpacing: "0.04em",
        color: "#f4f8ff",
        textShadow: "0 0 24px rgba(95,208,255,0.55), 0 2px 10px rgba(0,0,0,0.8)",
        opacity: interpolate(t, [from, from + 0.6, to - 0.5, to], [0, 1, 1, 0], clampOpts),
        translate: `0px ${interpolate(t, [from, from + 0.8], [18, 0], { ...clampOpts, easing: Easing.bezier(0.16, 1, 0.3, 1) })}px`,
        filter: `blur(${interpolate(t, [from, from + 0.6, to - 0.4, to], [10, 0, 0, 6], clampOpts)}px)`,
      }}
    >
      {text}
    </div>
  );
};

export const VictorVideo: React.FC = () => {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const t = frame / fps;
  return (
    <AbsoluteFill style={{ backgroundColor: "#000" }}>
      <ThreeCanvas
        width={width}
        height={height}
        camera={{ fov: 38, near: 0.03, far: 600, position: [0, 1, 5.5] }}
        gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.05 }}
      >
        <World t={t} />
      </ThreeCanvas>
      {/* vignette */}
      <AbsoluteFill style={{ background: "radial-gradient(ellipse at center, rgba(0,0,0,0) 55%, rgba(0,0,0,0.55) 100%)" }} />
      <AbsoluteFill style={{ background: "linear-gradient(to bottom, rgba(0,0,0,0) 68%, rgba(0,0,0,0.5) 100%)" }} />
      {CAPTIONS.map((c) => (
        <Caption key={c.from} t={t} {...c} />
      ))}
      {/* end title */}
      <AbsoluteFill
        style={{
          justifyContent: "flex-end",
          alignItems: "center",
          paddingBottom: 150,
          fontFamily,
          color: "#eaf6ff",
          opacity: interpolate(t, [58.1, 58.8], [0, 1], clampOpts),
        }}
      >
        <div style={{ fontWeight: 500, fontSize: 30, letterSpacing: "0.5em", marginBottom: 14, color: "#7fd4ff" }}>VICTOR</div>
        <div style={{ fontWeight: 200, fontSize: 46, letterSpacing: "0.08em" }}>et la petite lumière</div>
      </AbsoluteFill>
      <AbsoluteFill style={{ backgroundColor: "#000", opacity: interpolate(t, [59.4, 60], [0, 1], clampOpts) }} />
      <Audio src={staticFile("soundtrack.wav")} />
    </AbsoluteFill>
  );
};
