import { panelSizes } from "./panelSizes";

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
/** Frame at which the picture hard-cuts to black (after the last spoken word). */
export const CUT_TO_BLACK = 1704;
export const TOTAL_FRAMES = 1710;

export type FocalPoint =
  | "center"
  | "top"
  | "bottom"
  | "left"
  | "right"
  | "top-left"
  | "top-right"
  | "bottom-left"
  | "bottom-right";

export type EasingName = "linear" | "inOut" | "out" | "in" | "expo" | "steps3";

/**
 * Camera motion as keyframes over the panel's duration.
 * - scale: zoom factor of the panel inside its frame window
 * - x: horizontal pan in units of the available overflow (-1 = show right edge, +1 = show left edge)
 * - y: vertical offset in px
 * - rotate: degrees
 */
export type CameraMotion = {
  label: string;
  scale: [number, number];
  x?: [number, number];
  y?: [number, number];
  rotate?: [number, number];
  easing?: EasingName;
  /** frames (from panel start) over which the move happens; defaults to the panel duration */
  moveFrames?: number;
};

export type TransitionIn =
  | { type: "cut" }
  | { type: "dissolve"; frames: number }
  | { type: "whip"; frames: number; direction: "left" | "right" | "up" | "down" }
  | { type: "zoom-reveal"; frames: number }
  | { type: "rewind-flash"; frames: number }
  | { type: "impact"; frames: number }
  | { type: "fade-black"; frames: number };

export type HudOverlay =
  | "none"
  | "distance-edge"
  | "distance-halt"
  | "rewind-badge"
  | "gauges-throttle"
  | "gauges-brake"
  | "warning-blink"
  | "red-alert";

export type FxLayer =
  | "wiper"
  | "splash"
  | "headlight-flare"
  | "speed-lines"
  | "sparks"
  | "steam"
  | "light-spill"
  | "amber-pulse"
  | "amber-red-pulse"
  | "red-vignette"
  | "lightning";

export type SfxCue = {
  file: string;
  /** frame offset relative to the panel start */
  at: number;
  volume?: number;
  /** trim the cue to this many frames */
  frames?: number;
};

export type Panel = {
  id: string;
  sceneNumber: number;
  panelNumber: number;
  startFrame: number;
  durationInFrames: number;
  imagePath: string;
  bgPath: string;
  /** natural pixel size of the sliced panel */
  size: [number, number];
  focalPoint: FocalPoint;
  /** fine bias in -1..1 applied on top of the focal point (x) */
  focalBiasX?: number;
  cameraMotion: CameraMotion;
  /** continuous camera shake amplitude in px */
  shakeIntensity: number;
  /** height of the foreground picture window in px */
  windowHeight: number;
  exterior: boolean;
  transitionIn: TransitionIn;
  hudOverlay: HudOverlay;
  fx: FxLayer[];
  sfxList: SfxCue[];
  arabicSubtitleSegment: string;
};

type PanelInput = Omit<
  Panel,
  "id" | "sceneNumber" | "panelNumber" | "imagePath" | "bgPath" | "size" | "windowHeight" | "fx" | "exterior"
> & {
  windowHeight?: number;
  fx?: FxLayer[];
  exterior?: boolean;
};

const DEFAULT_WINDOW = 1080; // full-frame picture in 16:9
const EXTERIOR_SCENES = [1, 2, 4, 5, 7];

const make = (id: string, p: PanelInput): Panel => {
  const [s, n] = id.split("_").map(Number);
  return {
    id,
    sceneNumber: s,
    panelNumber: n,
    imagePath: `panels/${id}.png`,
    bgPath: `panels/bg/${id}.jpg`,
    size: panelSizes[id],
    windowHeight: p.windowHeight ?? DEFAULT_WINDOW,
    fx: p.fx ?? [],
    exterior: p.exterior ?? EXTERIOR_SCENES.includes(s),
    ...p,
  };
};

