import { defineNitroConfig } from "nitro/config"

export default defineNitroConfig({
  compatibilityDate: "2025-12-19",
  preset: getNitroPreset(),
  serverDir: "./",
  devServer: {
    runner: "bun-process",
  },
  cloudflare: {
    deployConfig: true,
    nodeCompat: true,
  },
  vercel: {
    functions: {
      runtime: "bun1.x",
    },
  },
})

function getNitroPreset(): string {
  return process.env.NITRO_PRESET
    ?? process.env.SERVER_PRESET
    ?? getCliPreset()
    ?? "bun"
}

function getCliPreset(): string | undefined {
  const presetFlagIndex = process.argv.findIndex(arg => arg === "--preset")
  if (presetFlagIndex >= 0) {
    return process.argv[presetFlagIndex + 1]
  }

  return process.argv
    .find(arg => arg.startsWith("--preset="))
    ?.slice("--preset=".length)
}
