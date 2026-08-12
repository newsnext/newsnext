import { nanoid } from "nanoid"

const ID_SIZE = 12

export function createId(): string {
  return nanoid(ID_SIZE)
}
