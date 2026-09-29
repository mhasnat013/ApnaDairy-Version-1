import { useEffect, useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";
import type { ThreeSceneProps } from "../LazyThree";

/**
 * Farm-to-table journey scene (brief §11) — premium, restrained, in-palette.
 * Five ceramic stage platforms along a route; a refrigerated truck drives to
 * the active stage with damped motion, rolling wheels and a soft bob.
 * - No humans, no text baked into the scene (labels are HTML overlays).
 * - reducedMotion: static frame at the active stage.
 * - active=false (off-screen / hidden tab): animation pauses.
 */
export interface JourneySceneProps extends ThreeSceneProps {
  /** Active stage index, 0–4. */
  stage: number;
}

const C = {
  emerald: "#087857",
  forest: "#0B3D33",
  pine: "#195843",
  moss: "#2D6A54",
  bright: "#00A878",
  ivory: "#F7F5F0",
  ceramic: "#FFFFFF",
  steel: "#9DB5AC",
  line: "#DCE8DF",
  lime: "#DDF06A",
  ink: "#173127",
  ground: "#EDF3EE",
};

/** Stage platform positions (x, z) — a gentle arc across the ground disc. */
const STAGE_POS: Array<[number, number]> = [
  [-4.4, 1.4],
  [-2.2, -0.7],
  [0, 1.0],
  [2.2, -0.7],
  [4.4, 1.4],
];

function useRouteCurve() {
  return useMemo(() => {
    const pts = STAGE_POS.map(([x, z]) => new THREE.Vector3(x, 0.02, z));
    return new THREE.CatmullRomCurve3(pts, false, "catmullrom", 0.35);
  }, []);
}

function Ground() {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.01, 0]} receiveShadow>
        <circleGeometry args={[7.6, 64]} />
        <meshStandardMaterial color={C.ground} roughness={0.95} />
      </mesh>
      {[2.6, 4.6, 6.4].map((r) => (
        <mesh key={r} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.005, 0]}>
          <ringGeometry args={[r - 0.02, r + 0.02, 96]} />
          <meshBasicMaterial color={C.line} transparent opacity={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function Route({ curve, stageT }: { curve: THREE.CatmullRomCurve3; stageT: number }) {
  const full = useMemo(
    () => new THREE.TubeGeometry(curve, 72, 0.15, 10, false),
    [curve],
  );
  const done = useMemo(() => {
    const pts = curve.getSpacedPoints(80).slice(0, Math.max(2, Math.round(stageT * 80) + 1));
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 48, 0.155, 10, false);
  }, [curve, stageT]);
  useEffect(
    () => () => {
      full.dispose();
      done.dispose();
    },
    [full, done],
  );
  return (
    <group position={[0, 0.03, 0]}>
      <mesh geometry={full}>
        <meshStandardMaterial color={C.line} roughness={0.9} />
      </mesh>
      <mesh geometry={done}>
        <meshStandardMaterial color={C.emerald} roughness={0.7} />
      </mesh>
    </group>
  );
}

/** Abstract ceramic glyph per stage — premium markers, no text, no humans. */
function StageGlyph({ kind, active }: { kind: number; active: boolean }) {
  const accent = active ? C.emerald : C.steel;
  return (
    <group>
      {kind === 0 && (
        <group>
          <mesh position={[0, 0.32, 0]}>
            <boxGeometry args={[0.52, 0.34, 0.42]} />
            <meshStandardMaterial color={C.ceramic} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.6, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[0.42, 0.26, 4]} />
            <meshStandardMaterial color={accent} roughness={0.6} />
          </mesh>
        </group>
      )}
      {kind === 1 && (
        <group>
          <mesh position={[0, 0.42, 0]}>
            <cylinderGeometry args={[0.05, 0.07, 0.62, 12]} />
            <meshStandardMaterial color={accent} roughness={0.5} metalness={0.3} />
          </mesh>
          <mesh position={[0, 0.78, 0]}>
            <sphereGeometry args={[0.1, 20, 20]} />
            <meshStandardMaterial
              color={C.lime}
              emissive={C.lime}
              emissiveIntensity={active ? 0.9 : 0.25}
              roughness={0.4}
            />
          </mesh>
        </group>
      )}
      {kind === 2 && (
        <group>
          <mesh position={[0, 0.42, 0]}>
            <sphereGeometry args={[0.26, 28, 28]} />
            <meshStandardMaterial color={C.ceramic} roughness={0.35} />
          </mesh>
          <mesh position={[0, 0.42, 0]} rotation={[Math.PI / 2.4, 0, 0]}>
            <torusGeometry args={[0.36, 0.035, 12, 40]} />
            <meshStandardMaterial color={accent} roughness={0.5} />
          </mesh>
        </group>
      )}
      {kind === 3 && (
        <group>
          <mesh position={[-0.08, 0.3, 0]}>
            <boxGeometry args={[0.56, 0.36, 0.44]} />
            <meshStandardMaterial color={C.ceramic} roughness={0.6} />
          </mesh>
          <mesh position={[0.16, 0.62, -0.08]}>
            <cylinderGeometry args={[0.07, 0.07, 0.34, 12]} />
            <meshStandardMaterial color={accent} roughness={0.6} />
          </mesh>
        </group>
      )}
      {kind === 4 && (
        <group>
          <mesh position={[0, 0.3, 0]}>
            <boxGeometry args={[0.5, 0.32, 0.42]} />
            <meshStandardMaterial color={C.ceramic} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.58, 0]} rotation={[0, Math.PI / 4, 0]}>
            <coneGeometry args={[0.4, 0.24, 4]} />
            <meshStandardMaterial color={active ? C.forest : C.pine} roughness={0.6} />
          </mesh>
          <mesh position={[0, 0.28, 0.22]}>
            <boxGeometry args={[0.16, 0.24, 0.03]} />
            <meshStandardMaterial color={C.emerald} roughness={0.6} />
          </mesh>
        </group>
      )}
    </group>
  );
}

