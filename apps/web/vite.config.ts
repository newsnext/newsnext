import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import Icons from "unplugin-icons/vite"
import TurboConsole from "unplugin-turbo-console/vite"
import { defineConfig } from "vite"

export default defineConfig(({ mode }) => {
  const isDEV = mode !== "production"
  console.log("isDEV", isDEV)
  return {
    server: {
      port: 3001,
      strictPort: true,
      host: true,
    },
    optimizeDeps: {
      force: false,
    },
    build: {
      rolldownOptions: {
        output: {
          manualChunks(id) {
            if (!id.includes("node_modules")) {
              return undefined
            }

            if (
              /node_modules\/(?:\.bun\/)?react-dom@/.test(id)
              || /node_modules\/(?:\.bun\/)?react@/.test(id)
              || /node_modules\/(?:\.bun\/)?scheduler@/.test(id)
              || /node_modules\/react-dom\//.test(id)
              || /node_modules\/react\//.test(id)
              || /node_modules\/scheduler\//.test(id)
            ) {
              return "vendor-react"
            }

            if (id.includes("@tanstack")) {
              return "vendor-tanstack"
            }

            if (id.includes("motion") || id.includes("framer-motion")) {
              return "vendor-motion"
            }

            return "vendor"
          },
        },
      },
    },
    plugins: [
      react(),
      Icons({
        compiler: "jsx",
        jsx: "react",
      }),
      TurboConsole(),
      tailwindcss(),
    ],
    resolve: {
      alias: {
        "@": path.resolve(__dirname, "src"),
      },
    },
  }
})
