const tailwindConfig = {
  theme: {
    extend: {
      blur: {
        glass: "14px",
        "glass-strong": "24px",
      },
      fontFamily: {
        sans: [
          "var(--font-geometric)",
          "ui-sans-serif",
          "system-ui",
          "sans-serif",
        ],
        mono: [
          "var(--font-telemetry)",
          "ui-monospace",
          "SFMono-Regular",
          "monospace",
        ],
      },
    },
  },
};

export default tailwindConfig;
