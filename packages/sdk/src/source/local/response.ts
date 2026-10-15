export interface SourceResponseTransport {
  body: string
  headers: [string, string][]
  status: number
  statusText: string
  url: string
}

export async function encodeSourceResponse(response: Response): Promise<SourceResponseTransport> {
  const bytes = new Uint8Array(await response.arrayBuffer())
  let binary = ""
  for (let offset = 0; offset < bytes.length; offset += 8192) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + 8192))
  }
  return { body: btoa(binary), headers: [...response.headers], status: response.status, statusText: response.statusText, url: response.url }
}

export function decodeSourceResponse(value: SourceResponseTransport): Response {
  const body = [101, 204, 205, 304].includes(value.status) ? null : Uint8Array.from(atob(value.body), character => character.charCodeAt(0))
  const response = new Response(body, { status: value.status, statusText: value.statusText, headers: value.headers })
  Object.defineProperty(response, "url", { value: value.url })
  return response
}
