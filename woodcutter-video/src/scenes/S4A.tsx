import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { BottomShade, Caption, FullImage, Icon, Voice, sec } from "../lib";
import { C } from "../theme";

const I = 6;
const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

// Sparkle flashing on the freshly sharpened edge (where the gleam is in the picture).
const Sparkle: React.FC<{ at: number }> = ({ at }) => {
  const frame = useCurrentFrame();
  const p = interpolate(frame, [at, at + 6, at + 22], [0, 1, 0], { ...clamp, easing: Easing.bezier(0.16, 1, 0.3, 1) });
  return (
    <Img
      src={staticFile("icons/sparkle.png")}
      style={{
        position: "absolute",
        left: "81%",
        top: "78.5%",
        width: 150,
        marginLeft: -75,
        marginTop: -58,
        opacity: p,
        scale: String(0.4 + p * 0.8),
        rotate: `${(frame - at) * 2}deg`,
      }}
    />
  );
};

export const S4A: React.FC = () => {
  const frame = useCurrentFrame();
  return (
    <AbsoluteFill>
      <FullImage src="img/s4a.png" from={1.0} to={1.08} origin="62% 78%" />
      <BottomShade />
      <Sparkle at={sec(4.6, I)} />
      <Sparkle at={sec(6.0, I)} />
      <Icon name="bulb" x={84} y={10} w={190} at={sec(0.4, I)} pulse />
      <Caption
        at={sec(6.6, I)}
        size={82}
        parts={[{ t: "شحذ الفأس =" }, { t: "تطوير الأدوات", color: C.emerald, br: true }]}
      />
      {/* realization flash coming out of the previous scene */}
      <AbsoluteFill style={{ backgroundColor: "#FFF7E0", opacity: interpolate(frame, [0, 3, 14], [0, 0.75, 0], clamp) }} />
      <Voice i={I} />
    </AbsoluteFill>
  );
};
