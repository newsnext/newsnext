export class SourceLoginRequiredError extends Error {
  readonly code = "SOURCE_LOGIN_REQUIRED"
  readonly loginUrl: string

  constructor(loginUrl: string) {
    super("Source login required.")
    this.name = "SourceLoginRequiredError"
    this.loginUrl = loginUrl
  }
}
