import * as THREE from "three";
import { RoundedBoxGeometry } from "three/examples/jsm/geometries/RoundedBoxGeometry.js";

export const FPS = 30;
export const DURATION_S = 60;

export const clamp = (x: number, a = 0, b = 1) => Math.min(b, Math.max(a, x));
export const prog = (t: number, a: number, b: number) => clamp((t - a) / (b - a));
export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const ease = {
  out: (x: number) => 1 - Math.pow(1 - x, 3),
  in: (x: number) => x * x * x,
  inOut: (x: number) => (x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2),
  sine: (x: number) => 0.5 - 0.5 * Math.cos(Math.PI * x),
  back: (x: number) => {
    const c = 1.6;
    return 1 + (c + 1) * Math.pow(x - 1, 3) + c * Math.pow(x - 1, 2);
  },
  expo: (x: number) => (x >= 1 ? 1 : 1 - Math.pow(2, -10 * x)),
};
export const rnd = (i: number) => {
  const s = Math.sin(i * 127.1 + 311.7) * 43758.5453;
  return s - Math.floor(s);
};
export const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);

// Palette
export const C = {
  night: "#060a12",
  fog: "#0b1424",
  sky: "#5fd0ff",
  skyDeep: "#2f8ff0",
  white: "#eef1f5",
  blue: "#2f6fd6",
  orange: "#ff9a3c",
  metal: "#b9c0c8",
};

// ---------- procedural textures (deterministic) ----------
const canvasTex = (size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void) => {
  const cv = document.createElement("canvas");
  cv.width = cv.height = size;
  const ctx = cv.getContext("2d")!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(cv);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
};

let _glow: THREE.Texture | null = null;
export const glowTex = () =>
  (_glow ??= canvasTex(128, (ctx, s) => {
    const g = ctx.createRadialGradient(s / 2, s / 2, 0, s / 2, s / 2, s / 2);
    g.addColorStop(0, "rgba(255,255,255,1)");
    g.addColorStop(0.15, "rgba(255,255,255,0.75)");
    g.addColorStop(0.4, "rgba(255,255,255,0.22)");
    g.addColorStop(0.7, "rgba(255,255,255,0.05)");
    g.addColorStop(1, "rgba(255,255,255,0)");
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, s, s);
  }));

let _fog: THREE.Texture | null = null;
export const fogTex = () => {
  if (_fog) return _fog;
  _fog = canvasTex(512, (ctx, s) => {
    ctx.clearRect(0, 0, s, s);
    for (let i = 0; i < 140; i++) {
      const x = rnd(i * 3.1) * s;
      const y = s * 0.2 + rnd(i * 7.7) * s * 0.6;
      const r = 40 + rnd(i * 1.3) * 130;
      const a = 0.04 + rnd(i * 9.1) * 0.08;
      for (const dx of [-s, 0, s]) {
        const g = ctx.createRadialGradient(x + dx, y, 0, x + dx, y, r);
        g.addColorStop(0, `rgba(255,255,255,${a})`);
        g.addColorStop(1, "rgba(255,255,255,0)");
        ctx.fillStyle = g;
        ctx.fillRect(x + dx - r, y - r, 2 * r, 2 * r);
      }
    }
    // soften top & bottom
    const m = ctx.createLinearGradient(0, 0, 0, s);
    m.addColorStop(0, "rgba(0,0,0,1)");
    m.addColorStop(0.25, "rgba(0,0,0,0)");
    m.addColorStop(0.75, "rgba(0,0,0,0)");
    m.addColorStop(1, "rgba(0,0,0,1)");
    ctx.globalCompositeOperation = "destination-out";
    ctx.fillStyle = m;
    ctx.fillRect(0, 0, s, s);
  });
  _fog.wrapS = THREE.RepeatWrapping;
  return _fog;
};

// ---------- shared geometries ----------
let _geo: ReturnType<typeof makeGeo> | null = null;
const makeGeo = () => ({
  rbox: new RoundedBoxGeometry(1, 1, 1, 3, 0.08),
  rboxSoft: new RoundedBoxGeometry(1, 1, 1, 4, 0.22),
  box: new THREE.BoxGeometry(1, 1, 1),
  sphere: new THREE.SphereGeometry(1, 40, 28),
  sphereLo: new THREE.SphereGeometry(1, 16, 12),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 40),
  torus: new THREE.TorusGeometry(1, 0.06, 16, 80),
  torusThin: new THREE.TorusGeometry(1, 0.025, 10, 80),
  plane: new THREE.PlaneGeometry(1, 1),
});
export const geo = () => (_geo ??= makeGeo());

const _fogVariants = new Map<string, THREE.Texture>();
export const fogTexV = (key: string) => {
  if (!_fogVariants.has(key)) {
    const t = fogTex().clone();
    t.needsUpdate = true;
    t.wrapS = THREE.RepeatWrapping;
    _fogVariants.set(key, t);
  }
  return _fogVariants.get(key)!;
};
