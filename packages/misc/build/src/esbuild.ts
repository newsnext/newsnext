/**
 * This entry file is for Esbuild plugin.
 *
 * @module
 */

import { BuildPlugin } from "./index"

/**
 * Esbuild plugin
 *
 * @example
 * ```ts
 * import { build } from 'esbuild'
 * import Build from '@newsnext/build/esbuild'
 *
 * build({
 *   plugins: [Build()],
 * })
 * ```
 */
const esbuild = BuildPlugin.esbuild as typeof BuildPlugin.esbuild
export default esbuild
export { esbuild as "module.exports" }
