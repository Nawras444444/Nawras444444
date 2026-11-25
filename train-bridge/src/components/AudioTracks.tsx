import React from "react";
import { Audio } from "@remotion/media";
import { getStaticFiles, interpolate, Sequence, staticFile } from "remotion";
import { ambienceRanges, FPS, storyData } from "../data/storyData";
import { voClips } from "../data/voiceData";
import { clamp } from "../lib/motion";

/** Mix levels (linear gain). */
export const MIX = {
  voiceover: 1.0, // 0 dB
  music: 0.9, // music bed – loud and clear
  musicUnderVoice: 0.65, // only a light duck while the narrator speaks
  sfx: 0.6, // SFX bus (-4.4 dB) on top of per-cue volumes, keeps the mix out of clipping
};

/**
 * Safe asset loading: if the file is not in public/, render nothing instead of
 * crashing preview/render. (getStaticFiles() may be empty in some environments,
 * in which case we trust the path.)
 */
const SafeAudio: React.FC<Omit<React.ComponentProps<typeof Audio>, "src"> & { file: string }> = ({ file, ...props }) => {
  const files = getStaticFiles();
  if (files.length > 0 && !files.some((f) => f.name === file)) {
    return null;
  }
  return <Audio {...props} src={staticFile(file)} />;
};

const voiceRanges = voClips.map((c) => [c.fromFrame, c.fromFrame + (c.srcEndSec - c.srcStartSec) * FPS]);

/** 0 = no voice, 1 = voice active (smoothed with 8-frame ramps). */
const voiceActivity = (f: number) => {
  let v = 0;
  for (const [a, b] of voiceRanges) {
    v = Math.max(v, interpolate(f, [a - 8, a, b, b + 8], [0, 1, 1, 0], clamp));
  }
  return v;
};

const ambienceAt = (f: number) => {
  // crossfade 10 frames between ranges
  for (let i = 0; i < ambienceRanges.length; i++) {
    const r = ambienceRanges[i];
    if (f >= r.from && f < r.to) {
      const next = ambienceRanges[i + 1];
      if (next && f > r.to - 10) return interpolate(f, [r.to - 10, r.to], [r.rain, next.rain]);
      return r.rain;
    }
  }
  return 0;
};

export const AudioTracks: React.FC<{ cutAt: number }> = ({ cutAt }) => {
  return (
    // Everything lives inside this sequence so ALL sound stops dead at the final hard cut.
    <Sequence durationInFrames={cutAt} name="Audio">
      {/* Voiceover – split into clips and re-placed onto each scene */}
      {voClips.map((c, i) => (
        <Sequence key={`vo${i}`} from={c.fromFrame} name={`VO ${i + 1}`} layout="none">
          <SafeAudio
            file="audio/voiceover.wav"
            trimBefore={Math.round(c.srcStartSec * FPS)}
            trimAfter={Math.round(c.srcEndSec * FPS)}
            volume={MIX.voiceover}
          />
        </Sequence>
      ))}

      {/* Music bed with ducking under the narration */}
      <Sequence name="Music" layout="none">
        <SafeAudio
          file="audio/music.mp3"
          volume={(f) => {
            const fadeIn = interpolate(f, [0, 12], [0, 1], clamp);
            const level = interpolate(voiceActivity(f), [0, 1], [MIX.music, MIX.musicUnderVoice]);
            return fadeIn * level;
          }}
        />
      </Sequence>

      {/* Rain ambience bed */}
      <Sequence name="Rain ambience" layout="none">
        <SafeAudio file="sfx/rain_loop.wav" loop volume={(f) => ambienceAt(f)} />
      </Sequence>

      {/* Foley / SFX cues at exact frames */}
      {storyData.flatMap((p) =>
        p.sfxList.map((cue, j) => (
          <Sequence
            key={`${p.id}-${j}`}
            from={Math.max(0, p.startFrame + cue.at)}
            durationInFrames={cue.frames}
            name={`SFX ${p.id} ${cue.file}`}
            layout="none"
          >
            <SafeAudio file={`sfx/${cue.file}`} volume={(cue.volume ?? 0.55) * MIX.sfx} />
          </Sequence>
        )),
      )}
    </Sequence>
  );
};
