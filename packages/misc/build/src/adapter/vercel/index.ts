import type { VitePlugin } from "unplugin"
import type { Adapter } from "../../core/adapter"
import type { Options } from "../../core/options"
import type { VercelBuildConfigV3, VercelServerlessFunctionConfig } from "./types.js"
import { existsSync, mkdirSync } from "node:fs"
import { cp, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

export type VercelBuildOptions = {
  vercel?: {
    config?: VercelBuildConfigV3
    function?: VercelServerlessFunctionConfig
  }
} & Omit<Options, "output" | "outputDir">

const BUNDLE_NAME = "index.js"
const FUNCTION_NAME = "__hono"

const writeJSON = (path: string, data: Record<string, unknown>) => {
  const dir = resolve(path, "..")
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return writeFile(path, JSON.stringify(data))
}

const getRuntimeVersion = () => {
  try {
    const systemNodeVersion = process.versions.node.split(".")[0]
    return `nodejs${Number(systemNodeVersion)}.x` as const
  } catch {
    return "nodejs22.x" as const
  }
}

const vercelAdapter = (options?: VercelBuildOptions): Adapter => {
  let config: VitePlugin.ResolvedConfig

  return {
    name: "vercel",
    output: `functions/${FUNCTION_NAME}.func/${BUNDLE_NAME}`,
    outputDir: ".vercel/output",
    entryContentAfterHooks: [

      () => "import { handle } from '@hono/node-server/vercel'",
    ],
    entryContentDefaultExportHook: appName => `export default handle(${appName})`,
    vite: {
      configResolved: (resolvedConfig) => {
        config = resolvedConfig
      },
    },
    onWriteBundle: async (outDir: string, root: string) => {
      // If config is not captured via vite hook (e.g. non-vite build), we need another way or default to assumption
      // However, onWriteBundle is currently called with resolved paths from BuildPlugin

      const functionDir = resolve(outDir, "functions", `${FUNCTION_NAME}.func`)

      const buildConfig: VercelBuildConfigV3 = {
        ...options?.vercel?.config,
        version: 3,
        routes: [
          ...(options?.vercel?.config?.routes ?? []),
          {
            handle: "filesystem",
          },
          {
            src: "/(.*)",
            dest: `/${FUNCTION_NAME}`,
          },
        ],
      }

      const functionConfig: VercelServerlessFunctionConfig = {
        ...options?.vercel?.function,
        handler: BUNDLE_NAME,
        shouldAddHelpers: true,
        // Fallback for sourcemap support check if config is not available
        shouldAddSourcemapSupport: config ? Boolean(config.build.sourcemap) : false,
        supportsResponseStreaming: true,
      }

      if (options?.vercel?.function?.runtime === "bun1.x") {
        //
      } else {
        functionConfig.launcherType = "Nodejs"
        functionConfig.runtime = getRuntimeVersion()
      }

      const publicDir = config ? config.publicDir : "public" // Default fallback
      const publicDirPath = resolve(root, publicDir)

      const promises = [
        // Write all necessary config files and ensure type compatibility
        writeJSON(resolve(outDir, "config.json"), buildConfig as Record<string, unknown>),
        writeJSON(resolve(functionDir, ".vc-config.json"), functionConfig as Record<string, unknown>),
        writeJSON(resolve(functionDir, "package.json"), {
          type: "module",
        }),
      ]

      if (existsSync(publicDirPath)) {
        promises.push(
          // Copy static files to the .vercel/output/static directory
          cp(publicDirPath, resolve(outDir, "static"), {
            recursive: true,
          }),
        )
      }

      await Promise.all(promises)
    },
  }
}

export default vercelAdapter
