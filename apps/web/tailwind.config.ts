import type { Config } from "tailwindcss";

/**
 * Tailwind theme is the binding layer between DESIGN.md (Cal.com tokens) and components.
 * NEVER add a color, radius, spacing, or font key here that does not appear in DESIGN.md.
 * NEVER use raw hex codes in components — reference token classes only (bg-canvas, text-ink, ...).
 * Soft shadows only. No neumorphism, no glassmorphism.
 */
const config: Config = {
  content: [
    "./app/**/*.{ts,tsx}",
    "./components/**/*.{ts,tsx}",
    "./lib/**/*.{ts,tsx}",
  ],
  theme: {
    colors: {
      transparent: "transparent",
      current: "currentColor",
      // DESIGN.md colors (Cal.com)
      primary: "#111111",
      "primary-active": "#242424",
      "primary-disabled": "#e5e7eb",
      ink: "#111111",
      body: "#374151",
      muted: "#6b7280",
      "muted-soft": "#898989",
      hairline: "#e5e7eb",
      "hairline-soft": "#f3f4f6",
      canvas: "#ffffff",
      "surface-soft": "#f8f9fa",
      "surface-card": "#f5f5f5",
      "surface-strong": "#e5e7eb",
      "surface-dark": "#101010",
      "surface-dark-elevated": "#1a1a1a",
      "on-primary": "#ffffff",
      "on-dark": "#ffffff",
      "on-dark-soft": "#a1a1aa",
      "brand-accent": "#3b82f6",
      success: "#10b981",
      warning: "#f59e0b",
      error: "#ef4444",
      "badge-orange": "#fb923c",
      "badge-pink": "#ec4899",
      "badge-violet": "#8b5cf6",
      "badge-emerald": "#34d399",
    },
    borderRadius: {
      none: "0",
      xs: "4px",
      sm: "6px",
      md: "8px",
      lg: "12px",
      xl: "16px",
      pill: "9999px",
      full: "9999px",
    },
    spacing: {
      0: "0",
      px: "1px",
      xxs: "4px",
      xs: "8px",
      sm: "12px",
      md: "16px",
      lg: "24px",
      xl: "32px",
      xxl: "48px",
      section: "96px",
    },
    fontFamily: {
      display: ["Cal Sans", "Inter", "sans-serif"],
      sans: ["Inter", "sans-serif"],
      mono: ["JetBrains Mono", "ui-monospace", "monospace"],
    },
    fontSize: {
      "display-xl": ["64px", { lineHeight: "1.05", letterSpacing: "-2px", fontWeight: "600" }],
      "display-lg": ["48px", { lineHeight: "1.1", letterSpacing: "-1.5px", fontWeight: "600" }],
      "display-md": ["36px", { lineHeight: "1.15", letterSpacing: "-1px", fontWeight: "600" }],
      "display-sm": ["28px", { lineHeight: "1.2", letterSpacing: "-0.5px", fontWeight: "600" }],
      "title-lg": ["22px", { lineHeight: "1.3", letterSpacing: "-0.3px", fontWeight: "600" }],
      "title-md": ["18px", { lineHeight: "1.4", fontWeight: "600" }],
      "title-sm": ["16px", { lineHeight: "1.4", fontWeight: "600" }],
      "body-md": ["16px", { lineHeight: "1.5", fontWeight: "400" }],
      "body-sm": ["14px", { lineHeight: "1.5", fontWeight: "400" }],
      caption: ["13px", { lineHeight: "1.4", fontWeight: "500" }],
      code: ["14px", { lineHeight: "1.5", fontWeight: "400" }],
      button: ["14px", { lineHeight: "1", fontWeight: "600" }],
      "nav-link": ["14px", { lineHeight: "1.4", fontWeight: "500" }],
    },
    extend: {
      // Soft shadows ONLY. No neumorphism, no glassmorphism.
      boxShadow: {
        none: "none",
        "soft-1": "0 1px 2px 0 rgba(17, 17, 17, 0.04)",
        "soft-2": "0 4px 12px -2px rgba(17, 17, 17, 0.06)",
      },
    },
  },
  plugins: [],
};

export default config;
