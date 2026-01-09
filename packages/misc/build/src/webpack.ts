/**
 * This entry file is for Webpack plugin.
 *
 * @module
 */

import { BuildPlugin } from "./index"

/**
 * Webpack plugin
 *
 * @example
 * ```ts
 * // webpack.config.js
 * import Build from '@newsnext/build/webpack'
 *
 * module.exports = {
 *  plugins: [Build()],
 * }
 * ```
 */
const webpack = BuildPlugin.webpack as typeof BuildPlugin.webpack
export default webpack
export { webpack as "module.exports" }
