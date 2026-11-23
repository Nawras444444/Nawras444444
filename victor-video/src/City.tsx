import React, { useMemo } from "react";
import * as THREE from "three";
import { C, clamp, ease, fogTexV, geo, glowTex, prog, rnd } from "./lib";

export const GAP_NEAR = -12.2;
export const GAP_FAR = -18.2;
export const TOWER_Z = -21.6;
export const TOWER: [number, number, number] = [0, 0, TOWER_Z];

// ---------------- grid floor shader ----------------
const gridVert = /* glsl */ `
varying vec3 vW;
void main(){ vec4 w = modelMatrix*vec4(position,1.0); vW = w.xyz; gl_Position = projectionMatrix*viewMatrix*w; }`;
const gridFrag = /* glsl */ `
uniform float uReveal; uniform float uWave; uniform float uBright; uniform vec3 uCam; uniform vec3 uTower;
uniform float uGapN; uniform float uGapF;
varying vec3 vW;
float grid(vec2 p, float w){ vec2 g = abs(fract(p-0.5)-0.5)/(fwidth(p)*w); return 1.0-min(min(g.x,g.y),1.0); }
void main(){
  if(vW.z < uGapN && vW.z > uGapF) discard;
  float l1 = grid(vW.xz, 1.0);
  float l2 = grid(vW.xz/4.0, 1.6);
  float d0 = length(vW.xz);
  float reveal = smoothstep(uReveal, uReveal-4.0, d0);
  float front = exp(-abs(d0-uReveal)*1.2) * step(0.01, uReveal) * step(d0, uReveal+2.0);
  float dt = length(vW.xz - uTower.xz);
  float lit = smoothstep(uWave, uWave-8.0, dt) * step(0.01, uWave);
  float wfront = exp(-abs(dt-uWave)*0.6) * step(0.01, uWave);
  float dist = length(vW - uCam);
  float fade = exp(-dist*0.03);
  float edge = exp(-min(abs(vW.z-uGapN), abs(vW.z-uGapF))*1.5);
  vec3 cyan = vec3(0.16,0.68,1.0);
  float a = (l1*0.22 + l2*0.55) * reveal * uBright;
  a += (l1+l2) * front * 0.9;
  a *= (1.0 + lit*2.2);
  a += edge*0.35*reveal;
  vec3 col = cyan*a + vec3(0.85,0.95,1.0)*wfront*(l1+l2)*1.2;
  gl_FragColor = vec4(col*fade, 1.0);
}`;

export const Grid: React.FC<{ reveal: number; wave: number; bright: number; cam: THREE.Vector3 }> = ({
  reveal,
  wave,
  bright,
  cam,
}) => {
  const mat = useMemo(
    () =>
      new THREE.ShaderMaterial({
        vertexShader: gridVert,
        fragmentShader: gridFrag,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: {
          uReveal: { value: 0 },
          uWave: { value: 0 },
          uBright: { value: 1 },
          uCam: { value: new THREE.Vector3() },
          uTower: { value: new THREE.Vector3(...TOWER) },
          uGapN: { value: GAP_NEAR },
          uGapF: { value: GAP_FAR },
        },
      }),
    [],
  );
  mat.uniforms.uReveal.value = reveal;
  mat.uniforms.uWave.value = wave;
  mat.uniforms.uBright.value = bright;
  mat.uniforms.uCam.value.copy(cam);
  if (reveal <= 0) return null;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.003, -20]} material={mat}>
      <planeGeometry args={[600, 600]} />
    </mesh>
  );
};

