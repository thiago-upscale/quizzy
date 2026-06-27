import { getContrastRatio, suggestAccessibleColor } from "@/lib/color";
import type { BrandingState, ContrastWarning } from "./editor-types";

export { getContrastRatio };

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
