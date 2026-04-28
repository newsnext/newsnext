DROP TABLE `boards_table`;
--> statement-breakpoint
DROP TABLE `sources_table`;
--> statement-breakpoint
CREATE TABLE `feed_forks` (
	`id` text NOT NULL,
	`userId` text NOT NULL,
	`feedId` text NOT NULL,
	`params` text NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	PRIMARY KEY(`userId`, `id`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `feed_forks_userId_idx` ON `feed_forks` (`userId`);
--> statement-breakpoint
CREATE INDEX `feed_forks_feedId_idx` ON `feed_forks` (`feedId`);
--> statement-breakpoint
CREATE TABLE `starred_feeds` (
	`userId` text NOT NULL,
	`feedId` text NOT NULL,
	`createdAt` integer NOT NULL,
	PRIMARY KEY(`userId`, `feedId`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `starred_feeds_userId_idx` ON `starred_feeds` (`userId`);
--> statement-breakpoint
CREATE TABLE `feed_param_configs` (
	`userId` text NOT NULL,
	`feedInstanceId` text NOT NULL,
	`feedId` text NOT NULL,
	`params` text NOT NULL,
	`updatedAt` integer NOT NULL,
	PRIMARY KEY(`userId`, `feedInstanceId`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `feed_param_configs_userId_idx` ON `feed_param_configs` (`userId`);
--> statement-breakpoint
CREATE INDEX `feed_param_configs_feedId_idx` ON `feed_param_configs` (`feedId`);
