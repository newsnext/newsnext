import { Md5 } from "@smithy/md5-js"

export async function md5(s: string): Promise<string> {
  const hasher = new Md5()
  hasher.update(s)
  const result = await hasher.digest()
  return Array.from(result)
    .map(b => b.toString(16).padStart(2, "0"))
    .join("")
}

type Algorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512"
export async function myCrypto(s: string, algorithm: Algorithm): Promise<string> {
  const sUint8 = new TextEncoder().encode(s)
  const hashBuffer = await crypto.subtle.digest(algorithm, sUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
  return hashHex
}
