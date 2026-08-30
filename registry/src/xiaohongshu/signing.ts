import { md5 } from "@newsnext/source-kit/utils"

/*
 * Browser-safe adaptation of lucasygu/redbook's XYS signer.
 *
 * MIT License
 * Copyright (c) 2026 Lucas Gu
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
 * IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
 * FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
 * AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
 * LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
 * OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
 * SOFTWARE.
 */
const STANDARD_BASE64 = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/"
const CUSTOM_BASE64 = "ZmserbBoHQtNP+wOcza/LpngG8yJq42KWYj0DSfdikx3VT16IlUAFM97hECvuRX5"
const X3_BASE64 = "MfgqrsbcyzPQRStuvC7mn501HIJBo2DEFTKdeNOwxWXYZap89+/A4UVLhijkl63G"
const HEX_KEY = "71a302257793271ddd273bcee3e4b98d9d7935e1da33f5765e2ea8afb6dc77a51a499d23b67c20660025860cbf13d4540d92497f58686c574e508f46e1956344f39139bf4faf22a3eef120b79258145b2feb5193b6478669961298e79bedca646e1a693a926154a5a7a1bd1cf0dedb742f917a747a1e388b234f2277516db7116035439730fa61e9822a0eca7bff72d8"
const VERSION_BYTES = [121, 104, 96, 41]
const ENV_TABLE = [115, 248, 83, 102, 103, 201, 181, 131, 99, 94, 4, 68, 250, 132, 21]
const ENV_CHECKS_DEFAULT = [0, 1, 18, 1, 0, 0, 0, 0, 0, 0, 3, 0, 0, 0, 0]
const A3_PREFIX = [2, 97, 51, 16]
const HASH_IV = [1831565813, 461845907, 2246822507, 3266489909] as const
const APP_ID = "xhs-pc-web"
const B1_SECRET_KEY = "xhswebmplfbt"
const HEX_CHARS = "abcdef0123456789"
const TEXT_ENCODER = new TextEncoder()

const XIAOHONGSHU_SIGNING_USER_AGENT = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/142.0.0.0 Safari/537.36 Edg/142.0.0.0"

interface XiaohongshuSignHeaders {
  "x-b3-traceid": string
  "x-s": string
  "x-s-common": string
  "x-t": string
  "x-xray-traceid": string
}

function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  for (const byte of bytes) binary += String.fromCharCode(byte)
  return btoa(binary)
}

function translateBase64(value: string, alphabet: string): string {
  return Array.from(value, (char) => {
    const index = STANDARD_BASE64.indexOf(char)
    return index < 0 ? char : alphabet[index]
  }).join("")
}

function customBase64Encode(value: string | Uint8Array): string {
  const bytes = typeof value === "string" ? TEXT_ENCODER.encode(value) : value
  return translateBase64(bytesToBase64(bytes), CUSTOM_BASE64)
}

function x3Base64Encode(value: Uint8Array): string {
  return translateBase64(bytesToBase64(value), X3_BASE64)
}

function hexToBytes(hex: string): Uint8Array {
  return Uint8Array.from({ length: hex.length / 2 }, (_, index) => Number.parseInt(hex.slice(index * 2, index * 2 + 2), 16))
}

function randomBytes(length: number): Uint8Array {
  return crypto.getRandomValues(new Uint8Array(length))
}

function randomHex(length: number): string {
  return Array.from(randomBytes(length), byte => byte.toString(16).padStart(2, "0")).join("")
}

