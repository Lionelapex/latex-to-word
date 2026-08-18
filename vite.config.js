import { defineConfig } from "vite";

export default defineConfig({
  base: "/latex-to-word/",
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
  },
});
