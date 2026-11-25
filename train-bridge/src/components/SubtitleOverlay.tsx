import React from "react";
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { captionPages, type CaptionPage } from "../data/voiceData";
import { clamp } from "../lib/motion";
import { cairo } from "../lib/fonts";

const COLORS = {
  base: "#F1F5F9",
  amber: "#F4A261",
  crimson: "#E63946",
};

const SHADOW = "0px 4px 12px rgba(13, 19, 26, 0.95), 0px 0px 3px rgba(13, 19, 26, 0.9)";

/**
 * Word-by-word RTL Arabic captions. Text is split on spaces only (never into
 * characters), so every word keeps its connected Arabic letter shaping.
 */
export const SubtitleOverlay: React.FC<{ cutAt: number }> = ({ cutAt }) => {
  const frame = useCurrentFrame();
  if (frame >= cutAt) return null;
  const page = captionPages.find((p) => frame >= p.fromFrame && frame < p.toFrame);
  if (!page) return null;
  return <Page page={page} frame={frame} />;
};

const Page: React.FC<{ page: CaptionPage; frame: number }> = ({ page, frame }) => {
  const { fps } = useVideoConfig();
  const exit = interpolate(frame, [page.toFrame - 4, page.toFrame], [1, 0], clamp);
  return (
    <AbsoluteFill style={{ pointerEvents: "none" }}>
      <div
        dir="rtl"
        lang="ar"
        style={{
          position: "absolute",
          left: 90,
          right: 90,
          bottom: 340,
          display: "flex",
          flexWrap: "wrap",
          justifyContent: "center",
          alignItems: "baseline",
          columnGap: 22,
          rowGap: 0,
          direction: "rtl",
          textAlign: "center",
          fontFamily: cairo,
          fontWeight: 800,
          fontSize: 76,
          lineHeight: 1.45,
          opacity: exit,
        }}
      >
        {page.words.map((w, i) => {
          const local = frame - w.startFrame;
          const pop = spring({ fps, frame: local, config: { damping: 14, stiffness: 180 } });
          const visible = local >= 0;
          // highlighted words get an extra 1.0 -> 1.08 -> 1.0 bump right after popping in
          const bump = w.highlight ? interpolate(local, [3, 8, 14], [1, 1.08, 1], clamp) : 1;
          const color = w.highlight === "crimson" ? COLORS.crimson : w.highlight === "amber" ? COLORS.amber : COLORS.base;
          return (
            <span
              key={i}
              style={{
                display: "inline-block",
                color,
                textShadow: w.highlight
                  ? `${SHADOW}, 0 0 26px ${color}66`
                  : SHADOW,
                opacity: visible ? Math.min(1, pop * 1.6) : 0,
                scale: String((0.55 + 0.45 * pop) * bump),
                translate: `0 ${(1 - pop) * 26}px`,
                whiteSpace: "nowrap",
              }}
            >
              {w.text}
            </span>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
