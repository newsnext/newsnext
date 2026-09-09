import { readFile, writeFile } from "node:fs/promises"
import process from "node:process"
import { fileURLToPath } from "node:url"

const root = new URL("../../../", import.meta.url)
const packageFile = new URL("package.json", root)
const lockFile = new URL("bun.lock", root)
const originalPackage = await readFile(packageFile, "utf8")
const originalLock = await readFile(lockFile, "utf8")
const manifest: { workspaces: { packages: string[] } } = JSON.parse(originalPackage)

// Restrict resolution itself; an install filter still resolves every workspace.
manifest.workspaces.packages = [
  "apps/landing",
  "packages/ui",
  "packages/shared",
  "packages/cmdk",
  "packages/tsconfigs",
]

try {
  await writeFile(packageFile, `${JSON.stringify(manifest, null, 2)}\n`)
  const install = Bun.spawn([process.execPath, "install", "--ignore-scripts"], {
    cwd: fileURLToPath(root),
    stdin: "inherit",
    stdout: "inherit",
    stderr: "inherit",
  })
  if (await install.exited !== 0) throw new Error("Landing dependency installation failed")
} finally {
  await writeFile(packageFile, originalPackage)
  await writeFile(lockFile, originalLock)
}
