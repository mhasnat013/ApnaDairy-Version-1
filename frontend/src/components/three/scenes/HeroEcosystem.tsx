import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { ContactShadows, Environment, Lightformer, RoundedBox } from "@react-three/drei";
import * as THREE from "three";
import type { ThreeSceneProps } from "../LazyThree";
import type { ModuleId } from "../../../lib/constants";

/* ------------------------------------------------------------------ */
/* Palette (locked brand tokens — no purple, no neon)                   */
/* ------------------------------------------------------------------ */
const C = {
  emerald: "#087857",
  forest: "#0B3D33",
  pine: "#195843",
  moss: "#2D6A54",
  bright: "#00A878",
  mint: "#E8F5E8",
  pale: "#EDF6EF",
  ivory: "#F7F5F0",
  sky: "#DCEEF8",
  line: "#DCE8DF",
  ink: "#173127",
  white: "#FFFFFF",
} as const;

interface HeroSceneProps extends ThreeSceneProps {
  /** Currently selected homepage module — drives the right-panel visual. */
  moduleId: ModuleId | "b2c" | "b2b";
}

/* ------------------------------------------------------------------ */
/* Motion helpers (all inert when reducedMotion — static final pose)    */
/* ------------------------------------------------------------------ */

/** Gentle hover drift. Amplitude is small on purpose — no bounce/wobble. */
function Float({
  children,
  baseY = 0,
  amp = 0.06,
  speed = 0.9,
  phase = 0,
  reducedMotion,
}: {
  children: React.ReactNode;
  baseY?: number;
  amp?: number;
  speed?: number;
  phase?: number;
  reducedMotion: boolean;
}) {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (reducedMotion || !ref.current) return;
    ref.current.position.y = baseY + Math.sin(clock.elapsedTime * speed + phase) * amp;
  });
  return (
    <group ref={ref} position={[0, baseY, 0]}>
      {children}
    </group>
  );
}

/** Subtle settle-in when a module visual mounts (rise + grow, eased). */
function Appear({
  children,
  reducedMotion,
  delay = 0,
}: {
  children: React.ReactNode;
  reducedMotion: boolean;
  delay?: number;
}) {
  const ref = useRef<THREE.Group>(null);
  const t0 = useRef<number | null>(null);
  useFrame(({ clock }) => {
    if (reducedMotion || !ref.current) return;
    if (t0.current === null) t0.current = clock.elapsedTime;
    const t = Math.min(1, Math.max(0, (clock.elapsedTime - t0.current - delay) / 0.7));
    const e = 1 - Math.pow(1 - t, 3);
    ref.current.position.y = -0.28 * (1 - e);
    ref.current.scale.setScalar(0.96 + 0.04 * e);
  });
  return (
    <group ref={ref} position={[0, reducedMotion ? 0 : -0.28, 0]} scale={reducedMotion ? 1 : 0.96}>
      {children}
    </group>
  );
}

/** Pointer parallax rig — lerped, low amplitude. */
function Rig({ children, reducedMotion }: { children: React.ReactNode; reducedMotion: boolean }) {
  const ref = useRef<THREE.Group>(null);
  useFrame((state) => {
    if (reducedMotion || !ref.current) return;
    const { x, y } = state.pointer;
    ref.current.rotation.y += (x * 0.14 - ref.current.rotation.y) * 0.06;
    ref.current.rotation.x += (-y * 0.09 - ref.current.rotation.x) * 0.06;
  });
  return <group ref={ref}>{children}</group>;
}

/** Very slow orbital ring — the "ecosystem" orbit, kept whisper-subtle. */
function DriftRing({ reducedMotion }: { reducedMotion: boolean }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame((_, dt) => {
    if (reducedMotion || !ref.current) return;
    ref.current.rotation.z += dt * 0.06;
  });
  return (
    <mesh ref={ref} rotation={[Math.PI / 2.35, 0, 0.4]}>
      <torusGeometry args={[2.75, 0.012, 12, 128]} />
      <meshBasicMaterial color={C.emerald} transparent opacity={0.28} />
    </mesh>
  );
}

