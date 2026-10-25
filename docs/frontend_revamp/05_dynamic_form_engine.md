# 05 — Dynamic Form and Page Rendering Engine

> Architecture and specifications for the configuration-driven UI rendering engine.

---

## 1. Objective and Core Principles

The HMS requires consistent, maintainable, and schema-driven data entry and display across workflows (e.g. Patient details, Lab test parameter configurations, Clinical charges, Inventory batch management, Settings).

### Principles:
1. **Zero Dynamic Code Execution:** Absolutely no `eval()`, `new Function()`, or execution of backend-supplied scripts.
2. **Strict Sanitization & Component Registry:** Fields and components render solely from a hardcoded, statically verified client-side registry.
3. **Controlled API Resources:** Any asynchronous lookups (`async_select`, search pickers) must specify a whitelisted resource key mapped to verified API client functions.
4. **Resilient Validation:** Client-side Zod validation provides immediate UI feedback while the server remains the authoritative validator. Field errors from HTTP 400 responses map automatically to form fields.

---

## 2. Configuration Schema (Zod Validated)

All configurations delivered to the dynamic engine must adhere to this schema:

```ts
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
  dependsOn: z.object({
    field: z.string(),
    equals: z.any().optional(),
    notEquals: z.any().optional(),
    hasValue: z.boolean().optional(),
  }).optional(),
});

export const formSectionSchema = z.object({
  id: z.string(),
  title: z.string().optional(),
  description: z.string().optional(),
  fields: z.array(fieldConfigSchema),
});

export const formActionSchema = z.object({
  id: z.string(),
  label: z.string(),
  kind: z.enum(['submit', 'reset', 'cancel', 'button']),
  variant: z.enum(['primary', 'secondary', 'destructive', 'ghost']).default('secondary'),
  permission: z.string().optional(),
});

export const dynamicFormConfigSchema = z.object({
  id: z.string(),
  version: z.number().int().positive(),
  title: z.string().optional(),
  description: z.string().optional(),
  sections: z.array(formSectionSchema),
  actions: z.array(formActionSchema).default([
    { id: 'submit', label: 'Save', kind: 'submit', variant: 'primary' },
    { id: 'cancel', label: 'Cancel', kind: 'cancel', variant: 'secondary' },
  ]),
});

export type DynamicFormConfig = z.infer<typeof dynamicFormConfigSchema>;
export type FieldConfig = z.infer<typeof fieldConfigSchema>;
```

---

## 3. Field Registry & Component Mapping

```text
apps/web/src/dynamic-ui/
├── field-registry/
│   ├── index.ts            — Maps fieldType to React Component
│   ├── TextInput.tsx
│   ├── NumberInput.tsx
│   ├── SelectInput.tsx
│   ├── AsyncSelectInput.tsx
│   ├── DateInput.tsx
│   ├── CheckboxInput.tsx
│   └── CurrencyInput.tsx
├── form-renderer/
│   ├── DynamicForm.tsx     — Main form container with React Hook Form
│   ├── FormSection.tsx     — Section & grid layout
│   └── FormFieldWrapper.tsx— Label, errors, tooltips, responsive grid
├── filter-renderer/
│   └── DynamicFilterBar.tsx— Reusable query parameter filter row
├── table-renderer/
│   └── DynamicTable.tsx    — Config-driven data table with pagination
└── config-validation/
    └── schemas.ts          — Zod validation rules
```

---

## 4. Dependent & Dynamic Dropdowns

When `dependsOn` is specified on a field:
1. The form engine subscribes to changes on the parent field using React Hook Form's `watch()`.
2. If visibility conditions are unmet, the field is hidden and its value is cleared or omitted from submission.
3. If an `async_select` field depends on a parent (e.g. doctor list filtered by department, or batches filtered by selected medicine), changing the parent clears the child selection and retriggers the query with parent context.
4. Requests use AbortController / TanStack Query query keys so stale responses from previous selections are discarded automatically.

