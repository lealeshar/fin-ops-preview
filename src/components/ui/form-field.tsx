import type { ReactNode } from 'react';

interface FormFieldProps {
  label: string;
  error?: string | undefined;
  required?: boolean;
  children: ReactNode;
}

export function FormField({ label, error, required, children }: FormFieldProps) {
  return (
    <div className="form-field">
      <label className="form-label">
        {label}
        {required && <span style={{ color: '#dc2626', marginRight: 2 }}>*</span>}
      </label>
      {children}
      {error && <span className="form-error">{error}</span>}
    </div>
  );
}
