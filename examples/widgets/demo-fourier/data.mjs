// Data-free Widget: the Fourier visualization is synthesized locally and
// needs no queries. The manifest still requires a producer, so this returns
// an empty result.
export default async function load() {
  return {}
}
