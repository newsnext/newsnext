export interface ApiHealthResponse {
  name: string
  ok: true
}

export function getApiHealth(): ApiHealthResponse {
  return { name: "newsnext-api", ok: true }
}
