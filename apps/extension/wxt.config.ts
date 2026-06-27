import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import Icons from "unplugin-icons/vite"
import TurboConsole from "unplugin-turbo-console/vite"
import { defineConfig } from "wxt"

// See https://wxt.dev/api/config.html
export default defineConfig({
  imports: false,
  srcDir: "./src",
  alias: {
    "#": path.resolve(__dirname, "src"),
  },
  dev: {
    server: {
      port: 3002,
    },
  },
  webExt: {
    disabled: true,
  },
  manifest: {
    name: "NewsNext",
    description: "NewsNext is a browser extension that helps you work with your browser",
    version: "0.9.0",
    host_permissions: ["<all_urls>"],
  },
  hooks: {
    ready: (wxt) => {
      wxt.config.alias = {
        ...wxt.config.alias,
        "@": path.resolve(__dirname, "../web/src"),
      }
    },
  },
  vite: () => {
    return {
      plugins: [
        tailwindcss(),
        TurboConsole(),
        Icons({
          compiler: "jsx",
          jsx: "react",
        }),
        react(),
      ],
    }
  },
})
