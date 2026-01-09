import type { Adapter } from "../../core/adapter"
import type { Options } from "../../core/options"
import { readdir, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

export type CloudflarePagesBuildOptions = Options

const WORKER_JS_NAME = "_worker.js"
const ROUTES_JSON_NAME = "_routes.json"

interface StaticRoutes { version: number, include: string[], exclude: string[] }

const cloudflarePagesAdapter = (options?: CloudflarePagesBuildOptions): Adapter => {
  return {
    name: "cloudflare-pages",
    output: WORKER_JS_NAME,
    onWriteBundle: async (outDir: string) => {
      const staticPaths: string[] = []
      const paths = await readdir(outDir, {
        withFileTypes: true,
      })
      // If _routes.json already exists, don't create it
      if (paths.some(p => p.name === ROUTES_JSON_NAME)) {
        //
      } else {
        paths.forEach((p) => {
          if (p.isDirectory()) {
            staticPaths.push(`/${p.name}/*`)
          } else {
            if (p.name === WORKER_JS_NAME) {
              return
            }
            staticPaths.push(`/${p.name}`)
          }
        })
        const staticRoutes: StaticRoutes = {
          version: 1,
          include: ["/*"],
          exclude: staticPaths,
        }
        const path = resolve(outDir, ROUTES_JSON_NAME)
        await writeFile(path, JSON.stringify(staticRoutes))
      }
    },
  }
}

export default cloudflarePagesAdapter