// ---------------- platforms & chasm ----------------
export const Ground: React.FC<{ t: number; visible: number }> = ({ t, visible }) => {
  if (visible <= 0) return null;
  const G = geo();
  const near = 400;
  const far = 400;
  return (
    <group>
      <mesh geometry={G.box} position={[0, -15, GAP_NEAR + near / 2]} scale={[1200, 30, near]}>
        <meshStandardMaterial color="#05080e" roughness={0.85} metalness={0.2} envMapIntensity={0.12} />
      </mesh>
      <mesh geometry={G.box} position={[0, -15, GAP_FAR - far / 2]} scale={[1200, 30, far]}>
        <meshStandardMaterial color="#05080e" roughness={0.85} metalness={0.2} envMapIntensity={0.12} />
      </mesh>
      {/* glowing edges */}
      {[GAP_NEAR, GAP_FAR].map((z, i) => (
        <mesh key={z} geometry={G.box} position={[0, -0.02, z + (i === 0 ? -0.01 : 0.01)]} scale={[200, 0.04, 0.04]}>
          <meshBasicMaterial color={new THREE.Color(C.sky).multiplyScalar(1.4)} transparent opacity={visible} toneMapped={false} />
        </mesh>
      ))}
      {/* chasm fog layers */}
      {[-1.8, -3.2, -4.8, -7].map((y, i) => (
        <mesh key={y} rotation={[-Math.PI / 2, 0, 0]} position={[0, y, (GAP_NEAR + GAP_FAR) / 2]}>
          <planeGeometry args={[60, 6.4]} />
          <meshBasicMaterial
            map={fogTexV("gap" + i)}
            color={i === 0 ? "#2a5a8c" : "#3d78b0"}
            transparent
            opacity={0.75 * visible}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            fog={false}
            map-offset={[t * 0.01 * (i % 2 ? 1 : -1), 0]}
            map-repeat={[2, 1]}
          />
        </mesh>
      ))}
      {/* light shafts rising from the void */}
      {[-6, -2.5, 3, 7].map((x, i) => (
        <mesh key={x} position={[x, -2, (GAP_NEAR + GAP_FAR) / 2]} rotation={[0, 0, (i - 1.5) * 0.08]}>
          <planeGeometry args={[1.4, 8]} />
          <meshBasicMaterial
            map={glowTex()}
            color="#4f8fcf"
            transparent
            opacity={0.035 * visible}
            blending={THREE.AdditiveBlending}
            depthWrite={false}
            fog={false}
          />
        </mesh>
      ))}
    </group>
  );
};

// ---------------- buildings ----------------
type B = {
  x: number;
  z: number;
  w: number;
  d: number;
  h: number;
  kind: "box" | "tower";
  shade: number;
  band: number; // relative height of light band, -1 none
  warm: boolean;
  dist: number;
};
const BUILDINGS: B[] = (() => {
  const out: B[] = [];
  let i = 0;
  for (let z = 7; z > -62; z -= 3.3) {
    for (const side of [1, -1]) {
      for (let col = 0; col < 4; col++) {
        i++;
        const zz = z + (rnd(i * 4.4) - 0.5) * 1.2;
        if (zz < GAP_NEAR + 1.4 && zz > GAP_FAR - 1.4) continue;
        if (Math.abs(zz - TOWER_Z) < 3 && col === 0) continue;
        if (rnd(i * 2.9) < 0.12) continue;
        const x = side * (6.2 + col * 3.6 + rnd(i * 1.7) * 1.1);
        if (Math.hypot(x, zz) < 9.5) continue;
        const tower = rnd(i * 6.1) < 0.18;
        const h = (tower ? 5 : 1.4) + Math.pow(rnd(i * 3.3), 1.6) * (tower ? 9 : 6) + col * 1.2;
        out.push({
          x,
          z: zz,
          w: tower ? 0.5 + rnd(i) * 0.4 : 1.5 + rnd(i * 5.5) * 1.3,
          d: 1.5 + rnd(i * 7.2) * 1.3,
          h,
          kind: tower ? "tower" : "box",
          shade: rnd(i * 8.8),
          band: rnd(i * 9.4) < 0.55 || tower ? 0.25 + rnd(i * 2.2) * 0.6 : -1,
          warm: rnd(i * 3.9) < 0.22,
          dist: Math.hypot(x, zz),
        });
      }
    }
  }
  return out;
})();

const riseAt = (b: { dist: number }) => 18.7 + b.dist * 0.075;

export const lightAt = (wave: number, x: number, z: number) =>
  wave <= 0 ? 0 : clamp((wave - Math.hypot(x - TOWER[0], z - TOWER[2])) / 5);

