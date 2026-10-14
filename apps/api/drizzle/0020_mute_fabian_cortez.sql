CREATE INDEX `ix_op_bill_patient` ON `op_bill` (`branch_id`,`patient_id`);--> statement-breakpoint
CREATE INDEX `ix_sale_visit` ON `pharmacy_sale` (`branch_id`,`visit_id`);