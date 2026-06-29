import type { CSSProperties } from "react";
import { hexToRgba, readableTextColor } from "@/lib/color";
import type { BackgroundDimming, LiveBranding } from "@/lib/live";

// Single source of truth for the live A/B/C/D answer tiles. Kept as a fixed
// palette (decision: preserve fast recognition) and imported by both the
// projector display and the participant mobile so they always match.
export const ANSWER_PALETTE = [
  { bg: "#e21b3c", fg: "#ffffff", icon: "▲" },
  { bg: "#1368ce", fg: "#ffffff", icon: "◆" },
  { bg: "#d89e00", fg: "#ffffff", icon: "●" },
  { bg: "#26890c", fg: "#ffffff", icon: "■" },
] as const;

// Semantic result colors (correct / wrong) — intentionally not themable.
export const RESULT_COLORS = {
  correct: "#16a34a",
  wrong: "#7f1d1d",
} as const;

const DIMMING_ALPHAS: Record<BackgroundDimming, [number, number]> = {
  leve: [0.25, 0.45],
  medio: [0.45, 0.65],
  forte: [0.7, 0.85],
};

// CSS custom properties derived from branding. Spread onto the root wrapper of
// every live surface (display, lobby/mobile, entry) AND the editor preview, so
// a single change re-themes everything consistently. Components read the
// `--brand-*` vars instead of hardcoded hex values.
export function brandingCssVars(branding: LiveBranding): CSSProperties {
  return {
    "--brand-primary": branding.primaryColor,
    "--brand-secondary": branding.secondaryColor,
    "--brand-accent": branding.accentColor,
    "--brand-on-accent": readableTextColor(branding.accentColor),
    "--brand-on-primary": readableTextColor(branding.primaryColor),
    "--brand-on-secondary": readableTextColor(branding.secondaryColor),
    "--brand-font": branding.fontFamily,
    fontFamily: branding.fontFamily,
  } as CSSProperties;
}

// Background style (image + themed overlay, or themed gradient fallback).
// The overlay is tinted with the secondary color and dimmed per
// `backgroundDimming` so an uploaded image stays visible (the old fixed dark
// overlay hid it).
export function brandingBackgroundStyle(branding: LiveBranding): CSSProperties {
  if (branding.backgroundImageUrl) {
    const [top, bottom] = DIMMING_ALPHAS[branding.backgroundDimming];
    return {
      backgroundImage: `linear-gradient(180deg, ${hexToRgba(
        branding.primaryColor,
        top,
      )} 0%, ${hexToRgba(branding.primaryColor, bottom)} 100%), url(${branding.backgroundImageUrl})`,
      backgroundPosition: "center",
      backgroundSize: "cover",
    };
  }

  return {
    backgroundImage: `linear-gradient(180deg, ${branding.primaryColor} 0%, ${branding.secondaryColor} 100%)`,
    backgroundPosition: "center",
    backgroundSize: "cover",
  };
}

// Convenience: full surface style (theme vars + background) for root wrappers.
export function brandingSurfaceStyle(branding: LiveBranding): CSSProperties {
  return { ...brandingCssVars(branding), ...brandingBackgroundStyle(branding) };
}
