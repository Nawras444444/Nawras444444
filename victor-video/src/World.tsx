import React, { useMemo } from "react";
import { useThree } from "@react-three/fiber";
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import { C, clamp, ease, prog, V3 } from "./lib";
import { Victor, Pose } from "./Victor";
import { Arches, BackFog, BridgeCubes, Buildings, Grid, Ground, Rings, Silhouettes, Tower, TOWER_Z } from "./City";
import { Ambient, Burst, FinalPoint, GlowSprite, LightLines, LightPoint, Orb } from "./Effects";

// ---------------- Victor's timeline ----------------
const WALK1 = [25.3, 32.8] as const;
const Z_STOP = -11.25;
const WALK2 = [48.2, 52.3] as const;
const Z_END = -19.8;

const victorZ = (t: number) => {
  if (t < WALK1[0]) return 0;
  if (t < WALK1[1]) return -1.5 * (t - WALK1[0]);
  if (t < WALK2[0]) return Z_STOP;
  if (t < WALK2[1]) return Z_STOP + (Z_END - Z_STOP) * ((t - WALK2[0]) / (WALK2[1] - WALK2[0]));
  return Z_END;
};

const victorPose = (t: number): Pose => {
  const w1 = prog(t, WALK1[0], WALK1[0] + 0.3) * (1 - prog(t, WALK1[1] - 0.3, WALK1[1]));
  const w2 = prog(t, WALK2[0], WALK2[0] + 0.3) * (1 - prog(t, WALK2[1] - 0.3, WALK2[1]));
  const walkAmt = Math.max(w1, w2 * 1.15);
  const walkPhase =
    t < WALK2[0] ? 2 * Math.PI * (t - WALK1[0]) : 2 * Math.PI * (t - WALK2[0]);
  // pushing the shapes 40.3 -> 47.6
  const push = ease.inOut(prog(t, 40.2, 40.8)) * (1 - ease.inOut(prog(t, 47.2, 48.0)));
  const pushWave = push * (0.8 + 0.12 * Math.sin((t - 40.2) * 4));
  // reaching to the tower
  const reach = ease.inOut(prog(t, 52.2, 52.8)) * (1 - ease.inOut(prog(t, 53.7, 54.5)));
  let headPitch = 0;
  let headYaw = 0;
  if (t > 16 && t < 18.5) headYaw = Math.sin((t - 16) * 1.6) * 0.25;
  if (t > 19 && t < 24.2) headYaw = Math.sin((t - 19) * 0.9) * 0.4, (headPitch = -0.08 * Math.sin((t - 19) * 0.7));
  headPitch += 0.38 * ease.inOut(prog(t, 32.7, 33.6)) * (1 - ease.inOut(prog(t, 35.0, 35.8)));
  if (t > 35.4 && t < 40.2) headYaw += Math.sin((t - 35.4) * 1.3) * 0.45 * prog(t, 35.4, 36);
  headPitch += 0.1 * push;
  headPitch -= 0.35 * ease.inOut(prog(t, 54.6, 55.6));
  if (t > 25 && t < 32.5) headYaw += Math.sin(t * 0.8) * 0.2;
  return {
    walkPhase,
    walkAmt,
    armRRaise: Math.max(pushWave, reach * 1.15),
    armRElbow: 0.25 + 0.2 * push - 0.1 * reach,
    headYaw,
    headPitch,
    eyes: ease.out(prog(t, 15.75, 16.05)),
    core: prog(t, 12.5, 13.5) * (t > 51.4 && t < 53.2 ? 0.4 : 1),
    sway: Math.sin(t * 1.1) * 0.006 * (1 - walkAmt),
  };
};

const victorRot = (t: number) => Math.PI * ease.inOut(prog(t, 24.2, 25.3));

// ---------------- the orb ----------------
const SOCKET = V3(0, 1.5, TOWER_Z + 1.0);
const orbState = (t: number) => {
  if (t < 51.4) return { pos: V3(), amount: 0, placed: 0 };
  const chest = V3(0, 1.23, Z_END - 0.16);
  const hand = V3(-0.05, 1.42, Z_END - 0.55);
  let pos: THREE.Vector3;
  if (t < 52.6) pos = chest.clone().lerp(hand, ease.inOut(prog(t, 51.4, 52.4)));
  else pos = hand.clone().lerp(SOCKET, ease.inOut(prog(t, 52.6, 53.2)));
  pos.y += t < 52.6 ? Math.sin(t * 5) * 0.015 : 0;
  return { pos, amount: ease.out(prog(t, 51.4, 51.9)), placed: t >= 53.2 ? 1 : 0 };
};

