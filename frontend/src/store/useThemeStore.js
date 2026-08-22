import { create } from "zustand";

// FIX: Helper function to detect the user's OS system theme preference
const getSystemTheme = () => {
  if (typeof window !== "undefined" && window.matchMedia) {
    return window.matchMedia("(prefers-color-scheme: dark)").matches
      ? "dark"
      : "light";
  }
  return "light"; // Fallback if the browser doesn't support matchMedia
};

export const useThemeStore = create((set) => ({
  // Load saved theme, or fallback to the OS default
  theme: localStorage.getItem("chat-theme") || getSystemTheme(),

  setTheme: (theme) => {
    localStorage.setItem("chat-theme", theme);
    set({ theme });
  },
}));
