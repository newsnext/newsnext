import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { nitro } from "nitro/vite"
import { defineConfig } from "vite"

export default defineConfig({
  plugins: [
    nitro(),
    react(),
    tailwindcss(),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./src/pages",
      generatedRouteTree: "./src/routeTree.gen.ts",
      routeFileIgnorePrefix: "-",
      quoteStyle: "double",
    }),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
})
