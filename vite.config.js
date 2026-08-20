import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  base: "/latex-to-word/",
  plugins: [tailwindcss()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
  },
});
