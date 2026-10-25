import type { FieldRenderer } from './types';
import type { DynamicFieldType } from '../config-validation/schemas';
import { TextInput } from './TextInput';
import { TextareaInput } from './TextareaInput';
import { NumberInput } from './NumberInput';
import { CurrencyInput } from './CurrencyInput';
import { SelectInput } from './SelectInput';
import { AsyncSelectInput } from './AsyncSelectInput';
import { DateInput } from './DateInput';
import { CheckboxInput } from './CheckboxInput';

/**
 * Hardcoded, statically verified registry of supported UI field types.
 * Any dynamic config specifying an unmapped type falls back safely to TextInput.
 */
export const FIELD_REGISTRY: Record<DynamicFieldType, FieldRenderer> = {
  text: TextInput,
  textarea: TextareaInput,
  number: NumberInput,
  currency: CurrencyInput,
  select: SelectInput,
  async_select: AsyncSelectInput,
  date: DateInput,
  time: TextInput,
  checkbox: CheckboxInput,
  radio: SelectInput,
};

export function getFieldRenderer(type: DynamicFieldType): FieldRenderer {
  return FIELD_REGISTRY[type] ?? TextInput;
}

export * from './types';