function StageNode({
  index,
  active,
  reducedMotion,
}: {
  index: number;
  active: boolean;
  reducedMotion: boolean;
}) {
  const ring = useRef<THREE.Mesh>(null);
  const [x, z] = STAGE_POS[index];
  useFrame(({ clock }) => {
    if (!ring.current || reducedMotion || !active) return;
    const s = 1 + Math.sin(clock.elapsedTime * 2.4) * 0.05;
    ring.current.scale.set(s, s, 1);
  });
  return (
    <group position={[x, 0, z]}>
      {/* soft contact shadow */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.012, 0]}>
        <circleGeometry args={[0.85, 32]} />
        <meshBasicMaterial color={C.forest} transparent opacity={0.1} />
      </mesh>
      <mesh position={[0, 0.07, 0]}>
        <cylinderGeometry args={[0.62, 0.68, 0.14, 40]} />
        <meshStandardMaterial color={C.ceramic} roughness={0.55} />
      </mesh>
      <mesh
        ref={ring}
        rotation={[-Math.PI / 2, 0, 0]}
        position={[0, 0.145, 0]}
      >
        <ringGeometry args={[0.62, 0.7, 48]} />
        <meshBasicMaterial
          color={active ? C.emerald : C.line}
          transparent
          opacity={active ? 0.95 : 0.6}
        />
      </mesh>
      <group position={[0, 0.14, 0]}>
        <StageGlyph kind={index} active={active} />
      </group>
    </group>
  );
}

const WHEEL_POS: Array<[number, number]> = [
  [-0.44, -0.62],
  [0.44, -0.62],
  [-0.44, 0.02],
  [0.44, 0.02],
  [-0.44, 0.68],
  [0.44, 0.68],
];

