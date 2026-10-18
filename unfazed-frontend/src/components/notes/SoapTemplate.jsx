import { Textarea } from '../common/Field.jsx';

export const NOTE_TEMPLATES = {
  soap: [
    { key: 'subjective', label: 'Subjective', hint: 'What the client reports in their own words' },
    { key: 'objective', label: 'Objective', hint: 'What you observed during the session' },
    { key: 'assessment', label: 'Assessment', hint: 'Your clinical impression' },
    { key: 'plan', label: 'Plan', hint: 'Next steps and homework' },
  ],
  dap: [
    { key: 'data', label: 'Data', hint: 'What happened in the session' },
    { key: 'assessment', label: 'Assessment', hint: 'Your clinical impression' },
    { key: 'plan', label: 'Plan', hint: 'Next steps and homework' },
  ],
};

export default function SoapTemplate({ format, values, onChange }) {
  const fields = NOTE_TEMPLATES[format] || [];
  return (
    <div className="space-y-4">
      {fields.map((field) => (
        <Textarea
          key={field.key}
          label={field.label}
          hint={field.hint}
          rows={3}
          value={values[field.key] || ''}
          onChange={(event) => onChange({ ...values, [field.key]: event.target.value })}
        />
      ))}
    </div>
  );
}
