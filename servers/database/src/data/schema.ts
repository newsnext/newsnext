import {
  index,
  integer,
  primaryKey,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core"

export const user = sqliteTable("user", {
  id: text().primaryKey(),
  name: text().notNull(),
  email: text().notNull(),
  emailVerified: integer({ mode: "boolean" }).notNull().default(false),
  image: text(),
  createdAt: integer({ mode: "timestamp_ms" }).notNull(),
  updatedAt: integer({ mode: "timestamp_ms" }).notNull(),
}, table => [
  uniqueIndex("user_email_unique").on(table.email),
])

export const session = sqliteTable("session", {
  id: text().primaryKey(),
  expiresAt: integer({ mode: "timestamp_ms" }).notNull(),
  token: text().notNull(),
  createdAt: integer({ mode: "timestamp_ms" }).notNull(),
  updatedAt: integer({ mode: "timestamp_ms" }).notNull(),
  ipAddress: text(),
  userAgent: text(),
  userId: text().notNull().references(() => user.id, { onDelete: "cascade" }),
}, table => [
  uniqueIndex("session_token_unique").on(table.token),
  index("session_userId_idx").on(table.userId),
])

export const account = sqliteTable("account", {
  id: text().primaryKey(),
  accountId: text().notNull(),
  providerId: text().notNull(),
  userId: text().notNull().references(() => user.id, { onDelete: "cascade" }),
  accessToken: text(),
  refreshToken: text(),
  idToken: text(),
  accessTokenExpiresAt: integer({ mode: "timestamp_ms" }),
  refreshTokenExpiresAt: integer({ mode: "timestamp_ms" }),
  scope: text(),
  password: text(),
  createdAt: integer({ mode: "timestamp_ms" }).notNull(),
  updatedAt: integer({ mode: "timestamp_ms" }).notNull(),
}, table => [
  index("account_userId_idx").on(table.userId),
])

export const verification = sqliteTable("verification", {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: integer({ mode: "timestamp_ms" }).notNull(),
  createdAt: integer({ mode: "timestamp_ms" }).notNull(),
  updatedAt: integer({ mode: "timestamp_ms" }).notNull(),
}, table => [
  index("verification_identifier_idx").on(table.identifier),
])

export const userSourceInstances = sqliteTable("user_source_instances", {
  userId: text().notNull().references(() => user.id, { onDelete: "cascade" }),
  instanceId: text().notNull(),
  sourceId: text().notNull(),
  params: text({ mode: "json" }).$type<Record<string, unknown>>().notNull(),
  isFork: integer({ mode: "boolean" }).notNull().default(false),
  createdAt: integer().notNull(),
  updatedAt: integer().notNull(),
}, table => [
  primaryKey({ columns: [table.userId, table.instanceId] }),
  index("user_source_instances_userId_idx").on(table.userId),
  index("user_source_instances_sourceId_idx").on(table.sourceId),
])

export const starredSourceInstances = sqliteTable("starred_source_instances", {
  userId: text().notNull().references(() => user.id, { onDelete: "cascade" }),
  instanceId: text().notNull(),
  createdAt: integer().notNull(),
}, table => [
  primaryKey({ columns: [table.userId, table.instanceId] }),
  index("starred_source_instances_userId_idx").on(table.userId),
])

export type UserSourceInstance = typeof userSourceInstances.$inferSelect
export type NewUserSourceInstance = typeof userSourceInstances.$inferInsert
export type StarredSourceInstance = typeof starredSourceInstances.$inferSelect
export type NewStarredSourceInstance = typeof starredSourceInstances.$inferInsert
