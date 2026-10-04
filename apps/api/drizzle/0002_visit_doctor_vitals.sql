ALTER TABLE `op_visit` ADD `doctor_user_id` integer REFERENCES user(id);--> statement-breakpoint
ALTER TABLE `op_visit` ADD `bp_systolic` integer;--> statement-breakpoint
ALTER TABLE `op_visit` ADD `bp_diastolic` integer;--> statement-breakpoint
ALTER TABLE `op_visit` ADD `pulse` integer;--> statement-breakpoint
ALTER TABLE `op_visit` ADD `temperature_f` real;--> statement-breakpoint
ALTER TABLE `op_visit` ADD `spo2` integer;--> statement-breakpoint
ALTER TABLE `op_visit` ADD `weight_kg` real;--> statement-breakpoint
CREATE INDEX `ix_op_visit_doctor` ON `op_visit` (`branch_id`,`doctor_user_id`,`visit_date`);