export async function md5(s: string) {
  // if (isCF) {
  return await myCrypto(s, "MD5")
  // } else {
  //   const { default: _md5 } = await import("md5")
  //   return _md5(s)
  // }
}

type Algorithm = "MD5" | "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512"
export async function myCrypto(s: string, algorithm: Algorithm) {
  const sUint8 = new TextEncoder().encode(s)
  const hashBuffer = await crypto.subtle.digest(algorithm, sUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
  return hashHex
}
