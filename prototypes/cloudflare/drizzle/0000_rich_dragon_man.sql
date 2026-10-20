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
CREATE TABLE `branch_doctor` (
	`branch_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	PRIMARY KEY(`branch_id`, `user_id`),
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `clinic_setting` (
	`branch_id` integer PRIMARY KEY NOT NULL,
	`consultation_fee_paise` integer DEFAULT 0 NOT NULL,
	`default_doctor_user_id` integer,
	`charge_presets` text,
	`fee_slots` text,
	`nav_counts` integer DEFAULT true NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`default_doctor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `course_item` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`sitting_id` integer NOT NULL,
	`kind` text NOT NULL,
	`medicine_id` integer,
	`test_id` integer,
	`description` text NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
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
	`note` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`course_id`) REFERENCES `treatment_course`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`visit_id`) REFERENCES `op_visit`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_sitting_course` ON `course_sitting` (`branch_id`,`course_id`);--> statement-breakpoint
CREATE INDEX `ix_sitting_due` ON `course_sitting` (`branch_id`,`due_at`);--> statement-breakpoint
CREATE TABLE `course_template` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`name` text NOT NULL,
	`sittings` text NOT NULL,
	`created_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_course_template` ON `course_template` (`branch_id`);--> statement-breakpoint
CREATE TABLE `expense` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`expense_date` text NOT NULL,
	`description` text NOT NULL,
	`vendor_id` integer,
	`vendor_name` text,
	`amount_paise` integer NOT NULL,
	`mode` text DEFAULT 'cash' NOT NULL,
	`notes` text,
	`created_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`vendor_id`) REFERENCES `vendor`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_expense_day` ON `expense` (`branch_id`,`expense_date`);--> statement-breakpoint
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
	`completed_at` text,
	`completed_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`visit_id`) REFERENCES `op_visit`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`patient_id`) REFERENCES `patient`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`test_id`) REFERENCES `lab_test`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`ordered_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`completed_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_lab_order_status` ON `lab_order` (`branch_id`,`status`);--> statement-breakpoint
CREATE INDEX `ix_lab_order_visit` ON `lab_order` (`branch_id`,`visit_id`);--> statement-breakpoint
CREATE TABLE `lab_package` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`name` text NOT NULL,
	`price_paise` integer NOT NULL,
	`test_ids` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_lab_package` ON `lab_package` (`branch_id`);--> statement-breakpoint
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
CREATE TABLE `lab_test` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`name` text NOT NULL,
	`price_paise` integer NOT NULL,
	`department` text DEFAULT 'OTHER TESTS' NOT NULL,
	`kind` text DEFAULT 'panel' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_lab_test_name` ON `lab_test` (`branch_id`,`name`);--> statement-breakpoint
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
	`optional` integer DEFAULT false NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`test_id`) REFERENCES `lab_test`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_lab_param_test` ON `lab_test_parameter` (`branch_id`,`test_id`);--> statement-breakpoint
