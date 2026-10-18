import { useState } from 'react';
import { useForm } from 'react-hook-form';
import api, { getErrorMessage } from '../../api/axiosInstance.js';
import Button from '../common/Button.jsx';
import { Input, Select, Textarea } from '../common/Field.jsx';

const consentCopy = [
  { key: 'treatment', title: 'Consent to treatment', text: 'I understand that therapy involves discussing personal matters and I agree to take part voluntarily.' },
  { key: 'privacy', title: 'Privacy and confidentiality', text: 'I understand how my information is stored and when confidentiality may need to be limited for safety.' },
  { key: 'telehealth', title: 'Online sessions', text: 'I agree to have sessions over video and understand the limits of remote care.' },
];

export default function IntakeForm({ onComplete }) {
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ defaultValues: { history: { previousTherapy: 'no' } } });

  const onSubmit = async (values) => {
    setServerError('');
    const payload = {
      demographics: { ...values.demographics, age: values.demographics.age ? Number(values.demographics.age) : undefined },
      presentingConcern: values.presentingConcern,
      goals: values.goals,
      history: { ...values.history, previousTherapy: values.history.previousTherapy === 'yes' },
      consents: values.consents,
    };
    try {
      await api.post('/portal/intake', payload, { actor: 'client' });
      onComplete();
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8" noValidate>
      <section>
        <h3 className="text-lg font-bold">About you</h3>
        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          <Input label="Age" type="number" min="0" max="120" error={errors.demographics && errors.demographics.age && errors.demographics.age.message} {...register('demographics.age', { required: 'Enter your age' })} />
          <Select label="Gender" {...register('demographics.gender')}>
            <option value="">Prefer not to say</option>
            <option>Female</option>
            <option>Male</option>
            <option>Non-binary</option>
            <option>Another identity</option>
          </Select>
          <Input label="Occupation" {...register('demographics.occupation')} />
          <Input label="City" {...register('demographics.city')} />
          <Input label="Emergency contact name" {...register('demographics.emergencyContactName', { required: 'Add an emergency contact' })} error={errors.demographics && errors.demographics.emergencyContactName && errors.demographics.emergencyContactName.message} />
          <Input label="Emergency contact phone" type="tel" {...register('demographics.emergencyContactPhone', { required: 'Add a phone number' })} error={errors.demographics && errors.demographics.emergencyContactPhone && errors.demographics.emergencyContactPhone.message} />
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-bold">What brings you here</h3>
        <Textarea label="What would you like help with?" rows={4} error={errors.presentingConcern && errors.presentingConcern.message} {...register('presentingConcern', { required: 'Describe what you would like help with', maxLength: { value: 3000, message: 'Please keep this under 3000 characters' } })} />
        <Textarea label="What would feel different if therapy worked?" rows={3} {...register('goals')} />
      </section>

      <section className="space-y-4">
        <h3 className="text-lg font-bold">Background</h3>
        <Select label="Have you been in therapy before?" {...register('history.previousTherapy')}>
          <option value="no">No</option>
          <option value="yes">Yes</option>
        </Select>
        <Input label="Current medications" hint="Leave blank if none" {...register('history.medications')} />
        <Input label="Medical conditions" hint="Anything your therapist should know about" {...register('history.medicalConditions')} />
        <Input label="Family history of mental health concerns" {...register('history.familyHistory')} />
      </section>

      <section>
        <h3 className="text-lg font-bold">Consent</h3>
        <div className="mt-4 space-y-3">
          {consentCopy.map((item) => (
            <label key={item.key} className="flex cursor-pointer gap-3 rounded-2xl border border-line p-4 has-[:checked]:border-brand has-[:checked]:bg-brand-soft/40">
              <input type="checkbox" className="mt-1 h-4 w-4 accent-brand" {...register(`consents.${item.key}`, { required: 'Please accept every consent statement to continue' })} />
              <span>
                <span className="block text-sm font-bold">{item.title}</span>
                <span className="mt-0.5 block text-sm text-muted">{item.text}</span>
              </span>
            </label>
          ))}
        </div>
        {errors.consents && <p className="mt-2 text-xs font-medium text-danger" role="alert">Please accept every consent statement to continue</p>}
        <p className="mt-3 text-xs text-muted">Your acceptance is saved with the date and time as an auditable record.</p>
      </section>

      {serverError && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger" role="alert">{serverError}</p>}
      <Button type="submit" size="lg" loading={isSubmitting}>Submit intake and consent</Button>
    </form>
  );
}
