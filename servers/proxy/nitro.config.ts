import { defineConfig } from "nitro"

export default defineConfig({
  preset: "cloudflare-module",
  imports: false,
  externals: {
    inline: ["cheerio"],
  },
  // minify: true,
})