// ---------------- camera ----------------
type Shot = { p: THREE.Vector3; tg: THREE.Vector3 };
const vpos = (t: number) => V3(0, 0, victorZ(t));
const orbit = (a: number, r: number, h: number, c = V3()) => V3(c.x + Math.sin(a) * r, h, c.z + Math.cos(a) * r);

const SHOTS: { at: number; dur: number; fn: (t: number) => Shot }[] = [
  {
    at: -1,
    dur: 0,
    fn: (t) => {
      if (t < 5) return { p: V3(0, 1.0, 5.5 - 1.6 * ease.sine(t / 5)), tg: V3(0, 1, 0) };
      const k = prog(t, 5, 10);
      return { p: orbit(k * 0.6, 3.9 + 1.4 * ease.sine(k), 1.0 + 0.4 * k), tg: V3(0, 1, 0) };
    },
  },
  {
    at: 9.6,
    dur: 1.4,
    fn: (t) => {
      const k = ease.sine(prog(t, 10, 16));
      return { p: orbit(0.6 - 1.1 * k, 4.8 - 1.4 * k, 1.5 - 0.1 * k), tg: V3(0, 0.95 + 0.25 * k, 0) };
    },
  },
  {
    at: 15.0,
    dur: 0.7,
    fn: (t) => {
      const k = ease.sine(prog(t, 15, 18.5));
      return { p: V3(0.28 - 0.12 * k, 1.72, 1.35 - 0.3 * k), tg: V3(0, 1.69, 0) };
    },
  },
  {
    at: 17.9,
    dur: 1.3,
    fn: (t) => {
      const k = ease.inOut(prog(t, 18, 25.4));
      const s = Math.sin(Math.PI * k);
      return { p: orbit(0.15 + 2.48 * k, 4.1 + 3.6 * s, 1.6 + 4.6 * s), tg: V3(0, 1.3 + 1.2 * s, -1.5 * s) };
    },
  },
  {
    at: 25.0,
    dur: 0.8,
    fn: (t) => {
      const v = vpos(t);
      const d = Math.sin(t * 0.4) * 0.25;
      return { p: v.clone().add(V3(2.1 + d, 1.6, -3.6)), tg: v.clone().add(V3(0, 1.25, -0.4)) };
    },
  },
  {
    at: 31.4,
    dur: 2.2,
    fn: (t) => {
      const k = ease.sine(prog(t, 32, 40));
      return { p: V3(3.4 - 0.8 * k, 3.9 - 0.5 * k, -5.4 - 1.4 * k), tg: V3(0, -0.2 + 0.4 * k, -15.2) };
    },
  },
  {
    at: 39.6,
    dur: 1.4,
    fn: (t) => {
      const k = ease.sine(prog(t, 40, 48));
      return { p: V3(7.6 - 0.6 * k, 3.4 - 0.3 * k, -12.3 - 3.2 * k), tg: V3(0, 0.2 + 0.2 * k, -14.2 - 1.4 * k) };
    },
  },
  {
    at: 47.6,
    dur: 1.2,
    fn: (t) => {
      const v = vpos(t);
      return { p: v.clone().add(V3(2.3, 1.9, 3.8)), tg: V3(0, 1.8, TOWER_Z) };
    },
  },
  {
    at: 51.8,
    dur: 1.0,
    fn: (t) => {
      const k = ease.sine(prog(t, 52, 55));
      return { p: V3(2.0 - 0.3 * k, 1.8, -18.2 - 0.3 * k), tg: V3(-0.1, 1.45, -20.6) };
    },
  },
  {
    at: 54.9,
    dur: 0.8,
    fn: (t) => {
      const k1 = ease.out(prog(t, 55, 56));
      const k2 = Math.pow(prog(t, 55.8, 59.2), 1.6);
      const a = V3(2.0, 1.8, -18.4).lerp(V3(4.2, 3.4, -13.5), k1);
      const p = a.lerp(V3(0, 170, 250), ease.inOut(k2));
      return { p, tg: V3(0, 2.6 - 1.2 * k2, TOWER_Z) };
    },
  },
];

const camera = (t: number): Shot => {
  let cur = SHOTS[0].fn(t);
  for (let i = 1; i < SHOTS.length; i++) {
    const s = SHOTS[i];
    const w = ease.inOut(prog(t, s.at, s.at + s.dur));
    if (w <= 0) continue;
    const n = s.fn(t);
    cur = { p: cur.p.clone().lerp(n.p, w), tg: cur.tg.clone().lerp(n.tg, w) };
  }
  // subtle handheld float
  cur.p.x += Math.sin(t * 0.7) * 0.03;
  cur.p.y += Math.sin(t * 0.53 + 1) * 0.025;
  return cur;
};

