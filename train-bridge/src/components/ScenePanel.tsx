import React from "react";
import { AbsoluteFill, Easing, Img, interpolate, staticFile, useCurrentFrame } from "remotion";
import { WIDTH, type Panel } from "../data/storyData";
import { clamp, easingFn, focalBias, shakeAt } from "../lib/motion";
import { PanelFx } from "./PanelFx";

/** Vertical centre of the foreground picture window. */
export const WINDOW_CENTER_Y = 860;

/** How many frames a panel's Sequence starts before its nominal startFrame. */
export const transitionLead = (p: Panel): number => {
  const t = p.transitionIn;
  if (t.type === "dissolve" || t.type === "whip" || t.type === "zoom-reveal") return t.frames;
  return 0;
};

const ChannelFilters: React.FC = () => (
  <svg width={0} height={0} style={{ position: "absolute" }}>
    <filter id="only-r">
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 0 0 0 0  0 0 0 0 0  0 0 0 1 0" />
    </filter>
    <filter id="only-g">
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 1 0 0 0  0 0 0 0 0  0 0 0 1 0" />
    </filter>
    <filter id="only-b">
      <feColorMatrix type="matrix" values="0 0 0 0 0  0 0 0 0 0  0 0 1 0 0  0 0 0 1 0" />
    </filter>
  </svg>
);

/**
 * Renders one sliced storyboard panel:
 * blurred 9:16 backdrop + a cinematic picture window with Ken Burns motion,
 * focal-point framing, transitions, camera shake and per-panel FX.
 * `frame` 0 == the panel's nominal startFrame (negative during a transition lead-in).
 */
export const ScenePanel: React.FC<{ panel: Panel }> = ({ panel }) => {
  const lead = transitionLead(panel);
  const frame = useCurrentFrame() - lead;
  const { cameraMotion: m, transitionIn: tr } = panel;
  const moveFrames = m.moveFrames ?? panel.durationInFrames;
  const ease = easingFn(m.easing);
  const p = ease(interpolate(frame, [0, moveFrames], [0, 1], clamp));

  // ── camera keyframes
  let scale = interpolate(p, [0, 1], m.scale);
  const rot = m.rotate ? interpolate(p, [0, 1], m.rotate) : 0;
  const fb = focalBias(panel.focalPoint);
  const xUnit = m.x ? interpolate(p, [0, 1], m.x) : Math.max(-1, Math.min(1, fb.x + (panel.focalBiasX ?? 0)));
  let yPx = m.y ? interpolate(p, [0, 1], m.y) : 0;

  // ── shake (scaled per panel, with special-case behaviours)
  let amp = panel.shakeIntensity;
  if (m.label === "expo-dead-stop") amp *= interpolate(frame, [0, 30], [1, 0], clamp);
  if (tr.type === "impact") amp += interpolate(frame, [0, tr.frames + 2], [34, 0], clamp);
  if (m.label === "settle") {
    // 2px downward settle bounce, then dead still
    yPx += 2.4 * Math.exp(-frame / 6) * Math.sin(frame * 0.9);
  }
  const shake = shakeAt(frame + panel.startFrame, amp, panel.panelNumber);

  // ── transition-in
  let opacity = 1;
  let tx = 0;
  let ty = 0;
  let blur = 0;
  if (tr.type === "dissolve") {
    opacity = interpolate(frame, [-tr.frames, 0], [0, 1], clamp);
  } else if (tr.type === "whip") {
    const k = interpolate(frame, [-tr.frames, 0], [1, 0], { ...clamp, easing: Easing.out(Easing.cubic) });
    const d = { left: [1, 0], right: [-1, 0], up: [0, 1], down: [0, -1] }[tr.direction];
    tx = d[0] * k * WIDTH;
    ty = d[1] * k * 1300;
    blur = k * 28;
  } else if (tr.type === "zoom-reveal") {
    opacity = interpolate(frame, [-tr.frames, -tr.frames / 2], [0, 1], clamp);
    blur = interpolate(frame, [-tr.frames, 0], [18, 0], clamp);
    scale *= interpolate(frame, [-tr.frames, 0], [1.25, 1], { ...clamp, easing: Easing.out(Easing.cubic) });
  }

  // ── geometry
  const wh = panel.windowHeight;
  const [nw, nh] = panel.size;
  const imgW = (wh * nw) / nh;
  const overflowX = Math.max(0, (imgW * scale - WIDTH) / 2);
  const overflowY = Math.max(0, (wh * scale - wh) / 2);
  const panX = xUnit * overflowX;
  const panY = fb.y * overflowY * 0.9 + yPx;
  const windowTop = WINDOW_CENTER_Y - wh / 2;

  // chromatic aberration during the rewind flash
  const caAmount = tr.type === "rewind-flash" ? interpolate(frame, [0, tr.frames], [22, 0], clamp) : 0;
  // warm "memory" grade for the flashback
  const flashbackGrade = panel.sceneNumber === 3 ? "sepia(0.18) saturate(1.1) contrast(1.05)" : "";

  const imgStyle: React.CSSProperties = {
    position: "absolute",
    left: "50%",
    top: 0,
    width: imgW,
    height: wh,
    marginLeft: -imgW / 2,
    translate: `${panX}px ${panY}px`,
    scale: String(scale),
    rotate: `${rot}deg`,
  };

  return (
    <AbsoluteFill
      style={{
        opacity,
        translate: `${tx + shake.x}px ${ty + shake.y}px`,
        rotate: `${shake.r}deg`,
        filter: [blur > 0.3 ? `blur(${blur}px)` : "", flashbackGrade].join(" ").trim() || undefined,
      }}
    >
      {/* blurred backdrop fills the 9:16 frame */}
      <Img
        src={staticFile(panel.bgPath)}
        style={{
          position: "absolute",
          inset: -60,
          width: WIDTH + 120,
          height: 1920 + 120,
          objectFit: "cover",
          scale: String(1.05 + p * 0.04),
        }}
      />
      {/* picture window */}
      <div
        style={{
          position: "absolute",
          left: 0,
          top: windowTop,
          width: WIDTH,
          height: wh,
          overflow: "hidden",
          maskImage: "linear-gradient(to bottom, transparent 0%, black 9%, black 91%, transparent 100%)",
          WebkitMaskImage: "linear-gradient(to bottom, transparent 0%, black 9%, black 91%, transparent 100%)",
        }}
      >
        {caAmount > 0.5 ? (
          <div style={{ position: "absolute", inset: 0, background: "#000" }}>
            <ChannelFilters />
            {(["r", "g", "b"] as const).map((c, i) => (
              <Img
                key={c}
                src={staticFile(panel.imagePath)}
                style={{
                  ...imgStyle,
                  translate: `${panX + (i - 1) * caAmount}px ${panY}px`,
                  filter: `url(#only-${c})`,
                  mixBlendMode: "screen",
                }}
              />
            ))}
          </div>
        ) : (
          <Img src={staticFile(panel.imagePath)} style={imgStyle} />
        )}
        <PanelFx panel={panel} frame={frame} />
      </div>
    </AbsoluteFill>
  );
};
