import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { Button, Card, cn } from '@platform/ui';
import { ApiError } from '@/core/api/client';
import type { DynamicFormConfig } from '../config-validation/schemas';
import { FormSection } from './FormSection';

interface DynamicFormProps {
  config: DynamicFormConfig;
  onSubmit: (data: Record<string, any>) => Promise<void> | void;
  onCancel?: () => void;
  defaultValues?: Record<string, any>;
  apiError?: ApiError | null;
  loading?: boolean;
  className?: string;
}

export function DynamicForm({
  config,
  onSubmit,
  onCancel,
  defaultValues,
  apiError,
  loading = false,
  className,
}: DynamicFormProps) {
  // Extract initial default values from config field definitions if not explicitly provided
  const initialValues: Record<string, any> = { ...defaultValues };
  if (!defaultValues) {
    config.sections.forEach((sec) => {
      sec.fields.forEach((f) => {
        if (f.defaultValue !== undefined) {
          initialValues[f.name] = f.defaultValue;
        }
      });
    });
  }

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
    control,
    reset,
  } = useForm({
    defaultValues: initialValues,
  });

  // Re-initialize when defaultValues change
  useEffect(() => {
    if (defaultValues) {
      reset(defaultValues);
    }
  }, [defaultValues, reset]);

  // Synchronize backend API validation field errors into React Hook Form
  useEffect(() => {
    if (apiError && apiError.fields) {
      Object.entries(apiError.fields).forEach(([field, msgs]) => {
        const msg = Array.isArray(msgs) ? msgs[0] : String(msgs);
        setError(field as any, {
          type: 'server',
          message: msg,
        });
      });
    }
  }, [apiError, setError]);

  const isBusy = loading || isSubmitting;

  return (
    <Card className={cn('p-5 space-y-6', className)}>
      {(config.title || config.description) && (
        <div className="border-b border-border pb-3">
          {config.title && <h2 className="text-base font-semibold text-ink">{config.title}</h2>}
          {config.description && <p className="text-xs text-muted mt-0.5">{config.description}</p>}
        </div>
      )}

      {apiError && !apiError.fields && (
        <div className="rounded-md border border-critical/30 bg-critical-soft p-3 text-xs text-critical">
          {apiError.message}
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        {config.sections.map((section) => (
          <FormSection
            key={section.id}
            section={section}
            register={register}
            errors={errors}
            control={control}
            disabled={isBusy}
          />
        ))}

        <div className="flex items-center justify-end gap-3 border-t border-border pt-4">
          {config.actions.map((act) => {
            if (act.kind === 'submit') {
              return (
                <Button
                  key={act.id}
                  type="submit"
                  disabled={isBusy}
                  className={cn(
                    act.variant === 'primary' && 'bg-primary text-primary-foreground hover:bg-primary/90',
                    act.variant === 'destructive' && 'bg-critical text-white hover:bg-critical/90',
                  )}
                >
                  {isBusy ? 'Saving...' : act.label}
                </Button>
              );
            }

            if (act.kind === 'cancel' || act.kind === 'button') {
              return (
                <Button
                  key={act.id}
                  type="button"
                  variant="outline"
                  disabled={isBusy}
                  onClick={onCancel}
                >
                  {act.label}
                </Button>
              );
            }

            if (act.kind === 'reset') {
              return (
                <Button
                  key={act.id}
                  type="button"
                  variant="ghost"
                  disabled={isBusy}
                  onClick={() => reset()}
                >
                  {act.label}
                </Button>
              );
            }

            return null;
          })}
        </div>
      </form>
    </Card>
  );
}

