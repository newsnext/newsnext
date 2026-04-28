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
  createdAt: integer({ mode: "timestamp" }).notNull(),
  updatedAt: integer({ mode: "timestamp" }).notNull(),
}, table => [
  uniqueIndex("user_email_unique").on(table.email),
])

export const session = sqliteTable("session", {
  id: text().primaryKey(),
  expiresAt: integer({ mode: "timestamp" }).notNull(),
  token: text().notNull(),
  createdAt: integer({ mode: "timestamp" }).notNull(),
  updatedAt: integer({ mode: "timestamp" }).notNull(),
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
  accessTokenExpiresAt: integer({ mode: "timestamp" }),
  refreshTokenExpiresAt: integer({ mode: "timestamp" }),
  scope: text(),
  password: text(),
  createdAt: integer({ mode: "timestamp" }).notNull(),
  updatedAt: integer({ mode: "timestamp" }).notNull(),
}, table => [
  index("account_userId_idx").on(table.userId),
])

export const verification = sqliteTable("verification", {
  id: text().primaryKey(),
  identifier: text().notNull(),
  value: text().notNull(),
  expiresAt: integer({ mode: "timestamp" }).notNull(),
  createdAt: integer({ mode: "timestamp" }).notNull(),
  updatedAt: integer({ mode: "timestamp" }).notNull(),
}, table => [
  index("verification_identifier_idx").on(table.identifier),
])

export const feedForks = sqliteTable("feed_forks", {
  id: text().notNull(),
  userId: text().notNull().references(() => user.id, { onDelete: "cascade" }),
  feedId: text().notNull(),
  params: text({ mode: "json" }).$type<Record<string, unknown>>().notNull(),
  createdAt: integer().notNull(),
  updatedAt: integer().notNull(),
}, table => [
  primaryKey({ columns: [table.userId, table.id] }),
  index("feed_forks_userId_idx").on(table.userId),
  index("feed_forks_feedId_idx").on(table.feedId),
])

export const starredFeeds = sqliteTable("starred_feeds", {
  userId: text().notNull().references(() => user.id, { onDelete: "cascade" }),
  feedId: text().notNull(),
  createdAt: integer().notNull(),
}, table => [
  primaryKey({ columns: [table.userId, table.feedId] }),
  index("starred_feeds_userId_idx").on(table.userId),
])

export const feedParamConfigs = sqliteTable("feed_param_configs", {
  userId: text().notNull().references(() => user.id, { onDelete: "cascade" }),
  feedInstanceId: text().notNull(),
  feedId: text().notNull(),
  params: text({ mode: "json" }).$type<Record<string, unknown>>().notNull(),
  updatedAt: integer().notNull(),
}, table => [
  primaryKey({ columns: [table.userId, table.feedInstanceId] }),
  index("feed_param_configs_userId_idx").on(table.userId),
  index("feed_param_configs_feedId_idx").on(table.feedId),
])

export type FeedFork = typeof feedForks.$inferSelect
export type NewFeedFork = typeof feedForks.$inferInsert
export type StarredFeed = typeof starredFeeds.$inferSelect
export type NewStarredFeed = typeof starredFeeds.$inferInsert
export type FeedParamConfig = typeof feedParamConfigs.$inferSelect
export type NewFeedParamConfig = typeof feedParamConfigs.$inferInsert
