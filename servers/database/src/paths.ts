import { fileURLToPath } from "node:url"

export const DB_PATH = `file:${fileURLToPath(new URL("../../../data/newsnext.db", import.meta.url))}`
