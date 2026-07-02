import type { SourceErrorCode } from "@newsnext/server-source/service"

export { SourceServiceError } from "@newsnext/server-source/service"

export function isSourceErrorCode(code: string): code is SourceErrorCode {
  return code === "SOURCE_NOT_FOUND"
    || code === "INVALID_PARAMS"
    || code === "INVALID_FORMAT"
    || code === "LOADER_NOT_FOUND"
    || code === "PROVIDER_NOT_FOUND"
}
