import { spawn } from "node:child_process"
import { dirname, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { defineWxtModule } from "wxt/modules"

const SOURCE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../packages/source")
const SOURCE_PROVIDER_DIR = resolve(SOURCE_ROOT, "src/providers")
const REGISTRY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../packages/registry")
const REGISTRY_SOURCE_DIR = resolve(REGISTRY_ROOT, "src")
const SOURCE_CHANGE_EVENTS = new Set(["add", "change", "unlink"])
const TEST_FILE_REGEX = /\.(?:test|spec)\.ts$/
const SOURCE_BUILD_ROOTS = [REGISTRY_ROOT, SOURCE_ROOT]

export function isSourceProviderFile(
  filePath: string,
  sourceRoot = SOURCE_ROOT,
  registryRoot = REGISTRY_ROOT,
): boolean {
  const registryPathParts = relative(registryRoot, filePath).split(sep)
  if (
    registryPathParts.length === 2
    && registryPathParts[0] === "src"
    && registryPathParts[1]?.endsWith(".json")
  ) {
    return true
  }

  const pathParts = relative(sourceRoot, filePath).split(sep)

  if (
    pathParts[0] !== "src"
    || pathParts[1] !== "providers"
    || !pathParts.at(-1)?.endsWith(".ts")
    || TEST_FILE_REGEX.test(pathParts.at(-1) ?? "")
  ) {
    return false
  }

  return pathParts.length === 3
    || (pathParts.length === 4 && pathParts[3] === "index.ts")
}

function runPackageBuild(packageRoot: string): Promise<void> {
  return new Promise((resolveBuild, rejectBuild) => {
    const child = spawn("bun", ["run", "build"], {
      cwd: packageRoot,
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

async function runSourceBuilds(): Promise<void> {
  for (const packageRoot of SOURCE_BUILD_ROOTS) {
    await runPackageBuild(packageRoot)
  }
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
          await runSourceBuilds()
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
          .then(() => wxt.logger.info("Regenerated source registry"))
          .catch(error => wxt.logger.error("Failed to regenerate source registry", error))
      }

      server.watcher.add([SOURCE_PROVIDER_DIR, REGISTRY_SOURCE_DIR])
      server.watcher.on("all", handleSourceChange)
      wxt.hook("server:closed", () => {
        server.watcher.off("all", handleSourceChange)
      })
    })
  },
})
