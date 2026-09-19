import type { TUnsafe } from "typebox"
import Type from "typebox"

export const EmptyObject = Type.Object({}, { additionalProperties: false })
export const Identifier = Type.String({ minLength: 1 })
export const RecordValue = Type.Record(Type.String(), Type.Unknown())

// Described identifiers for Action inputs. Validation is identical to
// Identifier; the description flows into the generated reference (like
// ego-browser's per-option docs) and into actions.list() schemas.
function describedId(description: string) {
  return Type.String({ minLength: 1, description })
}

export const BoardIdParam = describedId("Board identifier. Board names are not unique: resolve with board.list first.")
export const TargetBoardIdParam = describedId("Destination Board identifier.")
export const CardIdParam = describedId("LiveCard identifier.")
export const CardIdArrayParam = Type.Array(CardIdParam, { uniqueItems: true, description: "LiveCard identifiers in order." })
export const LiveWidgetIdParam = describedId("LiveWidget instance identifier, not the Widget definition ID.")
export const WidgetIdParam = describedId("Widget definition ID (e.g. \"snake\"); the running instance ID is liveWidgetId.")
export const SourceIdParam = describedId("Qualified Source ID (e.g. \"x:list\").")

export function stringEnum<const Values extends readonly string[]>(values: Values): TUnsafe<Values[number]> {
  return Type.Unsafe<Values[number]>({ type: "string", enum: values })
}
