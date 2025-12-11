import tailwindcss from "@tailwindcss/vite"
import { defineConfig } from "wxt"

// See https://wxt.dev/api/config.html
export default defineConfig({
  modules: ["@wxt-dev/module-react"],
  imports: false,
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
    web_accessible_resources: [
      {
        resources: ["command-iframe.html"],
        matches: ["<all_urls>"],
      },
    ],
  },
  vite: () => {
    return {
      plugins: [
        tailwindcss(),
      ],
    }
  },
})
