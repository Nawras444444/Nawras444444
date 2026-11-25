import { AbsoluteFill } from "remotion";
import { BottomShade, Caption, FullImage, Icon, Voice, sec } from "../lib";
import { C } from "../theme";

const I = 5;

export const S3B: React.FC = () => (
  <AbsoluteFill>
    <FullImage src="img/s3b.png" from={1.06} to={1.16} origin="55% 45%" shake={[sec(2.5, I), sec(4.9, I)]} shakeAmp={7} />
    <BottomShade />
    <Icon name="lock" x={84} y={10} w={170} at={sec(1.0, I)} shakeAt={[sec(2.5, I), sec(3.4, I), sec(5.5, I)]} />
    <Caption at={sec(2.4, I)} parts={[{ t: "أنا " }, { t: "مشغول بالقطع!", color: C.coral }]} size={90} />
    <Voice i={I} />
  </AbsoluteFill>
);
