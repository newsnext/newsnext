CREATE TABLE `feeds` (
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
	`updatedAt` integer NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `feeds_provider_feedId_unique` ON `feeds` (`provider`,`feedId`);
--> statement-breakpoint
CREATE INDEX `feeds_provider_idx` ON `feeds` (`provider`);
--> statement-breakpoint
CREATE INDEX `feeds_category_idx` ON `feeds` (`category`);
