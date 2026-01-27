import type { VitePlugin } from "unplugin"
import type { Adapter } from "../../core/adapter"
import type { Options } from "../../core/options"
import type { VercelBuildConfigV3, VercelServerlessFunctionConfig } from "./types.js"
import { existsSync, mkdirSync } from "node:fs"
import { cp, readFile, writeFile } from "node:fs/promises"
import { resolve } from "node:path"

export type VercelBuildOptions = {
  vercel?: {
    config?: VercelBuildConfigV3
    function?: VercelServerlessFunctionConfig
  }
} & Omit<Options, "output" | "outputDir">

const BUNDLE_NAME = "index.js"
const FUNCTION_NAME = "__hono"

const writeJSON = (path: string, data: Record<string, unknown>) => {
  const dir = resolve(path, "..")
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }
  return writeFile(path, JSON.stringify(data))
}

const vercelAdapter = (options?: VercelBuildOptions): Adapter => {
  let config: VitePlugin.ResolvedConfig

  return {
    name: "vercel",
    output: `functions/${FUNCTION_NAME}.func/${BUNDLE_NAME}`,
    outputDir: ".vercel/output",
    vite: {
      configResolved: (resolvedConfig) => {
        config = resolvedConfig
      },
    },
    onWriteBundle: async (outDir: string, root: string) => {
      // If config is not captured via vite hook (e.g. non-vite build), we need another way or default to assumption
      // However, onWriteBundle is currently called with resolved paths from BuildPlugin

      const functionDir = resolve(outDir, "functions", `${FUNCTION_NAME}.func`)

      const buildConfig: VercelBuildConfigV3 = {
        ...options?.vercel?.config,
        version: 3,
        routes: [
          ...(options?.vercel?.config?.routes ?? []),
          {
            handle: "filesystem",
          },
          {
            src: "/(.*)",
            dest: `/${FUNCTION_NAME}`,
          },
        ],
      }

      const functionConfig: VercelServerlessFunctionConfig = {
        ...options?.vercel?.function,
        handler: BUNDLE_NAME,
        shouldAddHelpers: true,
        // Fallback for sourcemap support check if config is not available
        shouldAddSourcemapSupport: config ? Boolean(config.build.sourcemap) : false,
        supportsResponseStreaming: true,
      }

      const publicDir = config ? config.publicDir : "public" // Default fallback
      const publicDirPath = resolve(root, publicDir)

      const promises = [
        // Write all necessary config files and ensure type compatibility
        writeJSON(resolve(outDir, "config.json"), buildConfig as Record<string, unknown>),
        writeJSON(resolve(functionDir, ".vc-config.json"), functionConfig as Record<string, unknown>),
        writeJSON(resolve(functionDir, "package.json"), {
          type: "module",
        }),
      ]

      if (existsSync(publicDirPath)) {
        promises.push(
          // Copy static files to the .vercel/output/static directory
          cp(publicDirPath, resolve(outDir, "static"), {
            recursive: true,
          }),
        )
      }

      await Promise.all(promises)

      // Fix for Vercel's read-only filesystem: Add environment variables at the top of the bundle
      // This redirects Bun's cache and temp directories to /tmp (writable in Vercel)
      const bundlePath = resolve(functionDir, BUNDLE_NAME)
      try {
        const bundleContent = await readFile(bundlePath, "utf-8")
        const envSetupCode = `// Set environment variables for Vercel's read-only filesystem
// Redirect Bun's cache and temp directories to /tmp (writable in Vercel)
// This must be executed BEFORE any imports to prevent Bun from writing to read-only filesystem
(function() {
	if (typeof process === "undefined" || !process.env) return;
	
	// Set Bun cache directory to /tmp
	if (!process.env.BUN_INSTALL_CACHE_DIR) {
		process.env.BUN_INSTALL_CACHE_DIR = "/tmp/.bun-cache";
	}
	
	// Set temp directories to /tmp
	const tmpDirs = ["TMPDIR", "TMP", "TEMP"];
	for (const dir of tmpDirs) {
		if (!process.env[dir]) {
			process.env[dir] = "/tmp";
		}
	}
	
	// Disable Bun's bytecode cache to prevent file writes
	if (!process.env.BUN_DISABLE_BYTECODE_CACHE) {
		process.env.BUN_DISABLE_BYTECODE_CACHE = "1";
	}
})();

`
        // Only add if not already present
        if (!bundleContent.includes("BUN_INSTALL_CACHE_DIR")) {
          await writeFile(bundlePath, envSetupCode + bundleContent, "utf-8")
        }
      } catch (error) {
        console.warn(`Failed to add environment variable setup to bundle: ${error}`)
      }
    },
  }
}

export default vercelAdapter
