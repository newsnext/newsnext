function bytesToBase64(bytes: Uint8Array): string {
  let binary = ""
  const chunkSize = 0x8000

  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    const chunk = bytes.subarray(offset, offset + chunkSize)
    binary += String.fromCharCode(...chunk)
  }

  return btoa(binary)
}

function base64ToBytes(str: string): Uint8Array {
  const binary = atob(str)
  const bytes = new Uint8Array(binary.length)

  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index)
  }

  return bytes
}

export function decodeBase64URL(str: string) {
  return decodeBase64(decodeURIComponent(str))
}

export function encodeBase64URL(str: string) {
  return encodeURIComponent(encodeBase64(str))
}

export function decodeBase64(str: string) {
  return new TextDecoder().decode(base64ToBytes(str))
}

export function encodeBase64(str: string) {
  return bytesToBase64(new TextEncoder().encode(str))
}
