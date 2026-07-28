import { spawn } from "node:child_process"
import { dirname, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"
import { defineWxtModule } from "wxt/modules"

const REGISTRY_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), "../../../packages/registry")
const REGISTRY_SOURCE_DIR = resolve(REGISTRY_ROOT, "src")
const REGISTRY_OUTPUT_PATH = resolve(REGISTRY_ROOT, "registry.json")
const SOURCE_CHANGE_EVENTS = new Set(["add", "change", "unlink"])
const TEST_FILE_REGEX = /\.(?:test|spec)\.ts$/

export function isSourceProviderFile(
  filePath: string,
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

  if (
    registryPathParts[0] !== "src"
    || !registryPathParts.at(-1)?.endsWith(".ts")
    || TEST_FILE_REGEX.test(registryPathParts.at(-1) ?? "")
  ) {
    return false
  }

  return registryPathParts.length === 2
    || (registryPathParts.length === 3 && registryPathParts[2] === "index.ts")
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
  await runPackageBuild(REGISTRY_ROOT)
}

export default defineWxtModule({
  setup(wxt) {
    let activeBuild: Promise<void> | undefined
    let rebuildRequested = false
    let reloadTimer: ReturnType<typeof setTimeout> | undefined

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
      const watchDebounce = wxt.config.dev.server?.watchDebounce ?? 800

      const scheduleRegistryReload = (): void => {
        clearTimeout(reloadTimer)
        reloadTimer = setTimeout(() => {
          reloadTimer = undefined
          // Re-enter WXT's normal rebuild path after its source event debounce.
          server.watcher.emit("all", "change", REGISTRY_OUTPUT_PATH)
        }, watchDebounce + 10)
      }

      const handleSourceChange = (eventName: string, filePath: string): void => {
        if (!SOURCE_CHANGE_EVENTS.has(eventName) || !isSourceProviderFile(filePath)) {
          return
        }

        void generateSource()
          .then(() => {
            wxt.logger.info("Regenerated source registry")
            scheduleRegistryReload()
          })
          .catch(error => wxt.logger.error("Failed to regenerate source registry", error))
      }

      server.watcher.add(REGISTRY_SOURCE_DIR)
      server.watcher.on("all", handleSourceChange)
      wxt.hook("server:closed", () => {
        clearTimeout(reloadTimer)
        server.watcher.off("all", handleSourceChange)
      })
    })
  },
})