/* ------------------------------------------------------------------ */
/* Shared bits: droplet, materials                                     */
/* ------------------------------------------------------------------ */

function useDropletGeometry(segments: number) {
  return useMemo(() => {
    const pts: THREE.Vector2[] = [
      [0.001, 0],
      [0.14, 0.015],
      [0.19, 0.1],
      [0.155, 0.21],
      [0.08, 0.32],
      [0.001, 0.44],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, segments);
  }, [segments]);
}

function useDispose(geos: THREE.BufferGeometry[]) {
  useEffect(() => {
    return () => {
      geos.forEach((g) => g.dispose());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
}

/** Glass droplet (no text baked in — labels are DOM overlays). */
function Droplet({
  position,
  scale = 1,
  reducedMotion,
  phase = 0,
  glass = true,
  lowPerf,
}: {
  position: [number, number, number];
  scale?: number;
  reducedMotion: boolean;
  phase?: number;
  glass?: boolean;
  lowPerf: boolean;
}) {
  const geo = useDropletGeometry(lowPerf ? 20 : 36);
  useDispose([geo]);
  return (
    <Float baseY={position[1]} amp={0.07} speed={1.0} phase={phase} reducedMotion={reducedMotion}>
      <mesh geometry={geo} position={[position[0], -0.22 * scale, position[2]]} scale={scale}>
        {glass ? (
          <meshPhysicalMaterial
            color="#f2faf6"
            roughness={0.12}
            metalness={0}
            transmission={lowPerf ? 0 : 0.9}
            thickness={0.4}
            ior={1.4}
            transparent
            opacity={lowPerf ? 0.5 : 1}
          />
        ) : (
          <meshStandardMaterial color={C.white} roughness={0.25} metalness={0} />
        )}
      </mesh>
    </Float>
  );
}

/* ------------------------------------------------------------------ */
/* B2C — glass milk bottle + droplet + floating product cards          */
/* ------------------------------------------------------------------ */

function Bottle({ lowPerf }: { lowPerf: boolean }) {
  const geo = useMemo(() => {
    const pts: THREE.Vector2[] = [
      [0.001, 0],
      [0.3, 0],
      [0.36, 0.05],
      [0.36, 0.8],
      [0.3, 0.95],
      [0.18, 1.06],
      [0.155, 1.12],
      [0.155, 1.38],
      [0.185, 1.42],
      [0.185, 1.5],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    return new THREE.LatheGeometry(pts, lowPerf ? 24 : 48);
  }, [lowPerf]);
  useDispose([geo]);
  return (
    <group>
      {/* milk inside */}
      <mesh geometry={geo} scale={[0.86, 0.7, 0.86]} position={[0, 0.04, 0]}>
        <meshStandardMaterial color={C.white} roughness={0.4} />
      </mesh>
      {/* glass shell */}
      <mesh geometry={geo}>
        <meshPhysicalMaterial
          color="#eef7f2"
          roughness={0.1}
          metalness={0}
          transmission={lowPerf ? 0 : 0.92}
          thickness={0.5}
          ior={1.4}
          transparent
          opacity={lowPerf ? 0.42 : 1}
        />
      </mesh>
      {/* cap */}
      <mesh position={[0, 1.56, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.13, 32]} />
        <meshStandardMaterial color={C.emerald} roughness={0.35} />
      </mesh>
    </group>
  );
}

function ProductCard({
  position,
  tint,
  accent,
  reducedMotion,
  phase,
}: {
  position: [number, number, number];
  tint: string;
  accent: string;
  reducedMotion: boolean;
  phase: number;
}) {
  return (
    <Float baseY={position[1]} amp={0.08} speed={0.8} phase={phase} reducedMotion={reducedMotion}>
      <group position={[position[0], 0, position[2]]} rotation={[0, -0.28, 0.04]}>
        <RoundedBox args={[0.95, 1.15, 0.09]} radius={0.06} smoothness={4}>
          <meshStandardMaterial color={tint} roughness={0.5} />
        </RoundedBox>
        {/* abstract product mark — a plain disc, never text */}
        <mesh position={[-0.22, 0.28, 0.055]}>
          <cylinderGeometry args={[0.11, 0.11, 0.03, 24]} />
          <meshStandardMaterial color={accent} roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.28, 0.048]}>
          <boxGeometry args={[0.62, 0.09, 0.012]} />
          <meshStandardMaterial color={C.line} roughness={0.6} />
        </mesh>
      </group>
    </Float>
  );
}

function B2CScene({ reducedMotion, lowPerf }: { reducedMotion: boolean; lowPerf: boolean }) {
  return (
    <group>
      <group position={[-1.05, -1.15, 0]}>
        <Bottle lowPerf={lowPerf} />
      </group>
      <Droplet position={[-1.05, 1.15, 0]} scale={1.15} reducedMotion={reducedMotion} phase={0.6} lowPerf={lowPerf} />
      <ProductCard position={[0.75, -0.55, 0.2]} tint={C.white} accent={C.emerald} reducedMotion={reducedMotion} phase={0} />
      <ProductCard position={[1.0, 0.45, -0.15]} tint={C.mint} accent={C.bright} reducedMotion={reducedMotion} phase={2.1} />
      <ProductCard position={[0.55, 1.35, 0.1]} tint={C.sky} accent={C.pine} reducedMotion={reducedMotion} phase={4.2} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* B2B — stacked crates/pallets + tanker truck + partnership rings     */
/* ------------------------------------------------------------------ */

function Crates() {
  const crates: Array<{ p: [number, number, number]; c: string; r: number }> = [
    { p: [-0.35, 0.31, 0], c: C.forest, r: 0 },
    { p: [0.35, 0.31, 0.1], c: C.pine, r: 0.12 },
    { p: [0, 0.93, 0.05], c: C.moss, r: -0.08 },
  ];
  return (
    <group position={[-1.15, -1.15, 0]}>
      {/* pallet */}
      <mesh position={[0, 0.05, 0]}>
        <boxGeometry args={[1.55, 0.1, 1.15]} />
        <meshStandardMaterial color={C.line} roughness={0.8} />
      </mesh>
      {crates.map((b, i) => (
        <RoundedBox key={i} args={[0.62, 0.62, 0.62]} radius={0.04} smoothness={3} position={b.p} rotation={[0, b.r, 0]}>
          <meshStandardMaterial color={b.c} roughness={0.6} />
        </RoundedBox>
      ))}
    </group>
  );
}

function TankerTruck() {
  const wheel = (x: number, z: number) => (
    <mesh key={`${x}-${z}`} position={[x, 0.16, z]} rotation={[Math.PI / 2, 0, 0]}>
      <cylinderGeometry args={[0.16, 0.16, 0.1, 20]} />
      <meshStandardMaterial color={C.ink} roughness={0.7} />
    </mesh>
  );
  return (
    <group position={[0.85, -1.12, 0]} rotation={[0, -0.32, 0]}>
      {/* chassis */}
      <mesh position={[0, 0.34, 0]}>
        <boxGeometry args={[1.95, 0.14, 0.6]} />
        <meshStandardMaterial color={C.forest} roughness={0.6} />
      </mesh>
      {/* tank */}
      <mesh position={[-0.18, 0.72, 0]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.33, 0.33, 1.35, 28]} />
        <meshStandardMaterial color={C.white} roughness={0.28} metalness={0.15} />
      </mesh>
      {/* emerald band */}
      <mesh position={[-0.18, 0.72, 0]}>
        <boxGeometry args={[0.12, 0.68, 0.68]} />
        <meshStandardMaterial color={C.emerald} roughness={0.4} />
      </mesh>
      {/* cab */}
      <RoundedBox args={[0.52, 0.6, 0.62]} radius={0.08} smoothness={4} position={[0.92, 0.62, 0]}>
        <meshStandardMaterial color={C.emerald} roughness={0.45} />
      </RoundedBox>
      <mesh position={[1.19, 0.72, 0]}>
        <boxGeometry args={[0.02, 0.22, 0.44]} />
        <meshStandardMaterial color={C.sky} roughness={0.2} metalness={0.1} />
      </mesh>
      {wheel(-0.72, 0.32)}
      {wheel(-0.72, -0.32)}
      {wheel(-0.28, 0.32)}
      {wheel(-0.28, -0.32)}
      {wheel(0.85, 0.32)}
      {wheel(0.85, -0.32)}
    </group>
  );
}

function B2BScene({ reducedMotion }: { reducedMotion: boolean }) {
  return (
    <group>
      <Crates />
      <TankerTruck />
      {/* interlocked partnership rings */}
      <Float baseY={1.35} amp={0.07} speed={0.85} phase={1.2} reducedMotion={reducedMotion}>
        <group position={[-0.1, 0, 0]}>
          <mesh rotation={[0.5, 0.2, 0]}>
            <torusGeometry args={[0.3, 0.055, 16, 48]} />
            <meshStandardMaterial color={C.bright} roughness={0.35} />
          </mesh>
          <mesh position={[0.3, 0.05, 0.08]} rotation={[0.5, 1.1, 0.3]}>
            <torusGeometry args={[0.3, 0.055, 16, 48]} />
            <meshStandardMaterial color={C.emerald} roughness={0.35} />
          </mesh>
        </group>
      </Float>
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* IoT — stylised barn cross-section with glowing sensor nodes        */
/* ------------------------------------------------------------------ */

function SensorNode({
  position,
  phase,
  reducedMotion,
}: {
  position: [number, number, number];
  phase: number;
  reducedMotion: boolean;
}) {
  const mat = useRef<THREE.MeshStandardMaterial>(null);
  const glow = useRef<THREE.MeshBasicMaterial>(null);
  useFrame(({ clock }) => {
    if (reducedMotion) return;
    const p = 1.5 + Math.sin(clock.elapsedTime * 1.6 + phase) * 0.55;
    if (mat.current) mat.current.emissiveIntensity = p;
    if (glow.current) glow.current.opacity = 0.16 + Math.sin(clock.elapsedTime * 1.6 + phase) * 0.05;
  });
  return (
    <group position={position}>
      {/* mast */}
      <mesh position={[0, 0.3, 0]}>
        <cylinderGeometry args={[0.015, 0.015, 0.6, 8]} />
        <meshStandardMaterial color={C.pine} roughness={0.6} />
      </mesh>
      {/* node */}
      <mesh position={[0, 0.62, 0]}>
        <sphereGeometry args={[0.075, 20, 20]} />
        <meshStandardMaterial ref={mat} color={C.bright} emissive={C.bright} emissiveIntensity={1.5} roughness={0.3} />
      </mesh>
      {/* soft halo */}
      <mesh position={[0, 0.62, 0]}>
        <sphereGeometry args={[0.16, 16, 16]} />
        <meshBasicMaterial ref={glow} color={C.bright} transparent opacity={0.16} blending={THREE.AdditiveBlending} depthWrite={false} />
      </mesh>
    </group>
  );
}

function IoTScene({ reducedMotion }: { reducedMotion: boolean }) {
  const roofGeo = useMemo(() => {
    const s = new THREE.Shape();
    s.moveTo(-1.35, 0);
    s.lineTo(1.35, 0);
    s.lineTo(0, 0.78);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth: 1.7, bevelEnabled: false });
    g.translate(0, 0, -0.85);
    return g;
  }, []);
  useDispose([roofGeo]);
  return (
    <group position={[0, -0.35, 0]}>
      {/* ground pad */}
      <mesh position={[0, -1.12, 0]}>
        <cylinderGeometry args={[2.25, 2.25, 0.07, 48]} />
        <meshStandardMaterial color={C.mint} roughness={0.9} />
      </mesh>
      {/* walls */}
      <mesh position={[0, -0.5, 0]}>
        <boxGeometry args={[2.3, 1.15, 1.5]} />
        <meshStandardMaterial color={C.pale} roughness={0.85} />
      </mesh>
      {/* roof */}
      <mesh geometry={roofGeo} position={[0, 0.075, 0]}>
        <meshStandardMaterial color={C.forest} roughness={0.7} />
      </mesh>
      {/* door */}
      <mesh position={[0, -0.72, 0.76]}>
        <boxGeometry args={[0.62, 0.72, 0.04]} />
        <meshStandardMaterial color={C.pine} roughness={0.7} />
      </mesh>
      {/* sensor nodes */}
      <SensorNode position={[-1.05, 0.85, 0.5]} phase={0} reducedMotion={reducedMotion} />
      <SensorNode position={[1.05, 0.85, -0.4]} phase={1.4} reducedMotion={reducedMotion} />
      <SensorNode position={[0, 1.05, 0]} phase={2.6} reducedMotion={reducedMotion} />
      <SensorNode position={[-1.7, -1.08, 0.9]} phase={3.8} reducedMotion={reducedMotion} />
      <SensorNode position={[1.7, -1.08, -0.8]} phase={5.0} reducedMotion={reducedMotion} />
    </group>
  );
}

/* ------------------------------------------------------------------ */
/* AI — freshness gauge dial (0–100). Numbers stay in the DOM overlay. */
/* ------------------------------------------------------------------ */

const GAUGE_VALUE = 0.82;
const DEG = Math.PI / 180;
const G_START = 315 * DEG; // dial starts lower-left…
const G_SWEEP = 270 * DEG; // …sweeps 270° over the top (gap at bottom)

function AIGauge({ reducedMotion }: { reducedMotion: boolean }) {
  const needle = useRef<THREE.Group>(null);
  const start = useRef<number | null>(null);
  const finalAngle = (90 - (315 + GAUGE_VALUE * 270)) * DEG;
  const startAngle = (90 - 315) * DEG;

  useFrame(({ clock }) => {
    if (reducedMotion || !needle.current) return;
    if (start.current === null) start.current = clock.elapsedTime;
    const t = Math.min(1, (clock.elapsedTime - start.current) / 1.2);
    const e = 1 - Math.pow(1 - t, 3);
    const v = GAUGE_VALUE * e;
    needle.current.rotation.z = (90 - (315 + v * 270)) * DEG;
  });

  const ticks = [0, 0.25, 0.5, 0.75, 1];

  return (
    <group position={[0, -0.25, 0]}>
      {/* plinth */}
      <RoundedBox args={[2.7, 0.16, 1.3]} radius={0.05} smoothness={3} position={[0, -1.32, 0]}>
        <meshStandardMaterial color={C.forest} roughness={0.6} />
      </RoundedBox>
      {/* dial face */}
      <mesh position={[0, 0, -0.06]}>
        <circleGeometry args={[1.28, 64]} />
        <meshStandardMaterial color={C.white} roughness={0.55} />
      </mesh>
      {/* track */}
      <mesh>
        <ringGeometry args={[1.0, 1.16, 72, 1, G_START, G_SWEEP]} />
        <meshStandardMaterial color={C.line} roughness={0.5} side={THREE.DoubleSide} />
      </mesh>
      {/* value arc */}
      <mesh>
        <ringGeometry args={[1.0, 1.16, 72, 1, G_START, G_SWEEP * GAUGE_VALUE]} />
        <meshStandardMaterial color={C.bright} roughness={0.4} side={THREE.DoubleSide} />
      </mesh>
      {/* ticks */}
      {ticks.map((v) => {
        const a = G_START + G_SWEEP * v;
        return (
          <mesh
            key={v}
            position={[Math.cos(a) * 0.88, Math.sin(a) * 0.88, 0.01]}
            rotation={[0, 0, a - Math.PI / 2]}
          >
            <boxGeometry args={[0.028, 0.13, 0.02]} />
            <meshStandardMaterial color={C.moss} roughness={0.6} />
          </mesh>
        );
      })}
      {/* needle */}
      <group ref={needle} rotation={[0, 0, reducedMotion ? finalAngle : startAngle]}>
        <mesh position={[0, 0.42, 0.03]}>
          <boxGeometry args={[0.05, 0.86, 0.03]} />
          <meshStandardMaterial color={C.forest} roughness={0.4} />
        </mesh>
        <mesh position={[0, -0.14, 0.03]}>
          <boxGeometry args={[0.05, 0.22, 0.03]} />
          <meshStandardMaterial color={C.forest} roughness={0.4} />
        </mesh>
      </group>
      {/* hub */}
      <mesh position={[0, 0, 0.05]} rotation={[Math.PI / 2, 0, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 0.07, 24]} />
        <meshStandardMaterial color={C.forest} roughness={0.35} />
      </mesh>
      <Droplet position={[0, 1.55, 0]} scale={0.85} reducedMotion={reducedMotion} phase={2.4} lowPerf={false} />
    </group>
  );
}

function AIScene({ reducedMotion }: { reducedMotion: boolean }) {
  return <AIGauge reducedMotion={reducedMotion} />;
}

/* ------------------------------------------------------------------ */
/* Scene root                                                          */
/* ------------------------------------------------------------------ */

export default function HeroEcosystem({ reducedMotion, active, moduleId }: HeroSceneProps) {
  const perf = useMemo(() => {
    if (typeof window === "undefined") return { mobile: false, low: false };
    const mobile = window.innerWidth < 768;
    const cores = typeof navigator !== "undefined" && navigator.hardwareConcurrency ? navigator.hardwareConcurrency : 8;
    return { mobile, low: mobile || cores <= 4 };
  }, []);

  return (
    <Canvas
      dpr={perf.mobile ? [1, 1.6] : [1, 2]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0.9, 7.4], fov: 38 }}
      frameloop={reducedMotion ? "never" : active ? "always" : "never"}
      shadows={false}
      aria-hidden="true"
    >
      {/* soft studio lighting — emerald/ivory, no neon */}
      <ambientLight intensity={0.55} />
      <hemisphereLight args={[C.sky, C.mint, 0.5]} />
      <directionalLight position={[4, 6, 5]} intensity={1.1} color={C.white} />
      <directionalLight position={[-5, 3, -2]} intensity={0.35} color={C.sky} />

      {/* local procedural reflections for glass — no network HDR */}
      <Environment resolution={256}>
        <group rotation={[-Math.PI / 3, 0, 0]}>
          <Lightformer form="circle" intensity={4} position={[0, 5, -9]} scale={2} color={C.white} />
          <Lightformer intensity={1.4} position={[-5, 1, -1]} scale={[3, 1, 1]} color={C.mint} />
          <Lightformer intensity={1.4} position={[5, 1, 0]} scale={[3, 1, 1]} color={C.sky} />
        </group>
      </Environment>

      <Rig reducedMotion={reducedMotion}>
        <DriftRing reducedMotion={reducedMotion} />
        <Appear key={moduleId} reducedMotion={reducedMotion}>
          {moduleId === "b2c" && <B2CScene reducedMotion={reducedMotion} lowPerf={perf.low} />}
          {moduleId === "b2b" && <B2BScene reducedMotion={reducedMotion} />}
          {moduleId === "iot" && <IoTScene reducedMotion={reducedMotion} />}
          {moduleId === "ai" && <AIScene reducedMotion={reducedMotion} />}
        </Appear>
      </Rig>

      <ContactShadows
        position={[0, -1.28, 0]}
        scale={9}
        far={3.2}
        blur={2.4}
        opacity={0.3}
        resolution={256}
        color={C.forest}
        frames={perf.mobile ? 1 : Infinity}
      />
    </Canvas>
  );
}
