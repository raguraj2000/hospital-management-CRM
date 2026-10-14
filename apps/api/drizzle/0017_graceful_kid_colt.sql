ALTER TABLE `clinic_setting` ADD `nav_counts` integer DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE `patient` ADD `deactivated_at` text;--> statement-breakpoint
ALTER TABLE `patient` ADD `deactivated_reason` text;--> statement-breakpoint
ALTER TABLE `patient` ADD `deactivated_by` integer REFERENCES user(id);