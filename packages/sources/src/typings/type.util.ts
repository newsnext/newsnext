export type OmitNever<T> = { [K in keyof T as T[K] extends never ? never : K]: T[K] }
export type UnionToIntersection<U>
  = (U extends any ? (x: U) => void : never) extends ((x: infer I) => void) ? I : never

export type MaybePromise<T> = Promise<T> | T

export type Either<T, U> = T | U extends object
  ? (Without<T, U> & U) | (Without<U, T> & T)
  : T | U

export type Without<T, U> = { [P in Exclude<keyof T, keyof U>]?: never }

export function typeSafeObjectFromEntries<T extends ReadonlyArray<readonly [PropertyKey, unknown]>>(entries: T) {
  return Object.fromEntries(entries) as { [K in T[number] as K[0]]: K[1] }
}

export function typeSafeObjectEntries<T extends Record<PropertyKey, unknown>>(obj: T) {
  return Object.entries(obj) as { [K in keyof T]: [K, T[K]] }[keyof T][]
}

export function typeSafeObjectKeys<T extends Record<PropertyKey, unknown>>(obj: T) {
  return Object.keys(obj) as (keyof T)[]
}

export function typeSafeObjectValues<T extends Record<PropertyKey, unknown>>(obj: T) {
  return Object.values(obj) as T[keyof T][]
}

export function typeSafeObjectOmit<T extends Record<PropertyKey, unknown>, K extends keyof T>(obj: T, ...keys: K[]) {
  return Object.fromEntries(Object.entries(obj).filter(([key]) => !keys.includes(key as K))) as Omit<T, K>
}
