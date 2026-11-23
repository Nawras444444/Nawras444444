import { Composition } from "remotion";
import { VictorVideo } from "./Video";
import { DURATION_S, FPS } from "./lib";

export const RemotionRoot: React.FC = () => (
  <Composition
    id="Victor"
    component={VictorVideo}
    durationInFrames={DURATION_S * FPS}
    fps={FPS}
    width={1920}
    height={1080}
  />
);
