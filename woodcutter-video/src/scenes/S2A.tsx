import { AbsoluteFill } from "remotion";
import { BottomShade, Caption, FullImage, Icon, Voice, sec } from "../lib";
import { C } from "../theme";
import { HoursCard } from "../data";

const I = 2;

export const S2A: React.FC = () => (
  <AbsoluteFill>
    <FullImage src="img/s2a.png" from={1.04} to={1.12} origin="60% 70%" shake={[sec(1.3, I), sec(3.2, I), sec(3.6, I), sec(4.2, I)]} shakeAmp={9} />
    <BottomShade />
    <Icon name="stopwatch" x={17} y={11} w={190} at={sec(0.6, I)} shakeAt={[sec(3.6, I), sec(4.7, I), sec(5.5, I)]} />
    <Icon name="battery_low" x={83} y={8} w={210} at={sec(3.2, I)} pulse float={false} />
    <HoursCard at={sec(1.9, I)} grow={sec(4.7, I)} />
    <Caption at={sec(1.3, I)} parts={[{ t: "جهد ", color: C.white }, { t: "مضاعف..", color: C.gold }]} size={96} />
    <Voice i={I} />
  </AbsoluteFill>
);
