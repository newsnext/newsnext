import { defineConfig } from "nitro"

export default defineConfig({
  imports: false,
  externals: {
    inline: ["cheerio"],
  },
  // minify: true,
})
