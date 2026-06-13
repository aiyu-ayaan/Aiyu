import { useState, useEffect } from "react";

/**
 * Device capability tiers used to scale hero/scroll effects.
 *
 * The source of truth is the `data-perf="lite|full"` flag set pre-paint by the
 * inline script in layout.js (reduced-motion / data-saver / slow network / weak
 * touch hardware). Reading it here keeps JS gating in lockstep with the CSS
 * fallbacks and fixes the old bug where iOS/Safari — which never expose
 * navigator.deviceMemory or navigator.connection — always fell through to
 * "high" and loaded the full WebGL hero on phones.
 *
 * - lite            -> "low"    (no WebGL scene, no scrubbed FX)
 * - full + modest hw -> "medium" (reduced scene quality)
 * - full + strong hw -> "high"   (full experience)
 *
 * `ready` flips true after the first client measurement so callers can hold off
 * mounting expensive, non-SSR modules until the tier is known.
 */
const useDevicePerformance = () => {
  const [tier, setTier] = useState("high");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);
  const [isLite, setIsLite] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e) => setPrefersReducedMotion(e.matches);
    mediaQuery.addEventListener("change", handleChange);

    const detectPerformanceTier = () => {
      // Primary signal: the pre-paint data-perf flag.
      const perf = document.documentElement.getAttribute("data-perf");
      if (perf === "lite") {
        setIsLite(true);
        setTier("low");
        return;
      }

      setIsLite(false);

      // "full" devices: split medium vs high so mid-range hardware still gets a
      // lighter scene. deviceMemory is undefined on iOS/Safari -> treated as capable.
      const mem = navigator.deviceMemory;
      const cores = navigator.hardwareConcurrency;
      if ((mem && mem <= 8) || (cores && cores <= 6)) {
        setTier("medium");
        return;
      }

      setTier("high");
    };

    detectPerformanceTier();
    setReady(true);

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return { tier, prefersReducedMotion, isLite, ready };
};

export default useDevicePerformance;
