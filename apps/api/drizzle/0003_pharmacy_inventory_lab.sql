CREATE TABLE `lab_order` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`visit_id` integer NOT NULL,
	`patient_id` integer NOT NULL,
	`test_id` integer NOT NULL,
	`price_paise` integer NOT NULL,
	`status` text DEFAULT 'ordered' NOT NULL,
	`ordered_by` integer,
	`sample_collected_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`visit_id`) REFERENCES `op_visit`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`patient_id`) REFERENCES `patient`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`test_id`) REFERENCES `lab_test`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ordered_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_lab_order_status` ON `lab_order` (`branch_id`,`status`);--> statement-breakpoint
CREATE INDEX `ix_lab_order_visit` ON `lab_order` (`branch_id`,`visit_id`);--> statement-breakpoint
CREATE TABLE `lab_test` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`name` text NOT NULL,
	`price_paise` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_lab_test_name` ON `lab_test` (`branch_id`,`name`);--> statement-breakpoint
CREATE TABLE `medicine` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`name` text NOT NULL,
	`form` text NOT NULL,
	`strength` text,
	`price_paise` integer NOT NULL,
	`reorder_level` integer DEFAULT 10 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_medicine_name` ON `medicine` (`branch_id`,`name`);--> statement-breakpoint
CREATE TABLE `medicine_batch` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`medicine_id` integer NOT NULL,
	`batch_no` text NOT NULL,
	`expiry_date` text NOT NULL,
	`quantity` integer NOT NULL,
	`received_qty` integer NOT NULL,
	`created_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`medicine_id`) REFERENCES `medicine`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_batch_fefo` ON `medicine_batch` (`branch_id`,`medicine_id`,`expiry_date`);--> statement-breakpoint
CREATE TABLE `pharmacy_sale` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`sale_no` text NOT NULL,
	`visit_id` integer,
	`patient_id` integer,
	`total_paise` integer NOT NULL,
	`payment_mode` text NOT NULL,
	`created_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`visit_id`) REFERENCES `op_visit`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`patient_id`) REFERENCES `patient`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_sale_no` ON `pharmacy_sale` (`branch_id`,`sale_no`);--> statement-breakpoint
CREATE INDEX `ix_sale_day` ON `pharmacy_sale` (`branch_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `pharmacy_sale_line` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`sale_id` integer NOT NULL,
	`prescription_item_id` integer,
	`medicine_id` integer NOT NULL,
	`batch_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`unit_price_paise` integer NOT NULL,
	`amount_paise` integer NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sale_id`) REFERENCES `pharmacy_sale`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`prescription_item_id`) REFERENCES `prescription_item`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`medicine_id`) REFERENCES `medicine`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batch_id`) REFERENCES `medicine_batch`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_sale_line_sale` ON `pharmacy_sale_line` (`sale_id`);--> statement-breakpoint
CREATE TABLE `prescription_item` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`visit_id` integer NOT NULL,
	`medicine_id` integer NOT NULL,
	`dose` text NOT NULL,
	`days` integer NOT NULL,
	`quantity` integer NOT NULL,
	`instructions` text,
	`status` text DEFAULT 'pending' NOT NULL,
	`created_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`visit_id`) REFERENCES `op_visit`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`medicine_id`) REFERENCES `medicine`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_rx_visit` ON `prescription_item` (`branch_id`,`visit_id`);--> statement-breakpoint
CREATE INDEX `ix_rx_status` ON `prescription_item` (`branch_id`,`status`);