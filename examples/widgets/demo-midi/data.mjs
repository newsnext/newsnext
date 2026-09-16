// Data-free Widget: the view is a standalone instrument and needs no queries.
// The manifest still requires a producer, so this returns an empty result.
export default async function load() {
  return {}
}
