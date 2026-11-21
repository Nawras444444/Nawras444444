import React from "react";
import { AbsoluteFill, Sequence, staticFile } from "remotion";
import { Audio } from "@remotion/media";
import { linearTiming, springTiming, TransitionSeries } from "@remotion/transitions";
import { cube } from "@remotion/transitions/cube";
import { iris } from "@remotion/transitions/iris";
import { clockWipe } from "@remotion/transitions/clock-wipe";
import { flip } from "@remotion/transitions/flip";
import { ClipScene, Intro, Outro } from "./Scenes";
import { Flash } from "./fx";
import { H, W } from "./theme";

export const TRANSITION = 20;
export const SCENES = { intro: 120, c1: 150, c2: 150, c3: 160, outro: 120 };
export const TOTAL =
  SCENES.intro + SCENES.c1 + SCENES.c2 + SCENES.c3 + SCENES.outro - 4 * TRANSITION;

// global start frames of each scene (for flashes + audio sync)
export const T = {
  c1: SCENES.intro - TRANSITION,
  c2: SCENES.intro + SCENES.c1 - 2 * TRANSITION,
  c3: SCENES.intro + SCENES.c1 + SCENES.c2 - 3 * TRANSITION,
  outro: SCENES.intro + SCENES.c1 + SCENES.c2 + SCENES.c3 - 4 * TRANSITION,
};

export const Montage: React.FC<{ music: boolean }> = ({ music }) => {
  return (
    <AbsoluteFill style={{ background: "#04061a" }}>
      <TransitionSeries>
        <TransitionSeries.Sequence durationInFrames={SCENES.intro}>
          <Intro />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={iris({ width: W, height: H })} timing={linearTiming({ durationInFrames: TRANSITION })} />
        <TransitionSeries.Sequence durationInFrames={SCENES.c1}>
          <ClipScene
            src="clips/clip1.mp4"
            hero="NAWRAS"
            level={13}
            casts={{ Q: 30, W: 62, E: 88, R: 112 }}
            bursts={[
              { at: 30, x: 560, y: 560, key: "Q" },
              { at: 62, x: 1000, y: 420, key: "W" },
              { at: 88, x: 1380, y: 600, key: "E" },
              { at: 112, x: 960, y: 520, key: "R" },
            ]}
            banner={{ at: 40, text: "FIRST BLOOD", sub: "YOU HAVE SLAIN AN ENEMY" }}
            kills={1}
            feed={[{ at: 46, text: "NAWRAS  ⚔  ENEMY CHAMPION" }]}
            gameStartSec={202}
            gold={[500, 3400]}
            zoomFrom={1.0}
            zoomTo={1.1}
            panX={-30}
            seed={1}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={cube({ direction: "from-right" })} timing={springTiming({ durationInFrames: TRANSITION, config: { damping: 200 } })} />
        <TransitionSeries.Sequence durationInFrames={SCENES.c2}>
          <ClipScene
            src="clips/clip2.mp4"
            hero="NAWRAS"
            level={15}
            casts={{ R: 20, Q: 58, W: 92, E: 124 }}
            bursts={[
              { at: 20, x: 960, y: 500, key: "R" },
              { at: 58, x: 700, y: 640, key: "Q" },
              { at: 92, x: 1200, y: 360, key: "W" },
              { at: 124, x: 900, y: 700, key: "E" },
            ]}
            banner={{ at: 28, text: "DOUBLE KILL", sub: "THE RIFT TREMBLES", color: "#c4b5fd" }}
            kills={2}
            feed={[
              { at: 12, text: "NAWRAS  ⚔  ENEMY CHAMPION" },
              { at: 34, text: "NAWRAS  ⚔  ENEMY CHAMPION" },
            ]}
            gameStartSec={247}
            gold={[3400, 8200]}
            zoomFrom={1.12}
            zoomTo={1.0}
            panX={40}
            seed={2}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={clockWipe({ width: W, height: H })} timing={linearTiming({ durationInFrames: TRANSITION })} />
        <TransitionSeries.Sequence durationInFrames={SCENES.c3}>
          <ClipScene
            src="clips/clip3.mp4"
            hero="NAWRAS"
            level={18}
            casts={{ E: 25, Q: 58, R: 96, W: 134 }}
            bursts={[
              { at: 25, x: 520, y: 520, key: "E" },
              { at: 58, x: 900, y: 440, key: "Q" },
              { at: 96, x: 960, y: 540, key: "R" },
              { at: 134, x: 1400, y: 500, key: "W" },
            ]}
            banner={{ at: 100, text: "PENTAKILL", sub: "LEGENDARY", color: "#f0abfc" }}
            kills={5}
            feed={[
              { at: 30, text: "NAWRAS  ⚔  ENEMY CHAMPION" },
              { at: 62, text: "NAWRAS  ⚔  ENEMY CHAMPION" },
              { at: 100, text: "NAWRAS  ⚔  ENEMY CHAMPION" },
              { at: 108, text: "★ ACE ★  THE ENEMY TEAM HAS BEEN SLAIN" },
            ]}
            gameStartSec={292}
            gold={[8200, 18200]}
            zoomFrom={1.0}
            zoomTo={1.14}
            panX={-40}
            seed={3}
          />
        </TransitionSeries.Sequence>
        <TransitionSeries.Transition presentation={flip({ direction: "from-bottom" })} timing={linearTiming({ durationInFrames: TRANSITION })} />
        <TransitionSeries.Sequence durationInFrames={SCENES.outro}>
          <Outro />
        </TransitionSeries.Sequence>
      </TransitionSeries>
      {[T.c1, T.c2, T.c3, T.outro].map((t) => (
        <Sequence key={t} from={t} durationInFrames={20} layout="absolute-fill">
          <Flash at={TRANSITION / 2 - 3} len={12} color="#a5b4fc" />
        </Sequence>
      ))}
      {music && <Audio src={staticFile("music.wav")} volume={0.9} />}
    </AbsoluteFill>
  );
};
