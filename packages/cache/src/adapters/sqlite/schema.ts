import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const cache = sqliteTable("sources_cache_table", {
  key: text().primaryKey(),
  value: text({ mode: "json" }).notNull(),
  updatedAt: integer().notNull().$default(() => Date.now()).$onUpdate(() => Date.now()),
})

export type Cache = typeof cache.$inferSelect
export type NewCache = typeof cache.$inferInsert
