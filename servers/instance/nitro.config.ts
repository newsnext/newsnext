import { defineNitroConfig } from "nitro/config"

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
  preset: process.env.NITRO_PRESET ?? process.env.SERVER_PRESET ?? "bun",
  serverEntry: {
    handler: "./src/index.ts",
    format: "web",
  },
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
    external: ["@newsnext/cache/sqlite", "db0/connectors/bun-sqlite", "bun:sqlite"],
  },
})
