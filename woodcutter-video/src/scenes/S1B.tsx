import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Voice, sec } from "../lib";
import { C } from "../theme";

const I = 1;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// The three-day panel: day 1 (10) is shown, day 2 (7) and day 3 (4) wipe in on the spoken numbers.
const panels = [
  { top: 0, bottom: 66.6, at: -1 },
  { top: 33.4, bottom: 33.3, at: 3.1 },
  { top: 66.7, bottom: 0, at: 7.2 },
];

export const S1B: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  const starts = panels.map((p) => (p.at < 0 ? -20 : sec(p.at, I) - 4));
  return (
    <AbsoluteFill style={{ backgroundColor: C.navy, overflow: "hidden" }}>
      <AbsoluteFill style={{ scale: interpolate(frame, [0, durationInFrames], [1.0, 1.05], clamp), transformOrigin: "50% 60%" }}>
        {panels.map((p, k) => {
          const s = starts[k];
          const rev = interpolate(frame, [s, s + 12], [0, 1], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) });
          const next = starts[k + 1];
          const dim = next === undefined ? 1 : interpolate(frame, [next, next + 12], [1, 0.5], clamp);
          // impact bump when the number lands
          const bump = interpolate(frame, [s + 8, s + 13, s + 20], [0, 1, 0], clamp);
          return (
            <Img
              key={k}
              src={staticFile("img/s1b.png")}
              style={{
                position: "absolute",
                inset: 0,
                width: "100%",
                height: "100%",
                objectFit: "cover",
                clipPath: `inset(${p.top}% 0% ${p.bottom}% 0%)`,
                opacity: rev,
                translate: `${(1 - rev) * -80}px ${bump * 6}px`,
                filter: `brightness(${dim})`,
              }}
            />
          );
        })}
      </AbsoluteFill>
      <Voice i={I} />
    </AbsoluteFill>
  );
};
