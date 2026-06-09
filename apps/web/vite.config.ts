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
