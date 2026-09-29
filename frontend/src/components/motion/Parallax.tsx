import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion, useScroll, useTransform } from "framer-motion";
import { cn } from "../../lib/cn";

const EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];

/**
 * Scroll parallax wrapper: inner content drifts at a fraction of scroll speed.
 * GPU-friendly translateY only. Reduced on mobile, static for reduced motion.
 */
export function Parallax({
  children,
  className,
  speed = 0.14,
}: {
  children: ReactNode;
  className?: string;
  /** Fraction of section travel applied as offset (0.1 = gentle). */
  speed?: number;
}) {
  const reduce = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [coarse, setCoarse] = useState(false);
  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  useEffect(() => {
    const mq = window.matchMedia("(max-width: 640px)");
    setCoarse(mq.matches);
    const onChange = (e: MediaQueryListEvent) => setCoarse(e.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  const travel = (coarse ? speed * 0.35 : speed) * 320;
  const y = useTransform(scrollYProgress, [0, 1], [travel, -travel]);

  if (reduce) return <div className={className}>{children}</div>;
  return (
    <div ref={ref} className={className}>
      <motion.div style={{ y }} className="will-change-transform">
        {children}
      </motion.div>
    </div>
  );
}

/**
 * Cinematic image reveal: the image unwipes from a rounded inset crop
 * and settles from a slight scale. Optional overlay (chips/captions) rides along.
 */
export function WipeImage({
  src,
  alt,
  className,
  imgClassName,
  overlay,
  eager = false,
}: {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  overlay?: ReactNode;
  eager?: boolean;
}) {
  const reduce = useReducedMotion();
  if (reduce) {
    return (
      <div className={cn("relative overflow-hidden", className)}>
        <img src={src} alt={alt} className={imgClassName} loading={eager ? "eager" : "lazy"} />
        {overlay}
      </div>
    );
  }
  return (
    <div className={cn("relative overflow-hidden", className)}>
      <motion.img
        src={src}
        alt={alt}
        loading={eager ? "eager" : "lazy"}
        initial={{ clipPath: "inset(14% 7% 14% 7% round 28px)", scale: 1.1, opacity: 0.4 }}
        whileInView={{ clipPath: "inset(0% 0% 0% 0% round 28px)", scale: 1, opacity: 1 }}
        viewport={{ once: true, margin: "-72px" }}
        transition={{ duration: 1, ease: EASE }}
        className={cn("will-change-transform", imgClassName)}
      />
      {overlay}
    </div>
  );
}