function Truck({
  curve,
  t,
  reducedMotion,
  active,
}: {
  curve: THREE.CatmullRomCurve3;
  t: number;
  reducedMotion: boolean;
  active: boolean;
}) {
  const group = useRef<THREE.Group>(null);
  const wheels = useRef<Array<THREE.Mesh | null>>([]);
  const param = useRef(t);
  const wheelGeo = useMemo(() => {
    const g = new THREE.CylinderGeometry(0.21, 0.21, 0.15, 20);
    g.rotateZ(Math.PI / 2);
    return g;
  }, []);
  useEffect(() => () => wheelGeo.dispose(), [wheelGeo]);

  useFrame((state, delta) => {
    const g = group.current;
    if (!g) return;
    const target = THREE.MathUtils.clamp(t, 0, 1);
    // The truck rides on top of the route tube (tube top ≈ y 0.20).
    const RIDE_Y = 0.2;
    if (!reducedMotion && active) {
      const prev = param.current;
      param.current = THREE.MathUtils.damp(param.current, target, 2.4, delta);
      const speed = Math.abs(param.current - prev) / Math.max(delta, 1e-4);
      wheels.current.forEach((w) => {
        if (w) w.rotation.x -= speed * delta * 3.2;
      });
      const bob = Math.min(1, speed * 6) * Math.sin(state.clock.elapsedTime * 14) * 0.012;
      g.position.y = RIDE_Y + bob;
    } else {
      param.current = target;
      g.position.y = RIDE_Y;
    }
    const p = curve.getPointAt(param.current);
    const tan = curve.getTangentAt(param.current);
    g.position.x = p.x;
    g.position.z = p.z;
    g.rotation.y = Math.atan2(tan.x, tan.z);
  });

  return (
    <group ref={group}>
      {/* soft shadow follows the truck, just above the route */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.006, 0]}>
        <circleGeometry args={[1.05, 32]} />
        <meshBasicMaterial color={C.forest} transparent opacity={0.14} />
      </mesh>
      {/* chassis */}
      <mesh position={[0, 0.3, 0]}>
        <boxGeometry args={[0.68, 0.16, 1.78]} />
        <meshStandardMaterial color={C.pine} roughness={0.7} />
      </mesh>
      {/* refrigerated box */}
      <mesh position={[0, 0.78, -0.28]}>
        <boxGeometry args={[0.88, 0.78, 1.06]} />
        <meshStandardMaterial color={C.ceramic} roughness={0.45} />
      </mesh>
      {/* emerald stripe on the reefer box */}
      <mesh position={[0, 0.92, -0.28]}>
        <boxGeometry args={[0.9, 0.14, 1.08]} />
        <meshStandardMaterial color={C.emerald} roughness={0.5} />
      </mesh>
      {/* cooling unit */}
      <mesh position={[0, 0.72, 0.3]}>
        <boxGeometry args={[0.5, 0.34, 0.12]} />
        <meshStandardMaterial color={C.steel} roughness={0.5} metalness={0.4} />
      </mesh>
      {/* cab */}
      <mesh position={[0, 0.66, 0.72]}>
        <boxGeometry args={[0.82, 0.56, 0.5]} />
        <meshStandardMaterial color={C.emerald} roughness={0.5} />
      </mesh>
      {/* windshield */}
      <mesh position={[0, 0.76, 0.96]}>
        <boxGeometry args={[0.68, 0.26, 0.06]} />
        <meshStandardMaterial color={C.ink} roughness={0.25} metalness={0.2} />
      </mesh>
      {/* wheels */}
      {WHEEL_POS.map(([x, z], i) => (
        <mesh
          key={i}
          ref={(m) => {
            wheels.current[i] = m;
          }}
          geometry={wheelGeo}
          position={[x, 0.21, z]}
        >
          <meshStandardMaterial color={C.ink} roughness={0.8} />
        </mesh>
      ))}
    </group>
  );
}

function Scene({ stage, reducedMotion, active }: JourneySceneProps) {
  const curve = useRouteCurve();
  const t = stage / (STAGE_POS.length - 1);
  return (
    <>
      <hemisphereLight args={[C.ivory, C.moss, 0.9]} />
      <directionalLight position={[6, 10, 4]} intensity={1.15} color="#ffffff" />
      <directionalLight position={[-6, 6, -6]} intensity={0.35} color={C.line} />
      <Ground />
      <Route curve={curve} stageT={t} />
      {STAGE_POS.map((_, i) => (
        <StageNode key={i} index={i} active={i === stage} reducedMotion={reducedMotion} />
      ))}
      <Truck curve={curve} t={t} reducedMotion={reducedMotion} active={active} />
    </>
  );
}

export default function TruckJourney(props: JourneySceneProps) {
  const { reducedMotion, active } = props;
  return (
    <Canvas
      dpr={[1, 1.75]}
      camera={{ position: [0, 7.6, 11.6], fov: 38 }}
      gl={{ antialias: true, alpha: true }}
      frameloop={active && !reducedMotion ? "always" : "demand"}
      style={{ background: "transparent" }}
    >
      <Scene {...props} />
    </Canvas>
  );
}
