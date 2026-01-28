/**
 * Vercel adapter options
 */
export interface VercelBuildOptions {
  config?: {
    version?: 3
    routes?: Array<{
      src?: string
      dest?: string
      handle?: string
      [key: string]: unknown
    }>
    [key: string]: unknown
  }
  function?: {
    handler?: string
    runtime?: `nodejs${number}.x` | "bun1.x"
    memory?: number
    maxDuration?: number
    supportsResponseStreaming?: boolean
    shouldAddHelpers?: boolean
    shouldAddSourcemapSupport?: boolean
    [key: string]: unknown
  }
}
