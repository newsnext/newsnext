import { customAlphabet } from "nanoid"

const generateId = customAlphabet("ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789", 16)

export function createId(): string {
  return generateId()
}
