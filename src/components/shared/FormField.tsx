import type { ReactNode } from 'react';

interface Props {
  id: string;
  label: string;
  help?: ReactNode;
  children: ReactNode;
}

/** The caller owns the input ID, described-by association, and validation. */
export default function FormField({ id, label, help, children }: Props) {
  return (
    <div className="form-field">
      <label className="form-field-label" htmlFor={id}>{label}</label>
      {children}
      {help && <p className="form-field-help" id={`${id}-help`}>{help}</p>}
    </div>
  );
}
