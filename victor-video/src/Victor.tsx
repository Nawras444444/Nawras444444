import React, { createContext, useContext } from "react";
import * as THREE from "three";
import { C, clamp, ease, geo, glowTex, prog, rnd } from "./lib";

export type Pose = {
  walkPhase: number;
  walkAmt: number;
  armRRaise: number; // 0..1 reach forward
  armRElbow: number;
  headYaw: number;
  headPitch: number;
  eyes: number; // 0..1 open
  core: number; // chest glow 0..1
  sway: number;
};

const BUILD_START = 10.4;
const BUILD_STEP = 0.3;
const BUILD_DUR = 0.95;
export const buildEnd = (k: number) => BUILD_START + k * BUILD_STEP + BUILD_DUR;

const GlowCtx = createContext(0);

type Kind = "white" | "blue" | "metal" | "visor" | "hand";
const MAT: Record<Kind, { color: string; roughness: number; metalness: number }> = {
  white: { color: C.white, roughness: 0.55, metalness: 0 },
  blue: { color: C.blue, roughness: 0.42, metalness: 0.05 },
  metal: { color: C.metal, roughness: 0.26, metalness: 0.95 },
  visor: { color: "#05070b", roughness: 0.12, metalness: 0.4 },
  hand: { color: "#d9dee5", roughness: 0.45, metalness: 0.1 },
};

const M: React.FC<{ kind: Kind }> = ({ kind }) => {
  const g = useContext(GlowCtx);
  const m = MAT[kind];
  return (
    <meshStandardMaterial
      color={m.color}
      roughness={m.roughness}
      metalness={m.metalness}
      emissive="#7fdcff"
      emissiveIntensity={g * 2.2}
      envMapIntensity={kind === "metal" ? 1.1 : 0.55}
    />
  );
};

const Glow: React.FC<{ color: string; size: number; opacity: number; position?: [number, number, number] }> = ({
  color,
  size,
  opacity,
  position = [0, 0, 0],
}) =>
  opacity <= 0.001 ? null : (
    <sprite position={position} scale={[size, size, size]}>
      <spriteMaterial
        map={glowTex()}
        color={color}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        toneMapped={false}
      />
    </sprite>
  );

const Part: React.FC<{ t: number; k: number; children: React.ReactNode }> = ({ t, k, children }) => {
  const s = BUILD_START + k * BUILD_STEP;
  const raw = prog(t, s, s + BUILD_DUR);
  if (raw <= 0) return null;
  const p = ease.out(raw);
  const q = 1 - p;
  const end = s + BUILD_DUR;
  const glow = raw < 1 ? 0.35 + 0.65 * raw : Math.exp(-(t - end) * 2.5);
  const sx = (rnd(k * 5.1) - 0.5) * 7;
  const sy = rnd(k * 2.3) * 3 + 0.8;
  const sz = (rnd(k * 8.7) - 0.5) * 6;
  const flash = t >= end ? Math.exp(-(t - end) * 5) : 0;
  return (
    <GlowCtx.Provider value={glow}>
      <group
        position={[sx * q, sy * q, sz * q]}
        rotation={[q * (rnd(k) - 0.5) * 8, q * (rnd(k + 1) - 0.5) * 8, q * (rnd(k + 2) - 0.5) * 8]}
        scale={0.25 + 0.75 * p}
      >
        {children}
        <Glow color={C.sky} size={0.9} opacity={flash * 0.8} />
      </group>
    </GlowCtx.Provider>
  );
};

const Mesh: React.FC<{
  g: THREE.BufferGeometry;
  kind: Kind;
  position?: [number, number, number];
  scale?: [number, number, number] | number;
  rotation?: [number, number, number];
}> = ({ g, kind, position, scale, rotation }) => (
  <mesh geometry={g} position={position} scale={scale} rotation={rotation}>
    <M kind={kind} />
  </mesh>
);

const capsules = new Map<string, THREE.CapsuleGeometry>();
const capsule = (r: number, l: number) => {
  const key = `${r}_${l}`;
  if (!capsules.has(key)) capsules.set(key, new THREE.CapsuleGeometry(r, l, 8, 20));
  return capsules.get(key)!;
};

let visorGeo: THREE.SphereGeometry | null = null;
const visor = () =>
  (visorGeo ??= new THREE.SphereGeometry(0.2245, 48, 24, Math.PI / 2 - 0.78, 1.56, Math.PI / 2 - 0.36, 0.6));

