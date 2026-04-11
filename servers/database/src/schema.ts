import { integer, sqliteTable, text } from "drizzle-orm/sqlite-core"

export const boards = sqliteTable("boards_table", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  description: text().notNull(),
})

export const feeds = sqliteTable("sources_table", {
  id: integer().primaryKey({ autoIncrement: true }),
  name: text().notNull(),
  description: text().notNull(),
  url: text().notNull(),
})

export type Feed = typeof feeds.$inferSelect
export type NewFeed = typeof feeds.$inferInsert
export type Board = typeof boards.$inferSelect
