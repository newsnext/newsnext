import { cloudflare } from "@cloudflare/vite-plugin"
import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"
import viteReact from "@vitejs/plugin-react"
import { defineConfig } from "vite"

export default defineConfig(({ command, isPreview }) => ({
  plugins: [
    tailwindcss(),
    // Miniflare requires Undici APIs that Bun's development runtime lacks.
    (command === "build" || isPreview) && cloudflare({ viteEnvironment: { name: "ssr" } }),
    tanstackStart(),
    viteReact(),
  ],
}))