// ---------------- scene ----------------
const Env: React.FC = () => {
  const { gl, scene } = useThree();
  useMemo(() => {
    const pm = new THREE.PMREMGenerator(gl);
    scene.environment = pm.fromScene(new RoomEnvironment(), 0.04).texture;
    scene.environmentIntensity = 0.6;
  }, [gl, scene]);
  return null;
};

export const World: React.FC<{ t: number }> = ({ t }) => {
  const { camera: cam } = useThree();
  const shot = camera(t);
  cam.position.copy(shot.p);
  cam.lookAt(shot.tg);
  cam.updateMatrixWorld();

  const keyLight = useMemo(() => new THREE.DirectionalLight("#fff4e8", 1.7), []);
  const rimLight = useMemo(() => new THREE.DirectionalLight("#5fb8ff", 3.2), []);
  const dir = shot.tg.clone().sub(shot.p).normalize();
  const side = new THREE.Vector3().crossVectors(dir, V3(0, 1, 0)).normalize();
  keyLight.position.copy(shot.tg).addScaledVector(dir, -8).addScaledVector(side, -5).add(V3(0, 7, 0));
  keyLight.target.position.copy(shot.tg);
  keyLight.target.updateMatrixWorld();
  rimLight.position.copy(shot.tg).addScaledVector(dir, 10).addScaledVector(side, 3).add(V3(0, 5, 0));
  rimLight.target.position.copy(shot.tg);
  rimLight.target.updateMatrixWorld();

  const lit = ease.inOut(prog(t, 55.0, 55.9));
  const wave = t > 55.2 ? (t - 55.2) * 32 : 0;
  const reveal = t > 18.4 ? clamp((t - 18.4) * 14, 0, 150) : 0;
  const worldOn = t > 18.4 ? 1 : 0;
  const victorOn = t > 10.3;
  const vp = vpos(t);
  const orb = orbState(t);
  const preWorldLight = 1 - prog(t, 17, 19);
  const fogDensity = 0.022 - 0.006 * prog(t, 55.5, 58.5);

  return (
    <>
      <Env />
      <color attach="background" args={[C.night]} />
      <fogExp2 attach="fog" args={[C.fog, fogDensity]} />
      <hemisphereLight args={["#7d9cc4", "#0a0f18", 0.55 + 0.6 * lit]} />
      <primitive object={keyLight} intensity={t < 10 ? 0.5 : 1.7} />
      <primitive object={keyLight.target} />
      <primitive object={rimLight} />
      <primitive object={rimLight.target} />
      {/* soft fill from the initial light while Victor is being built */}
      <pointLight position={[0, 2.2, 1.6]} intensity={preWorldLight * 6} distance={7} color="#bfe9ff" />
      {victorOn && (
        <pointLight position={[vp.x, 1.25, vp.z + (t > 25 ? -0.4 : 0.4)]} intensity={1.2} distance={2.2} color={C.orange} />
      )}
      {orb.amount > 0 && <pointLight position={orb.pos.toArray()} intensity={4 * orb.amount} distance={4} color="#ffb070" />}
      {lit > 0 && <pointLight position={[0, 2.5, TOWER_Z + 2]} intensity={25 * lit} distance={30} color="#7fd4ff" />}

      <LightPoint t={t} />
      <Burst t={t} />
      <LightLines t={t} />
      <Ambient t={t} amount={prog(t, 0.5, 3)} />

      {worldOn > 0 && (
        <>
          <Ground t={t} visible={prog(t, 18.4, 19.4)} />
          <Grid reveal={reveal} wave={wave} bright={1} cam={shot.p} />
          <Buildings t={t} wave={wave} />
          <Arches t={t} wave={wave} />
          <Rings t={t} wave={wave} />
          <Silhouettes t={t} wave={wave} />
          <BackFog t={t} amount={prog(t, 21, 24)} />
          <Tower t={t} placed={orb.placed} lit={lit} />
          <BridgeCubes t={t} victorPos={vp} />
        </>
      )}

      {victorOn && <Victor t={t} pose={victorPose(t)} position={[vp.x, vp.y, vp.z]} rotY={victorRot(t)} />}
      {victorOn && t < 13 && <GlowSprite position={[0, 0.9, 0]} size={2.5} color={C.sky} opacity={0.25 * (1 - prog(t, 11.5, 13))} />}
      <Orb t={t} position={orb.pos} amount={orb.amount} placed={orb.placed} />
      <FinalPoint t={t} position={SOCKET} cam={shot.p} />
    </>
  );
};
