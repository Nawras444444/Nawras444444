import { AbsoluteFill } from "remotion";
import { BottomShade, Caption, FullImage, Icon, Voice, sec } from "../lib";
import { C } from "../theme";

const I = 3;

export const S2B: React.FC = () => (
  <AbsoluteFill>
    <FullImage src="img/s2b.png" from={1.1} to={1.0} origin="55% 45%" />
    <BottomShade />
    <Icon name="battery_low" x={20} y={8} w={210} at={0} pulse float={false} />
    <Caption at={sec(0.3, I)} parts={[{ t: "نتيجة " }, { t: "أقل", color: C.coral }]} size={96} />
    <Voice i={I} />
  </AbsoluteFill>
);
