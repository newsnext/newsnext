import { sql } from "drizzle-orm"
import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const boards = sqliteTable("boards_table", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  description: text().notNull(),
})

export const sources = sqliteTable("sources_table", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  description: text().notNull(),
  url: text().notNull(),
})

export type Source = typeof sources.$inferSelect
export type NewSource = typeof sources.$inferInsert
export type Board = typeof boards.$inferSelect

export const cache = sqliteTable("cache_table", {
  key: text().primaryKey(),
  value: text().notNull(),
  createdAt: integer().notNull().default(sql`CURRENT_TIMESTAMP`),
  updatedAt: integer().notNull().default(sql`CURRENT_TIMESTAMP`),
})

export type Cache = typeof cache.$inferSelect
export type NewCache = typeof cache.$inferInsert
