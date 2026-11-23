import {Composition} from 'remotion';
import {TikTokTips} from './TikTokTips';
import {FPS, TOTAL_FRAMES} from './script';

export const RemotionRoot = () => {
  return (
    <Composition
      id="TikTokTips"
      component={TikTokTips}
      durationInFrames={TOTAL_FRAMES}
      fps={FPS}
      width={1080}
      height={1920}
    />
  );
};
