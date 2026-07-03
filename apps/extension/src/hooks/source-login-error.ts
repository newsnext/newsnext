interface LoginRequiredError extends Error {
  code?: unknown
  loginUrl?: unknown
}

function getLoginUrlFromMessage(message: string): string | undefined {
  const loginUrl = /^Please log in to (https?:\/\/\S+) first\.$/.exec(message.trim())?.[1]
  return loginUrl?.trim()
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

  return getLoginUrlFromMessage(error.message)
}
