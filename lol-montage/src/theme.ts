import { cancelRender, continueRender, delayRender, staticFile } from "remotion";

// Fonts are self-hosted from public/fonts (same families as @remotion/google-fonts:
// Cinzel, Rajdhani, Orbitron). Self-hosting keeps renders working offline / behind proxies.
const FACES: { family: string; file: string; weight: string }[] = [
  { family: "Cinzel", file: "Cinzel-700.woff2", weight: "400 900" },
  { family: "Rajdhani", file: "Rajdhani-600.woff2", weight: "600" },
  { family: "Rajdhani", file: "Rajdhani-700.woff2", weight: "700" },
  { family: "Orbitron", file: "Orbitron-700.woff2", weight: "400 900" },
];

if (typeof document !== "undefined") {
  const handle = delayRender("Loading self-hosted fonts");
  Promise.all(
    FACES.map(async (f) => {
      const face = new FontFace(f.family, `url(${staticFile(`fonts/${f.file}`)}) format("woff2")`, {
        weight: f.weight,
      });
      await face.load();
      document.fonts.add(face);
    }),
  )
    .then(() => continueRender(handle))
    .catch((e) => cancelRender(e));
}

export const FONTS = {
  display: "Cinzel, serif",
  ui: "Rajdhani, sans-serif",
  tech: "Orbitron, sans-serif",
};

// Hextech blue + arcane purple palette
export const THEME = {
  bg: "#04061a",
  surface: "#0b1030",
  primary: "#38bdf8",
  secondary: "#a855f7",
  accent: "#c8aa6e", // hextech gold trim
  text: "#eaf4ff",
  muted: "#8aa0c8",
  glow: "#6366f1",
};

export const SKILL_COLORS = {
  Q: "#38bdf8",
  W: "#a855f7",
  E: "#6366f1",
  R: "#e879f9",
} as const;

export type SkillKey = keyof typeof SKILL_COLORS;
export const W = 1920;
export const H = 1080;
export const FPS = 30;
