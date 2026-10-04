ALTER TABLE `organization` ADD `is_active` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `user` ADD `mobile` text;--> statement-breakpoint
ALTER TABLE `user` ADD `is_platform_admin` integer DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX `ux_user_mobile` ON `user` (`mobile`);