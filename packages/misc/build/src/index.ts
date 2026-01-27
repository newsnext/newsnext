import type { UnpluginInstance } from "unplugin"
import type { Options } from "./core/options"
import { existsSync, readdirSync, rmSync } from "node:fs"
import { resolve } from "node:path"
import { createUnplugin } from "unplugin"
import { resolveOptions } from "./core/options"
import { getEntryContent } from "./entry"

export const BuildPlugin: UnpluginInstance<Options | undefined, false>
  = createUnplugin((rawOptions = {}) => {
    const options = resolveOptions(rawOptions)
    const virtualEntryId = "virtual:build-entry-module"
    const resolvedVirtualEntryId = `\0${virtualEntryId}`

    // Defaults for non-Vite environments
    const root = process.cwd()
    const publicDir = "public"
    const outDir = options.outputDir || "dist"

    const rawInput = []

    const name = "@newsnext/build"

    return {
      name,
      enforce: options.enforce,

      resolveId(id, _importer, _options) {
        if (id === virtualEntryId) {
          return resolvedVirtualEntryId
        }
        // Also handle the resolved ID to ensure it's recognized
        if (id === resolvedVirtualEntryId) {
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

      buildStart: () => {
      },

      writeBundle: async () => {
        if (options.adapter?.onWriteBundle) {
          await options.adapter.onWriteBundle(resolve(root, outDir), root)
        }
      },
      buildEnd: () => {
      },

      rolldown: {
        options: (rolldownOptions) => {
          rawInput.push(...(Array.isArray(rolldownOptions.input) ? rolldownOptions.input : [rolldownOptions.input]))
          return {
            ...rolldownOptions,
            input: virtualEntryId,
          }
        },
        outputOptions: (rolldownOutputOptions) => {
          return {
            ...rolldownOutputOptions,
            entryFileNames: options.output,
          }
        },
      },
    }
  })

export default BuildPlugin
