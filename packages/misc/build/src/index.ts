import type { UnpluginInstance, VitePlugin } from "unplugin"
import type { Options } from "./core/options"
import { readdirSync } from "node:fs"
import { builtinModules } from "node:module"
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
    let root = process.cwd()
    let publicDir = "public"
    let outDir = options.outputDir || "dist"

    const name = "@newsnext/build"

    return {
      name,
      enforce: options.enforce,

      resolveId(id) {
        if (id === virtualEntryId) {
          return resolvedVirtualEntryId
        }
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
            } catch {}

            const buildOutDirPath = resolve(root, outDir)
            try {
              const buildOutDirPaths = readdirSync(buildOutDirPath, {
                withFileTypes: true,
              })
              direntPaths.push(...buildOutDirPaths)
            } catch {}
          } catch {}

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
      },

      writeBundle: async () => {
        if (options.adapter?.onWriteBundle) {
          await options.adapter.onWriteBundle(resolve(root, outDir), root)
        }
      },

      vite: {
        configResolved(config: VitePlugin.ResolvedConfig) {
          root = config.root
          publicDir = config.publicDir
          outDir = config.build.outDir
          if (options.adapter?.vite?.configResolved) {
            options.adapter.vite.configResolved(config)
          }
        },
        apply: (_config: VitePlugin.Config, { command, mode }: { command: string, mode: string }) => {
          if (command === "build" && mode !== "client") {
            return true
          }
          return false
        },
        config: async (config) => {
          const baseConfig = {
            ssr: {
              external: options.external,
              noExternal: true,
              target: "webworker",
            },
            build: {
              outDir: options.outputDir,
              emptyOutDir: options.emptyOutDir,
              minify: options.minify,
              ssr: true,
              rollupOptions: {
                external: [...builtinModules, /^node:/],
                input: virtualEntryId,
                output: {
                  entryFileNames: options.output,
                },
              },
            },
          }

          if (options.adapter?.vite?.config) {
            const adapterConfig = await options.adapter.vite.config(config)
            // Simple merge for now, deep merge might be needed
            return {
              ...baseConfig,
              ...adapterConfig,
              ssr: { ...baseConfig.ssr, ...adapterConfig.ssr },
              build: {
                ...baseConfig.build,
                ...adapterConfig.build,
                rollupOptions: {
                  ...baseConfig.build.rollupOptions,
                  ...(adapterConfig.build?.rollupOptions || {}),
                },
              },
            }
          }

          return baseConfig
        },
      },
    }
  })

export default BuildPlugin
