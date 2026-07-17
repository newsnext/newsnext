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
    "@": path.resolve(__dirname, "src"),
  },
  dev: {
    server: {
      port: 3002,
    },
  },
  webExt: {
    disabled: true,
  },
  manifest: ({ browser, mode }) => {
    const extensionName = mode === "development" ? "NewsNext Dev" : "NewsNext"

    return {
      name: extensionName,
      description: "Elegant reading experience, Fastest information reception",
      version: "0.9.0",
      permissions: [
        "bookmarks",
        "contextMenus",
        "cookies",
        "favicon",
        "history",
        "scripting",
        "storage",
        "tabs",
      ],
      host_permissions: [
        "http://*/*",
        "https://*/*",
      ],
      ...browser === "chrome"
        ? {
            action: {
              default_title: "NewsNext",
            },
          }
        : {},
    }
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
