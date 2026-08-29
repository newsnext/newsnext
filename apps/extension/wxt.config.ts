import path from "node:path"
import babel from "@rolldown/plugin-babel"
import tailwindcss from "@tailwindcss/vite"
import react, { reactCompilerPreset } from "@vitejs/plugin-react"
import Icons from "unplugin-icons/vite"
import TurboConsole from "unplugin-turbo-console/vite"
import { defineConfig } from "wxt"
import packageJson from "./package.json"
import { OPTIONAL_SOURCE_PERMISSIONS } from "./src/lib/source/permission-constants"

const OPTIONAL_SOURCE_ORIGINS = ["*://*/*"] as const
const DEVELOPMENT_CHROMIUM_KEY = "MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEAnMP+yuUF0ux7GhQjicLdzMrMW9SFYE1VOQTGQpy5RJ9VpSh/TLQ1Ho9wjupXD+KAcxP8c7mVOuirth3MQal/aRB0tvB/i2Tk61jvtrlGL99Juj1o14kixPgKUkOp5CR+4YT5I+zFG8aQsvI5FKirMIwbMQjBeiS3h19+ONvuu3IaoipawdmWlvnnKKKbYvtASv8TJTHM6GyWeNUhPE0DTAo+zN0ZkZ04okeYL4+t1npn/Ntvd8Sxd/faZhqSIry5NkzV1dOTbYXMDGV0nFp1LnRbe4DDp09chlJdYf+xhwf6TSZPUk88A8bWYQeoB/UnYhbPqwhoP+7RoGuXAu80GQIDAQAB"
const REQUIRED_PERMISSIONS = [
  "activeTab",
  "alarms",
  "contextMenus",
  "declarativeNetRequestWithHostAccess",
  "nativeMessaging",
  "scripting",
  "storage",
] as const
const WIDGET_SERVER_ORIGIN = "http://127.0.0.1/*"
const RSSHUB_RADAR_CHROMIUM_ID = "kefjpfngnndepjbopdmoebkipbgkggaa"
const manifestVersion = packageJson.version.split("-", 1)[0]

// See https://wxt.dev/api/config.html
export default defineConfig({
  imports: false,
  srcDir: "./src",
  outDir: "dist",
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
    "vite:build:extendConfig": (entrypoints, viteConfig) => {
      // WXT's background build is an IIFE, which cannot use code splitting.
      if (!entrypoints.every(entrypoint => entrypoint.inputPath.endsWith(".html"))) return

      viteConfig.build ??= {}
      const rolldownOptions = viteConfig.build.rolldownOptions ?? viteConfig.build.rollupOptions ?? {}
      const codeSplitting = {
        groups: [
          {
            name: "react-vendor",
            test: /node_modules\/(?:@tanstack|jotai|react|react-dom|scheduler)\//,
          },
          {
            name: "base-ui-vendor",
            test: /node_modules\/(?:@base-ui|lucide-react)\//,
          },
          {
            name: "motion-vendor",
            test: /node_modules\/motion\//,
          },
        ],
      }
      const output = Array.isArray(rolldownOptions.output)
        ? rolldownOptions.output.map(item => ({
            ...item,
            codeSplitting,
          }))
        : {
            ...rolldownOptions.output,
            codeSplitting,
          }
      const mergedRolldownOptions = {
        ...rolldownOptions,
        output,
      }

      // Vite 8 treats rollupOptions as an alias. Keep both references identical so
      // WXT's entry naming survives when adding Rolldown-specific chunk groups.
      viteConfig.build.rollupOptions = mergedRolldownOptions
      viteConfig.build.rolldownOptions = mergedRolldownOptions
    },
  },
  manifest: ({ browser, mode }) => {
    const extensionName = mode === "development" ? "NewsNext Dev" : "NewsNext"
    const yoloMode = mode === "development" && import.meta.env.WXT_YOLO_MODE === "true"

    return {
      name: extensionName,
      key: mode === "development" && browser !== "firefox"
        ? DEVELOPMENT_CHROMIUM_KEY
        : undefined,
      description: "Elegant reading experience, Fastest information reception",
      version: manifestVersion,
      version_name: packageJson.version,
      permissions: yoloMode
        ? [...REQUIRED_PERMISSIONS, ...OPTIONAL_SOURCE_PERMISSIONS]
        : [...REQUIRED_PERMISSIONS],
      content_security_policy: {
        extension_pages: "script-src 'self'; object-src 'self'; frame-src http://127.0.0.1:*",
      },
      host_permissions: yoloMode
        ? [...OPTIONAL_SOURCE_ORIGINS]
        : [WIDGET_SERVER_ORIGIN],
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
      web_accessible_resources: browser === "firefox"
        ? undefined
        : [{
            resources: ["app.html"],
            extension_ids: [RSSHUB_RADAR_CHROMIUM_ID],
          }],
      browser_specific_settings: browser === "firefox"
        ? {
            gecko: {
              id: mode === "development" ? "dev@newsnext.app" : "addon@newsnext.app",
            },
          }
        : undefined,
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
