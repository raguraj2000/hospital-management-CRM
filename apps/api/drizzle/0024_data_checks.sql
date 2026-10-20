-- The database itself refuses impossible values (a last line of defence behind the app's own checks):
-- negative money or stock, zero quantities, unknown statuses. Existing rows are not changed; only new writes
-- are checked. Each rule is two triggers: on insert, and on update of that table.
CREATE TRIGGER IF NOT EXISTS chk_medicine_price_paise_insert BEFORE INSERT ON `medicine` FOR EACH ROW WHEN NEW.price_paise < 0 BEGIN SELECT RAISE(ABORT, 'A medicine price cannot be negative'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_medicine_price_paise_update BEFORE UPDATE ON `medicine` FOR EACH ROW WHEN NEW.price_paise < 0 BEGIN SELECT RAISE(ABORT, 'A medicine price cannot be negative'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_medicine_batch_quantity_insert BEFORE INSERT ON `medicine_batch` FOR EACH ROW WHEN NEW.quantity < 0 BEGIN SELECT RAISE(ABORT, 'Stock cannot go below zero'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_medicine_batch_quantity_update BEFORE UPDATE ON `medicine_batch` FOR EACH ROW WHEN NEW.quantity < 0 BEGIN SELECT RAISE(ABORT, 'Stock cannot go below zero'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_prescription_item_quantity_insert BEFORE INSERT ON `prescription_item` FOR EACH ROW WHEN NEW.quantity <= 0 BEGIN SELECT RAISE(ABORT, 'A prescribed quantity must be at least 1'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_prescription_item_quantity_update BEFORE UPDATE ON `prescription_item` FOR EACH ROW WHEN NEW.quantity <= 0 BEGIN SELECT RAISE(ABORT, 'A prescribed quantity must be at least 1'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_prescription_item_status_insert BEFORE INSERT ON `prescription_item` FOR EACH ROW WHEN NEW.status NOT IN ('pending','dispensed','declined') BEGIN SELECT RAISE(ABORT, 'Unknown prescription status'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_prescription_item_status_update BEFORE UPDATE ON `prescription_item` FOR EACH ROW WHEN NEW.status NOT IN ('pending','dispensed','declined') BEGIN SELECT RAISE(ABORT, 'Unknown prescription status'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_pharmacy_sale_total_paise_insert BEFORE INSERT ON `pharmacy_sale` FOR EACH ROW WHEN NEW.total_paise < 0 BEGIN SELECT RAISE(ABORT, 'A sale total cannot be negative'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_pharmacy_sale_total_paise_update BEFORE UPDATE ON `pharmacy_sale` FOR EACH ROW WHEN NEW.total_paise < 0 BEGIN SELECT RAISE(ABORT, 'A sale total cannot be negative'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_pharmacy_sale_line_quantity_insert BEFORE INSERT ON `pharmacy_sale_line` FOR EACH ROW WHEN NEW.quantity <= 0 OR NEW.unit_price_paise < 0 OR NEW.amount_paise < 0 BEGIN SELECT RAISE(ABORT, 'A sale line needs a quantity of at least 1 and no negative amount'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_pharmacy_sale_line_quantity_update BEFORE UPDATE ON `pharmacy_sale_line` FOR EACH ROW WHEN NEW.quantity <= 0 OR NEW.unit_price_paise < 0 OR NEW.amount_paise < 0 BEGIN SELECT RAISE(ABORT, 'A sale line needs a quantity of at least 1 and no negative amount'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_lab_test_price_paise_insert BEFORE INSERT ON `lab_test` FOR EACH ROW WHEN NEW.price_paise < 0 BEGIN SELECT RAISE(ABORT, 'A test price cannot be negative'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_lab_test_price_paise_update BEFORE UPDATE ON `lab_test` FOR EACH ROW WHEN NEW.price_paise < 0 BEGIN SELECT RAISE(ABORT, 'A test price cannot be negative'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_lab_order_price_paise_insert BEFORE INSERT ON `lab_order` FOR EACH ROW WHEN NEW.price_paise < 0 BEGIN SELECT RAISE(ABORT, 'A lab order price cannot be negative'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_lab_order_price_paise_update BEFORE UPDATE ON `lab_order` FOR EACH ROW WHEN NEW.price_paise < 0 BEGIN SELECT RAISE(ABORT, 'A lab order price cannot be negative'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_lab_order_status_insert BEFORE INSERT ON `lab_order` FOR EACH ROW WHEN NEW.status NOT IN ('ordered','sample_collected','completed','cancelled') BEGIN SELECT RAISE(ABORT, 'Unknown lab order status'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_lab_order_status_update BEFORE UPDATE ON `lab_order` FOR EACH ROW WHEN NEW.status NOT IN ('ordered','sample_collected','completed','cancelled') BEGIN SELECT RAISE(ABORT, 'Unknown lab order status'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_purchase_line_quantity_insert BEFORE INSERT ON `purchase_line` FOR EACH ROW WHEN NEW.quantity <= 0 OR NEW.amount_paise < 0 BEGIN SELECT RAISE(ABORT, 'A purchase line needs a quantity of at least 1 and no negative amount'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_purchase_line_quantity_update BEFORE UPDATE ON `purchase_line` FOR EACH ROW WHEN NEW.quantity <= 0 OR NEW.amount_paise < 0 BEGIN SELECT RAISE(ABORT, 'A purchase line needs a quantity of at least 1 and no negative amount'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_vendor_payment_amount_paise_insert BEFORE INSERT ON `vendor_payment` FOR EACH ROW WHEN NEW.amount_paise < 0 BEGIN SELECT RAISE(ABORT, 'A vendor payment cannot be negative'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_vendor_payment_amount_paise_update BEFORE UPDATE ON `vendor_payment` FOR EACH ROW WHEN NEW.amount_paise < 0 BEGIN SELECT RAISE(ABORT, 'A vendor payment cannot be negative'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_op_bill_total_paise_insert BEFORE INSERT ON `op_bill` FOR EACH ROW WHEN NEW.consultation_fee_paise < 0 OR NEW.discount_paise < 0 OR NEW.total_paise < 0 BEGIN SELECT RAISE(ABORT, 'A bill cannot have a negative fee, discount or total'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_op_bill_total_paise_update BEFORE UPDATE ON `op_bill` FOR EACH ROW WHEN NEW.consultation_fee_paise < 0 OR NEW.discount_paise < 0 OR NEW.total_paise < 0 BEGIN SELECT RAISE(ABORT, 'A bill cannot have a negative fee, discount or total'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_op_bill_line_amount_paise_insert BEFORE INSERT ON `op_bill_line` FOR EACH ROW WHEN NEW.amount_paise < 0 BEGIN SELECT RAISE(ABORT, 'A bill line cannot be negative'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_op_bill_line_amount_paise_update BEFORE UPDATE ON `op_bill_line` FOR EACH ROW WHEN NEW.amount_paise < 0 BEGIN SELECT RAISE(ABORT, 'A bill line cannot be negative'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_bill_payment_amount_paise_insert BEFORE INSERT ON `bill_payment` FOR EACH ROW WHEN NEW.amount_paise <= 0 BEGIN SELECT RAISE(ABORT, 'A payment must be more than zero'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_bill_payment_amount_paise_update BEFORE UPDATE ON `bill_payment` FOR EACH ROW WHEN NEW.amount_paise <= 0 BEGIN SELECT RAISE(ABORT, 'A payment must be more than zero'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_visit_charge_amount_paise_insert BEFORE INSERT ON `visit_charge` FOR EACH ROW WHEN NEW.amount_paise < 0 BEGIN SELECT RAISE(ABORT, 'A charge cannot be negative'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_visit_charge_amount_paise_update BEFORE UPDATE ON `visit_charge` FOR EACH ROW WHEN NEW.amount_paise < 0 BEGIN SELECT RAISE(ABORT, 'A charge cannot be negative'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_expense_amount_paise_insert BEFORE INSERT ON `expense` FOR EACH ROW WHEN NEW.amount_paise < 0 BEGIN SELECT RAISE(ABORT, 'An expense cannot be negative'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_expense_amount_paise_update BEFORE UPDATE ON `expense` FOR EACH ROW WHEN NEW.amount_paise < 0 BEGIN SELECT RAISE(ABORT, 'An expense cannot be negative'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_lab_package_price_paise_insert BEFORE INSERT ON `lab_package` FOR EACH ROW WHEN NEW.price_paise < 0 BEGIN SELECT RAISE(ABORT, 'A package price cannot be negative'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_lab_package_price_paise_update BEFORE UPDATE ON `lab_package` FOR EACH ROW WHEN NEW.price_paise < 0 BEGIN SELECT RAISE(ABORT, 'A package price cannot be negative'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_op_visit_status_insert BEFORE INSERT ON `op_visit` FOR EACH ROW WHEN NEW.status NOT IN ('waiting','with_doctor','at_lab','at_counter','completed','cancelled') BEGIN SELECT RAISE(ABORT, 'Unknown visit status'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_op_visit_status_update BEFORE UPDATE ON `op_visit` FOR EACH ROW WHEN NEW.status NOT IN ('waiting','with_doctor','at_lab','at_counter','completed','cancelled') BEGIN SELECT RAISE(ABORT, 'Unknown visit status'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_treatment_course_status_insert BEFORE INSERT ON `treatment_course` FOR EACH ROW WHEN NEW.status NOT IN ('active','frozen','closed') OR NEW.credit_paise < 0 BEGIN SELECT RAISE(ABORT, 'Unknown course status or negative credit'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_treatment_course_status_update BEFORE UPDATE ON `treatment_course` FOR EACH ROW WHEN NEW.status NOT IN ('active','frozen','closed') OR NEW.credit_paise < 0 BEGIN SELECT RAISE(ABORT, 'Unknown course status or negative credit'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_course_sitting_status_insert BEFORE INSERT ON `course_sitting` FOR EACH ROW WHEN NEW.status NOT IN ('planned','started','done','missed','cancelled') BEGIN SELECT RAISE(ABORT, 'Unknown sitting status'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_course_sitting_status_update BEFORE UPDATE ON `course_sitting` FOR EACH ROW WHEN NEW.status NOT IN ('planned','started','done','missed','cancelled') BEGIN SELECT RAISE(ABORT, 'Unknown sitting status'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_course_item_quantity_insert BEFORE INSERT ON `course_item` FOR EACH ROW WHEN NEW.quantity <= 0 OR NEW.price_paise < 0 BEGIN SELECT RAISE(ABORT, 'A course item needs a quantity of at least 1 and no negative price'); END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS chk_course_item_quantity_update BEFORE UPDATE ON `course_item` FOR EACH ROW WHEN NEW.quantity <= 0 OR NEW.price_paise < 0 BEGIN SELECT RAISE(ABORT, 'A course item needs a quantity of at least 1 and no negative price'); END;
