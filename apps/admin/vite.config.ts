import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import { defineConfig } from "vite"

const API_PREFIX_REGEX = /^\/api/

export default defineConfig({
  server: {
    port: 3002,
    strictPort: true,
    host: true,
    proxy: {
      "/api": {
        target: "http://localhost:4000/api",
        changeOrigin: true,
        rewrite: path => path.replace(API_PREFIX_REGEX, ""),
      },
    },
  },
  plugins: [
    react(),
    tailwindcss(),
  ],
  resolve: {
    alias: {
      "@": path.resolve(__dirname, "src"),
    },
  },
})
