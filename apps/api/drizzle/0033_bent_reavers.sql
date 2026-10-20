CREATE TABLE `platform_payment` (
	`id` integer PRIMARY KEY NOT NULL,
	`organization_id` integer NOT NULL,
	`amount_paise` integer NOT NULL,
	`paid_on` text NOT NULL,
	`period_from` text NOT NULL,
	`period_to` text NOT NULL,
	`note` text,
	`created_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `organization` ADD `plan_name` text;--> statement-breakpoint
ALTER TABLE `organization` ADD `monthly_fee_paise` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `organization` ADD `paid_until` text;--> statement-breakpoint
ALTER TABLE `organization` ADD `grace_days` integer DEFAULT 7 NOT NULL;--> statement-breakpoint
ALTER TABLE `organization` ADD `max_branches` integer;--> statement-breakpoint
ALTER TABLE `organization` ADD `max_staff` integer;--> statement-breakpoint
ALTER TABLE `organization` ADD `modules_off` text;--> statement-breakpoint
ALTER TABLE `organization` ADD `support_until` text;--> statement-breakpoint
ALTER TABLE `organization` ADD `delete_on` text;