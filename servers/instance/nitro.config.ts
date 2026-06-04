import { fileURLToPath } from "node:url"
import { defineNitroConfig } from "nitro/config"

const preset = getNitroPreset()
const isCloudflarePreset = preset.includes("cloudflare")
const cacheDbPath = process.env.NEWSNEXT_CACHE_DB_PATH
  ?? fileURLToPath(new URL("../../data/cache.db", import.meta.url))
const cacheDatabase = isCloudflarePreset
  ? {
      connector: "cloudflare-d1",
      options: {
        bindingName: "CACHE_DB",
      },
    }
  : {
      connector: "bun-sqlite",
      options: {
        path: cacheDbPath,
      },
    }

const saferBufferCloudflarePlugin = {
  name: "newsnext:safer-buffer-cloudflare",
  transform(code: string, id: string) {
    if (!id.includes("safer-buffer") && !code.includes("buffer.hasOwnProperty")) {
      return null
    }

    return code
      .replaceAll("buffer.hasOwnProperty(key)", "Object.prototype.hasOwnProperty.call(buffer, key)")
      .replaceAll("Buffer.hasOwnProperty(key)", "Object.prototype.hasOwnProperty.call(Buffer, key)")
  },
}

export default defineNitroConfig({
  compatibilityDate: "2025-12-19",
  preset,
  serverDir: "./",
  devServer: {
    runner: "bun-process",
  },
  experimental: {
    database: true,
  },
  database: {
    default: cacheDatabase,
  },
  devDatabase: {
    default: {
      connector: "bun-sqlite",
      options: {
        path: cacheDbPath,
      },
    },
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
  rolldownConfig: {
    plugins: [saferBufferCloudflarePlugin],
    external: isCloudflarePreset
      ? ["@newsnext/database/cache/local", "db0/connectors/bun-sqlite", "bun:sqlite"]
      : ["bun:sqlite"],
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