export const Buildings: React.FC<{ t: number; wave: number }> = ({ t, wave }) => {
  const G = geo();
  return (
    <group>
      {BUILDINGS.map((b, i) => {
        const r = prog(t, riseAt(b), riseAt(b) + 1.0);
        if (r <= 0) return null;
        const s = ease.back(r);
        const lit = lightAt(wave, b.x, b.z);
        const base = new THREE.Color().lerpColors(new THREE.Color("#4a525e"), new THREE.Color("#c4cad2"), b.shade);
        const bandCol = new THREE.Color(b.warm ? C.orange : C.sky).multiplyScalar(0.5 + lit * 2.6);
        const h = b.h * s;
        return (
          <group key={i} position={[b.x, 0, b.z]}>
            {b.kind === "box" ? (
              <mesh geometry={G.rbox} position={[0, h / 2, 0]} scale={[b.w, Math.max(0.001, h), b.d]}>
                <meshStandardMaterial color={base} roughness={0.7} envMapIntensity={0.35} emissive="#9fdcff" emissiveIntensity={lit * 0.12} />
              </mesh>
            ) : (
              <>
                <mesh geometry={G.cyl} position={[0, h / 2, 0]} scale={[b.w, Math.max(0.001, h), b.w]}>
                  <meshStandardMaterial color="#1a1f27" roughness={0.25} metalness={0.85} envMapIntensity={0.8} />
                </mesh>
                <mesh geometry={G.cyl} position={[0, h + 0.4 * s, 0]} scale={[0.04, 0.8 * s, 0.04]}>
                  <meshStandardMaterial color="#9aa3ad" metalness={0.9} roughness={0.3} />
                </mesh>
                {[0.2, 0.45, 0.7].map((f, j) => (
                  <mesh key={j} geometry={G.cyl} position={[0, h * f, 0]} scale={[b.w * 1.04, 0.12, b.w * 1.04]}>
                    <meshBasicMaterial
                      color={new THREE.Color(j === 1 && b.warm ? C.orange : C.sky).multiplyScalar(0.6 + lit * 2.4)}
                      toneMapped={false}
                    />
                  </mesh>
                ))}
              </>
            )}
            {b.kind === "box" && b.band > 0 && (
              <mesh geometry={G.box} position={[0, h * b.band, 0]} scale={[b.w * 1.02, 0.07, b.d * 1.02]}>
                <meshBasicMaterial color={bandCol} toneMapped={false} />
              </mesh>
            )}
          </group>
        );
      })}
    </group>
  );
};

// ---------------- arches, rings, silhouettes ----------------
const ARCHES = [
  { z: -3.5, r: 6.8 },
  { z: -29, r: 6.8 },
  { z: -41, r: 7.2 },
];
export const Arches: React.FC<{ t: number; wave: number }> = ({ t, wave }) => {
  const G = geo();
  return (
    <group>
      {ARCHES.map((a, i) => {
        const p = ease.out(prog(t, 20 + i * 0.5, 21.6 + i * 0.5));
        if (p <= 0) return null;
        const lit = lightAt(wave, 0, a.z);
        return (
          <group key={i} position={[0, 0, a.z]}>
            <mesh rotation={[0, 0, 0]}>
              <torusGeometry args={[a.r, 0.22, 16, 90, Math.PI * p]} />
              <meshStandardMaterial color="#cfd5dc" roughness={0.4} metalness={0.5} />
            </mesh>
            <mesh position={[0, 0, 0.23]}>
              <torusGeometry args={[a.r, 0.035, 8, 90, Math.PI * p]} />
              <meshBasicMaterial color={new THREE.Color(i === 1 ? C.orange : C.sky).multiplyScalar(0.8 + lit * 2.5)} toneMapped={false} />
            </mesh>
            {[1, -1].map((s) => (
              <mesh key={s} geometry={G.rbox} position={[s * a.r, 0.5, 0]} scale={[0.9 * p, 1, 0.9 * p]}>
                <meshStandardMaterial color="#9ea6b0" roughness={0.5} />
              </mesh>
            ))}
          </group>
        );
      })}
    </group>
  );
};

const RINGS = [
  { p: [-2.8, 3.6, -5], r: 0.9, s: 1 },
  { p: [-2.6, 3.9, -5.4], r: 0.75, s: 2 },
  { p: [-3.1, 3.3, -4.6], r: 1.05, s: 3 },
  { p: [3.2, 4.4, -9], r: 0.8, s: 4 },
  { p: [2.5, 5.2, -26], r: 1.2, s: 5 },
  { p: [-3.5, 4.5, -33], r: 0.9, s: 6 },
  { p: [0, 6.5, 2], r: 1.1, s: 7 },
];
export const Rings: React.FC<{ t: number; wave: number }> = ({ t, wave }) => {
  const G = geo();
  return (
    <group>
      {RINGS.map((r, i) => {
        const p = ease.back(prog(t, 21 + i * 0.25, 22 + i * 0.25));
        if (p <= 0) return null;
        const lit = lightAt(wave, r.p[0], r.p[2]);
        return (
          <group
            key={i}
            position={[r.p[0], r.p[1] + Math.sin(t * 0.9 + r.s) * 0.18, r.p[2]]}
            rotation={[t * 0.35 * (i % 2 ? 1 : -1) + r.s, t * 0.25 + r.s * 0.7, r.s * 0.4]}
            scale={r.r * p}
          >
            <mesh geometry={G.torus}>
              <meshStandardMaterial color="#c3cad2" metalness={0.95} roughness={0.22} envMapIntensity={1.2} />
            </mesh>
            <mesh geometry={G.torusThin} scale={1.0}>
              <meshBasicMaterial
                color={new THREE.Color(C.sky).multiplyScalar(0.35 + lit * 2)}
                transparent
                opacity={0.8}
                toneMapped={false}
              />
            </mesh>
          </group>
        );
      })}
    </group>
  );
};

