import React from "react";
import { AbsoluteFill, Sequence } from "remotion";
import { CUT_TO_BLACK, storyData } from "./data/storyData";
import { ScenePanel, transitionLead } from "./components/ScenePanel";
import { SubtitleOverlay } from "./components/SubtitleOverlay";
import { BlackOverlays, FilmFinish, Hud, LightningFlash, RewindFlash, Weather } from "./components/HudEffects";
import { AudioTracks } from "./components/AudioTracks";

/**
 * THE TRAIN ON THE BROKEN BRIDGE — 1920x1080 (16:9) @ 30fps.
 * Layer order (bottom → top):
 *  1. 32 sequential panels (one-by-one, with transition lead-ins)
 *  2. weather (rain / fog), lightning
 *  3. caption legibility gradient, HUD
 *  4. scene transitions (rewind flash, fade-through-black, final cut)
 *  5. film finish (vignette + grain), subtitles
 */
export const MainVideo: React.FC = () => {
  return (
    <AbsoluteFill style={{ backgroundColor: "#0D131A" }}>
      {storyData.map((panel) => {
        const lead = transitionLead(panel);
        return (
          <Sequence
            key={panel.id}
            name={`${panel.id} · ${panel.cameraMotion.label}`}
            from={panel.startFrame - lead}
            durationInFrames={panel.durationInFrames + lead}
            premountFor={30}
          >
            <ScenePanel panel={panel} />
          </Sequence>
        );
      })}

      <Weather />
      <LightningFlash />

      {/* darken the lower band so captions always read */}
      <AbsoluteFill
        style={{
          background: "linear-gradient(to bottom, transparent 58%, rgba(13,19,26,0.5) 75%, rgba(13,19,26,0.85) 100%)",
        }}
      />
      <Hud />
      <RewindFlash />
      <FilmFinish />
      <SubtitleOverlay cutAt={CUT_TO_BLACK} />
      <BlackOverlays cutAt={CUT_TO_BLACK} />

      <AudioTracks cutAt={CUT_TO_BLACK} />
    </AbsoluteFill>
  );
};
