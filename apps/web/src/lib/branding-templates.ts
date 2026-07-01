import type { LiveBranding } from "@/lib/live";

export type BrandingTemplate = {
  id: string;
  name: string;
  description: string;
  preview: {
    primary: string;
    secondary: string;
    accent: string;
  };
  branding: Partial<LiveBranding>;
};

export const BRANDING_TEMPLATES: BrandingTemplate[] = [
  {
    id: "quizzy-default",
    name: "Quizzy Padrão",
    description: "O tema original — verde-teal com fundo escuro.",
    preview: { primary: "#0f766e", secondary: "#10233f", accent: "#f59e0b" },
    branding: {
      primaryColor: "#0f766e",
      secondaryColor: "#10233f",
      accentColor: "#f59e0b",
      fontFamily: "DM Sans",
    },
  },
  {
    id: "ocean-blue",
    name: "Oceano",
    description: "Azul profundo com destaque ciano — ideal para corporativo.",
    preview: { primary: "#1d4ed8", secondary: "#0f172a", accent: "#06b6d4" },
    branding: {
      primaryColor: "#1d4ed8",
      secondaryColor: "#0f172a",
      accentColor: "#06b6d4",
      fontFamily: "Montserrat",
    },
  },
  {
    id: "midnight-purple",
    name: "Roxo Noturno",
    description: "Violeta escuro com destaque dourado — elegante e moderno.",
    preview: { primary: "#6d28d9", secondary: "#1e1b4b", accent: "#fbbf24" },
    branding: {
      primaryColor: "#6d28d9",
      secondaryColor: "#1e1b4b",
      accentColor: "#fbbf24",
      fontFamily: "Raleway",
    },
  },
  {
    id: "sunset",
    name: "Pôr do Sol",
    description: "Vermelho-coral com laranja vibrante — energia e atenção.",
    preview: { primary: "#be123c", secondary: "#1c1917", accent: "#f97316" },
    branding: {
      primaryColor: "#be123c",
      secondaryColor: "#1c1917",
      accentColor: "#f97316",
      fontFamily: "Space Grotesk",
    },
  },
  {
    id: "forest",
    name: "Floresta",
    description: "Verde-escuro com destaque âmbar — sereno e focado.",
    preview: { primary: "#166534", secondary: "#052e16", accent: "#d97706" },
    branding: {
      primaryColor: "#166534",
      secondaryColor: "#052e16",
      accentColor: "#d97706",
      fontFamily: "Playfair Display",
    },
  },
];
