import type { NativeCollectionStatus } from "@newsnext/extension-connection"
import Type from "typebox"
import Value from "typebox/value"

const count = Type.Integer({ minimum: 0, maximum: Number.MAX_SAFE_INTEGER })
const timestamp = Type.Union([count, Type.Null()])
const nullableText = Type.Union([Type.String(), Type.Null()])
const schema = Type.Object({
  initialized: Type.Boolean(),
  sampledAt: count,
  persistenceError: nullableText,
  pendingWrites: count,
  streams: Type.Array(Type.Object({
    streamId: Type.String(),
    sourceId: Type.String(),
    workerId: Type.String(),
    instanceIds: Type.Array(Type.String()),
    resolved: Type.Boolean(),
    observationCount: Type.Optional(Type.Union([count, Type.Null()])),
    activity: Type.Union((["loading", "offline", "backoff", "due", "scheduled"] as const).map(value => Type.Literal(value))),
    policy: Type.Object({
      intervalMs: Type.Integer({ minimum: 60_000, maximum: 3_600_000 }),
      nextRunAt: count,
      lastFetchedAt: timestamp,
      lastAttemptAt: timestamp,
      lastChangedAt: timestamp,
      lastError: nullableText,
      lastOutcome: Type.Union([Type.Literal("fresh"), Type.Literal("cached"), Type.Literal("error"), Type.Null()]),
      phase: Type.Union([Type.Literal("learning"), Type.Literal("burst"), Type.Literal("adaptive")]),
      sampleCount: Type.Integer({ minimum: 0, maximum: 64 }),
      estimatedChangesPerHour: Type.Union([Type.Number({ minimum: 0 }), Type.Null()]),
      added: count,
      removed: count,
      edited: count,
      moved: count,
    }),
  })),
})

export function parseCollectionStatus(value: unknown): NativeCollectionStatus {
  if (!Value.Check(schema, value)) throw new Error("The NewsNext App returned invalid stream diagnostics")
  return value
}
