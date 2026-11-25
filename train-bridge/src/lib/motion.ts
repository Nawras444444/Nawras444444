import { Easing, interpolate, random } from "remotion";
import type { EasingName, FocalPoint } from "../data/storyData";

export const clamp = { extrapolateLeft: "clamp", extrapolateRight: "clamp" } as const;

const steps3 = (p: number) => {
  // three snappy micro-moves with short holds in between
  const seg = Math.min(2, Math.floor(p * 3));
  const local = p * 3 - seg;
  const snap = Easing.out(Easing.cubic)(Math.min(1, local * 3.5));
  return (seg + snap) / 3;
};

export const easingFn = (name: EasingName = "linear"): ((t: number) => number) => {
  switch (name) {
    case "inOut":
      return Easing.inOut(Easing.cubic);
    case "out":
      return Easing.out(Easing.cubic);
    case "in":
      return Easing.in(Easing.quad);
    case "expo":
      return Easing.out(Easing.exp);
    case "steps3":
      return steps3;
    default:
      return (t) => t;
  }
};

/** Pseudo-noise camera shake (deterministic, smooth-ish). */
export const shakeAt = (frame: number, amp: number, seed = 0) => {
  if (amp <= 0) return { x: 0, y: 0, r: 0 };
  const f = frame + seed * 13.7;
  const x =
    (Math.sin(f * 1.73) + 0.6 * Math.sin(f * 3.11 + 1.3) + 0.35 * Math.sin(f * 7.37 + 0.4)) / 1.95;
  const y =
    (Math.sin(f * 1.37 + 2.1) + 0.6 * Math.sin(f * 2.89 + 0.7) + 0.35 * Math.sin(f * 6.91 + 2.4)) / 1.95;
  const jitter = (random(`shake-${Math.floor(f)}`) - 0.5) * 0.4;
  return { x: (x + jitter) * amp, y: (y - jitter) * amp, r: x * amp * 0.03 };
};

/** Base horizontal / vertical bias (-1..1) for a focal point. */
export const focalBias = (fp: FocalPoint): { x: number; y: number } => {
  const x = fp.includes("left") ? 0.85 : fp.includes("right") ? -0.85 : 0;
  const y = fp.startsWith("top") ? 0.85 : fp.startsWith("bottom") ? -0.85 : 0;
  return { x, y };
};

/** Linear ramp helper for flashes: 1 at `at`, decaying over `len` frames. */
export const spike = (frame: number, at: number, len = 3) =>
  interpolate(frame, [at - 1, at, at + len], [0, 1, 0], clamp);
