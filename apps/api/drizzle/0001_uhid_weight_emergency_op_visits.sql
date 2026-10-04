CREATE TABLE `op_visit` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`patient_id` integer NOT NULL,
	`op_no` text NOT NULL,
	`visit_date` text NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`complaint` text,
	`notes` text,
	`created_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`patient_id`) REFERENCES `patient`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_op_visit_no` ON `op_visit` (`branch_id`,`op_no`);--> statement-breakpoint
CREATE INDEX `ix_op_visit_day` ON `op_visit` (`branch_id`,`visit_date`);--> statement-breakpoint
CREATE INDEX `ix_op_visit_patient` ON `op_visit` (`branch_id`,`patient_id`);--> statement-breakpoint
CREATE TABLE `org_counter` (
	`organization_id` integer NOT NULL,
	`name` text NOT NULL,
	`value` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`organization_id`, `name`),
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
ALTER TABLE `patient` ADD `weight_kg` real;--> statement-breakpoint
ALTER TABLE `patient` ADD `emergency_contact_name` text;--> statement-breakpoint
ALTER TABLE `patient` ADD `emergency_contact_phone` text;--> statement-breakpoint
ALTER TABLE `organization` ADD `id_prefix` text DEFAULT '' NOT NULL;