import type { Adapter, VercelBuildConfigV3, VercelServerlessFunctionConfig } from "../../types"
import type { VercelBuildOptions } from "./types"
import { existsSync, mkdirSync } from "node:fs"
import { cp, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

const BUNDLE_NAME = "index.js"
const FUNCTION_NAME = "__hono"

const writeJSON = (path: string, data: Record<string, unknown>) => {
  const dir = resolve(path, "..")
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return writeFile(path, JSON.stringify(data))
}

/**
 * Vercel adapter for Hono applications
 *
 * @param options - Adapter configuration options
 * @returns Adapter configuration
 *
 * @example
 * ```ts
 * import { buildPlugin } from '@newsnext/build'
 * import vercelAdapter from '@newsnext/build/adapters/vercel'
 *
 * export default {
 *   plugins: [buildPlugin({
 *     adapter: vercelAdapter({
 *       vercel: {
 *         config: { version: 3 }
 *       }
 *     })
 *   })]
 * }
 * ```
 */
export default function vercelAdapter(options?: VercelBuildOptions): Adapter {
  return {
    name: "vercel",
    output: `functions/${FUNCTION_NAME}.func/${BUNDLE_NAME}`,
    outputDir: ".vercel/output",
    bundler: {
      input: options => ({
        ...options,
        noExternal: [/.*/],
      }),
      output: options => ({
        ...options,
        inlineDynamicImports: true,
      }),
    },
    onWriteBundle: async (outDir: string, root: string) => {
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
        shouldAddSourcemapSupport: false,
        supportsResponseStreaming: true,
      }

      const publicDirPath = resolve(root, "public")

      const promises = [
        writeJSON(resolve(outDir, "config.json"), buildConfig as Record<string, unknown>),
        writeJSON(resolve(functionDir, ".vc-config.json"), functionConfig as Record<string, unknown>),
        writeJSON(resolve(functionDir, "package.json"), {
          type: "module",
        }),
      ]

      if (existsSync(publicDirPath)) {
        promises.push(
          cp(publicDirPath, resolve(outDir, "static"), {
            recursive: true,
          }),
        )
      }

      await Promise.all(promises)
    },
  }
}
