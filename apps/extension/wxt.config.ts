import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import Icons from "unplugin-icons/vite"
import TurboConsole from "unplugin-turbo-console/vite"
import { defineConfig } from "wxt"

// See https://wxt.dev/api/config.html
export default defineConfig({
  imports: false,
  srcDir: "./wxt",
  dev: {
    server: {
      port: 3002,
    },
  },
  manifest: {
    name: "NewsNext",
    description: "NewsNext is a browser extension that helps you work with your browser",
    version: "0.9.0",
    commands: {
      "command-bar-toggle": {
        suggested_key: {
          default: "Ctrl+Space",
          mac: "Command+Space",
        },
        description: "Toggle the command bar",
      },
    },
    permissions: ["bookmarks", "history"],
    host_permissions: ["<all_urls>"],
    web_accessible_resources: [
      {
        resources: ["command-iframe.html"],
        matches: ["<all_urls>"],
      },
    ],
  },
  hooks: {
    ready: (wxt) => {
      wxt.config.alias = {
        "#": path.resolve(__dirname, "wxt"),
        "@": path.resolve(__dirname, "shared"),
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