export const Victor: React.FC<{ t: number; pose: Pose; position: [number, number, number]; rotY: number }> = ({
  t,
  pose,
  position,
  rotY,
}) => {
  const G = geo();
  const { walkPhase: ph, walkAmt: wa } = pose;
  const swing = Math.sin(ph) * 0.55 * wa;
  const bob = Math.abs(Math.cos(ph)) * 0.035 * wa;
  const breathe = Math.sin(t * 2.1) * 0.006;

  const leg = (side: 1 | -1, kBase: number) => {
    const a = side * swing;
    const knee = (0.08 + 0.55 * Math.max(0, Math.sin(ph * side + Math.PI * 0.35 * side))) * wa;
    return (
      <group position={[side * 0.12, -0.02, 0]} rotation={[-a, 0, 0]}>
        <Part t={t} k={kBase + 2}>
          <Mesh g={G.sphere} kind="metal" scale={0.072} />
          <Mesh g={capsule(0.07, 0.2)} kind="white" position={[0, -0.19, 0]} />
        </Part>
        <group position={[0, -0.38, 0]} rotation={[knee, 0, 0]}>
          <Part t={t} k={kBase + 1}>
            <Mesh g={G.sphere} kind="metal" scale={0.066} />
            <Mesh g={G.sphere} kind="blue" position={[0, 0, 0.045]} scale={[0.06, 0.055, 0.035]} />
            <Mesh g={capsule(0.076, 0.2)} kind="white" position={[0, -0.19, 0]} />
          </Part>
          <group position={[0, -0.38, 0]} rotation={[-knee * 0.4 + a * 0.3, 0, 0]}>
            <Part t={t} k={kBase}>
              <Mesh g={G.rboxSoft} kind="white" position={[0, -0.005, 0.05]} scale={[0.19, 0.11, 0.32]} />
              <Mesh g={G.box} kind="blue" position={[0, -0.05, 0.05]} scale={[0.17, 0.012, 0.3]} />
            </Part>
          </group>
        </group>
      </group>
    );
  };

  const arm = (side: 1 | -1, kBase: number) => {
    const isR = side === -1; // Victor's right arm is on -x when facing +z
    const reach = isR ? pose.armRRaise : 0;
    const swingA = side * swing * 0.75 * (1 - reach);
    const elbow = isR ? -pose.armRElbow : -0.18 - 0.25 * wa * Math.max(0, -side * Math.sin(ph));
    return (
      <group
        position={[side * 0.275, 0.44, 0]}
        rotation={[swingA - reach * 1.35, 0, side * (0.1 + 0.03 * Math.sin(t * 1.3))]}
      >
        <Part t={t} k={kBase + 3}>
          <Mesh g={G.sphere} kind="metal" scale={0.075} />
          <Mesh g={G.sphere} kind="blue" position={[side * 0.025, 0.02, 0]} scale={[0.085, 0.08, 0.09]} />
        </Part>
        <Part t={t} k={kBase + 2}>
          <Mesh g={capsule(0.055, 0.15)} kind="white" position={[0, -0.16, 0]} />
        </Part>
        <group position={[0, -0.31, 0]} rotation={[elbow, 0, 0]}>
          <Part t={t} k={kBase + 1}>
            <Mesh g={G.sphere} kind="metal" scale={0.056} />
            <Mesh g={capsule(0.058, 0.14)} kind="white" position={[0, -0.14, 0]} />
            <Mesh g={G.torus} kind="metal" position={[0, -0.235, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[0.066, 0.066, 0.2]} />
          </Part>
          <group position={[0, -0.3, 0]} rotation={[reach * 0.5, 0, 0]}>
            <Part t={t} k={kBase}>
              <Mesh g={G.sphere} kind="hand" scale={[0.055, 0.05, 0.042]} />
              {[-1, 0, 1].map((f) => (
                <group key={f} rotation={[0.15 * reach, 0, f * 0.38]} position={[f * 0.025, -0.035, 0.012]}>
                  <Mesh g={capsule(0.014, 0.04)} kind="hand" position={[0, -0.03, 0]} />
                  <Mesh g={G.sphere} kind="white" position={[0, -0.065, 0]} scale={0.019} />
                </group>
              ))}
            </Part>
          </group>
        </group>
      </group>
    );
  };

  const eyeOpen = clamp(pose.eyes);
  const blink = t > 30 && Math.abs(((t - 30) % 4.3) - 2) < 0.06 ? 0.15 : 1;
  const eyeY = Math.max(0.08, eyeOpen) * blink;

  return (
    <group position={position} rotation={[0, rotY, pose.sway]}>
      {/* contact shadow */}
      {t > 15.5 && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.004, 0]} scale={[1.0, 0.8, 1]}>
          <planeGeometry args={[1, 1]} />
          <meshBasicMaterial map={glowTex()} color="#000000" transparent opacity={0.65 * prog(t, 15.5, 16.5)} depthWrite={false} />
        </mesh>
      )}
      <group position={[0, 0.82 + bob, 0]}>
        <Part t={t} k={4}>
          <Mesh g={G.sphere} kind="blue" scale={[0.2, 0.12, 0.16]} />
        </Part>
        {leg(1, 0)}
        {leg(-1, 1)}
        <group position={[0, 0.07, 0]} rotation={[0.04 * wa, -swing * 0.12, 0]}>
          <Part t={t} k={5}>
            <Mesh g={G.cyl} kind="blue" position={[0, 0.07, 0]} scale={[0.13, 0.14, 0.12]} />
            <Mesh g={G.rboxSoft} kind="white" position={[0, 0.32 + breathe, 0]} scale={[0.44, 0.36, 0.27]} />
            <Mesh g={G.box} kind="blue" position={[0, 0.2, 0.125]} scale={[0.3, 0.025, 0.02]} />
            <Mesh g={G.box} kind="blue" position={[0.2, 0.32, 0]} scale={[0.03, 0.22, 0.2]} />
            <Mesh g={G.box} kind="blue" position={[-0.2, 0.32, 0]} scale={[0.03, 0.22, 0.2]} />
          </Part>
          <Part t={t} k={6}>
            <Mesh g={G.torus} kind="metal" position={[0, 0.34, 0.135]} scale={[0.072, 0.072, 0.25]} />
            <mesh geometry={G.sphere} position={[0, 0.34, 0.132]} scale={0.052}>
              <meshBasicMaterial color={new THREE.Color(C.orange).multiplyScalar(1 + pose.core * 1.5)} toneMapped={false} />
            </mesh>
            <Glow color={C.orange} size={0.42 + 0.1 * pose.core} opacity={0.55 * pose.core} position={[0, 0.34, 0.16]} />
          </Part>
          {arm(1, 7)}
          {arm(-1, 7)}
          <Part t={t} k={11}>
            <Mesh g={G.cyl} kind="metal" position={[0, 0.56, 0]} scale={[0.045, 0.1, 0.045]} />
          </Part>
          <group position={[0, 0.62, 0]} rotation={[pose.headPitch, pose.headYaw, 0]}>
            <Part t={t} k={12}>
              <Mesh g={G.sphere} kind="white" position={[0, 0.17, 0]} scale={0.22} />
              <mesh geometry={G.torusThin} position={[0, 0.17, 0]} rotation={[0, Math.PI / 2, 0]} scale={0.221}>
                <meshStandardMaterial color="#c9d0d8" roughness={0.6} />
              </mesh>
            </Part>
            <Part t={t} k={13}>
              <mesh geometry={visor()} position={[0, 0.17, 0]}>
                <M kind="visor" />
              </mesh>
            </Part>
            <Part t={t} k={14}>
              {[1, -1].map((s) => (
                <group key={s} position={[s * 0.215, 0.17, 0]} rotation={[0, 0, Math.PI / 2]}>
                  <Mesh g={G.cyl} kind="blue" scale={[0.075, 0.05, 0.075]} />
                  <Mesh g={G.cyl} kind="white" position={[0, -s * 0.02, 0]} scale={[0.048, 0.02, 0.048]} />
                </group>
              ))}
            </Part>
            {eyeOpen > 0 &&
              [1, -1].map((s) => (
                <group key={s} position={[s * 0.068, 0.185, 0.212]} rotation={[0, s * 0.3, 0]}>
                  <mesh geometry={G.sphere} scale={[0.034, 0.045 * eyeY, 0.012]}>
                    <meshBasicMaterial color={new THREE.Color("#8fe4ff").multiplyScalar(1.6)} toneMapped={false} />
                  </mesh>
                  <Glow color={C.sky} size={0.22} opacity={0.7 * eyeOpen * blink} position={[0, 0, 0.02]} />
                </group>
              ))}
          </group>
        </group>
      </group>
    </group>
  );
};
