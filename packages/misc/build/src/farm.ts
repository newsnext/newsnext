/**
 * This entry file is for Farm plugin.
 *
 * @module
 */

import { BuildPlugin } from "./index"

/**
 * Farm plugin
 *
 * @example
 * ```ts
 * // farm.config.ts
 * import Build from '@newsnext/build/farm'
 *
 * export default {
 *   plugins: [Build()],
 * }
 * ```
 */
const farm = BuildPlugin.farm as typeof BuildPlugin.farm
export default farm
export { farm as "module.exports" }