const SIL = Array.from({ length: 70 }, (_, i) => ({
  x: (rnd(i * 3.7) - 0.5) * 220,
  z: -75 - rnd(i * 1.9) * 40,
  w: 4 + rnd(i * 5.3) * 9,
  h: 6 + Math.pow(rnd(i * 2.1), 1.5) * 34,
  c: rnd(i * 8.1),
}));
export const Silhouettes: React.FC<{ t: number; wave: number }> = ({ t, wave }) => {
  const a = prog(t, 22, 25) * (1 - prog(t, 56.3, 57.6));
  if (a <= 0) return null;
  const G = geo();
  return (
    <group>
      {SIL.map((s, i) => {
        const lit = lightAt(wave * 1.3, s.x, s.z);
        const col = new THREE.Color().lerpColors(new THREE.Color("#131c2b"), new THREE.Color("#22324a"), s.c);
        col.lerp(new THREE.Color("#3a6ea8"), lit * 0.6);
        return (
          <mesh key={i} geometry={G.box} position={[s.x, s.h / 2 - 2, s.z]} scale={[s.w, s.h, 3]}>
            <meshBasicMaterial color={col} fog={false} transparent opacity={a} />
          </mesh>
        );
      })}
    </group>
  );
};

export const BackFog: React.FC<{ t: number; amount: number }> = ({ t, amount }) => (
  <group>
    {[0, 1, 2].map((i) => (
      <mesh key={i} position={[(i - 1) * 40, 6 + i * 3, -70 - i * 6]}>
        <planeGeometry args={[110, 36]} />
        <meshBasicMaterial
          map={fogTexV("back" + i)}
          color="#2f5f96"
          transparent
          opacity={0.32 * amount * (1 - prog(t, 56.0, 57.4))}
          blending={THREE.AdditiveBlending}
          depthWrite={false}
          fog={false}
          map-offset={[t * 0.004 * (i + 1), 0]}
        />
      </mesh>
    ))}
  </group>
);

// ---------------- tower ----------------
export const Tower: React.FC<{ t: number; placed: number; lit: number }> = ({ t, placed, lit }) => {
  const G = geo();
  const p = ease.out(prog(t, 20.5, 22.5));
  if (p <= 0) return null;
  const H = 8.5;
  const glowCol = new THREE.Color(C.sky).multiplyScalar(0.15 + lit * 3.2);
  const ringCol = new THREE.Color(C.sky).multiplyScalar(0.25 + placed * 0.8 + lit * 3);
  const pulse = placed > 0 && lit < 0.05 ? 0.5 + 0.5 * Math.sin(t * 9) : 1;
  return (
    <group position={TOWER}>
      <mesh geometry={G.cyl} position={[0, (H * p) / 2, 0]} scale={[1.0, H * p, 1.0]}>
        <meshStandardMaterial color="#0c1119" roughness={0.3} metalness={0.8} envMapIntensity={0.6} emissive="#5fd0ff" emissiveIntensity={lit * 0.06} />
      </mesh>
      <mesh geometry={G.torus} position={[0, H * p + 0.05, 0]} rotation={[Math.PI / 2, 0, 0]} scale={[1.02, 1.02, 1.5]}>
        <meshBasicMaterial color={ringCol} toneMapped={false} />
      </mesh>
      {[0.32, 0.55, 0.78].map((f, i) => (
        <mesh key={i} geometry={G.cyl} position={[0, H * p * f, 0]} scale={[1.025, 0.08, 1.025]}>
          <meshBasicMaterial color={glowCol} toneMapped={false} />
        </mesh>
      ))}
      {/* socket */}
      <group position={[0, 1.5, 1.0]}>
        <mesh geometry={G.torus} scale={[0.32, 0.32, 1.4]}>
          <meshBasicMaterial color={ringCol.clone().multiplyScalar(pulse)} toneMapped={false} />
        </mesh>
        <mesh geometry={G.sphere} scale={[0.3, 0.3, 0.06]} position={[0, 0, -0.04]}>
          <meshStandardMaterial color="#05080c" roughness={0.2} metalness={0.6} />
        </mesh>
      </group>
      {lit > 0 && (
        <>
          <sprite position={[0, 1.5, 1.2]} scale={[6 * lit + 1, 6 * lit + 1, 1]}>
            <spriteMaterial map={glowTex()} color="#9fe6ff" transparent opacity={0.9 * lit} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </sprite>
          <sprite position={[0, H * 0.55, 0]} scale={[9 * lit, 14 * lit, 1]}>
            <spriteMaterial map={glowTex()} color="#4fb6ff" transparent opacity={0.35 * lit} blending={THREE.AdditiveBlending} depthWrite={false} toneMapped={false} />
          </sprite>
        </>
      )}
    </group>
  );
};

