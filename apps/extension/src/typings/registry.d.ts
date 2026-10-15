// Provider definitions are validated by the SDK before entering the catalog.
declare module "@registry/sources/*.js" {
  const provider: unknown
  export default provider
}

declare module "@registry/sources/*.mjs" {
  const provider: unknown
  export default provider
}
