DROP TABLE IF EXISTS `starred_source_instances`;
--> statement-breakpoint
DROP TABLE IF EXISTS `user_source_instances`;
--> statement-breakpoint
DROP TABLE IF EXISTS `sources`;
--> statement-breakpoint
CREATE TABLE `user_source_instances` (
	`userId` text NOT NULL,
	`instanceId` text NOT NULL,
	`sourceKey` text NOT NULL,
	`params` text NOT NULL,
	`isFork` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	PRIMARY KEY(`userId`, `instanceId`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_source_instances_userId_idx` ON `user_source_instances` (`userId`);
--> statement-breakpoint
CREATE INDEX `user_source_instances_sourceKey_idx` ON `user_source_instances` (`sourceKey`);
--> statement-breakpoint
CREATE TABLE `starred_source_instances` (
	`userId` text NOT NULL,
	`instanceId` text NOT NULL,
	`createdAt` integer NOT NULL,
	PRIMARY KEY(`userId`, `instanceId`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `starred_source_instances_userId_idx` ON `starred_source_instances` (`userId`);
