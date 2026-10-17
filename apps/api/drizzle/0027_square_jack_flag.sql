CREATE TABLE `prescription_note` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`visit_id` integer NOT NULL,
	`kind` text NOT NULL,
	`text` text NOT NULL,
	`after_item_id` integer,
	`created_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`visit_id`) REFERENCES `op_visit`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`after_item_id`) REFERENCES `prescription_item`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_rx_note_visit` ON `prescription_note` (`branch_id`,`visit_id`);