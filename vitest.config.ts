import { existsSync, statSync } from "node:fs"
import path from "node:path"
import process from "node:process"
import { defineConfig } from "vitest/config"

const rootDir = process.cwd()
export default defineConfig({
  resolve: {
    alias: [
      { find: "@registry", replacement: path.resolve(rootDir, "../registry") },
      { find: /^@newsnext\/sdk\/source$/, replacement: path.resolve(rootDir, "packages/sdk/src/source/index.ts") },
    ],
  },
  plugins: [
    {
      name: "newsnext:workspace-local-alias",
      enforce: "pre",
      resolveId(source, importer) {
        if (!source.startsWith("@/") || !importer) {
          return null
        }

        const normalizedImporter = importer.split(path.sep).join("/")
        if (!normalizedImporter.includes("/apps/extension/")) {
          return null
        }

        const resolved = path.resolve(rootDir, "apps/extension/src", source.slice(2))
        return resolveExistingModule(resolved)
      },
    },
  ],
  test: {
    globals: true,
    include: [
      "apps/extension/**/*.{test,spec}.{ts,tsx}",
      "packages/cmdk/**/*.{test,spec}.{ts,tsx}",
      "packages/date-parser/**/*.{test,spec}.{ts,tsx}",
      "packages/shared/**/*.{test,spec}.{ts,tsx}",
      "packages/sdk/**/*.{test,spec}.{ts,tsx}",
      "packages/ui/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
    ],
  },
})

function resolveExistingModule(resolved: string): string {
  const candidates = [
    path.join(resolved, "index.ts"),
    path.join(resolved, "index.tsx"),
    `${resolved}.ts`,
    `${resolved}.tsx`,
    resolved,
  ]

  return candidates.find(isFile) ?? resolved
}

function isFile(candidate: string): boolean {
  return existsSync(candidate) && statSync(candidate).isFile()
}
