import { existsSync, statSync } from "node:fs"
import path from "node:path"
import { defineConfig } from "vitest/config"

const rootDir = path.resolve(import.meta.dirname, "../..")
const workspaceAliasRoots = [
  "servers/api",
  "servers/instance",
  "packages/sources",
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
    include: ["src/**/*.test.ts"],
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
