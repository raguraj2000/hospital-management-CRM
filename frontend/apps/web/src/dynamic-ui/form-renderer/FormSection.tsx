import type { FormSection as FormSectionType } from '../config-validation/schemas';
import type { UseFormRegister, FieldErrors, Control } from 'react-hook-form';
import { getFieldRenderer } from '../field-registry';
import { FormFieldWrapper } from './FormFieldWrapper';

interface FormSectionProps {
  section: FormSectionType;
  register: UseFormRegister<any>;
  errors: FieldErrors<any>;
  control: Control<any>;
  disabled?: boolean;
}

export function FormSection({ section, register, errors, disabled }: FormSectionProps) {
  return (
    <div className="space-y-3">
      {(section.title || section.description) && (
        <div className="border-b border-border pb-2">
          {section.title && <h3 className="text-sm font-semibold text-ink">{section.title}</h3>}
          {section.description && <p className="text-xs text-muted mt-0.5">{section.description}</p>}
        </div>
      )}

      <div className="grid grid-cols-12 gap-4">
        {section.fields.map((field) => {
          const Renderer = getFieldRenderer(field.type);
          const errorMsg = errors[field.name]?.message as string | undefined;

          return (
            <FormFieldWrapper key={field.name} config={field} error={errorMsg}>
              <Renderer
                config={field}
                registration={register(field.name, {
                  required: field.validation?.required ? `${field.label} is required` : false,
                  min: field.validation?.min !== undefined ? { value: field.validation.min, message: `Minimum value is ${field.validation.min}` } : undefined,
                  max: field.validation?.max !== undefined ? { value: field.validation.max, message: `Maximum value is ${field.validation.max}` } : undefined,
                  minLength: field.validation?.minLength !== undefined ? { value: field.validation.minLength, message: `Minimum ${field.validation.minLength} characters` } : undefined,
                  maxLength: field.validation?.maxLength !== undefined ? { value: field.validation.maxLength, message: `Maximum ${field.validation.maxLength} characters` } : undefined,
                })}
                error={errorMsg}
                disabled={disabled}
              />
            </FormFieldWrapper>
          );
        })}
      </div>
    </div>
  );
}

