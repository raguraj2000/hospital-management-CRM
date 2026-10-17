CREATE TABLE `branch_role_permission` (
	`branch_id` integer NOT NULL,
	`role_id` integer NOT NULL,
	`permission` text NOT NULL,
	PRIMARY KEY(`branch_id`, `role_id`, `permission`),
	FOREIGN KEY (`branch_id`) REFERENCES `branch`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`role_id`) REFERENCES `role`(`id`) ON UPDATE no action ON DELETE no action
);
