interface ServeStaticHookOptions {
  filePaths?: string[]
  root?: string
}

/**
 * Generate code to serve static files with Hono's serveStatic middleware
 *
 * @param appName - Name of the Hono app variable
 * @param options - Configuration options for static file serving
 * @returns Generated code string
 */
export const serveStaticHook = (appName: string, options: ServeStaticHookOptions): string => {
  let code = ""

  code += `${appName}.get('/*', serveStatic({ root: '${options.root ?? "./"}' }))\n`
  // code += `${appName}.get('*', serveStatic({ path: '${options.root ?? "."}/index.html' }))\n`
  return code
}
