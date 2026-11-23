import React, { useMemo } from "react";
import * as THREE from "three";
import { C, clamp, ease, glowTex, lerp, prog, rnd } from "./lib";

export const CENTER = new THREE.Vector3(0, 1.0, 0);

const add = THREE.AdditiveBlending;

export const GlowSprite: React.FC<{
  position: THREE.Vector3 | [number, number, number];
  size: number;
  color: string | THREE.Color;
  opacity: number;
  fog?: boolean;
}> = ({ position, size, color, opacity, fog = true }) =>
  opacity <= 0.002 ? null : (
    <sprite position={position instanceof THREE.Vector3 ? position.toArray() : position} scale={[size, size, size]}>
      <spriteMaterial
        map={glowTex()}
        color={color}
        transparent
        opacity={Math.min(1, opacity)}
        blending={add}
        depthWrite={false}
        toneMapped={false}
        fog={fog}
      />
    </sprite>
  );

// heartbeat envelope: double thump each second for the first 5 s
const BEATS = [0.1, 1.1, 2.1, 3.1, 4.1];
export const heart = (t: number) => {
  let v = 0;
  for (const b of BEATS) {
    if (t >= b) v += Math.exp(-(t - b) * 7);
    if (t >= b + 0.22) v += 0.7 * Math.exp(-(t - b - 0.22) * 7);
  }
  return v;
};

// ---------- scene 1: the point of light ----------
export const LightPoint: React.FC<{ t: number }> = ({ t }) => {
  if (t > 5.8) return null;
  const fadeIn = ease.out(prog(t, 0, 0.9));
  const h = heart(t);
  const burst = prog(t, 5.0, 5.8);
  const s = (1 + 0.35 * h) * (1 + burst * 3) * fadeIn;
  const a = 1 - ease.in(burst);
  return (
    <group position={CENTER.toArray()}>
      <mesh scale={0.045 * s * (1 - burst)}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshBasicMaterial color={new THREE.Color("#ffffff").multiplyScalar(2)} toneMapped={false} />
      </mesh>
      <GlowSprite position={[0, 0, 0]} size={0.5 * s} color="#ffffff" opacity={a * fadeIn} />
      <GlowSprite position={[0, 0, 0]} size={1.8 * s} color="#bfe9ff" opacity={0.45 * a * fadeIn} />
      <GlowSprite position={[0, 0, 0]} size={5 * s} color={C.skyDeep} opacity={0.18 * a * fadeIn} />
    </group>
  );
};

// ---------- scene 2: burst particles ----------
const NB = 220;
const BURST = Array.from({ length: NB }, (_, i) => {
  const u = rnd(i * 1.7) * 2 - 1;
  const th = rnd(i * 3.1) * Math.PI * 2;
  const r = Math.sqrt(1 - u * u);
  return {
    dir: new THREE.Vector3(r * Math.cos(th), u * 0.8, r * Math.sin(th)),
    speed: 0.6 + rnd(i * 5.3) * 2.4,
    phase: rnd(i * 7.9) * 6.28,
    delay: rnd(i * 4.4) * 0.25,
  };
});

export const Burst: React.FC<{ t: number }> = ({ t }) => {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(NB * 3), 3));
    return g;
  }, []);
  if (t < 5.0 || t > 11.8) return null;
  const pos = geom.attributes.position as THREE.BufferAttribute;
  const conv = ease.inOut(prog(t, 10.0, 11.6));
  BURST.forEach((b, i) => {
    const tt = Math.max(0, t - 5.0 - b.delay);
    const R = b.speed * (1 - Math.exp(-tt * 2.0)) + tt * 0.05;
    const p = b.dir.clone().multiplyScalar(R);
    p.y += Math.sin(t * 1.3 + b.phase) * 0.08;
    p.x += Math.cos(t * 0.9 + b.phase) * 0.08;
    p.add(CENTER);
    const target = new THREE.Vector3(0, 0.3 + (i / NB) * 1.6, 0);
    p.lerp(target, conv);
    pos.setXYZ(i, p.x, p.y, p.z);
  });
  pos.needsUpdate = true;
  const a = prog(t, 5.0, 5.3) * (1 - prog(t, 11.0, 11.8));
  return (
    <points geometry={geom}>
      <pointsMaterial
        map={glowTex()}
        size={0.09}
        color="#9fe2ff"
        transparent
        opacity={a}
        blending={add}
        depthWrite={false}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  );
};

// ---------- scene 2-3: light lines ----------
const NL = 9;
const TUB = 140;
const RAD = 6;
const LINES = Array.from({ length: NL }, (_, i) => {
  const pts: THREE.Vector3[] = [];
  for (let k = 0; k < 6; k++) {
    const a = rnd(i * 13.1 + k) * Math.PI * 2;
    const r = 0.6 + rnd(i * 3.7 + k * 1.9) * 2.4;
    pts.push(new THREE.Vector3(Math.cos(a) * r, (rnd(i * 5.5 + k * 2.2) - 0.5) * 2.4, Math.sin(a) * r * 0.7));
  }
  const curve = new THREE.CatmullRomCurve3(pts);
  return { curve, geo: new THREE.TubeGeometry(curve, TUB, 0.011, RAD, false), start: 6.1 + i * 0.28 };
});

