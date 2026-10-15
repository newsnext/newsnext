import { md5 as hashMd5 } from "@noble/hashes/legacy.js"
import { bytesToHex } from "@noble/hashes/utils.js"

export async function md5(s: string): Promise<string> {
  return bytesToHex(hashMd5(new TextEncoder().encode(s)))
}

type Algorithm = "SHA-1" | "SHA-256" | "SHA-384" | "SHA-512"
export async function myCrypto(s: string, algorithm: Algorithm): Promise<string> {
  const sUint8 = new TextEncoder().encode(s)
  const hashBuffer = await crypto.subtle.digest(algorithm, sUint8)
  const hashArray = Array.from(new Uint8Array(hashBuffer))
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("")
  return hashHex
}
