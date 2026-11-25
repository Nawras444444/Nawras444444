import { AbsoluteFill } from "remotion";
import { BottomShade, Caption, FullImage, Icon, Voice, sec } from "../lib";
import { C, ruqaa } from "../theme";

const I = 7;

export const S4B: React.FC = () => (
  <AbsoluteFill>
    <FullImage src="img/s4b.png" from={1.12} to={1.0} origin="55% 55%" />
    <BottomShade strength={0.9} />
    <Icon name="bolt" x={62} y={9} w={105} at={sec(7.2, I)} pulse />
    <Icon name="battery_full" x={81} y={9} w={210} at={sec(7.0, I)} float={false} />
    <Icon name="thumbs" x={14} y={9} w={150} at={sec(9.6, I)} />
    <Caption at={sec(1.0, I)} bottom={470} size={72} parts={[{ t: "التوقف للتطوير.." }]} />
    <Caption at={sec(8.4, I)} bottom={290} size={128} font={ruqaa} parts={[{ t: "يضاعف سرعتك", color: C.emerald }]} />
    <Voice i={I} />
  </AbsoluteFill>
);