CREATE TABLE `medicine` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`name` text NOT NULL,
	`form` text NOT NULL,
	`strength` text,
	`price_paise` integer NOT NULL,
	`reorder_level` integer DEFAULT 10 NOT NULL,
	`default_dose` text,
	`default_instructions` text,
	`default_days` integer,
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
CREATE INDEX `ix_op_bill_patient` ON `op_bill` (`branch_id`,`patient_id`);--> statement-breakpoint
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
CREATE TABLE `op_visit` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`patient_id` integer NOT NULL,
	`op_no` text NOT NULL,
	`visit_date` text NOT NULL,
	`status` text DEFAULT 'waiting' NOT NULL,
	`doctor_user_id` integer,
	`complaint` text,
	`referred_by` text,
	`notes` text,
	`pharmacy_note` text,
	`lab_note` text,
	`consultation_fee_paise` integer,
	`bp_systolic` integer,
	`bp_diastolic` integer,
	`pulse` integer,
	`temperature_f` real,
	`spo2` integer,
	`weight_kg` real,
	`height_cm` real,
	`created_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`patient_id`) REFERENCES `patient`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`doctor_user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_op_visit_no` ON `op_visit` (`branch_id`,`op_no`);--> statement-breakpoint
CREATE INDEX `ix_op_visit_doctor` ON `op_visit` (`branch_id`,`doctor_user_id`,`visit_date`);--> statement-breakpoint
CREATE INDEX `ix_op_visit_day` ON `op_visit` (`branch_id`,`visit_date`);--> statement-breakpoint
CREATE INDEX `ix_op_visit_patient` ON `op_visit` (`branch_id`,`patient_id`);--> statement-breakpoint
CREATE TABLE `patient` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`code` text NOT NULL,
	`name` text NOT NULL,
	`phone` text,
	`email` text,
	`gender` text,
	`dob` text,
	`age_years` integer,
	`blood_group` text,
	`weight_kg` real,
	`height_cm` real,
	`address` text,
	`conditions` text,
	`emergency_contact_name` text,
	`emergency_contact_phone` text,
	`created_by` integer,
	`deactivated_at` text,
	`deactivated_reason` text,
	`deactivated_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`deactivated_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_patient_code` ON `patient` (`branch_id`,`code`);--> statement-breakpoint
CREATE INDEX `ix_patient_name` ON `patient` (`branch_id`,`name`);--> statement-breakpoint
CREATE INDEX `ix_patient_phone` ON `patient` (`branch_id`,`phone`);--> statement-breakpoint
CREATE TABLE `pharmacy_sale` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`sale_no` text NOT NULL,
	`visit_id` integer,
	`patient_id` integer,
	`total_paise` integer NOT NULL,
	`round_off_paise` integer DEFAULT 0 NOT NULL,
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
CREATE INDEX `ix_sale_visit` ON `pharmacy_sale` (`branch_id`,`visit_id`);--> statement-breakpoint
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
	`given_here` integer DEFAULT false NOT NULL,
	`status` text DEFAULT 'pending' NOT NULL,
	`sort_order` integer DEFAULT 0 NOT NULL,
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
CREATE INDEX `ix_rx_status` ON `prescription_item` (`branch_id`,`status`);--> statement-breakpoint
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
CREATE INDEX `ix_rx_note_visit` ON `prescription_note` (`branch_id`,`visit_id`);--> statement-breakpoint
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
	`pack_size` integer DEFAULT 1 NOT NULL,
	`pack_qty` integer,
	`free_qty` integer DEFAULT 0 NOT NULL,
	`rate_paise` integer,
	`mrp_paise` integer,
	`gst_percent` real DEFAULT 0 NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bill_id`) REFERENCES `purchase_bill`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`medicine_id`) REFERENCES `medicine`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`batch_id`) REFERENCES `medicine_batch`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_purchase_line_bill` ON `purchase_line` (`bill_id`);--> statement-breakpoint
CREATE TABLE `treatment_bookmark` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`name` text NOT NULL,
	`created_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_bookmark_name` ON `treatment_bookmark` (`branch_id`,`name`);--> statement-breakpoint
CREATE TABLE `treatment_bookmark_line` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`bookmark_id` integer NOT NULL,
	`kind` text NOT NULL,
	`medicine_id` integer,
	`dose` text,
	`days` integer,
	`quantity` integer,
	`instructions` text,
	`given_here` integer DEFAULT false NOT NULL,
	`text` text,
	`sort_order` integer DEFAULT 0 NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`bookmark_id`) REFERENCES `treatment_bookmark`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`medicine_id`) REFERENCES `medicine`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_bookmark_line` ON `treatment_bookmark_line` (`branch_id`,`bookmark_id`);--> statement-breakpoint
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
	`start_day` text,
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
CREATE INDEX `ix_course_status` ON `treatment_course` (`branch_id`,`status`);--> statement-breakpoint
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
CREATE INDEX `ix_vendor_payment_bill` ON `vendor_payment` (`bill_id`);--> statement-breakpoint
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
CREATE TABLE `visit_instruction` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`visit_id` integer NOT NULL,
	`text` text NOT NULL,
	`bookmark_name` text,
	`done_at` text,
	`done_by` integer,
	`created_by` integer,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`deleted_at` text,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`visit_id`) REFERENCES `op_visit`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`done_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_visit_instruction` ON `visit_instruction` (`branch_id`,`visit_id`);--> statement-breakpoint
CREATE TABLE `audit_log` (
	`id` integer PRIMARY KEY NOT NULL,
	`organization_id` integer NOT NULL,
	`branch_id` integer,
	`user_id` integer,
	`action` text NOT NULL,
	`entity` text NOT NULL,
	`entity_id` text,
	`detail` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_audit_branch` ON `audit_log` (`branch_id`,`created_at`);--> statement-breakpoint
