import { cva, type VariantProps } from 'class-variance-authority';
import type { ButtonHTMLAttributes } from 'react';
import { cn } from './utils.js';

export const buttonVariants = cva(
  'inline-flex shrink-0 items-center justify-center gap-2 whitespace-nowrap rounded-lg text-sm font-medium transition-colors disabled:pointer-events-none disabled:opacity-50 [&_svg]:size-4 [&_svg]:shrink-0',
  {
    variants: {
      variant: {
        default: 'bg-primary text-primary-foreground shadow-sm hover:bg-primary/90',
        brand: 'bg-brand text-brand-foreground shadow-sm hover:bg-brand/90',
        outline: 'border border-border bg-surface shadow-sm hover:bg-subtle',
        secondary: 'bg-subtle text-ink hover:bg-border/60',
        ghost: 'text-ink hover:bg-subtle',
        danger: 'bg-critical text-white shadow-sm hover:bg-critical/90',
        link: 'text-brand underline-offset-4 hover:underline',
      },
      size: { sm: 'h-8 px-3 text-xs', md: 'h-9 px-4', lg: 'h-10 px-5', icon: 'size-9', 'icon-sm': 'size-8' },
    },
    defaultVariants: { variant: 'default', size: 'md' },
  },
);

export type ButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & VariantProps<typeof buttonVariants>;

export function Button({ className, variant, size, type = 'button', ...props }: ButtonProps) {
  return <button type={type} className={cn(buttonVariants({ variant, size }), className)} {...props} />;
}
