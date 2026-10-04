CREATE TABLE `lab_result` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`order_id` integer NOT NULL,
	`parameter_id` integer NOT NULL,
	`value` text NOT NULL,
	`flag` text DEFAULT '' NOT NULL,
	`entered_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`order_id`) REFERENCES `lab_order`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`parameter_id`) REFERENCES `lab_test_parameter`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`entered_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_lab_result` ON `lab_result` (`order_id`,`parameter_id`);--> statement-breakpoint
CREATE TABLE `lab_test_parameter` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`test_id` integer NOT NULL,
	`name` text NOT NULL,
	`method` text DEFAULT '' NOT NULL,
	`unit` text DEFAULT '' NOT NULL,
	`ref_range` text DEFAULT '' NOT NULL,
	`value_type` text DEFAULT 'number' NOT NULL,
	`options` text,
	`no_flag` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`test_id`) REFERENCES `lab_test`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_lab_param_test` ON `lab_test_parameter` (`branch_id`,`test_id`);--> statement-breakpoint
ALTER TABLE `lab_order` ADD `completed_at` text;--> statement-breakpoint
ALTER TABLE `lab_order` ADD `completed_by` integer REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `lab_test` ADD `department` text DEFAULT 'OTHER TESTS' NOT NULL;--> statement-breakpoint
ALTER TABLE `lab_test` ADD `kind` text DEFAULT 'panel' NOT NULL;--> statement-breakpoint
ALTER TABLE `lab_test` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `branch` ADD `print_header` text;