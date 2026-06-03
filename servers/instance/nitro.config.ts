import { defineNitroConfig } from "nitro/config"

const preset = process.env.NITRO_PRESET ?? process.env.SERVER_PRESET ?? "bun"

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
    external: preset.includes("cloudflare")
      ? ["@newsnext/cache/sqlite", "db0/connectors/bun-sqlite", "bun:sqlite"]
      : ["bun:sqlite"],
  },
})
