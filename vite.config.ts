/// <reference types="vitest" />
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

// base relative : l'application fonctionne aussi bien à la racine qu'à /arc9-lite/ (GitHub Pages)
export default defineConfig({
  base: "./",
  plugins: [react()],
  test: { environment: "jsdom", include: ["src/**/*.test.ts"] },
});
