import Dexie, { liveQuery } from "dexie"
import {
  createSvgIllustrationDataUrl,
  decodeSvgIllustrationDataUrl,
  MAX_BG_ILLUSTRATION_DATA_URL_LENGTH,
} from "./config"

const DATABASE_NAME = "newsnext-extension-background-illustration"

interface PersistedBgIllustration {
  bytes: Uint8Array<ArrayBuffer>
  id: string
}

class BgIllustrationDatabase extends Dexie {
  illustrations!: Dexie.Table<PersistedBgIllustration, string>

  constructor() {
    super(DATABASE_NAME)
    this.version(1).stores({ illustrations: "id" })
  }
}

const database = new BgIllustrationDatabase()

export function encodeBgIllustration(
  illustration: string,
): Uint8Array<ArrayBuffer> | null {
  const svg = decodeSvgIllustrationDataUrl(illustration)
  return svg === null ? null : new TextEncoder().encode(svg)
}

export function decodeBgIllustration(bytes: unknown): string | null {
  if (!(bytes instanceof Uint8Array)
    || bytes.byteLength > MAX_BG_ILLUSTRATION_DATA_URL_LENGTH) {
    return null
  }

  try {
    const svg = new TextDecoder("utf-8", { fatal: true }).decode(bytes)
    return createSvgIllustrationDataUrl(svg)
  } catch {
    return null
  }
}

export async function createBgIllustrationId(
  bytes: Uint8Array<ArrayBuffer>,
): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", bytes)
  return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, "0")).join("")
}

export async function readPersistedBgIllustrationBytes(
  id: string,
): Promise<Uint8Array<ArrayBuffer> | null> {
  try {
    const record = await database.illustrations.get(id)
    if (!record) return null
    if (decodeBgIllustration(record.bytes) === null) {
      await database.illustrations.delete(id)
      return null
    }
    return record.bytes
  } catch (error) {
    console.error("Failed to read background illustration", error)
    return null
  }
}

export function subscribePersistedBgIllustration(
  id: string,
  callback: (illustration: string | null) => void,
): () => void {
  const subscription = liveQuery(async () => {
    const record = await database.illustrations.get(id)
    return record ? decodeBgIllustration(record.bytes) : null
  }).subscribe({
    next: callback,
    error: error => console.error("Failed to observe background illustration", error),
  })
  return () => subscription.unsubscribe()
}

export async function writePersistedBgIllustration(
  id: string,
  bytes: Uint8Array<ArrayBuffer>,
): Promise<void> {
  if (decodeBgIllustration(bytes) === null || await createBgIllustrationId(bytes) !== id) {
    throw new Error("The background illustration is invalid")
  }
  await database.illustrations.put({ bytes, id })
}

export async function clearPersistedBgIllustrations(): Promise<void> {
  try {
    await database.illustrations.clear()
  } catch {
    // Illustration cleanup should not prevent the remaining user data from being cleared.
  }
}
