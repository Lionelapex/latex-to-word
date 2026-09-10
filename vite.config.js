import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";

export default defineConfig({
  // Custom domain https://latextodocx.com serves the site at domain root.
  // github.io/latex-to-word/ still redirects there once Pages custom domain is set.
  base: "/",
  plugins: [tailwindcss()],
  test: {
    environment: "node",
    include: ["tests/**/*.test.js"],
  },
});
