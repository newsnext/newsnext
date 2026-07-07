DROP TABLE IF EXISTS `user_source_instances`;

CREATE TABLE `user_source_instances` (
	`userId` text NOT NULL,
	`instanceId` text NOT NULL,
	`sourceId` text NOT NULL,
	`params_patch` text NOT NULL,
	`meta_patch` text,
	`origin` text NOT NULL,
	`origin_ref` text,
	`createdAt` integer NOT NULL,
	`updatedAt` integer NOT NULL,
	PRIMARY KEY(`userId`, `instanceId`),
	FOREIGN KEY (`userId`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE cascade
);

CREATE INDEX `user_source_instances_userId_idx` ON `user_source_instances` (`userId`);
CREATE INDEX `user_source_instances_sourceId_idx` ON `user_source_instances` (`sourceId`);
