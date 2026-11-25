import { Composition } from "remotion";
import { LawsVideo, TOTAL_FRAMES } from "./LawsVideo";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="WeirdLaws"
      component={LawsVideo}
      durationInFrames={TOTAL_FRAMES}
      fps={30}
      width={1080}
      height={1920}
    />
  );
};
