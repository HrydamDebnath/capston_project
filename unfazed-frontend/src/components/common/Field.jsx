import { forwardRef } from 'react';

export function Field({ label, error, hint, htmlFor, children, className = '' }) {
  return (
    <div className={className}>
      {label && (
        <label htmlFor={htmlFor} className="mb-1.5 block text-sm font-semibold">
          {label}
        </label>
      )}
      {children}
      {hint && !error && <p className="mt-1.5 text-xs text-muted">{hint}</p>}
      {error && <p className="mt-1.5 text-xs font-medium text-danger" role="alert">{error}</p>}
    </div>
  );
}

export const Input = forwardRef(function Input({ label, error, hint, id, className = '', fieldClassName = '', ...props }, ref) {
  const inputId = id || props.name;
  return (
    <Field label={label} error={error} hint={hint} htmlFor={inputId} className={fieldClassName}>
      <input id={inputId} ref={ref} className={`input ${className}`} aria-invalid={Boolean(error)} {...props} />
    </Field>
  );
});

export const Textarea = forwardRef(function Textarea({ label, error, hint, id, className = '', fieldClassName = '', ...props }, ref) {
  const inputId = id || props.name;
  return (
    <Field label={label} error={error} hint={hint} htmlFor={inputId} className={fieldClassName}>
      <textarea id={inputId} ref={ref} className={`input ${className}`} aria-invalid={Boolean(error)} {...props} />
    </Field>
  );
});

export const Select = forwardRef(function Select({ label, error, hint, id, className = '', fieldClassName = '', children, ...props }, ref) {
  const inputId = id || props.name;
  return (
    <Field label={label} error={error} hint={hint} htmlFor={inputId} className={fieldClassName}>
      <select id={inputId} ref={ref} className={`input ${className}`} aria-invalid={Boolean(error)} {...props}>
        {children}
      </select>
    </Field>
  );
});