export const LightLines: React.FC<{ t: number }> = ({ t }) => {
  if (t < 6.0 || t > 11.8) return null;
  const conv = ease.inOut(prog(t, 10.0, 11.6));
  return (
    <group position={CENTER.toArray()} scale={1 - conv * 0.85} rotation={[0, t * 0.12 + conv * 2, 0]}>
      {LINES.map((l, i) => {
        const p = ease.inOut(prog(t, l.start, l.start + 2.3));
        if (p <= 0) return null;
        l.geo.setDrawRange(0, Math.floor(p * TUB) * RAD * 6);
        const head = l.curve.getPointAt(Math.min(0.999, p));
        const col = i % 3 === 2 ? "#ffffff" : C.sky;
        return (
          <group key={i}>
            <mesh geometry={l.geo}>
              <meshBasicMaterial
                color={new THREE.Color(col).multiplyScalar(1.5)}
                transparent
                opacity={1 - conv}
                blending={add}
                depthWrite={false}
                toneMapped={false}
              />
            </mesh>
            {p < 1 && <GlowSprite position={head} size={0.35} color="#ffffff" opacity={0.9} />}
            <GlowSprite position={head} size={0.18} color={col} opacity={(1 - conv) * 0.6} />
          </group>
        );
      })}
    </group>
  );
};

// ---------- ambient particles everywhere ----------
const NA = 420;
const AMB = Array.from({ length: NA }, (_, i) => ({
  x: (rnd(i * 2.3) - 0.5) * 50,
  y: rnd(i * 4.9) * 12 - 1,
  z: 10 - rnd(i * 6.7) * 60,
  s: 0.15 + rnd(i * 8.3) * 0.35,
  ph: rnd(i * 1.1) * 6.28,
  warm: rnd(i * 3.3) < 0.1,
}));
export const Ambient: React.FC<{ t: number; amount: number }> = ({ t, amount }) => {
  const geom = useMemo(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.BufferAttribute(new Float32Array(NA * 3), 3));
    const col = new Float32Array(NA * 3);
    AMB.forEach((a, i) => {
      const c = new THREE.Color(a.warm ? C.orange : i % 4 === 0 ? "#ffffff" : C.sky);
      col.set([c.r, c.g, c.b], i * 3);
    });
    g.setAttribute("color", new THREE.BufferAttribute(col, 3));
    return g;
  }, []);
  const pos = geom.attributes.position as THREE.BufferAttribute;
  AMB.forEach((a, i) => {
    const y = ((a.y + t * a.s * 0.4) % 12) - 1;
    pos.setXYZ(i, a.x + Math.sin(t * 0.3 + a.ph) * 0.6, y, a.z + Math.cos(t * 0.25 + a.ph) * 0.6);
  });
  pos.needsUpdate = true;
  return (
    <points geometry={geom}>
      <pointsMaterial
        map={glowTex()}
        size={0.11}
        vertexColors
        transparent
        opacity={0.75 * amount}
        blending={add}
        depthWrite={false}
        sizeAttenuation
        toneMapped={false}
      />
    </points>
  );
};

// ---------- the little sphere of light ----------
export const Orb: React.FC<{ t: number; position: THREE.Vector3; amount: number; placed: number }> = ({
  t,
  position,
  amount,
  placed,
}) => {
  if (amount <= 0) return null;
  const pulse = 1 + 0.12 * Math.sin(t * 10);
  const flash = placed > 0 ? Math.exp(-(t - 53.2) * 3) : 0;
  return (
    <group position={position.toArray()}>
      <mesh scale={0.075 * amount * pulse}>
        <sphereGeometry args={[1, 24, 16]} />
        <meshBasicMaterial color={new THREE.Color("#ffd9a8").multiplyScalar(2.2)} toneMapped={false} />
      </mesh>
      <GlowSprite position={[0, 0, 0]} size={0.5 * amount * pulse} color="#ffc27a" opacity={0.9} />
      <GlowSprite position={[0, 0, 0]} size={1.4 * amount} color={C.orange} opacity={0.35} />
      <GlowSprite position={[0, 0, 0]} size={4 * flash + 0.01} color="#ffffff" opacity={flash} />
      {Array.from({ length: 8 }, (_, i) => {
        const a = t * (2 + rnd(i) * 2) + i;
        const r = 0.14 + rnd(i * 3) * 0.08;
        return (
          <GlowSprite
            key={i}
            position={[Math.cos(a) * r, Math.sin(a * 1.3) * r * 0.7, Math.sin(a) * r]}
            size={0.06}
            color="#ffd2a0"
            opacity={0.8 * amount * (1 - placed)}
          />
        );
      })}
    </group>
  );
};

// final point: keeps a constant on-screen size while camera recedes
export const FinalPoint: React.FC<{ t: number; position: THREE.Vector3; cam: THREE.Vector3 }> = ({ t, position, cam }) => {
  const a = prog(t, 56.6, 58.0);
  if (a <= 0) return null;
  const d = cam.distanceTo(position);
  const beat = t > 58.6 ? Math.exp(-(t - 58.6) * 6) + (t > 58.82 ? 0.7 * Math.exp(-(t - 58.82) * 6) : 0) : 0;
  const k = d * 0.03 * (1 + 0.35 * beat);
  return (
    <group>
      <GlowSprite position={position} size={k * 0.9} color="#ffffff" opacity={a} fog={false} />
      <GlowSprite position={position} size={k * 3.2} color="#bfe9ff" opacity={0.45 * a} fog={false} />
      <GlowSprite position={position} size={k * 9} color={C.skyDeep} opacity={0.2 * a} fog={false} />
    </group>
  );
};

export const lerpV = (a: THREE.Vector3, b: THREE.Vector3, k: number) => a.clone().lerp(b, clamp(k));
export { lerp };
