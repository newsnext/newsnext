import { spawn } from "node:child_process"
import { dirname, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { defineWxtModule } from "wxt/modules"

const SOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../packages/source")
const SOURCE_LIB_DIR = resolve(SOURCE_ROOT, "src/lib")
const SOURCE_BUILD_SCRIPT = "build.ts"
const SOURCE_CHANGE_EVENTS = new Set(["add", "change", "unlink"])
const TEST_FILE_REGEX = /\.(?:test|spec)\.ts$/

export function isSourceProviderFile(filePath: string, sourceRoot = SOURCE_ROOT): boolean {
  const pathParts = relative(sourceRoot, filePath).split(sep)

  if (
    pathParts[0] !== "src"
    || pathParts[1] !== "lib"
    || !pathParts.at(-1)?.endsWith(".ts")
    || TEST_FILE_REGEX.test(pathParts.at(-1) ?? "")
  ) {
    return false
  }

  return pathParts.length === 3
    || (pathParts.length === 4 && pathParts[3] === "index.ts")
}

function runSourceBuild(): Promise<void> {
  return new Promise((resolveBuild, rejectBuild) => {
    const child = spawn("bun", ["run", SOURCE_BUILD_SCRIPT], {
      cwd: SOURCE_ROOT,
      stdio: ["ignore", "pipe", "pipe"],
    })
    let output = ""

    child.stdout.on("data", chunk => output += String(chunk))
    child.stderr.on("data", chunk => output += String(chunk))
    child.once("error", rejectBuild)
    child.once("close", (exitCode) => {
      if (exitCode === 0) {
        resolveBuild()
        return
      }

      rejectBuild(new Error(output.trim() || `Source build exited with code ${exitCode}`))
    })
  })
}

export default defineWxtModule({
  setup(wxt) {
    let activeBuild: Promise<void> | undefined
    let rebuildRequested = false

    const generateSource = async (): Promise<void> => {
      if (activeBuild) {
        rebuildRequested = true
        return activeBuild
      }

      activeBuild = (async () => {
        do {
          rebuildRequested = false
          await runSourceBuild()
        } while (rebuildRequested)
      })()

      try {
        await activeBuild
      } finally {
        activeBuild = undefined
      }
    }

    wxt.hook("build:before", generateSource)
    wxt.hook("server:created", (_, server) => {
      const handleSourceChange = (eventName: string, filePath: string): void => {
        if (!SOURCE_CHANGE_EVENTS.has(eventName) || !isSourceProviderFile(filePath)) {
          return
        }

        void generateSource()
          .then(() => wxt.logger.info("Regenerated source metadata"))
          .catch(error => wxt.logger.error("Failed to regenerate source metadata", error))
      }

      server.watcher.add(SOURCE_LIB_DIR)
      server.watcher.on("all", handleSourceChange)
      wxt.hook("server:closed", () => {
        server.watcher.off("all", handleSourceChange)
      })
    })
  },
})
