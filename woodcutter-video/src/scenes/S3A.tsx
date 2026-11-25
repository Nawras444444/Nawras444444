import { AbsoluteFill } from "remotion";
import { BottomShade, Caption, FullImage, Icon, Voice, sec } from "../lib";
import { amiri, C } from "../theme";

const I = 4;

export const S3A: React.FC = () => (
  <AbsoluteFill>
    <FullImage src="img/s3a.png" from={1.0} to={1.07} origin="50% 35%" />
    <BottomShade strength={0.9} />
    <Icon name="magnifier" x={80} y={13} w={180} at={sec(4.2, I)} rotate={-12} />
    <Caption
      at={sec(4.2, I)}
      font={amiri}
      size={96}
      parts={[{ t: "متى شحذت فأسك", color: C.gold2 }, { t: "آخر مرة؟", br: true }]}
    />
    <Voice i={I} />
  </AbsoluteFill>
);
