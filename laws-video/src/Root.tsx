import { Composition } from "remotion";
import { LawsVideo, TOTAL_FRAMES } from "./LawsVideo";
import { LawsVideoWide } from "./LawsVideoWide";

export const RemotionRoot: React.FC = () => {
  return (
    <>
      <Composition
        id="WeirdLawsWide"
        component={LawsVideoWide}
        durationInFrames={TOTAL_FRAMES}
        fps={30}
        width={1920}
        height={1080}
      />
      <Composition
        id="WeirdLaws"
        component={LawsVideo}
        durationInFrames={TOTAL_FRAMES}
        fps={30}
        width={1080}
        height={1920}
      />
    </>
  );
};
