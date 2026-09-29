import { useEffect } from "react";
import { Outlet, useLocation } from "react-router-dom";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { FloatingNav } from "./FloatingNav";
import { Footer } from "./Footer";
import { ScrollProgress } from "../motion/ScrollProgress";
import { Grain } from "../motion/Grain";

/**
 * Public layout: light navbar + content + deep forest footer, skip-link target.
 * - Scroll progress hairline, cinematic grain, route-change fade.
 */
/** Auth routes render their own branded card — the global nav pill would double the logo. */
const AUTH_PATHS = ["/login", "/register", "/forgot-password", "/reset-password"];

export function AppLayout() {
  const location = useLocation();
  const reduce = useReducedMotion();
  const hideNav = AUTH_PATHS.includes(location.pathname);

  // Scroll to top on route change (instant for reduced motion).
  useEffect(() => {
    window.scrollTo({ top: 0, behavior: "instant" as ScrollBehavior });
  }, [location.pathname]);

  return (
    <div className="flex min-h-screen flex-col bg-ivory text-ink">
      <ScrollProgress />
      <Grain />
      {!hideNav && <FloatingNav />}
      <AnimatePresence mode="wait" initial={false}>
        <motion.main
          key={location.pathname}
          id="main-content"
          className="flex-1"
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          exit={reduce ? { opacity: 0 } : { opacity: 0, y: -6 }}
          transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        >
          <Outlet />
        </motion.main>
      </AnimatePresence>
      <Footer />
    </div>
  );
}
