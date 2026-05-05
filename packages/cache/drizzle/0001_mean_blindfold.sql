CREATE TABLE `sources_cache_policy_table` (
	`key` text PRIMARY KEY NOT NULL,
	`currentMaxCacheAge` integer NOT NULL,
	`lastFingerprint` text,
	`lastFetchedAt` integer NOT NULL,
	`lastChangedAt` integer,
	`unchangedStreak` integer NOT NULL,
	`errorStreak` integer NOT NULL,
	`hourlyChangeScores` text NOT NULL,
	`averageChangeScore` real NOT NULL,
	`updatedAt` integer NOT NULL
);
