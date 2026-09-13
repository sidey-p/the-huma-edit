"use client";

import { useEffect } from "react";

/**
 * Theme manager — port of the reference theme.js. Three behaviors:
 *   1. Reads the OS/browser preference via matchMedia on first load.
 *   2. Keeps listening — if the user flips their OS theme while the
 *      tab is open, the site updates live (unless they chose manually).
 *   3. Persists an explicit manual choice in localStorage ("hume-theme"),
 *      separately from the "auto" state.
 *
 * The no-FOUC inline script in layout.tsx already set the attribute
 * before first paint; this runs right after hydration.
 */
const STORAGE_KEY = "hume-theme"; // "light" | "dark" | "auto"

function systemTheme(): "dark" | "light" {
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

function getStored(): string {
  try {
    return localStorage.getItem(STORAGE_KEY) || "auto";
  } catch {
    return "auto";
  }
}

function apply(theme: string) {
  const root = document.documentElement;
  root.setAttribute("data-theme", theme === "auto" ? systemTheme() : theme);
  root.setAttribute("data-theme-mode", theme);
}

export function ThemeProvider() {
  useEffect(() => {
    const media = window.matchMedia("(prefers-color-scheme: dark)");

    // Live-follow the OS only while the user hasn't overridden it.
    const onChange = () => {
      if (getStored() === "auto") apply("auto");
    };
    media.addEventListener("change", onChange);

    apply(getStored());
    return () => media.removeEventListener("change", onChange);
  }, []);

  return null;
}
