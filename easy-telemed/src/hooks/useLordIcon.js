import { useEffect } from "react";

const LORDICON_CDN = "https://cdn.lordicon.com/lordicon.js";

export default function useLordIcon() {
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.__lordiconLoaded) return;

    const script = document.createElement("script");
    script.src = LORDICON_CDN;
    script.async = true;
    script.onload = () => {
      window.__lordiconLoaded = true;
    };
    script.onerror = () => {
      console.warn("Failed to load Lordicon script");
    };
    document.body.appendChild(script);

    return () => {
      // keep script for subsequent renders; no cleanup required
    };
  }, []);
}
