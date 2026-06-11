import type { BrandingState, ContrastWarning } from "./editor-types";

function normalizeHexColor(value: string) {
  const hex = value.trim().replace("#", "");
  if (hex.length !== 6) return null;
  const parsed = Number.parseInt(hex, 16);
  if (Number.isNaN(parsed)) return null;
  return {
    blue: parsed & 255,
    green: (parsed >> 8) & 255,
    red: (parsed >> 16) & 255,
  };
}

function channelToLinear(value: number) {
  const normalized = value / 255;
  return normalized <= 0.03928
    ? normalized / 12.92
    : ((normalized + 0.055) / 1.055) ** 2.4;
}

function getRelativeLuminance(hex: string) {
  const rgb = normalizeHexColor(hex);
  if (!rgb) return 0;
  return (
    0.2126 * channelToLinear(rgb.red) +
    0.7152 * channelToLinear(rgb.green) +
    0.0722 * channelToLinear(rgb.blue)
  );
}

export function getContrastRatio(foreground: string, background: string) {
  const foregroundLuminance = getRelativeLuminance(foreground);
  const backgroundLuminance = getRelativeLuminance(background);
  const lighter = Math.max(foregroundLuminance, backgroundLuminance);
  const darker = Math.min(foregroundLuminance, backgroundLuminance);
  return (lighter + 0.05) / (darker + 0.05);
}

function rgbToHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map((channel) =>
      Math.max(0, Math.min(255, Math.round(channel)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

function mixColors(source: string, target: string, amount: number) {
  const sourceRgb = normalizeHexColor(source);
  const targetRgb = normalizeHexColor(target);
  if (!sourceRgb || !targetRgb) return source;
  return rgbToHex(
    sourceRgb.red + (targetRgb.red - sourceRgb.red) * amount,
    sourceRgb.green + (targetRgb.green - sourceRgb.green) * amount,
    sourceRgb.blue + (targetRgb.blue - sourceRgb.blue) * amount,
  );
}

function suggestAccessibleColor(source: string, background: string) {
  const targets = ["#0b1220", "#ffffff"];
  let bestCandidate = source;
  let bestDistance = Number.POSITIVE_INFINITY;
  for (const target of targets) {
    for (let step = 1; step <= 20; step += 1) {
      const candidate = mixColors(source, target, step / 20);
      const ratio = getContrastRatio(candidate, background);
      if (ratio >= 4.5 && step < bestDistance) {
        bestCandidate = candidate;
        bestDistance = step;
      }
    }
  }
  return bestCandidate;
}

export function computeContrastWarnings(
  branding: BrandingState,
): ContrastWarning[] {
  const warnings: ContrastWarning[] = [];
  const checks: Array<{
    background: string;
    foreground: string;
    key: ContrastWarning["key"];
    label: string;
  }> = [
    {
      background: branding.primaryColor,
      foreground: "#ffffff",
      key: "primaryColor",
      label: "Texto branco sobre a cor primaria",
    },
    {
      background: branding.secondaryColor,
      foreground: "#ffffff",
      key: "secondaryColor",
      label: "Texto branco sobre a cor secundaria",
    },
    {
      background: branding.accentColor,
      foreground: "#10233f",
      key: "accentColor",
      label: "Texto navy sobre a cor de destaque",
    },
  ];

  for (const check of checks) {
    const ratio = getContrastRatio(check.foreground, check.background);
    if (ratio < 4.5) {
      warnings.push({
        key: check.key,
        label: check.label,
        ratio,
        suggestion: suggestAccessibleColor(
          branding[check.key],
          check.foreground,
        ),
      });
    }
  }
  return warnings;
}
