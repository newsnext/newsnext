const __dirname = new URL(".", import.meta.url).pathname

export const DATA_DB_PATH = `file:${__dirname}/data.db`
export const CACHE_DB_PATH = `file:${__dirname}/cache.db`