interface ServeStaticHookOptions {
  filePaths?: string[]
  root?: string
}

export const serveStaticHook = (appName: string, options: ServeStaticHookOptions) => {
  let code = ""

  code += `${appName}.get('/*', serveStatic({ root: '${options.root ?? "./"}' }))\n`
  // code += `${appName}.get('*', serveStatic({ path: '${options.root ?? "."}/index.html' }))\n`
  return code
}