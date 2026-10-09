import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { changePasswordSchema } from '@platform/shared';
import { Button, Dialog, Field, Input, toast } from '@platform/ui';
import { api, ApiError, errorMessage } from '@/api/client';

type Values = { currentPassword: string; newPassword: string };

/** Change my own password. Other devices are signed out; this one stays. */
export function ChangePasswordDialog({ open, onOpenChange }: { open: boolean; onOpenChange: (o: boolean) => void }) {
  const {
    register,
    handleSubmit,
    setError,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<Values>({ resolver: zodResolver(changePasswordSchema) });

  const close = (o: boolean) => {
    if (!o) reset();
    onOpenChange(o);
  };

  return (
    <Dialog open={open} onOpenChange={close} title="Change password" description="You stay signed in here; other devices are signed out.">
      <form
        noValidate
        className="flex flex-col gap-4"
        onSubmit={handleSubmit(async (v) => {
          try {
            await api.post('/auth/password', v);
            toast.success('Password changed');
            close(false);
          } catch (e) {
            if (e instanceof ApiError && e.fields) for (const [f, m] of Object.entries(e.fields)) setError(f as keyof Values, { message: m[0] });
            else setError('root', { message: errorMessage(e) });
          }
        })}
      >
        <Field required label="Current password" htmlFor="current-password" error={errors.currentPassword?.message}>
          <Input id="current-password" type="password" autoComplete="current-password" autoFocus {...register('currentPassword')} />
        </Field>
        <Field required label="New password" htmlFor="new-password" error={errors.newPassword?.message} hint="At least 8 characters">
          <Input id="new-password" type="password" autoComplete="new-password" {...register('newPassword')} />
        </Field>
        {errors.root && <p className="text-sm text-critical">{errors.root.message}</p>}
        <div className="flex flex-col-reverse gap-2 pt-2 sm:flex-row sm:justify-end">
          <Button variant="outline" onClick={() => close(false)}>
            Cancel
          </Button>
          <Button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Change password'}
          </Button>
        </div>
      </form>
    </Dialog>
  );
}
