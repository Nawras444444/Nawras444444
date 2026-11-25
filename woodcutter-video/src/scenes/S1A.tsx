import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame, useVideoConfig } from "remotion";
import { Caption, Voice, sec } from "../lib";
import { C } from "../theme";

const I = 0;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;
const W = 960;
const H = Math.round((W * 1448) / 1086);
const TOP = 110;

// Opening: the four character panels of the woodcutter board pop in one by one.
const quads = [
  { clip: "inset(0% 50% 50% 0%)", origin: "25% 25%", at: 0.0 }, // woodcutter
  { clip: "inset(0% 0% 50% 50%)", origin: "75% 25%", at: 1.0 }, // axe
  { clip: "inset(50% 50% 0% 0%)", origin: "25% 75%", at: 2.8 }, // tree
  { clip: "inset(50% 0% 0% 50%)", origin: "75% 75%", at: 3.5 }, // "10"
];

export const S1A: React.FC = () => {
  const frame = useCurrentFrame();
  const { durationInFrames } = useVideoConfig();
  return (
    <AbsoluteFill style={{ backgroundColor: "rgb(0,14,33)" }}>
      <div
        style={{
          position: "absolute",
          left: (1080 - W) / 2,
          top: TOP,
          width: W,
          height: H,
          scale: interpolate(frame, [0, durationInFrames], [1, 1.04], clamp),
        }}
      >
        {quads.map((q, k) => {
          const at = k === 0 ? 0 : sec(q.at, I);
          const p = interpolate(frame, [at, at + 14], [0, 1], { ...clamp, easing: Easing.bezier(0.34, 1.4, 0.64, 1) });
          return (
            <Img
              key={k}
              src={staticFile("img/s1a.png")}
              style={{
                position: "absolute",
                inset: 0,
                width: W,
                height: H,
                clipPath: q.clip,
                transformOrigin: q.origin,
                scale: String(0.85 + 0.15 * p),
                opacity: Math.min(1, p * 1.4),
              }}
            />
          );
        })}
      </div>
      <Caption
        at={sec(4.3, I)}
        bottom={300}
        size={74}
        parts={[{ t: "لماذا يتعب البعض كثيراً.." }, { t: "وينجز ", br: true }, { t: "قليلاً؟", color: C.coral }]}
      />
      <Voice i={I} />
    </AbsoluteFill>
  );
};
