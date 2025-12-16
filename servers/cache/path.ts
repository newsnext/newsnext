const __dirname = new URL(".", import.meta.url).pathname

export const DB_PATH = `file:${__dirname}/cache.db`