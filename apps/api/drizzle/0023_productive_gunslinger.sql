CREATE TABLE `course_item` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`sitting_id` integer NOT NULL,
	`kind` text NOT NULL,
	`medicine_id` integer,
	`test_id` integer,
	`description` text NOT NULL,
	`quantity` integer DEFAULT 1 NOT NULL,
	`price_paise` integer DEFAULT 0 NOT NULL,
	`prepaid` integer DEFAULT false NOT NULL,
	`given_at` text,
	`given_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`sitting_id`) REFERENCES `course_sitting`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`medicine_id`) REFERENCES `medicine`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`test_id`) REFERENCES `lab_test`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`given_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_course_item_sitting` ON `course_item` (`branch_id`,`sitting_id`);--> statement-breakpoint
CREATE TABLE `course_sitting` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`course_id` integer NOT NULL,
	`due_at` text NOT NULL,
	`kind` text NOT NULL,
	`review_fee_paise` integer,
	`status` text DEFAULT 'planned' NOT NULL,
	`visit_id` integer,
	`done_at` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `treatment_course`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`visit_id`) REFERENCES `op_visit`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_sitting_course` ON `course_sitting` (`branch_id`,`course_id`);--> statement-breakpoint
CREATE INDEX `ix_sitting_due` ON `course_sitting` (`branch_id`,`due_at`);--> statement-breakpoint
CREATE TABLE `treatment_course` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`patient_id` integer NOT NULL,
	`visit_id` integer NOT NULL,
	`name` text NOT NULL,
	`pay_mode` text DEFAULT 'per_sitting' NOT NULL,
	`status` text DEFAULT 'active' NOT NULL,
	`doctor_user_id` integer,
	`frozen_at` text,
	`closed_at` text,
	`closed_reason` text,
	`closed_by` integer,
	`credit_paise` integer DEFAULT 0 NOT NULL,
	`created_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`patient_id`) REFERENCES `patient`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`visit_id`) REFERENCES `op_visit`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`doctor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`closed_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_course_patient` ON `treatment_course` (`branch_id`,`patient_id`);--> statement-breakpoint
CREATE INDEX `ix_course_status` ON `treatment_course` (`branch_id`,`status`);