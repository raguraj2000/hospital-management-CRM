CREATE TABLE `treatment_dose` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`prescription_item_id` integer NOT NULL,
	`visit_id` integer NOT NULL,
	`patient_id` integer NOT NULL,
	`due_date` text NOT NULL,
	`slot_no` integer NOT NULL,
	`slot` text NOT NULL,
	`amount` text,
	`given_at` text,
	`given_by` integer,
	`note` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`prescription_item_id`) REFERENCES `prescription_item`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`visit_id`) REFERENCES `op_visit`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`patient_id`) REFERENCES `patient`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`given_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_treatment_dose` ON `treatment_dose` (`prescription_item_id`,`due_date`,`slot_no`);--> statement-breakpoint
CREATE INDEX `ix_treatment_dose_day` ON `treatment_dose` (`branch_id`,`due_date`);--> statement-breakpoint
ALTER TABLE `prescription_item` ADD `given_here` integer DEFAULT false NOT NULL;--> statement-breakpoint
ALTER TABLE `purchase_line` ADD `pack_size` integer DEFAULT 1 NOT NULL;--> statement-breakpoint
ALTER TABLE `purchase_line` ADD `pack_qty` integer;--> statement-breakpoint
ALTER TABLE `purchase_line` ADD `free_qty` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `purchase_line` ADD `rate_paise` integer;--> statement-breakpoint
ALTER TABLE `purchase_line` ADD `mrp_paise` integer;--> statement-breakpoint
ALTER TABLE `purchase_line` ADD `gst_percent` real DEFAULT 0 NOT NULL;