export const storyData: Panel[] = [
  // ───────────── SCENE 01 · THE CLIFFHANGER OPENING (0–210)
  make("01_1", {
    startFrame: 0,
    durationInFrames: 54,
    focalPoint: "center",
    focalBiasX: 0.35,
    cameraMotion: { label: "push-in", scale: [1.0, 1.12], easing: "inOut" },
    shakeIntensity: 1.6,
    transitionIn: { type: "cut" },
    hudOverlay: "none",
    sfxList: [
    ],
    arabicSubtitleSegment: "متران فقط تفصل مقدمة القطار",
  }),
  make("01_2", {
    startFrame: 54,
    durationInFrames: 54,
    focalPoint: "right",
    cameraMotion: { label: "pan-right", scale: [1.08, 1.1], x: [0.6, -0.85], easing: "inOut" },
    shakeIntensity: 2.2,
    transitionIn: { type: "whip", frames: 6, direction: "left" },
    hudOverlay: "distance-edge",
    sfxList: [
    ],
    arabicSubtitleSegment: "عن السقوط في وادٍ سحيق",
  }),
  make("01_3", {
    startFrame: 108,
    durationInFrames: 52,
    focalPoint: "bottom",
    cameraMotion: { label: "tilt-down", scale: [1.16, 1.18], y: [-40, 40], easing: "inOut" },
    shakeIntensity: 1,
    transitionIn: { type: "dissolve", frames: 8 },
    hudOverlay: "distance-edge",
    sfxList: [],
    arabicSubtitleSegment: "عن السقوط في وادٍ سحيق",
  }),
  make("01_4", {
    startFrame: 160,
    durationInFrames: 50,
    focalPoint: "center",
    focalBiasX: 0.15,
    cameraMotion: { label: "slow-zoom", scale: [1.05, 1.15], easing: "out" },
    shakeIntensity: 0.4,
    transitionIn: { type: "cut" },
    hudOverlay: "distance-edge",
    sfxList: [
    ],
    arabicSubtitleSegment: "والعجلات تتحرك ببطء نحو الهاوية",
  }),

  // ───────────── SCENE 02 · THE COLLAPSED BRIDGE REVEAL (210–420)
  make("02_1", {
    startFrame: 210,
    durationInFrames: 54,
    focalPoint: "left",
    focalBiasX: 0.2,
    cameraMotion: { label: "zoom-out", scale: [1.35, 1.0], easing: "expo", moveFrames: 40 },
    shakeIntensity: 0.8,
    transitionIn: { type: "zoom-reveal", frames: 10 },
    hudOverlay: "none",
    sfxList: [
    ],
    arabicSubtitleSegment: "جسر منهار بالكامل",
  }),
  make("02_2", {
    startFrame: 264,
    durationInFrames: 51,
    focalPoint: "center",
    cameraMotion: { label: "pan-left-to-right", scale: [1.04, 1.06], x: [0.95, -0.95], easing: "inOut" },
    shakeIntensity: 0.6,
    transitionIn: { type: "whip", frames: 6, direction: "left" },
    hudOverlay: "none",
    sfxList: [],
    arabicSubtitleSegment: "وسط عاصفة لا ترحم",
  }),
  make("02_3", {
    startFrame: 315,
    durationInFrames: 51,
    focalPoint: "top",
    cameraMotion: { label: "tilt-up", scale: [1.14, 1.16], y: [40, -40], easing: "inOut" },
    shakeIntensity: 0.8,
    transitionIn: { type: "dissolve", frames: 8 },
    hudOverlay: "none",
    fx: ["lightning"],
    sfxList: [{ file: "thunder.wav", at: 5, volume: 0.85 }],
    arabicSubtitleSegment: "وسط عاصفة لا ترحم",
  }),
  make("02_4", {
    startFrame: 366,
    durationInFrames: 54,
    focalPoint: "bottom",
    cameraMotion: { label: "drift-zoom", scale: [1.06, 1.16], x: [0.25, -0.15], easing: "linear" },
    shakeIntensity: 0.3,
    transitionIn: { type: "dissolve", frames: 8 },
    hudOverlay: "none",
    sfxList: [],
    arabicSubtitleSegment: "ولا طريق للعودة",
  }),

  // ───────────── SCENE 03 · FLASHBACK – INSIDE THE COCKPIT (420–630)
  make("03_1", {
    startFrame: 420,
    durationInFrames: 54,
    focalPoint: "left",
    focalBiasX: 0.35,
    cameraMotion: { label: "push-in", scale: [1.02, 1.12], easing: "out" },
    shakeIntensity: 0.6,
    transitionIn: { type: "rewind-flash", frames: 12 },
    hudOverlay: "rewind-badge",
    sfxList: [
      { file: "rewind.wav", at: -14, volume: 0.6 },
      { file: "engine_hum.wav", at: 2, volume: 0.35, frames: 210 },
    ],
    arabicSubtitleSegment: "قبل أربع دقائق",
  }),
  make("03_2", {
    startFrame: 474,
    durationInFrames: 51,
    focalPoint: "center",
    cameraMotion: { label: "rapid-zoom", scale: [1.0, 1.15], easing: "out", moveFrames: 18 },
    shakeIntensity: 0.8,
    transitionIn: { type: "cut" },
    hudOverlay: "warning-blink",
    sfxList: [{ file: "alert_beeps.wav", at: 3, volume: 0.45 }],
    arabicSubtitleSegment: "تجاهل السائق تحذير العاصفة",
  }),
  make("03_3", {
    startFrame: 525,
    durationInFrames: 51,
    focalPoint: "bottom-right",
    focalBiasX: 0.05,
    cameraMotion: { label: "diagonal-push", scale: [1.06, 1.16], x: [0.15, -0.12], y: [-24, 22], easing: "out" },
    shakeIntensity: 1.2,
    transitionIn: { type: "whip", frames: 6, direction: "up" },
    hudOverlay: "gauges-throttle",
    sfxList: [{ file: "throttle.wav", at: 4, volume: 0.6 }],
    arabicSubtitleSegment: "ليلحق الركاب برحلتهم",
  }),
  make("03_4", {
    startFrame: 576,
    durationInFrames: 54,
    focalPoint: "top",
    cameraMotion: { label: "cabin-sway", scale: [1.08, 1.12], rotate: [-0.8, 0.8], x: [0.2, -0.2], easing: "inOut" },
    shakeIntensity: 1,
    transitionIn: { type: "dissolve", frames: 8 },
    hudOverlay: "gauges-throttle",
    sfxList: [],
    arabicSubtitleSegment: "ليلحق الركاب برحلتهم",
  }),

  // ───────────── SCENE 04 · SPEEDING THROUGH THE STORM (630–840)
  make("04_1", {
    startFrame: 630,
    durationInFrames: 54,
    focalPoint: "center",
    focalBiasX: -0.1,
    cameraMotion: { label: "fast-parallax", scale: [1.1, 1.14], x: [0.75, -0.75], easing: "linear" },
    shakeIntensity: 4,
    transitionIn: { type: "cut" },
    hudOverlay: "none",
    sfxList: [
      { file: "train_pass.wav", at: 0, volume: 0.6 },
    ],
    arabicSubtitleSegment: "",
  }),
  make("04_2", {
    startFrame: 684,
    durationInFrames: 51,
    focalPoint: "center",
    cameraMotion: { label: "impact-zoom", scale: [1.0, 1.12], easing: "out", moveFrames: 10 },
    shakeIntensity: 4,
    transitionIn: { type: "whip", frames: 6, direction: "right" },
    hudOverlay: "none",
    sfxList: [],
    arabicSubtitleSegment: "",
  }),
  make("04_3", {
    startFrame: 735,
    durationInFrames: 51,
    focalPoint: "left",
    focalBiasX: 0.3,
    cameraMotion: { label: "tight-zoom", scale: [1.12, 1.22], easing: "inOut" },
    shakeIntensity: 3,
    transitionIn: { type: "cut" },
    hudOverlay: "none",
    sfxList: [],
    arabicSubtitleSegment: "حتى انكشف الجسر المنهار فجأة",
  }),
  make("04_4", {
    startFrame: 786,
    durationInFrames: 54,
    focalPoint: "center",
    focalBiasX: -0.2,
    cameraMotion: { label: "directional-rush", scale: [1.08, 1.2], x: [0.3, -0.3], easing: "in" },
    shakeIntensity: 6,
    transitionIn: { type: "whip", frames: 6, direction: "left" },
    hudOverlay: "none",
    sfxList: [],
    arabicSubtitleSegment: "وسط الضباب الكثيف",
  }),

  // ───────────── SCENE 05 · THE SUDDEN GAP IN THE FOG (840–1050)
  make("05_1", {
    startFrame: 840,
    durationInFrames: 54,
    focalPoint: "center",
    focalBiasX: -0.25,
    cameraMotion: { label: "fast-forward-zoom", scale: [1.0, 1.18], easing: "in" },
    shakeIntensity: 3,
    transitionIn: { type: "impact", frames: 4 },
    hudOverlay: "none",
    fx: ["red-vignette"],
    sfxList: [
      { file: "impact.wav", at: 0, volume: 0.6 },
    ],
    arabicSubtitleSegment: "لا وقت للتوقف العادي",
  }),
  make("05_2", {
    startFrame: 894,
    durationInFrames: 51,
    focalPoint: "center",
    cameraMotion: { label: "jolt", scale: [1.06, 1.12], easing: "out" },
    shakeIntensity: 2,
    transitionIn: { type: "impact", frames: 6 },
    hudOverlay: "red-alert",
    fx: ["red-vignette"],
    sfxList: [
      { file: "alarm_chime.wav", at: 2, volume: 0.4 },
      { file: "impact.wav", at: 0, volume: 0.5 },
    ],
    arabicSubtitleSegment: "على قضبان زلقة",
  }),
  make("05_3", {
    startFrame: 945,
    durationInFrames: 51,
    focalPoint: "top",
    focalBiasX: -0.12,
    cameraMotion: { label: "punch-in", scale: [1.05, 1.3], y: [0, 40], easing: "out", moveFrames: 12 },
    shakeIntensity: 2,
    transitionIn: { type: "cut" },
    hudOverlay: "none",
    fx: ["lightning"],
    sfxList: [{ file: "heartbeat.wav", at: 2, volume: 0.9 }],
    arabicSubtitleSegment: "القرار الخطأ يعني الانزلاق للأسفل",
  }),
  make("05_4", {
    startFrame: 996,
    durationInFrames: 54,
    focalPoint: "center",
    cameraMotion: { label: "rapid-scale-up", scale: [1.0, 1.32], easing: "in" },
    shakeIntensity: 3.5,
    transitionIn: { type: "cut" },
    hudOverlay: "red-alert",
    fx: ["red-vignette"],
    sfxList: [],
    arabicSubtitleSegment: "القرار الخطأ يعني الانزلاق للأسفل",
  }),

  // ───────────── SCENE 06 · REVERSE DYNAMIC BRAKING (1050–1260)
  make("06_1", {
    startFrame: 1050,
    durationInFrames: 54,
    focalPoint: "left",
    focalBiasX: 0.15,
    cameraMotion: { label: "3-step-micro-pan", scale: [1.08, 1.12], x: [0.6, -0.4], easing: "steps3" },
    shakeIntensity: 3,
    transitionIn: { type: "cut" },
    hudOverlay: "gauges-brake",
    sfxList: [{ file: "toggle_clicks.wav", at: 2, volume: 0.75 }],
    arabicSubtitleSegment: "فيقلب السائق اتجاه الدفع العكسي",
  }),
  make("06_2", {
    startFrame: 1104,
    durationInFrames: 51,
    focalPoint: "center",
    cameraMotion: { label: "gauge-zoom", scale: [1.0, 1.15], easing: "out" },
    shakeIntensity: 4,
    transitionIn: { type: "whip", frames: 6, direction: "down" },
    hudOverlay: "gauges-brake",
    sfxList: [{ file: "air_hiss.wav", at: 0, volume: 0.7 }],
    arabicSubtitleSegment: "ويضبط ضغط الهواء",
  }),
  make("06_3", {
    startFrame: 1155,
    durationInFrames: 51,
    focalPoint: "top",
    focalBiasX: -0.05,
    cameraMotion: { label: "intense-hold", scale: [1.08, 1.16], easing: "inOut" },
    shakeIntensity: 6,
    transitionIn: { type: "cut" },
    hudOverlay: "gauges-brake",
    sfxList: [],
    arabicSubtitleSegment: "في ثوانٍ حاسمة",
  }),
  make("06_4", {
    startFrame: 1206,
    durationInFrames: 54,
    focalPoint: "center",
    cameraMotion: { label: "heavy-shake", scale: [1.1, 1.14], easing: "linear" },
    shakeIntensity: 12,
    transitionIn: { type: "cut" },
    hudOverlay: "gauges-brake",
    fx: ["sparks"],
    sfxList: [{ file: "brake_screech.wav", at: 0, volume: 0.6 }],
    arabicSubtitleSegment: "",
  }),

  // ───────────── SCENE 07 · THE MIRACLE HALT (1260–1470)
  make("07_1", {
    startFrame: 1260,
    durationInFrames: 54,
    focalPoint: "right",
    focalBiasX: 0.3,
    cameraMotion: { label: "expo-dead-stop", scale: [1.12, 1.06], x: [1.0, -0.2], easing: "expo", moveFrames: 30 },
    shakeIntensity: 5,
    transitionIn: { type: "cut" },
    hudOverlay: "distance-halt",
    sfxList: [{ file: "grind_stop.wav", at: 0, volume: 0.7 }],
    arabicSubtitleSegment: "يصرخ المعدن",
  }),
  make("07_2", {
    startFrame: 1314,
    durationInFrames: 51,
    focalPoint: "right",
    focalBiasX: 0.1,
    cameraMotion: { label: "settle", scale: [1.06, 1.06], easing: "linear" },
    shakeIntensity: 0,
    transitionIn: { type: "cut" },
    hudOverlay: "distance-halt",
    sfxList: [],
    arabicSubtitleSegment: "ويتوقف القطار قبل الحافة بشعرة",
  }),
  make("07_3", {
    startFrame: 1365,
    durationInFrames: 51,
    focalPoint: "bottom",
    focalBiasX: 0.2,
    cameraMotion: { label: "pan-up", scale: [1.14, 1.16], y: [36, -36], easing: "inOut" },
    shakeIntensity: 0,
    transitionIn: { type: "dissolve", frames: 8 },
    hudOverlay: "distance-halt",
    fx: ["steam"],
    sfxList: [],
    arabicSubtitleSegment: "ويتوقف القطار قبل الحافة بشعرة",
  }),
  make("07_4", {
    startFrame: 1416,
    durationInFrames: 54,
    focalPoint: "center",
    cameraMotion: { label: "ultra-slow-pullback", scale: [1.05, 1.0], easing: "out" },
    shakeIntensity: 0,
    transitionIn: { type: "dissolve", frames: 10 },
    hudOverlay: "none",
    sfxList: [],
    arabicSubtitleSegment: "يتنفس الجميع الصعداء",
  }),

  // ───────────── SCENE 08 · THE CLIFFHANGER ENDING (1470–1710)
  make("08_1", {
    startFrame: 1470,
    durationInFrames: 60,
    focalPoint: "left",
    cameraMotion: { label: "reveal-pan", scale: [1.06, 1.08], x: [0.9, 0.1], easing: "inOut" },
    shakeIntensity: 0,
    transitionIn: { type: "fade-black", frames: 15 },
    hudOverlay: "none",
    sfxList: [
      { file: "exhale.wav", at: -8, volume: 0.55 },
      { file: "door_slide.wav", at: 10, volume: 0.6 },
      { file: "engine_hum.wav", at: 0, volume: 0.15, frames: 234 },
    ],
    arabicSubtitleSegment: "لكن الباب يُفتح",
  }),
  make("08_2", {
    startFrame: 1530,
    durationInFrames: 60,
    focalPoint: "right",
    focalBiasX: 0.0,
    cameraMotion: { label: "ominous-push-in", scale: [1.0, 1.1], y: [0, 30], easing: "inOut" },
    shakeIntensity: 0,
    transitionIn: { type: "cut" },
    hudOverlay: "none",
    sfxList: [{ file: "footsteps.wav", at: 4, volume: 0.65 }],
    arabicSubtitleSegment: "ويقول صوت هادئ",
  }),
  make("08_3", {
    startFrame: 1590,
    durationInFrames: 46,
    focalPoint: "left",
    focalBiasX: 0.15,
    cameraMotion: { label: "reaction-tilt", scale: [1.08, 1.12], rotate: [0, -1.5], easing: "out" },
    shakeIntensity: 0.4,
    transitionIn: { type: "cut" },
    hudOverlay: "none",
    sfxList: [],
    arabicSubtitleSegment: "نجوت من السقوط",
  }),
  make("08_4", {
    startFrame: 1636,
    durationInFrames: 74,
    focalPoint: "right",
    focalBiasX: 0.25,
    cameraMotion: { label: "slow-zoom-to-hand", scale: [1.0, 1.22], x: [0, -0.35], easing: "in" },
    shakeIntensity: 0,
    transitionIn: { type: "cut" },
    hudOverlay: "none",
    sfxList: [],
    arabicSubtitleSegment: "لكن انظر إلى ما ينتظرك في الأسفل",
  }),
];

/** Lightning flashes: [frame, strength]. Synced with thunder cues. */
export const lightningFlashes: Array<[number, number]> = [
  [216, 0.35],
  [321, 1],
  [329, 0.6],
  [952, 0.55],
  [957, 0.3],
];

/** Scene-wide background ambience levels (rain loop) per frame range. */
export const ambienceRanges: Array<{ from: number; to: number; rain: number }> = [
  { from: 0, to: 420, rain: 0.048 },
  { from: 420, to: 630, rain: 0.021 }, // muffled inside the cab
  { from: 630, to: 1050, rain: 0.054 },
  { from: 1050, to: 1260, rain: 0.024 },
  { from: 1260, to: 1416, rain: 0.045 },
  { from: 1416, to: 1470, rain: 0.018 }, // eerie silence
  { from: 1470, to: 1704, rain: 0.015 },
];
