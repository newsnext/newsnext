import type { InputOptions, OutputOptions } from "rolldown"
import type { GetEntryContentOptions } from "./entry"

/**
 * Entry content hook function type
 */
export type EntryContentHook = (
  appName: string,
  options?: { staticPaths: string[] },
) => string | Promise<string>

/**
 * Platform adapter interface
 */
export interface Adapter {
  name: string

  /**
   * Hooks to inject code into the entry file
   */
  entryContentBeforeHooks?: EntryContentHook[]
  entryContentAfterHooks?: EntryContentHook[]
  entryContentDefaultExportHook?: EntryContentHook

  /**
   * Override output configuration
   */
  output?: string
  outputDir?: string

  /**
   * Bundler configuration hooks
   */
  bundler?: {
    input?: (options: InputOptions) => InputOptions
    output?: (options: OutputOptions) => OutputOptions
  }

  /**
   * Post-build hook
   */
  onWriteBundle?: (outDir: string, root: string) => Promise<void> | void
}

/**
 * Build plugin options
 */
export interface Options extends Omit<GetEntryContentOptions, "entry"> {
  entry?: string | string[]
  output?: string
  outputDir?: string
  external?: string[]
  minify?: boolean
  emptyOutDir?: boolean
  /**
   * Platform adapter configuration
   */
  adapter?: Adapter
}

type Overwrite<T, U> = Pick<T, Exclude<keyof T, keyof U>> & U

export type OptionsResolved = Overwrite<
  Required<Options>,
  Pick<Options, "entryContentBeforeHooks" | "entryContentAfterHooks" | "entryContentDefaultExportHook" | "adapter">
>

/**
 * Resolve and validate plugin options
 */
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
    adapter: options.adapter,
  }
}

// Vercel adapter types
export interface VercelBuildConfigV3 {
  version: 3
  routes?: Array<{
    src?: string
    dest?: string
    handle?: string
    [key: string]: unknown
  }>
  [key: string]: unknown
}

export interface VercelServerlessFunctionConfig {
  handler: string
  runtime?: string
  memory?: number
  maxDuration?: number
  supportsResponseStreaming?: boolean
  shouldAddHelpers?: boolean
  shouldAddSourcemapSupport?: boolean
  [key: string]: unknown
}
