import { defineConfig } from "bumpp"

import { syncCliVersion } from "./scripts/sync-cli-version"

export default defineConfig({
  execute: async ({ state }) => {
    await syncCliVersion(state.newVersion)
  },
})
