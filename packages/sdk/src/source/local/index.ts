// Transport shared by the module host and the extension's Source engine.
export { bindLocalProvider, serializeLocalProvider } from "./provider"
export type { LocalFunctionReference } from "./provider"
export { decodeSourceResponse, encodeSourceResponse } from "./response"
export type { SourceResponseTransport } from "./response"
