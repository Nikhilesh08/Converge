import daisyui from "daisyui";
/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {},
  },
  plugins: [require("daisyui")],
  daisyui: {
    themes: [
      "light",
      {
        dark: {
          primary: "#34C759", // Apple Messages Green
          "primary-content": "#ffffff",
          "base-100": "#000000", // OLED Black
          "base-200": "#1C1C1E", // Dark Grey
          "base-300": "#2C2C2E",
          "base-content": "#ffffff",
          info: "#0A84FF",
          success: "#34C759",
          warning: "#FF9F0A",
          error: "#FF453A",
        },
      },
    ],
  },
};
