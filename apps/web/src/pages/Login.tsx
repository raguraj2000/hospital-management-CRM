import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Navigate, useLocation, useNavigate } from 'react-router';
import { AlertCircle, HeartPulse, ShieldCheck, Building2, Users } from 'lucide-react';
import { loginSchema, type LoginInput } from '@platform/shared';
import { Button, Field, Input } from '@platform/ui';
import { errorMessage } from '@/api/client';
import { useLogin, useMe } from '@/state/auth';

const FEATURES = [
  { icon: Building2, text: 'Every branch keeps its own records' },
  { icon: ShieldCheck, text: 'Staff see only what their role allows' },
  { icon: Users, text: 'Works on the clinic network, even offline' },
];

export function Login() {
  const { data: me } = useMe();
  const login = useLogin();
  const navigate = useNavigate();
  const from = (useLocation().state as { from?: string } | null)?.from;
  const target = (slug?: string) => (from && from !== '/login' ? from : `/${slug ?? ''}`);
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({ resolver: zodResolver(loginSchema) });

  if (me) return <Navigate to={me.user.isPlatformAdmin ? '/platform' : target(me.branches[0]?.slug)} replace />;

  return (
    <div className="grid min-h-dvh lg:grid-cols-2">
      {/* Brand panel (desktop) */}
      <div className="relative hidden flex-col justify-between overflow-hidden bg-primary p-10 text-primary-foreground lg:flex">
        <div className="pointer-events-none absolute -top-24 -right-24 size-96 rounded-full bg-brand/30 blur-3xl" />
        <div className="relative flex items-center gap-2 text-lg font-semibold">
          <span className="flex size-9 items-center justify-center rounded-lg bg-primary-foreground text-primary">
            <HeartPulse className="size-5" />
          </span>
          HMS
        </div>
        <div className="relative">
          <h2 className="max-w-md text-3xl font-semibold tracking-tight">Patients, billing, lab and pharmacy — one place for every branch.</h2>
          <ul className="mt-8 space-y-3">
            {FEATURES.map((f) => (
              <li key={f.text} className="flex items-center gap-3 text-sm opacity-80">
                <f.icon className="size-4" /> {f.text}
              </li>
            ))}
          </ul>
        </div>
        <p className="relative text-xs opacity-50">Sessions end after 12 hours. Sign out on shared computers.</p>
      </div>

      {/* Form */}
      <div className="flex items-center justify-center p-6">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2 text-lg font-semibold lg:hidden">
            <span className="flex size-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <HeartPulse className="size-5" />
            </span>
            HMS
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">Welcome back</h1>
          <p className="mt-1 text-sm text-muted">Sign in with your mobile number and password.</p>

          <form
            noValidate
            className="mt-8 flex flex-col gap-5"
            onSubmit={handleSubmit((v) => login.mutate(v, { onSuccess: (m) => navigate(m.user.isPlatformAdmin ? '/platform' : target(m.branches[0]?.slug), { replace: true }) }))}
          >
            <Field required label="Mobile number" htmlFor="mobile" error={errors.mobile?.message}>
              <Input id="mobile" type="tel" inputMode="tel" autoComplete="username" autoFocus placeholder="98765 43210" aria-invalid={!!errors.mobile} {...register('mobile')} />
            </Field>
            <Field required label="Password" htmlFor="password" error={errors.password?.message}>
              <Input id="password" type="password" autoComplete="current-password" aria-invalid={!!errors.password} {...register('password')} />
            </Field>
            {login.error && (
              <div role="alert" className="flex items-start gap-2 rounded-lg border border-critical/20 bg-critical-soft px-3 py-2.5 text-sm text-critical">
                <AlertCircle className="mt-0.5 size-4 shrink-0" />
                {errorMessage(login.error)}
              </div>
            )}
            <Button type="submit" size="lg" disabled={login.isPending} className="w-full">
              {login.isPending ? 'Signing in…' : 'Sign in'}
            </Button>
          </form>
        </div>
      </div>
    </div>
  );
}
