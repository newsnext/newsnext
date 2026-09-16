// Data-free Widget: the view renders the local time and needs no queries.
// The manifest still requires a producer, so this returns an empty result.
export default async function load() {
  return {}
}
