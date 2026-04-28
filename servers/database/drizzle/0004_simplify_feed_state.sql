CREATE TABLE `feeds_next` (
	`key` text PRIMARY KEY NOT NULL,
	`provider` text NOT NULL,
	`feedId` text NOT NULL,
	`name` text NOT NULL,
	`title` text,
	`interval` integer NOT NULL,
	`params` text NOT NULL,
	`color` text NOT NULL,
	`desc` text,
	`type` text,
	`category` text NOT NULL,
	`home` text,
	`icon` text,
	`enabled` integer DEFAULT true NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	CONSTRAINT `feeds_type_check` CHECK(`type` IS NULL OR `type` IN ('hottest', 'timeline')),
	CONSTRAINT `feeds_category_check` CHECK(`category` IN ('tech', 'finance', 'china', 'world', 'others'))
);
--> statement-breakpoint
INSERT INTO `feeds_next` (
	`key`,
	`provider`,
	`feedId`,
	`name`,
	`title`,
	`interval`,
	`params`,
	`color`,
	`desc`,
	`type`,
	`category`,
	`home`,
	`icon`,
	`enabled`,
	`createdAt`,
	`updatedAt`
)
SELECT
	`key`,
	`provider`,
	`feedId`,
	`name`,
	`title`,
	`interval`,
	`params`,
	`color`,
	`desc`,
	`type`,
	`category`,
	`home`,
	`icon`,
	`enabled`,
	`createdAt`,
	`updatedAt`
FROM `feeds`;
--> statement-breakpoint
DROP TABLE `feeds`;
--> statement-breakpoint
ALTER TABLE `feeds_next` RENAME TO `feeds`;
--> statement-breakpoint
CREATE UNIQUE INDEX `feeds_provider_feedId_unique` ON `feeds` (`provider`,`feedId`);
--> statement-breakpoint
CREATE INDEX `feeds_provider_idx` ON `feeds` (`provider`);
--> statement-breakpoint
CREATE INDEX `feeds_category_idx` ON `feeds` (`category`);
--> statement-breakpoint
CREATE TABLE `user_feed_instances` (
	`userId` text NOT NULL,
	`instanceId` text NOT NULL,
	`feedKey` text NOT NULL,
	`params` text NOT NULL,
	`isFork` integer DEFAULT false NOT NULL,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	PRIMARY KEY(`userId`, `instanceId`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade,
	FOREIGN KEY (`feedKey`) REFERENCES `feeds`(`key`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `user_feed_instances_userId_idx` ON `user_feed_instances` (`userId`);
--> statement-breakpoint
CREATE INDEX `user_feed_instances_feedKey_idx` ON `user_feed_instances` (`feedKey`);
--> statement-breakpoint
CREATE TABLE `starred_feed_instances` (
	`userId` text NOT NULL,
	`instanceId` text NOT NULL,
	`createdAt` integer NOT NULL,
	PRIMARY KEY(`userId`, `instanceId`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `starred_feed_instances_userId_idx` ON `starred_feed_instances` (`userId`);
--> statement-breakpoint
INSERT INTO `user_feed_instances` (
	`userId`,
	`instanceId`,
	`feedKey`,
	`params`,
	`isFork`,
	`createdAt`,
	`updatedAt`
)
SELECT
	`userId`,
	`id`,
	`feedId`,
	`params`,
	true,
	`createdAt`,
	`updatedAt`
FROM `feed_forks`;
--> statement-breakpoint
INSERT INTO `user_feed_instances` (
	`userId`,
	`instanceId`,
	`feedKey`,
	`params`,
	`isFork`,
	`createdAt`,
	`updatedAt`
)
SELECT
	`userId`,
	`feedInstanceId`,
	`feedId`,
	`params`,
	false,
	`updatedAt`,
	`updatedAt`
FROM `feed_param_configs`
WHERE true
ON CONFLICT(`userId`, `instanceId`) DO UPDATE SET
	`feedKey` = excluded.`feedKey`,
	`params` = excluded.`params`,
	`updatedAt` = excluded.`updatedAt`;
--> statement-breakpoint
INSERT INTO `starred_feed_instances` (
	`userId`,
	`instanceId`,
	`createdAt`
)
SELECT
	`userId`,
	`feedId`,
	`createdAt`
FROM `starred_feeds`;
--> statement-breakpoint
DROP TABLE `feed_forks`;
--> statement-breakpoint
DROP TABLE `starred_feeds`;
--> statement-breakpoint
DROP TABLE `feed_param_configs`;
--> statement-breakpoint
DROP TABLE IF EXISTS `cache_table`;
