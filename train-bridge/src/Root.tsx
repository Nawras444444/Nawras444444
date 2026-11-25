import { Composition } from "remotion";
import { MainVideo } from "./MainVideo";
import { FPS, HEIGHT, TOTAL_FRAMES, WIDTH } from "./data/storyData";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="TrainOnBrokenBridge"
      component={MainVideo}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={WIDTH}
      height={HEIGHT}
    />
  );
};
