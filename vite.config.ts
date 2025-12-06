import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import { nitro } from "nitro/vite"
import unpluginFonts from "unplugin-fonts/vite"
import Icons from "unplugin-icons/vite"
import TurboConsole from "unplugin-turbo-console/vite"
import { defineConfig } from "vite"
import { ROOT_DIR } from "./root"

export default defineConfig({
  server: {
    port: 3001,
    strictPort: true,
    host: true,
    proxy: {
      "/api": {
        target: "https://newsnow.busiyi.world/api",
        changeOrigin: true,
        rewrite: path => path.replace(/^\/api/, ""),
      },
    },
  },
  plugins: [
    nitro(),
    react(),
    tailwindcss(),
    Icons({
      compiler: "jsx",
      jsx: "react",
    }),
    unpluginFonts({
      google: {
        preconnect: true,
        text: "NewNext",
        families: [
          {
            name: "Baloo 2",
            styles: "wght@400..800",
          },
        ],
      },
    }),
    tanstackRouter({
      target: "react",
      autoCodeSplitting: true,
      routesDirectory: "./src/pages",
      generatedRouteTree: "./src/routeTree.gen.ts",
      routeFileIgnorePrefix: "-",
      quoteStyle: "double",
    }),
    TurboConsole(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(ROOT_DIR, "src"),
    },
  },
})