function randomInt(min: number, max: number): number {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

function intToLeBytes(value: number, length = 4): number[] {
  let remaining = BigInt(Math.floor(value))
  return Array.from({ length }, () => {
    const byte = Number(remaining & 0xFFn)
    remaining >>= 8n
    return byte
  })
}

function uint32FromLeBytes(bytes: Uint8Array, offset: number): number {
  return (
    (bytes[offset] ?? 0)
    | ((bytes[offset + 1] ?? 0) << 8)
    | ((bytes[offset + 2] ?? 0) << 16)
    | ((bytes[offset + 3] ?? 0) << 24)
  ) >>> 0
}

function rotateLeft(value: number, bits: number): number {
  return ((value << bits) | (value >>> (32 - bits))) >>> 0
}

function customHashV2(inputBytes: number[]): number[] {
  let s0: number = HASH_IV[0]
  let s1: number = HASH_IV[1]
  let s2: number = HASH_IV[2]
  let s3: number = HASH_IV[3]
  const length = inputBytes.length
  s0 = (s0 ^ length) >>> 0
  s1 = (s1 ^ (length << 8)) >>> 0
  s2 = (s2 ^ (length << 16)) >>> 0
  s3 = (s3 ^ (length << 24)) >>> 0

  const bytes = Uint8Array.from(inputBytes)
  for (let index = 0; index < Math.floor(length / 8); index += 1) {
    const v0 = uint32FromLeBytes(bytes, index * 8)
    const v1 = uint32FromLeBytes(bytes, index * 8 + 4)
    s0 = rotateLeft(((s0 + v0) >>> 0) ^ s2, 7)
    s1 = rotateLeft(((v0 ^ s1) + s3) >>> 0, 11)
    s2 = rotateLeft(((s2 + v1) >>> 0) ^ s0, 13)
    s3 = rotateLeft(((s3 ^ v1) + s1) >>> 0, 17)
  }

  const t0 = (s0 ^ length) >>> 0
  const t1 = (s1 ^ t0) >>> 0
  const t2 = (s2 + t1) >>> 0
  const t3 = (s3 ^ t2) >>> 0
  s0 = (rotateLeft(t0, 9) + rotateLeft(t2, 17)) >>> 0
  s1 = (rotateLeft(t1, 13) ^ rotateLeft(t3, 19)) >>> 0
  s2 = (rotateLeft(t2, 17) + s0) >>> 0
  s3 = (rotateLeft(t3, 19) ^ s1) >>> 0
  return [s0, s1, s2, s3].flatMap(value => intToLeBytes(value))
}

async function buildPayloadArray(
  digest: string,
  a1: string,
  content: string,
  timestampSeconds: number,
): Promise<number[]> {
  const payload: number[] = [...VERSION_BYTES]
  const seedBytes = Array.from(randomBytes(4))
  payload.push(...seedBytes)
  const seedByte = seedBytes[0] ?? 0
  const timestampBytes = intToLeBytes(timestampSeconds * 1000, 8)
  payload.push(...timestampBytes)
  payload.push(...intToLeBytes((timestampSeconds - randomInt(10, 50)) * 1000, 8))
  payload.push(...intToLeBytes(randomInt(15, 50)))
  payload.push(...intToLeBytes(randomInt(1000, 1200)))
  payload.push(...intToLeBytes(TEXT_ENCODER.encode(content).length))
  payload.push(...Array.from(hexToBytes(digest).slice(0, 8), byte => byte ^ seedByte))
  payload.push(52)
  const a1Bytes = TEXT_ENCODER.encode(a1)
  for (let index = 0; index < 52; index += 1) payload.push(a1Bytes[index] ?? 0)
  payload.push(10)
  const sourceBytes = TEXT_ENCODER.encode(APP_ID)
  for (let index = 0; index < 10; index += 1) payload.push(sourceBytes[index] ?? 0)
  payload.push(1, seedByte ^ (ENV_TABLE[0] ?? 0))
  for (let index = 1; index < 15; index += 1) payload.push((ENV_TABLE[index] ?? 0) ^ (ENV_CHECKS_DEFAULT[index] ?? 0))

  const apiPath = content.split(/[?{]/, 1)[0] ?? content
  const apiPathDigest = hexToBytes(await md5(apiPath))
  const hashOutput = customHashV2([...timestampBytes, ...apiPathDigest])
  payload.push(...A3_PREFIX, ...hashOutput.map(byte => byte ^ seedByte))
  return payload
}

function xorTransform(source: number[]): Uint8Array {
  const key = hexToBytes(HEX_KEY)
  return Uint8Array.from(source, (byte, index) => byte ^ (key[index] ?? 0))
}

let crc32Table: Uint32Array | undefined

function getCrc32Table(): Uint32Array {
  if (crc32Table) return crc32Table
  crc32Table = Uint32Array.from({ length: 256 }, (_, index) => {
    let value = index
    for (let bit = 0; bit < 8; bit += 1) value = value & 1 ? (value >>> 1) ^ 0xEDB88320 : value >>> 1
    return value
  })
  return crc32Table
}

function crc32JsInt(value: string): number {
  const table = getCrc32Table()
  let crc = 0xFFFFFFFF
  for (let index = 0; index < value.length; index += 1) {
    crc = ((table[(crc & 0xFF) ^ (value.charCodeAt(index) & 0xFF)] ?? 0) ^ (crc >>> 8)) >>> 0
  }
  const result = ((0xFFFFFFFF ^ crc) ^ 0xEDB88320) >>> 0
  return result > 0x7FFFFFFF ? result - 0x100000000 : result
}

function rc4Encrypt(key: string, value: string): Uint8Array {
  const keyBytes = TEXT_ENCODER.encode(key)
  const valueBytes = TEXT_ENCODER.encode(value)
  const state = Uint8Array.from({ length: 256 }, (_, index) => index)
  let j = 0
  for (let i = 0; i < 256; i += 1) {
    j = (j + (state[i] ?? 0) + (keyBytes[i % keyBytes.length] ?? 0)) & 0xFF
    const swap = state[i] ?? 0
    state[i] = state[j] ?? 0
    state[j] = swap
  }
  const result = new Uint8Array(valueBytes.length)
  let i = 0
  j = 0
  for (let index = 0; index < valueBytes.length; index += 1) {
    i = (i + 1) & 0xFF
    j = (j + (state[i] ?? 0)) & 0xFF
    const swap = state[i] ?? 0
    state[i] = state[j] ?? 0
    state[j] = swap
    result[index] = (valueBytes[index] ?? 0) ^ (state[((state[i] ?? 0) + (state[j] ?? 0)) & 0xFF] ?? 0)
  }
  return result
}

function generateFingerprint(cookies: Record<string, string>, signLocation: string): Record<string, unknown> {
  const cookieString = Object.entries(cookies).map(([key, value]) => `${key}=${value}`).join("; ")
  const webglHash = randomHex(16)
  const y = randomInt(2350, 2450)
  return {
    x1: XIAOHONGSHU_SIGNING_USER_AGENT,
    x2: "false",
    x3: "zh-CN",
    x4: "24",
    x5: "8",
    x6: "24",
    x7: "Google Inc. (Intel),ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11)",
    x8: "8",
    x9: "1920;1080",
    x10: "1920;1040",
    x11: "-480",
    x12: "Asia/Shanghai",
    x13: "false",
    x14: "false",
    x15: "false",
    x16: "false",
    x17: "false",
    x18: "un",
    x19: "Win32",
    x20: "",
    x21: "PDF Viewer,Chrome PDF Viewer,Chromium PDF Viewer,Microsoft Edge PDF Viewer,WebKit built-in PDF",
    x22: webglHash,
    x23: "false",
    x24: "false",
    x25: "false",
    x26: "false",
    x27: "false",
    x28: "0,false,false",
    x29: "4,7,8",
    x30: "swf object not loaded",
    x31: "124.04347527516074",
    x33: "0",
    x34: "0",
    x35: "0",
    x36: String(randomInt(1, 20)),
    x37: "0|0|0|0|0|0|0|0|0|1|0|0|0|0|0|0|0|0|1|0|0|0|0|0",
    x38: "0|0|1|0|1|0|0|0|0|0|1|0|1|0|1|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0|0",
    x39: 0,
    x40: "0",
    x41: "0",
    x42: "3.4.4",
    x43: "742cc32c",
    x44: String(Date.now()),
    x45: "__SEC_CAV__1-1-1-1-1|__SEC_WSA__|",
    x46: "false",
    x47: "1|0|0|0|0|0",
    x48: "",
    x49: "{list:[],type:}",
    x50: "",
    x51: "",
    x52: "",
    x53: randomHex(16),
    x54: "10311144241322244122",
    x55: "380,380,360,400,380,400,420,380,400,400,360,360,440,420",
    x56: `Google Inc. (Intel)|ANGLE (Intel, Intel(R) UHD Graphics 620 Direct3D11)|${webglHash}|35`,
    x57: cookieString,
    x58: "180",
    x59: "2",
    x60: "63",
    x61: "1291",
    x62: "2047",
    x63: "0",
    x64: "0",
    x65: "0",
    x66: { referer: "", location: signLocation, frame: 0 },
    x67: "1|0",
    x68: "0",
    x69: "326|1292|30",
    x70: ["location"],
    x71: "true",
    x72: "complete",
    x73: "1191",
    x74: "0|0|0",
    x75: "Google Inc.",
    x76: "true",
    x77: "1|1|1|1|1|1|1|1|1|1",
    x78: { x: 0, y, left: 0, right: 290.828125, bottom: y + 18, height: 18, top: y, width: 290.828125 },
    x79: "144|599565058866",
    x80: "1|[object FileSystemDirectoryHandle]",
    x82: "_0x17a2|_0x1954",
  }
}

function generateB1(fingerprint: Record<string, unknown>): string {
  const fields: Record<string, unknown> = {}
  for (const key of ["x33", "x34", "x35", "x36", "x37", "x38", "x39", "x42", "x43", "x44", "x45", "x46", "x48", "x49", "x50", "x51", "x52", "x82"]) {
    fields[key] = fingerprint[key]
  }
  const encrypted = rc4Encrypt(B1_SECRET_KEY, JSON.stringify(fields))
  const latin1 = Array.from(encrypted, byte => String.fromCharCode(byte)).join("")
  const encoded = encodeURIComponent(latin1)
  const bytes: number[] = []
  for (const part of encoded.split("%").slice(1)) {
    bytes.push(Number.parseInt(part.slice(0, 2), 16))
    for (let index = 2; index < part.length; index += 1) bytes.push(part.charCodeAt(index))
  }
  return customBase64Encode(Uint8Array.from(bytes))
}

function randomTraceId(length: number): string {
  return Array.from({ length }, () => HEX_CHARS[randomInt(0, HEX_CHARS.length - 1)]).join("")
}

export async function signXiaohongshuPost(
  uri: string,
  payload: Record<string, unknown>,
  cookies: Record<string, string>,
  signLocation: string,
): Promise<XiaohongshuSignHeaders> {
  const a1 = cookies.a1
  if (!a1) throw new Error("Xiaohongshu a1 cookie is required.")
  const timestampSeconds = Date.now() / 1000
  const timestampMs = Math.floor(timestampSeconds * 1000)
  const content = uri + JSON.stringify(payload)
  const digest = await md5(content)
  const payloadArray = await buildPayloadArray(digest, a1, content, timestampSeconds)
  const x3 = `mns0301_${x3Base64Encode(xorTransform(payloadArray).slice(0, 144))}`
  const xS = `XYS_${customBase64Encode(JSON.stringify({ x0: "4.2.6", x1: APP_ID, x2: "Windows", x3, x4: "" }))}`
  const b1 = generateB1(generateFingerprint(cookies, signLocation))
  const xSCommon = customBase64Encode(JSON.stringify({
    s0: 5,
    s1: "",
    x0: "1",
    x1: "4.2.6",
    x2: "Windows",
    x3: APP_ID,
    x4: "4.86.0",
    x5: a1,
    x6: "",
    x7: "",
    x8: b1,
    x9: crc32JsInt(b1),
    x10: 0,
    x11: "normal",
  }))
  const xrayPrefix = ((BigInt(timestampMs) << 23n) | BigInt(randomInt(0, 8_388_607))).toString(16).padStart(16, "0")
  return {
    "x-b3-traceid": randomTraceId(16),
    "x-s": xS,
    "x-s-common": xSCommon,
    "x-t": String(timestampMs),
    "x-xray-traceid": xrayPrefix + randomTraceId(16),
  }
}
