import type { FilterPattern } from "unplugin"
import type { GetEntryContentOptions } from "../entry"
import type { Adapter } from "./adapter"

export interface Options extends Omit<GetEntryContentOptions, "entry"> {
  entry?: string | string[]
  output?: string
  outputDir?: string
  external?: string[]
  minify?: boolean
  emptyOutDir?: boolean
  include?: FilterPattern
  exclude?: FilterPattern
  enforce?: "pre" | "post" | undefined
  /**
   * Adapter options
   */
  adapter?: Adapter
}

type Overwrite<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U

export type OptionsResolved = Overwrite<
  Required<Options>,
  Pick<Options, "enforce" | "entryContentBeforeHooks" | "entryContentAfterHooks" | "entryContentDefaultExportHook" | "adapter">
>

export function resolveOptions(options: Options): OptionsResolved {
  return {
    entry: options.entry || ["src/index.ts", "./src/index.tsx", "./app/server.ts"],
    output: options.adapter?.output || options.output || "index.js",
    outputDir: options.adapter?.outputDir || options.outputDir || "./dist",
    external: options.external || [],
    minify: options.minify ?? true,
    emptyOutDir: options.emptyOutDir ?? false,
    staticPaths: options.staticPaths || [],
    preset: options.preset || "hono",
    entryContentBeforeHooks: [
      ...(options.entryContentBeforeHooks || []),
      ...(options.adapter?.entryContentBeforeHooks || []),
    ],
    entryContentAfterHooks: [
      ...(options.entryContentAfterHooks || []),
      ...(options.adapter?.entryContentAfterHooks || []),
    ],
    entryContentDefaultExportHook: options.adapter?.entryContentDefaultExportHook || options.entryContentDefaultExportHook,
    include: options.include || [/\.[cm]?[jt]sx?$/],
    exclude: options.exclude || [/node_modules/],
    enforce: "enforce" in options ? options.enforce : undefined,
    adapter: options.adapter,
  }
}
