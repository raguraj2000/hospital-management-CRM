-- Plans are yearly: the fee kept on a hospital is per year (super admin panel, Plans & payments).
ALTER TABLE `organization` RENAME COLUMN `monthly_fee_paise` TO `yearly_fee_paise`;
