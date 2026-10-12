CREATE TABLE `visit_charge` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`visit_id` integer NOT NULL,
	`description` text NOT NULL,
	`amount_paise` integer NOT NULL,
	`bill_id` integer,
	`created_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`visit_id`) REFERENCES `op_visit`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bill_id`) REFERENCES `op_bill`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_visit_charge_visit` ON `visit_charge` (`branch_id`,`visit_id`);--> statement-breakpoint
ALTER TABLE `clinic_setting` ADD `charge_presets` text;