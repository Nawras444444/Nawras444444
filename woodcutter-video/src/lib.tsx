import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, Sequence, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { cairo, C, sceneLead } from "./theme";

const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
export const ease = Easing.bezier(0.16, 1, 0.3, 1);

/** Full-bleed storyboard picture with slow Ken Burns push and optional shake. */
export const FullImage: React.FC<{
  src: string;
  from?: number;
  to?: number;
  origin?: string;
  shake?: number[]; // frames where a small impact shake happens
  shakeAmp?: number;
}> = ({ src, from = 1.0, to = 1.08, origin = "50% 50%", shake = [], shakeAmp = 10 }) => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  let dx = 0, dy = 0;
  for (const s of shake) {
    const t = frame - s;
    if (t >= 0 && t < 10) {
      const k = (1 - t / 10) * shakeAmp;
      dx += Math.sin(t * 2.7) * k;
      dy += Math.cos(t * 3.3) * k * 0.6;
    }
  }
  return (
    <AbsoluteFill style={{ overflow: "hidden", backgroundColor: C.navy }}>
      <Img
        src={staticFile(src)}
        style={{
          width: "100%",
          height: "100%",
          objectFit: "cover",
          transformOrigin: origin,
          scale: interpolate(frame, [0, durationInFrames], [from, to], clamp),
          translate: `${dx}px ${dy}px`,
        }}
      />
    </AbsoluteFill>
  );
};

/** Soft dark fade at the bottom so captions read on top of the picture. */
export const BottomShade: React.FC<{ strength?: number }> = ({ strength = 0.85 }) => (
  <AbsoluteFill
    style={{
      background: `linear-gradient(to bottom, rgba(15,23,42,0) 58%, rgba(15,23,42,${strength * 0.75}) 74%, rgba(15,23,42,${strength}) 100%)`,
    }}
  />
);

export type Part = { t: string; color?: string; font?: string; size?: number; br?: boolean };

/** On-screen caption: slide up 20px + fade in over 0.25s, fade out at scene end. */
export const Caption: React.FC<{
  parts: Part[];
  at: number; // frame to appear
  bottom?: number;
  size?: number;
  font?: string;
}> = ({ parts, at, bottom = 360, size = 78, font = cairo }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const inP = interpolate(frame, [at, at + 0.25 * fps], [0, 1], { ...clamp, easing: ease });
  const outP = interpolate(frame, [durationInFrames - 10, durationInFrames - 2], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ justifyContent: "flex-end", alignItems: "center" }}>
      <div
        dir="rtl"
        style={{
          marginBottom: bottom,
          padding: "0 70px",
          textAlign: "center",
          fontFamily: font,
          fontWeight: 900,
          fontSize: size,
          lineHeight: 1.45,
          color: C.white,
          textShadow: "0 4px 18px rgba(0,0,0,0.75), 0 2px 4px rgba(0,0,0,0.6)",
          opacity: inP * outP,
          translate: `0px ${(1 - inP) * 20}px`,
        }}
      >
        {parts.map((p, i) => (
          <React.Fragment key={i}>
            {p.br ? <br /> : null}
            <span style={{ whiteSpace: "nowrap", color: p.color ?? C.white, fontFamily: p.font ?? font, fontSize: p.size ?? size }}>{p.t}</span>
          </React.Fragment>
        ))}
      </div>
    </AbsoluteFill>
  );
};

/** One 3D asset (cut-out PNG) with a springy pop-in, gentle float and fade-out. */
export const Icon: React.FC<{
  name: string;
  x: number; // % of width (center)
  y: number; // % of height (center)
  w: number; // px width
  at: number; // frame to appear
  rotate?: number;
  float?: boolean;
  pulse?: boolean;
  shakeAt?: number[];
  children?: React.ReactNode;
}> = ({ name, x, y, w, at, rotate = 0, float = true, pulse = false, shakeAt = [] }) => {
  const frame = useCurrentFrame();
  const { durationInFrames, fps } = useVideoConfig();
  const t = frame - at;
  const pop = interpolate(t, [0, 0.45 * fps], [0, 1], { ...clamp, easing: Easing.bezier(0.34, 1.56, 0.64, 1) });
  const out = interpolate(frame, [durationInFrames - 10, durationInFrames - 2], [1, 0], clamp);
  const bob = float ? Math.sin((frame / fps) * 2.2) * 8 : 0;
  const pul = pulse ? 1 + 0.06 * Math.max(0, Math.sin((frame / fps) * Math.PI * 2)) : 1;
  let sh = 0;
  for (const s of shakeAt) {
    const k = frame - s;
    if (k >= 0 && k < 14) sh += Math.sin(k * 2.4) * (1 - k / 14) * 12;
  }
  return (
    <Img
      src={staticFile(`icons/${name}.png`)}
      style={{
        position: "absolute",
        left: `${x}%`,
        top: `${y}%`,
        width: w,
        marginLeft: -w / 2,
        translate: `${sh}px calc(-50% + ${bob + (1 - pop) * 40}px)`,
        scale: String(Math.max(0, pop) * pul),
        rotate: `${rotate + sh * 0.6}deg`,
        opacity: Math.min(1, pop * 1.5) * out,
        filter: "drop-shadow(0 18px 22px rgba(0,0,0,0.45))",
      }}
    />
  );
};

/** Narration line for scene i, starting after its lead-in. */
export const Voice: React.FC<{ i: number }> = ({ i }) => (
  <Sequence from={sceneLead(i)} layout="none" name={`Voice ${i + 1}`}>
    <Audio src={staticFile(`vo/vo${i + 1}.wav`)} volume={0.7} />
  </Sequence>
);

export const sec = (s: number, i: number) => Math.round(s * 30) + sceneLead(i);
