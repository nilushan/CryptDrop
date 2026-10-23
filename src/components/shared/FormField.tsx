import type { ReactNode } from 'react';

interface Props {
  id: string;
  label: string;
  help?: ReactNode;
  error?: ReactNode;
  children: ReactNode;
}

/** The caller owns the input ID, described-by association, and validation. */
export default function FormField({ id, label, help, error, children }: Props) {
  return (
    <div className="form-field">
      <label className="form-field-label" htmlFor={id}>{label}</label>
      {children}
      {help && <p className="form-field-help" id={`${id}-help`}>{help}</p>}
      {error && <p className="form-field-error" id={`${id}-error`} role="alert">{error}</p>}
    </div>
  );
}
