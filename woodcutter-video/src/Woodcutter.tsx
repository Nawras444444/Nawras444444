import React from "react";
import { AbsoluteFill, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Audio } from "@remotion/media";
import { TransitionSeries, linearTiming } from "@remotion/transitions";
import { fade } from "@remotion/transitions/fade";
import { slide } from "@remotion/transitions/slide";
import { FPS, TRANSITION, VO, sceneFrames, sceneLead } from "./theme";
import { S1A } from "./scenes/S1A";
import { S1B } from "./scenes/S1B";
import { S2A } from "./scenes/S2A";
import { S2B } from "./scenes/S2B";
import { S3A } from "./scenes/S3A";
import { S3B } from "./scenes/S3B";
import { S4A } from "./scenes/S4A";
import { S4B } from "./scenes/S4B";

const scenes = [
  { name: "1A Strong start", C: S1A },
  { name: "1B Numbers drop", C: S1B },
  { name: "2A Double effort", C: S2A },
  { name: "2B Less result", C: S2B },
  { name: "3A Wise question", C: S3A },
  { name: "3B Too busy", C: S3B },
  { name: "4A Sharpening", C: S4A },
  { name: "4B Results", C: S4B },
];
const presentations = [fade(), fade(), slide({ direction: "from-left" }), fade(), fade(), fade(), fade()];

// Global start frame of each scene (transitions overlap scenes).
const starts = scenes.map((_, i) => {
  let s = 0;
  for (let j = 0; j < i; j++) s += sceneFrames(j) - TRANSITION;
  return s;
});
const voiceWindows = VO.map((v, i) => [starts[i] + sceneLead(i), starts[i] + sceneLead(i) + v * FPS]);

// Background music: clearly audible, dipping only slightly under the narration.
const MUSIC_UNDER_VOICE = 0.27;
const MUSIC_OPEN = 0.45;
const musicVolume = (f: number, total: number) => {
  let duck = 0;
  for (const [a, b] of voiceWindows) {
    duck = Math.max(duck, interpolate(f, [a - 8, a, b, b + 12], [0, 1, 1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }));
  }
  const base = MUSIC_OPEN + (MUSIC_UNDER_VOICE - MUSIC_OPEN) * duck;
  const fadeIn = interpolate(f, [0, 15], [0, 1], { extrapolateRight: "clamp" });
  const fadeOut = interpolate(f, [total - 50, total - 2], [1, 0], { extrapolateLeft: "clamp", extrapolateRight: "clamp" });
  return base * fadeIn * fadeOut;
};

export const Woodcutter: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "#0F172A" }}>
      <TransitionSeries>
        {scenes.map(({ name, C }, i) => (
          <React.Fragment key={name}>
            {i > 0 ? (
              <TransitionSeries.Transition presentation={presentations[i - 1]} timing={linearTiming({ durationInFrames: TRANSITION })} />
            ) : null}
            <TransitionSeries.Sequence name={name} durationInFrames={sceneFrames(i)}>
              <C />
            </TransitionSeries.Sequence>
          </React.Fragment>
        ))}
      </TransitionSeries>
      <Audio src={staticFile("music/music.wav")} volume={(f) => musicVolume(f, durationInFrames)} />
      <AbsoluteFill
        style={{
          backgroundColor: "#0F172A",
          opacity: interpolate(frame, [durationInFrames - 20, durationInFrames - 1], [0, 1], { extrapolateLeft: "clamp", extrapolateRight: "clamp" }),
        }}
      />
    </AbsoluteFill>
  );
};
