interface LoginRequiredError extends Error {
  code?: unknown
  loginUrl?: unknown
}

export function getLoginUrlFromError(error: unknown): string | undefined {
  if (!(error instanceof Error)) {
    return undefined
  }

  const loginUrl = (error as LoginRequiredError).loginUrl
  const code = (error as LoginRequiredError).code
  if (code === "SOURCE_LOGIN_REQUIRED" && typeof loginUrl === "string" && loginUrl.trim()) {
    return loginUrl.trim()
  }

  return undefined
}
