import type { ActionInput, ActionResult } from "./action/index.js"

// Single Action registry: mutation writes, query reads, command touches the browser runtime.
export type { ActionDescriptor, ActionInput, ActionName, ActionResult, AllActionName } from "./action/index.js"

export type FetchInput = Pick<ActionInput<"developer.fetch">, "url" | "body"> & Partial<Pick<ActionInput<"developer.fetch">, "headers" | "method" | "searchParams" | "json" | "retry" | "throwHttpErrors" | "redirect" | "credentials">>
export type FetchResult = ActionResult<"developer.fetch">
type OptionalDebug<Input> = Input extends object ? Omit<Input, "debug"> & { debug?: boolean } : never
export type RunInput = OptionalDebug<ActionInput<"developer.runSource">>
export type RunResult = ActionResult<"developer.runSource">