// ---------------- bridge cubes ----------------
const NCUBE = 24;
const CUBES = Array.from({ length: NCUBE }, (_, i) => {
  const a = rnd(i * 2.7) * Math.PI * 2;
  const rad = 0.9 + rnd(i * 5.9) * 1.4;
  const col = i % 3;
  const row = Math.floor(i / 2);
  return {
    home: new THREE.Vector3(Math.cos(a) * rad, 0.5 + rnd(i * 1.3) * 1.8, Math.sin(a) * rad * 0.7 - 0.6),
    slot: new THREE.Vector3((i % 2) * 0.5 - 0.25, -0.25, GAP_NEAR - 0.25 - row * 0.5),
    color: col === 0 ? "#f2f4f7" : col === 1 ? "#3f8ae0" : "#7fd4ff",
    appear: 34.0 + rnd(i * 4.1) * 2.6,
    fly: 40.6 + row * 0.55 + (i % 2) * 0.2,
    spin: rnd(i * 9.3),
  };
});

export const BridgeCubes: React.FC<{ t: number; victorPos: THREE.Vector3 }> = ({ t, victorPos }) => {
  const G = geo();
  if (t < 34) return null;
  const tmp = new THREE.Vector3();
  return (
    <group>
      {CUBES.map((c, i) => {
        const a = ease.back(prog(t, c.appear, c.appear + 0.7));
        if (a <= 0) return null;
        const f = prog(t, c.fly, c.fly + 1.2);
        const fe = ease.inOut(f);
        const home = tmp.copy(c.home).add(new THREE.Vector3(victorPos.x, 0, -11.2));
        home.y += Math.sin(t * 1.4 + i) * 0.12 * (1 - fe);
        const pos = new THREE.Vector3().lerpVectors(home, c.slot, fe);
        pos.y += Math.sin(Math.PI * fe) * 1.4;
        const landed = t >= c.fly + 1.2;
        const flash = landed ? Math.exp(-(t - c.fly - 1.2) * 4) : 0;
        const rot = (1 - fe) * (t * 0.8 + c.spin * 6);
        const color = new THREE.Color(c.color);
        return (
          <group key={i} position={pos.toArray()} rotation={[rot, rot * 0.7, 0]}>
            <mesh geometry={G.rbox} scale={0.48 * a}>
              <meshStandardMaterial color={color} roughness={0.35} emissive={c.color} emissiveIntensity={0.25 + flash * 2 + (f > 0 && f < 1 ? 0.8 : 0)} />
            </mesh>
            {(flash > 0.02 || (f > 0 && f < 1)) && (
              <sprite scale={[1.4, 1.4, 1]}>
                <spriteMaterial map={glowTex()} color={C.sky} transparent opacity={f > 0 && f < 1 ? 0.45 : flash * 0.9} blending={THREE.AdditiveBlending} depthWrite={false} />
              </sprite>
            )}
          </group>
        );
      })}
      {/* rails that draw along the bridge as it forms */}
      {[-0.55, 0.55].map((x) => {
        const len = clamp((t - 41.8) / 6.0) * (GAP_NEAR - GAP_FAR);
        if (len <= 0) return null;
        return (
          <mesh key={x} geometry={G.box} position={[x, 0.02, GAP_NEAR - len / 2]} scale={[0.04, 0.04, len]}>
            <meshBasicMaterial color={new THREE.Color(C.sky).multiplyScalar(1.6)} toneMapped={false} />
          </mesh>
        );
      })}
    </group>
  );
};
