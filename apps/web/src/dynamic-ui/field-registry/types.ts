import type { ComponentType } from 'react';
import type { UseFormRegisterReturn } from 'react-hook-form';
import type { FieldConfig } from '../config-validation/schemas';

export interface FieldComponentProps {
  config: FieldConfig;
  registration: UseFormRegisterReturn;
  value?: unknown;
  onChange?: (val: unknown) => void;
  error?: string;
  disabled?: boolean;
}

export type FieldRenderer = ComponentType<FieldComponentProps>;

