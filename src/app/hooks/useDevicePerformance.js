import { useState, useEffect } from "react";

const useDevicePerformance = () => {
  const [tier, setTier] = useState("high");
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  useEffect(() => {
    // Check for prefers-reduced-motion
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);

    // Detect device performance tier
    const detectPerformanceTier = () => {
      // Check device memory
      if (navigator.deviceMemory) {
        if (navigator.deviceMemory <= 4) {
          setTier("low");
          return;
        } else if (navigator.deviceMemory <= 8) {
          setTier("medium");
          return;
        }
      }

      // Check connection speed
      if (navigator.connection) {
        const effectiveType = navigator.connection.effectiveType;
        if (effectiveType === "2g" || effectiveType === "3g") {
          setTier("low");
          return;
        } else if (effectiveType === "4g") {
          setTier("high");
          return;
        }
      }

      // Default to high
      setTier("high");
    };

    detectPerformanceTier();

    return () => {
      mediaQuery.removeEventListener("change", handleChange);
    };
  }, []);

  return { tier, prefersReducedMotion };
};

export default useDevicePerformance;
