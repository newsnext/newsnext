import { defineConfig } from "nitro"

export default defineConfig({
  preset: process.env.VERCEL ? "vercel" : "bun",
})
