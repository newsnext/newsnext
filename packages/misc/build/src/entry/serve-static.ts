interface ServeStaticHookOptions {
  filePaths?: string[]
  root?: string
}

export const serveStaticHook = (appName: string, options: ServeStaticHookOptions) => {
  let code = ""

  code += `${appName}.get('/*', serveStatic({ root: '${options.root ?? "./"}' }))\n`
  return code
}

// app.get("/*", (c, next) => {
//   return serveStatic({ root: "./public" })(c, next)
// })

// app.get("*", serveStatic({ path: "./public/index.html" }))
