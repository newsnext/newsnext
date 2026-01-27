/**
 * Rolldown build plugin for Hono applications
 *
 * @module
 *
 * @example
 * ```ts
 * import { buildPlugin } from '@newsnext/build'
 * import bunAdapter from '@newsnext/build/adapters/bun'
 *
 * export default {
 *   plugins: [
 *     buildPlugin({
 *       entry: './src/index.ts',
 *       output: 'index.js',
 *       outputDir: './dist',
 *       adapter: bunAdapter()
 *     })
 *   ]
 * }
 * ```
 */

export type { GetEntryContentOptions, Preset } from "./entry"
export { buildPlugin } from "./plugin"

export { buildPlugin as default } from "./plugin"
export type { Adapter, Options, OptionsResolved } from "./types"
