"use client";

import { useEffect } from "react";
import Projects from "../components/projects/Projects";
import { useTheme } from "../context/ThemeContext";

export default function ProjectsPage() {
  const { setPageTheme } = useTheme();
  
  useEffect(() => {
    setPageTheme('projects');
  }, [setPageTheme]);
  
  return <Projects />;
}