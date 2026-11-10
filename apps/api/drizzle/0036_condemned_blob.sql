ALTER TABLE `op_bill_line` ADD `sale_id` integer REFERENCES pharmacy_sale(id);--> statement-breakpoint
CREATE UNIQUE INDEX `ux_bill_line_sale` ON `op_bill_line` (`sale_id`);--> statement-breakpoint
ALTER TABLE `pharmacy_sale` ADD `bill_id` integer REFERENCES op_bill(id);