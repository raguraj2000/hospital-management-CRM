CREATE TABLE `bill_payment` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`bill_id` integer NOT NULL,
	`amount_paise` integer NOT NULL,
	`mode` text NOT NULL,
	`received_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bill_id`) REFERENCES `op_bill`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`received_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_bill_payment_bill` ON `bill_payment` (`bill_id`);--> statement-breakpoint
CREATE INDEX `ix_bill_payment_day` ON `bill_payment` (`branch_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `clinic_setting` (
	`branch_id` integer PRIMARY KEY NOT NULL,
	`consultation_fee_paise` integer DEFAULT 0 NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `lab_release` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`visit_id` integer NOT NULL,
	`reason` text NOT NULL,
	`released_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`visit_id`) REFERENCES `op_visit`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`released_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_lab_release_visit` ON `lab_release` (`branch_id`,`visit_id`);--> statement-breakpoint
CREATE TABLE `op_bill` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`bill_no` text NOT NULL,
	`visit_id` integer NOT NULL,
	`patient_id` integer NOT NULL,
	`consultation_fee_paise` integer DEFAULT 0 NOT NULL,
	`other_charges_paise` integer DEFAULT 0 NOT NULL,
	`other_charges_label` text,
	`discount_paise` integer DEFAULT 0 NOT NULL,
	`total_paise` integer DEFAULT 0 NOT NULL,
	`created_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`visit_id`) REFERENCES `op_visit`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`patient_id`) REFERENCES `patient`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_op_bill_no` ON `op_bill` (`branch_id`,`bill_no`);--> statement-breakpoint
CREATE INDEX `ix_op_bill_visit` ON `op_bill` (`branch_id`,`visit_id`);--> statement-breakpoint
CREATE TABLE `op_bill_line` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`bill_id` integer NOT NULL,
	`lab_order_id` integer,
	`description` text NOT NULL,
	`amount_paise` integer NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bill_id`) REFERENCES `op_bill`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`lab_order_id`) REFERENCES `lab_order`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_bill_line_bill` ON `op_bill_line` (`bill_id`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_bill_line_lab` ON `op_bill_line` (`lab_order_id`);--> statement-breakpoint
CREATE TABLE `purchase_bill` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`vendor_id` integer NOT NULL,
	`vendor_bill_no` text,
	`bill_date` text NOT NULL,
	`due_date` text NOT NULL,
	`total_paise` integer NOT NULL,
	`notes` text,
	`created_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`cancelled_at` text,
	`cancelled_by` integer,
	`cancel_reason` text,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendor`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`cancelled_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_purchase_bill_vendor` ON `purchase_bill` (`branch_id`,`vendor_id`,`bill_date`);--> statement-breakpoint
CREATE TABLE `purchase_line` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`bill_id` integer NOT NULL,
	`medicine_id` integer NOT NULL,
	`batch_id` integer NOT NULL,
	`quantity` integer NOT NULL,
	`unit_cost_paise` integer NOT NULL,
	`amount_paise` integer NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bill_id`) REFERENCES `purchase_bill`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`medicine_id`) REFERENCES `medicine`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batch_id`) REFERENCES `medicine_batch`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_purchase_line_bill` ON `purchase_line` (`bill_id`);--> statement-breakpoint
CREATE TABLE `vendor` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`address` text,
	`gst_no` text,
	`credit_days` integer DEFAULT 0 NOT NULL,
	`notes` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_vendor_name` ON `vendor` (`branch_id`,`name`);--> statement-breakpoint
CREATE TABLE `vendor_payment` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`bill_id` integer NOT NULL,
	`amount_paise` integer NOT NULL,
	`mode` text NOT NULL,
	`reference` text,
	`paid_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bill_id`) REFERENCES `purchase_bill`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`paid_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_vendor_payment_bill` ON `vendor_payment` (`bill_id`);