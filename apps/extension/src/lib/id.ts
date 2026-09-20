import { customAlphabet } from "nanoid"

// Entity IDs: 16-char NanoIDs (A-Za-z0-9); Widget IDs stay manifest-authored.
const generateId = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", 16)

export function createId(): string {
  return generateId()
}
