import type { ThreeSceneProps } from "../LazyThree";

/**
 * 3D SCENE STUB — replaced by the 3D/motion agent (plan §18: SensorField).
 * Premium glass/ceramic materials, emerald/ivory palette, soft studio light.
 * Must honour reducedMotion (static frame) and active (pause when hidden).
 */
export default function SensorField(_props: ThreeSceneProps) {
  return (
    <div
      aria-hidden="true"
      className="h-full w-full bg-[radial-gradient(ellipse_at_center,#E8F5E8_0%,#EDF6EF_70%)]"
    />
  );
}
