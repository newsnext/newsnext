/**
 * Omit properties with never type from object type
 */
export type OmitNever<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] }

/**
 * Convert union type to intersection type
 */
export type UnionToIntersection<U>
  = (U extends any ? (x: U) => void : never) extends ((x: infer I) => void) ? I : never

/**
 * Type that can be either a Promise or the value directly
 */
export type MaybePromise<T> = Promise<T> | T
export type MaybeArray<T> = T | T[]

/**
 * Exclusive OR type - ensures only properties from one type are present
 */
export type Either<T, U> = T | U extends object
  ? (Without<T, U> & U) | (Without<U, T> & T)
  : T | U

/**
 * Remove properties that exist in U from T
 */
export type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never }

/**
 * Type-safe Object.fromEntries with proper inference
 */
export function typeSafeObjectFromEntries<T extends ReadonlyArray<readonly [PropertyKey, unknown]>>(entries: T) {
  return Object.fromEntries(entries) as { [K in T[number] as K[0]]: K[1] }
}

/**
 * Type-safe Object.entries with proper inference
 */
export function typeSafeObjectEntries<T extends Record<PropertyKey, unknown>>(obj: T) {
  return Object.entries(obj) as { [K in keyof T]: [K, T[K]] }[keyof T][]
}

/**
 * Type-safe Object.keys with proper inference
 */
export function typeSafeObjectKeys<T extends Record<PropertyKey, unknown>>(obj: T) {
  return Object.keys(obj) as (keyof T)[]
}

/**
 * Type-safe Object.values with proper inference
 */
export function typeSafeObjectValues<T extends Record<PropertyKey, unknown>>(obj: T) {
  return Object.values(obj) as T[keyof T][]
}

/**
 * Type-safe object property omission
 */
export function typeSafeObjectOmit<T extends Record<PropertyKey, unknown>, K extends keyof T>(obj: T, ...keys: K[]) {
  return Object.fromEntries(Object.entries(obj).filter(([key]) => !keys.includes(key as K))) as Omit<T, K>
}
