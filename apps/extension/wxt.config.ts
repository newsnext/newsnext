import path from "node:path"
import babel from "@rolldown/plugin-babel"
import tailwindcss from "@tailwindcss/vite"
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import Icons from "unplugin-icons/vite"
import TurboConsole from "unplugin-turbo-console/vite"
import { defineConfig } from "wxt"

const OPTIONAL_SOURCE_PERMISSIONS = [
  "bookmarks",
  "cookies",
  "favicon",
  "history",
] as const
const OPTIONAL_SOURCE_ORIGINS = ["*://*/*"] as const
const REQUIRED_PERMISSIONS = [
  "activeTab",
  "alarms",
  "contextMenus",
  "declarativeNetRequestWithHostAccess",
  "scripting",
  "storage",
] as const

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
  hooks: {
    "entrypoints:resolved": (wxt, entrypoints) => {
      if (wxt.config.mode === "development") return

      const cosmosEntrypoint = entrypoints.find(entrypoint => entrypoint.name === "cosmos")
      if (cosmosEntrypoint) cosmosEntrypoint.skipped = true
    },
  },
  manifest: ({ browser, mode }) => {
    const extensionName = mode === "development" ? "NewsNext Dev" : "NewsNext"
    const yoloMode = mode === "development" && import.meta.env.WXT_YOLO_MODE === "true"

    return {
      name: extensionName,
      description: "Elegant reading experience, Fastest information reception",
      version: "0.9.0",
      permissions: yoloMode
        ? [...REQUIRED_PERMISSIONS, ...OPTIONAL_SOURCE_PERMISSIONS]
        : [...REQUIRED_PERMISSIONS],
      host_permissions: yoloMode ? [...OPTIONAL_SOURCE_ORIGINS] : undefined,
      optional_permissions: yoloMode
        ? undefined
        : browser === "firefox"
          ? [...OPTIONAL_SOURCE_PERMISSIONS, ...OPTIONAL_SOURCE_ORIGINS]
          : [...OPTIONAL_SOURCE_PERMISSIONS],
      optional_host_permissions: yoloMode || browser === "firefox"
        ? undefined
        : [...OPTIONAL_SOURCE_ORIGINS],
      action: {
        default_popup: "radar-popup.html",
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
        babel({
          presets: [reactCompilerPreset()],
        }),
      ],
    }
  },
})