CREATE TABLE `branch` (
	`id` integer PRIMARY KEY NOT NULL,
	`organization_id` integer NOT NULL,
	`slug` text NOT NULL,
	`name` text NOT NULL,
	`code_prefix` text NOT NULL,
	`address` text,
	`phone` text,
	`print_header` text,
	`allowed_networks` text,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_branch_slug` ON `branch` (`organization_id`,`slug`);--> statement-breakpoint
CREATE TABLE `branch_counter` (
	`branch_id` integer NOT NULL,
	`name` text NOT NULL,
	`value` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`branch_id`, `name`),
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `branch_member` (
	`id` integer PRIMARY KEY NOT NULL,
	`branch_id` integer NOT NULL,
	`user_id` integer NOT NULL,
	`role_id` integer NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`role_id`) REFERENCES `role`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_branch_member` ON `branch_member` (`branch_id`,`user_id`);--> statement-breakpoint
CREATE TABLE `branch_role_permission` (
	`branch_id` integer NOT NULL,
	`role_id` integer NOT NULL,
	`permission` text NOT NULL,
	PRIMARY KEY(`branch_id`, `role_id`, `permission`),
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`role_id`) REFERENCES `role`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `org_counter` (
	`organization_id` integer NOT NULL,
	`name` text NOT NULL,
	`value` integer DEFAULT 0 NOT NULL,
	PRIMARY KEY(`organization_id`, `name`),
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `organization` (
	`id` integer PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`id_prefix` text DEFAULT '' NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`plan_name` text,
	`yearly_fee_paise` integer DEFAULT 0 NOT NULL,
	`paid_until` text,
	`grace_days` integer DEFAULT 7 NOT NULL,
	`max_branches` integer,
	`max_staff` integer,
	`modules_off` text,
	`support_until` text,
	`delete_on` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL
);
--> statement-breakpoint
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
CREATE TABLE `role` (
	`id` integer PRIMARY KEY NOT NULL,
	`organization_id` integer NOT NULL,
	`key` text NOT NULL,
	`name` text NOT NULL,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_role_key` ON `role` (`organization_id`,`key`);--> statement-breakpoint
CREATE TABLE `role_permission` (
	`role_id` integer NOT NULL,
	`permission` text NOT NULL,
	PRIMARY KEY(`role_id`, `permission`),
	FOREIGN KEY (`role_id`) REFERENCES `role`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE TABLE `session` (
	`id` text PRIMARY KEY NOT NULL,
	`user_id` integer NOT NULL,
	`expires_at` text NOT NULL,
	`revoked_at` text,
	`user_agent` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`user_id`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `ix_session_user` ON `session` (`user_id`);--> statement-breakpoint
CREATE TABLE `user` (
	`id` integer PRIMARY KEY NOT NULL,
	`organization_id` integer NOT NULL,
	`username` text NOT NULL,
	`mobile` text,
	`name` text NOT NULL,
	`password_hash` text NOT NULL,
	`is_owner` integer DEFAULT false NOT NULL,
	`is_platform_admin` integer DEFAULT false NOT NULL,
	`is_active` integer DEFAULT true NOT NULL,
	`failed_logins` integer DEFAULT 0 NOT NULL,
	`locked_until` text,
	`created_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	`updated_at` text DEFAULT (strftime('%Y-%m-%dT%H:%M:%fZ', 'now')) NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organization`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `ux_user_username` ON `user` (`username`);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_user_mobile` ON `user` (`mobile`);