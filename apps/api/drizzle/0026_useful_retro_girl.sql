ALTER TABLE `course_item` ADD `sort_order` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `course_sitting` ADD `note` text;--> statement-breakpoint
ALTER TABLE `treatment_course` ADD `start_day` text;