import {
  Component,
  ComponentType,
  ReactNode,
  Suspense,
  lazy,
  useEffect,
  useRef,
  useState,
} from "react";
import { useReducedMotion } from "framer-motion";
import { cn } from "../../lib/cn";

interface LazyThreeProps<P extends ThreeSceneProps> {
  /** Dynamic import of the R3F scene component, e.g. () => import("./scenes/HeroEcosystem") */
  loader: () => Promise<{ default: ComponentType<P> }>;
  /** Accessible label describing the 3D visual. */
  label: string;
  /** Static poster shown while loading / when 3D is unavailable. */
  poster?: ReactNode;
  className?: string;
  /** Extra props forwarded to the scene component (e.g. moduleId). */
  sceneProps?: Omit<P, keyof ThreeSceneProps>;
}

export interface ThreeSceneProps {
  /** True when the user prefers reduced motion — scene must render statically. */
  reducedMotion: boolean;
  /** True when the scene is visible and the tab is active — pause otherwise. */
  active: boolean;
}

/**
 * Catches runtime scene failures (e.g. no WebGL context on the device) and
 * falls back to the static poster instead of crashing the page.
 */
class SceneErrorBoundary extends Component<{ fallback: ReactNode; children: ReactNode }, { failed: boolean }> {
  constructor(props: { fallback: ReactNode; children: ReactNode }) {
    super(props);
    this.state = { failed: false };
  }
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? this.props.fallback : this.props.children;
  }
}

/**
 * Lazy 3D mount point (plan §15/§18):
 * - React.lazy + Suspense so three.js never blocks the initial bundle
 * - IntersectionObserver: mounts only when scrolled into view
 * - Pauses rendering when the tab is hidden or the scene scrolls off-screen
 * - prefers-reduced-motion renders a static frame
 * - Static poster fallback while loading or on error
 */
export function LazyThree<P extends ThreeSceneProps>({
  loader,
  label,
  poster,
  className,
  sceneProps,
}: LazyThreeProps<P>) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [shouldMount, setShouldMount] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const [tabActive, setTabActive] = useState(() => document.visibilityState === "visible");
  const [failed, setFailed] = useState(false);
  const reduceMotion = useReducedMotion();
  const [SceneComponent] = useState<ComponentType<any>>(() =>
    lazy(() =>
      loader().catch(() => {
        setFailed(true);
        return { default: () => null };
      }),
    ),
  );

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setShouldMount(true);
          setIsVisible(true);
        } else {
          setIsVisible(false);
        }
      },
      { rootMargin: "200px" },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    const onVisibility = () => setTabActive(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", onVisibility);
    return () => document.removeEventListener("visibilitychange", onVisibility);
  }, []);

  const active = isVisible && tabActive && !reduceMotion;
  const componentProps = { reducedMotion: Boolean(reduceMotion), active, ...sceneProps } as P;

  return (
    <div
      ref={containerRef}
      role="img"
      aria-label={label}
      className={cn("relative overflow-hidden", className)}
    >
      {shouldMount && !failed ? (
        <Suspense
          fallback={
            poster ?? (
              <div className="flex h-full w-full items-center justify-center bg-palegreen" aria-hidden="true">
                <span className="h-8 w-8 animate-spin rounded-full border-[3px] border-line border-t-brand" />
              </div>
            )
          }
        >
          <SceneErrorBoundary fallback={poster ?? <ScenePoster className="absolute inset-0" />}>
            <SceneComponent {...componentProps} />
          </SceneErrorBoundary>
        </Suspense>
      ) : (
        poster ?? <div className="h-full w-full bg-palegreen" aria-hidden="true" />
      )}
    </div>
  );
}

/** Simple gradient poster used until real scene posters are designed. */
export function ScenePoster({ className, tone = "light" }: { className?: string; tone?: "light" | "dark" }) {
  return (
    <div
      aria-hidden="true"
      className={cn(
        "h-full w-full",
        tone === "dark"
          ? "bg-[radial-gradient(ellipse_at_center,#195843_0%,#0B3D33_70%)]"
          : "bg-[radial-gradient(ellipse_at_center,#E8F5E8_0%,#EDF6EF_70%)]",
        className,
      )}
    />
  );
}
