import React from "react";
import { Composition } from "remotion";
import { Montage, TOTAL } from "./Montage";
import { FPS, H, W } from "./theme";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="LolMontage"
      component={Montage}
      durationInFrames={TOTAL}
      fps={FPS}
      width={W}
      height={H}
      defaultProps={{ music: true }}
    />
  );
};
