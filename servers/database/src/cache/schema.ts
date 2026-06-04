import { integer, real, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const cache = sqliteTable("sources_cache_table", {
  key: text().primaryKey(),
  value: text({ mode: "json" }).notNull(),
  updatedAt: integer().notNull().$default(() => Date.now()).$onUpdate(() => Date.now()),
})

export const cachePolicy = sqliteTable("sources_cache_policy_table", {
  key: text().primaryKey(),
  currentMaxCacheAge: integer().notNull(),
  lastFingerprint: text(),
  lastFetchedAt: integer().notNull(),
  lastChangedAt: integer(),
  unchangedStreak: integer().notNull(),
  errorStreak: integer().notNull(),
  hourlyChangeScores: text({ mode: "json" }).$type<number[]>().notNull(),
  averageChangeScore: real().notNull(),
  updatedAt: integer().notNull().$default(() => Date.now()).$onUpdate(() => Date.now()),
})

export type Cache = typeof cache.$inferSelect
export type NewCache = typeof cache.$inferInsert
export type CachePolicy = typeof cachePolicy.$inferSelect
export type NewCachePolicy = typeof cachePolicy.$inferInsert
