"use client";

import { useEffect } from "react";
import About from "../components/about/About";
import { useTheme } from "../context/ThemeContext";

export default function AboutPage() {
  const { setPageTheme } = useTheme();
  
  useEffect(() => {
    setPageTheme('about');
  }, [setPageTheme]);
  
  return <About />;
}