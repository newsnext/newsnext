import { existsSync, statSync } from "node:fs"
import path from "node:path"
import process from "node:process"
import { defineConfig } from "vitest/config"

const rootDir = process.cwd()
const workspaceAliasRoots = [
  "apps/extension",
  "packages/source",
]

export default defineConfig({
  plugins: [
    {
      name: "newsnext:workspace-local-alias",
      enforce: "pre",
      resolveId(source, importer) {
        if (!source.startsWith("@/") || !importer) {
          return null
        }

        const normalizedImporter = importer.split(path.sep).join("/")
        const workspace = workspaceAliasRoots.find(root => normalizedImporter.includes(`/${root}/`))
        if (!workspace) {
          return null
        }

        const resolved = path.resolve(rootDir, workspace, "src", source.slice(2))
        return resolveExistingModule(resolved)
      },
    },
  ],
  test: {
    globals: true,
    include: [
      "apps/extension/**/*.{test,spec}.{ts,tsx}",
      "packages/date-parser/**/*.{test,spec}.{ts,tsx}",
      "packages/registry/**/*.{test,spec}.{ts,tsx}",
      "packages/shared/**/*.{test,spec}.{ts,tsx}",
      "packages/source/**/*.{test,spec}.{ts,tsx}",
    ],
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "examples/**",
      "**/examples/**",
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
