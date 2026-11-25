import { loadFont } from "@remotion/fonts";
import { staticFile } from "remotion";

// Font system (3 families), bundled locally in public/fonts:
// Cairo      -> captions, numbers, hooks
// Amiri      -> the wise man's question (literary / quote)
// Aref Ruqaa -> the single closing key phrase
const AR = "U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0897-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC";
const LA = "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2190-2199, U+2212, U+2215, U+27A1, U+FEFF, U+FFFD";
const reg = (family: string, file: string, weights: string[]) => {
  for (const weight of weights) {
    loadFont({ family, url: staticFile(`fonts/${file}-ar.woff2`), weight, unicodeRange: AR });
    loadFont({ family, url: staticFile(`fonts/${file}-la.woff2`), weight, unicodeRange: LA });
  }
};
reg("Cairo", "cairo", ["700", "900"]);
reg("Amiri", "amiri", ["700"]);
reg("Aref Ruqaa", "ruqaa", ["700"]);

export const cairo = "Cairo";
export const amiri = "Amiri";
export const ruqaa = "'Aref Ruqaa'";

export const C = {
  navy: "#0F172A",
  gold: "#FBBF24",
  gold2: "#FACC15",
  emerald: "#10B981",
  coral: "#F43F5E",
  sky: "#38BDF8",
  white: "#FFFFFF",
};

export const FPS = 30;
export const LEAD = 0.35; // seconds of silence before each voice line
export const TRANSITION = 12; // frames

// Narration clip lengths in seconds (public/vo/voN.wav)
export const VO = [6.79, 12.25, 6.69, 2.21, 6.76, 6.83, 12.5, 10.5];
const TAILS = [0.6, 0.6, 0.6, 1.1, 0.6, 0.6, 0.6, 2.4];
const LEADS = [0.5, LEAD, LEAD, LEAD, LEAD, LEAD, LEAD, LEAD];

export const sceneLead = (i: number) => Math.round(LEADS[i] * FPS);
export const sceneFrames = (i: number) => Math.ceil((LEADS[i] + VO[i] + TAILS[i]) * FPS);
export const totalFrames = () =>
  VO.reduce((a, _, i) => a + sceneFrames(i), 0) - TRANSITION * (VO.length - 1);
