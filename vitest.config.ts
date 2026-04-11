import { defineConfig } from "vitest/config"

export default defineConfig({
  test: {
    globals: true,
    include: [
      "apps/**/*.{test,spec}.{ts,tsx}",
      "packages/**/*.{test,spec}.{ts,tsx}",
      "servers/**/*.{test,spec}.{ts,tsx}",
      "data/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "examples/**",
      "**/examples/**",
    ],
  },
})
