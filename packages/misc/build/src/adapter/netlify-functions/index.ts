import type { Adapter } from "../../core/adapter"
import type { Options } from "../../core/options"

export type NetlifyFunctionsBuildOptions = Options

export default function netlifyFunctionsAdapter(
  options?: NetlifyFunctionsBuildOptions,
): Adapter {
  return {
    name: "netlify-functions",
    entryContentBeforeHooks: [() => "import { handle } from \"hono/netlify\""],
    entryContentAfterHooks: [() => "export const config = { path: \"/*\", preferStatic: true }"],
    entryContentDefaultExportHook: appName => `export default handle(${appName})`,
  }
}
