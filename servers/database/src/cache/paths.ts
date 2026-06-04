import { fileURLToPath } from "node:url"

export const CACHE_DB_PATH = `file:${fileURLToPath(new URL("../../../../data/cache.db", import.meta.url))}`
