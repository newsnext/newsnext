DROP INDEX IF EXISTS `user_source_instances_sourceKey_idx`;
--> statement-breakpoint
ALTER TABLE `user_source_instances` RENAME COLUMN `sourceKey` TO `sourceId`;
--> statement-breakpoint
CREATE INDEX `user_source_instances_sourceId_idx` ON `user_source_instances` (`sourceId`);
