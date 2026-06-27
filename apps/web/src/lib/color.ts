// Pure color helpers shared between the branding editor (contrast warnings) and
// the live theming layer (readable text-on-color, background overlays).

export type Rgb = { red: number; green: number; blue: number };

export function normalizeHexColor(value: string): Rgb | null {
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

export function getRelativeLuminance(hex: string) {
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

export function rgbToHex(red: number, green: number, blue: number) {
  return `#${[red, green, blue]
    .map((channel) =>
      Math.max(0, Math.min(255, Math.round(channel)))
        .toString(16)
        .padStart(2, "0"),
    )
    .join("")}`;
}

export function mixColors(source: string, target: string, amount: number) {
  const sourceRgb = normalizeHexColor(source);
  const targetRgb = normalizeHexColor(target);
  if (!sourceRgb || !targetRgb) return source;
  return rgbToHex(
    sourceRgb.red + (targetRgb.red - sourceRgb.red) * amount,
    sourceRgb.green + (targetRgb.green - sourceRgb.green) * amount,
    sourceRgb.blue + (targetRgb.blue - sourceRgb.blue) * amount,
  );
}

export function suggestAccessibleColor(source: string, background: string) {
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

const DARK_INK = "#10233f";
const LIGHT_INK = "#ffffff";

// Pick the foreground (dark navy vs white) that reads best on the given color.
export function readableTextColor(background: string) {
  return getContrastRatio(LIGHT_INK, background) >=
    getContrastRatio(DARK_INK, background)
    ? LIGHT_INK
    : DARK_INK;
}

export function hexToRgba(hex: string, alpha: number) {
  const rgb = normalizeHexColor(hex);
  if (!rgb) return `rgba(16,35,63,${alpha})`;
  return `rgba(${rgb.red},${rgb.green},${rgb.blue},${alpha})`;
}
