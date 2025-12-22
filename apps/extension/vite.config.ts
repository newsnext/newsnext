import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import react from "@vitejs/plugin-react"
import Icons from "unplugin-icons/vite"
import TurboConsole from "unplugin-turbo-console/vite"
import { defineConfig } from "vite"

export default defineConfig(({ mode }) => {
  const _isDEV = mode !== "production"
  return {
    server: {
      port: 3001,
      strictPort: true,
      host: true,
      proxy: {
        "/trpc": {
          // target: "http://localhost:4000",
          // target: "http://api.newsnext.pro",
          target: "https://newsnext.orongxing.workers.dev/trpc",
          changeOrigin: true,
          rewrite: path => path.replace(/^\/trpc/, ""),
        },
      },
    },
    optimizeDeps: {
      force: false,
    },
    plugins: [
      react(),
      Icons({
        compiler: "jsx",
        jsx: "react",
      }),
      tanstackRouter({
        target: "react",
        autoCodeSplitting: true,
        routesDirectory: "./web/pages",
        generatedRouteTree: "./web/routeTree.gen.ts",
        routeFileIgnorePrefix: "-",
        quoteStyle: "double",
      }),
      TurboConsole(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "#": path.resolve(__dirname, "web"),
        "@": path.resolve(__dirname, "shared"),
      },
    },
  }
})
