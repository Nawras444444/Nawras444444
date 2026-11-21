import React from "react";
import { random, spring, useCurrentFrame, useVideoConfig } from "remotion";
import { ThreeCanvas } from "@remotion/three";
import { THEME } from "./theme";

const Shards: React.FC<{ count: number; radius: number; explode: number }> = ({ count, radius, explode }) => {
  const frame = useCurrentFrame();
  return (
    <>
      {Array.from({ length: count }).map((_, i) => {
        const a0 = random(`sa${i}`) * Math.PI * 2;
        const y0 = (random(`sy${i}`) - 0.5) * 4;
        const r = radius * (0.7 + random(`sr${i}`) * 0.7) * (1 + explode * 1.4);
        const sp = 0.012 + random(`ss${i}`) * 0.025;
        const a = a0 + frame * sp;
        const size = 0.12 + random(`sz${i}`) * 0.22;
        return (
          <mesh
            key={i}
            position={[Math.cos(a) * r, y0 + Math.sin(frame * 0.04 + i) * 0.3, Math.sin(a) * r]}
            rotation={[frame * 0.05 + i, frame * 0.03 + i * 2, 0]}
            scale={[size, size * 2.2, size]}
          >
            <octahedronGeometry args={[1, 0]} />
            <meshStandardMaterial
              color={i % 2 ? THEME.primary : THEME.secondary}
              emissive={i % 2 ? THEME.primary : THEME.secondary}
              emissiveIntensity={1.4}
              metalness={0.6}
              roughness={0.25}
              flatShading
            />
          </mesh>
        );
      })}
    </>
  );
};

/** Hextech crystal: faceted core, wireframe shell, three gyroscope rings, orbiting shards */
export const Crystal3D: React.FC<{ width: number; height: number; scale?: number; explodeAt?: number; x?: number; y?: number }> = ({
  width,
  height,
  scale = 1,
  explodeAt,
  x = 0,
  y = 0,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 12, stiffness: 110, mass: 1.2 } });
  const explode =
    explodeAt === undefined ? 0 : spring({ frame: frame - explodeAt, fps, config: { damping: 14, stiffness: 120 } });
  const s = scale * pop * (1 + explode * 0.25);
  const hue = frame * 0.006;
  return (
    <ThreeCanvas width={width} height={height} camera={{ position: [0, 0, 9], fov: 40 }}>
      <ambientLight intensity={0.5} />
      <pointLight position={[6, 6, 6]} color={THEME.primary} intensity={260} />
      <pointLight position={[-6, -3, 5]} color={THEME.secondary} intensity={260} />
      <pointLight position={[0, 0, 3]} color="#ffffff" intensity={60 + Math.sin(frame / 6) * 20} />
      <group position={[x, y + Math.sin(frame / 20) * 0.25, 0]} scale={s} rotation={[0.2, hue * 20, 0]}>
        <mesh scale={[1, 1.7, 1]} rotation={[0, frame * 0.025, 0]}>
          <octahedronGeometry args={[1, 0]} />
          <meshPhysicalMaterial
            color="#5b8cff"
            emissive="#4f46e5"
            emissiveIntensity={0.9}
            metalness={0.5}
            roughness={0.12}
            clearcoat={1}
            flatShading
          />
        </mesh>
        <mesh scale={[1.25, 2.15, 1.25]} rotation={[0, -frame * 0.02, 0]}>
          <octahedronGeometry args={[1, 1]} />
          <meshBasicMaterial color={THEME.primary} wireframe transparent opacity={0.55} />
        </mesh>
        <mesh rotation={[Math.PI / 2 + Math.sin(frame / 25) * 0.3, frame * 0.03, 0]}>
          <torusGeometry args={[2.2, 0.04, 16, 120]} />
          <meshStandardMaterial color={THEME.accent} emissive={THEME.accent} emissiveIntensity={1} metalness={0.9} roughness={0.2} />
        </mesh>
        <mesh rotation={[frame * 0.025, Math.PI / 3, frame * 0.01]}>
          <torusGeometry args={[2.8, 0.06, 16, 120]} />
          <meshStandardMaterial color={THEME.secondary} emissive={THEME.secondary} emissiveIntensity={1.4} metalness={0.7} roughness={0.2} />
        </mesh>
        <mesh rotation={[Math.PI / 5, frame * -0.02, frame * 0.02]}>
          <torusGeometry args={[3.4, 0.035, 16, 140]} />
          <meshStandardMaterial color={THEME.primary} emissive={THEME.primary} emissiveIntensity={1.6} metalness={0.7} roughness={0.2} />
        </mesh>
        <Shards count={26} radius={3.3} explode={explode} />
      </group>
    </ThreeCanvas>
  );
};
