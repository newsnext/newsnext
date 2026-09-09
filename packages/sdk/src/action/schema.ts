import type { TUnsafe } from "typebox"
import Type from "typebox"

export const EmptyObject = Type.Object({}, { additionalProperties: false })
export const Identifier = Type.String({ minLength: 1 })
export const RecordValue = Type.Record(Type.String(), Type.Unknown())

export function stringEnum<const Values extends readonly string[]>(values: Values): TUnsafe<Values[number]> {
  return Type.Unsafe<Values[number]>({ type: "string", enum: values })
}
