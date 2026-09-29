/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{ts,tsx}"],
  theme: {
    extend: {
      // ApnaDairy locked brand palette (§4) — no other colors on brand surfaces.
      // No purple gradients, no neon.
      colors: {
        brand: {
          DEFAULT: "#087857", // primary emerald
          forest: "#0B3D33", // deep forest
          pine: "#195843", // dark green
          moss: "#2D6A54", // secondary green
          bright: "#00A878", // bright action green
        },
        mint: "#DDF4E8",
        palegreen: "#EDF6EF",
        ivory: "#F7F5F0",
        offwhite: "#F4F4F0",
        white: "#FFFFFF",
        sky: "#DCEEF8",
        ink: "#10261E", // dark text
        muted: "#617168", // muted text
        lime: "#DDF06A", // controlled accent ONLY — small highlights, never large fills
        line: "#DCE8DF", // green border
        amber: "#D9A441",
        danger: "#B33B2F",
      },
      fontFamily: {
        // Bold condensed display for large editorial headings (§4).
        display: ["Archivo Narrow", "Arial Narrow", "Helvetica Neue", "sans-serif"],
        // Alias kept for in-progress night-theme surfaces; same display face.
        condensed: ["Archivo Narrow", "Arial Narrow", "Helvetica Neue", "sans-serif"],
        // Body text.
        sans: ["Inter", "system-ui", "-apple-system", "Segoe UI", "Roboto", "sans-serif"],
        // Technical mono annotations.
        tech: ["IBM Plex Mono", "ui-monospace", "SFMono-Regular", "Menlo", "monospace"],
      },
      boxShadow: {
        card: "0 1px 2px rgba(16, 38, 30, 0.06), 0 8px 24px rgba(16, 38, 30, 0.08)",
        lift: "0 2px 4px rgba(16, 38, 30, 0.08), 0 16px 40px rgba(16, 38, 30, 0.14)",
        pill: "0 2px 6px rgba(16, 38, 30, 0.08), 0 12px 32px rgba(16, 38, 30, 0.12)",
      },
      borderRadius: {
        xl2: "1.25rem",
      },
    },
  },
  plugins: [],
};
