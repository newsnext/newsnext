import type { Plugin } from "rolldown"
import type { Options, OptionsResolved } from "./types"
import { readdirSync } from "node:fs"
import { resolve } from "node:path"
import { getEntryContent } from "./entry"
import { resolveOptions } from "./types"

/**
 * Create a Rolldown build plugin for Hono applications
 *
 * @param rawOptions - Plugin configuration options
 * @returns Rolldown plugin instance
 *
 * @example
 * ```ts
 * import { buildPlugin } from '@newsnext/build'
 *
 * export default {
 *   plugins: [buildPlugin({
 *     entry: './src/index.ts',
 *     output: 'index.js',
 *     outputDir: './dist'
 *   })]
 * }
 * ```
 */
export function buildPlugin(rawOptions: Options = {}): Plugin {
  const options: OptionsResolved = resolveOptions(rawOptions)
  const virtualEntryId = "virtual:build-entry-module"
  const resolvedVirtualEntryId = `\0${virtualEntryId}`

  // Build context
  const root = process.cwd()
  const publicDir = "public"
  const outDir = options.outputDir

  const name = "@newsnext/build"

  return {
    name,

    resolveId(id) {
      if (id === virtualEntryId || id === resolvedVirtualEntryId) {
        return resolvedVirtualEntryId
      }
      return null
    },

    async load(id) {
      if (id === resolvedVirtualEntryId) {
        const staticPaths: string[] = options.staticPaths ?? []
        const direntPaths = []

        try {
          const publicDirPath = resolve(root, publicDir)
          try {
            const publicDirPaths = readdirSync(publicDirPath, {
              withFileTypes: true,
            })
            direntPaths.push(...publicDirPaths)
          } catch { }

          const buildOutDirPath = resolve(root, outDir)
          try {
            const buildOutDirPaths = readdirSync(buildOutDirPath, {
              withFileTypes: true,
            })
            direntPaths.push(...buildOutDirPaths)
          } catch { }
        } catch { }

        const uniqueStaticPaths = new Set<string>()

        direntPaths.forEach((p) => {
          if (p.isDirectory()) {
            uniqueStaticPaths.add(`/${p.name}/*`)
          } else {
            if (p.name === options.output) {
              return
            }
            uniqueStaticPaths.add(`/${p.name}`)
          }
        })

        staticPaths.push(...Array.from(uniqueStaticPaths))

        const entry = options.entry
        return await getEntryContent({
          entry: Array.isArray(entry) ? entry : [entry],
          entryContentBeforeHooks: options.entryContentBeforeHooks,
          entryContentAfterHooks: options.entryContentAfterHooks,
          entryContentDefaultExportHook: options.entryContentDefaultExportHook,
          staticPaths,
          preset: options.preset,
        })
      }
      return null
    },

    options(rolldownOptions) {
      return {
        ...rolldownOptions,
        input: virtualEntryId,
      }
    },

    outputOptions(rolldownOutputOptions) {
      return {
        ...rolldownOutputOptions,
        dir: options.outputDir,
        entryFileNames: options.output,
      }
    },

    async writeBundle() {
      if (options.adapter?.onWriteBundle) {
        await options.adapter.onWriteBundle(resolve(root, outDir), root)
      }
    },
  }
}
