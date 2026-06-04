import { fileURLToPath } from "node:url"

export const DATA_DB_PATH = `file:${fileURLToPath(new URL("../../../data/data.db", import.meta.url))}`
