import path from "node:path"
import tailwindcss from "@tailwindcss/vite"
import react from "@vitejs/plugin-react"
import Icons from "unplugin-icons/vite"
import TurboConsole from "unplugin-turbo-console/vite"
import { defineConfig } from "wxt"

const OPTIONAL_SOURCE_PERMISSIONS = [
  "bookmarks",
  "cookies",
  "favicon",
  "history",
  "tabs",
] as const
const OPTIONAL_SOURCE_ORIGINS = ["*://*/*"] as const

// See https://wxt.dev/api/config.html
export default defineConfig({
  imports: false,
  srcDir: "./src",
  alias: {
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
        "activeTab",
        "contextMenus",
        "declarativeNetRequestWithHostAccess",
        "scripting",
        "storage",
      ],
      optional_permissions: browser === "firefox"
        ? [...OPTIONAL_SOURCE_PERMISSIONS, ...OPTIONAL_SOURCE_ORIGINS]
        : [...OPTIONAL_SOURCE_PERMISSIONS],
      optional_host_permissions: browser === "firefox" ? undefined : [...OPTIONAL_SOURCE_ORIGINS],
      web_accessible_resources: browser === "firefox"
        ? ["radar-overlay.html"]
        : [{
            resources: ["radar-overlay.html"],
            matches: ["http://*/*", "https://*/*"],
          }],
      action: {
        default_title: "NewsNext",
      },
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
