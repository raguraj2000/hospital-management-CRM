import { z } from 'zod';

export const fieldTypeSchema = z.enum([
  'text',
  'textarea',
  'number',
  'currency',
  'select',
  'async_select',
  'date',
  'time',
  'checkbox',
  'radio',
]);

export type DynamicFieldType = z.infer<typeof fieldTypeSchema>;

export const fieldValidationSchema = z.object({
  required: z.boolean().optional(),
  min: z.number().optional(),
  max: z.number().optional(),
  minLength: z.number().optional(),
  maxLength: z.number().optional(),
  pattern: z.string().optional(),
  customMessage: z.string().optional(),
});

export const fieldOptionSchema = z.object({
  label: z.string(),
  value: z.union([z.string(), z.number(), z.boolean()]),
  description: z.string().optional(),
  disabled: z.boolean().optional(),
});

export type FieldOption = z.infer<typeof fieldOptionSchema>;

export const dataSourceSchema = z.object({
  resource: z.enum([
    'patients.search',
    'medicines.search',
    'doctors.list',
    'lab_tests.list',
    'vendors.list',
  ]),
  labelKey: z.string().default('name'),
  valueKey: z.string().default('id'),
  queryParam: z.string().default('q'),
});

export type DataSourceConfig = z.infer<typeof dataSourceSchema>;

export const fieldConfigSchema = z.object({
  name: z.string(),
  label: z.string(),
  type: fieldTypeSchema,
  placeholder: z.string().optional(),
  helpText: z.string().optional(),
  defaultValue: z.any().optional(),
  disabled: z.boolean().optional(),
  readOnly: z.boolean().optional(),
  colSpan: z.number().min(1).max(12).default(12),
  validation: fieldValidationSchema.optional(),
  options: z.array(fieldOptionSchema).optional(),
  dataSource: dataSourceSchema.optional(),
  dependsOn: z
    .object({
      field: z.string(),
      equals: z.any().optional(),
      notEquals: z.any().optional(),
      hasValue: z.boolean().optional(),
    })
    .optional(),
});

export type FieldConfig = z.infer<typeof fieldConfigSchema>;

export const formSectionSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  fields: z.array(fieldConfigSchema),
});

export type FormSection = z.infer<typeof formSectionSchema>;

export const formActionSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.enum(['submit', 'reset', 'cancel', 'button']),
  variant: z.enum(['primary', 'secondary', 'destructive', 'ghost']).default('secondary'),
  permission: z.string().optional(),
});

export type FormAction = z.infer<typeof formActionSchema>;

export const dynamicFormConfigSchema = z.object({
  id: z.string(),
  version: z.number().int().positive().default(1),
  title: z.string().optional(),
  description: z.string().optional(),
  sections: z.array(formSectionSchema),
  actions: z.array(formActionSchema).default([
    { id: 'submit', label: 'Save', kind: 'submit', variant: 'primary' },
    { id: 'cancel', label: 'Cancel', kind: 'cancel', variant: 'secondary' },
  ]),
});

export type DynamicFormConfig = z.infer<typeof dynamicFormConfigSchema>;

