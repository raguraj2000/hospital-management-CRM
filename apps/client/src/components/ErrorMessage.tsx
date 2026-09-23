import type { CSSProperties } from 'react';

/** The red error box used across the app. Renders nothing when there's no error. */
export function ErrorMessage({
  error,
  className,
  style,
}: {
  error: string | null | undefined;
  className?: string;
  style?: CSSProperties;
}) {
  if (!error) return null;
  return (
    <p className={className ? `error-message ${className}` : 'error-message'} style={style}>
      {error}
    </p>
  );
}
