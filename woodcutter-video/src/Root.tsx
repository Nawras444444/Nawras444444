import { Composition, Folder } from "remotion";
import { Woodcutter } from "./Woodcutter";
import { FPS, sceneFrames, totalFrames } from "./theme";
import { S1A } from "./scenes/S1A";
import { S1B } from "./scenes/S1B";
import { S2A } from "./scenes/S2A";
import { S2B } from "./scenes/S2B";
import { S3A } from "./scenes/S3A";
import { S3B } from "./scenes/S3B";
import { S4A } from "./scenes/S4A";
import { S4B } from "./scenes/S4B";

const parts = [S1A, S1B, S2A, S2B, S3A, S3B, S4A, S4B];
const ids = ["S1A", "S1B", "S2A", "S2B", "S3A", "S3B", "S4A", "S4B"];

export const RemotionRoot: React.FC = () => (
  <>
    <Composition id="Woodcutter" component={Woodcutter} durationInFrames={totalFrames()} fps={FPS} width={1080} height={1920} />
    <Folder name="Scenes">
      {parts.map((P, i) => (
        <Composition key={ids[i]} id={ids[i]} component={P} durationInFrames={sceneFrames(i)} fps={FPS} width={1080} height={1920} />
      ))}
    </Folder>
  </>
);
