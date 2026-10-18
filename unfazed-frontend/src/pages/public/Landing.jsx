import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import Navbar from '../../components/common/Navbar.jsx';
import Logo from '../../components/common/Logo.jsx';
import Button from '../../components/common/Button.jsx';
import { Input, Textarea, Select } from '../../components/common/Field.jsx';
import api, { getErrorMessage } from '../../api/axiosInstance.js';
import { SPECIALIZATIONS, LANGUAGES } from '../../utils/constants.js';

const capabilities = [
  { title: 'A booking page that looks like yours', text: 'Share one link. Clients see your story, your session types and open times in their own timezone.' },
  { title: 'Paid before they arrive', text: 'Advance payment at booking through Razorpay, with GST-style invoices generated automatically.' },
  { title: 'Intake and consent done early', text: 'New clients complete a short intake form and consent before session one, with an auditable record.' },
  { title: 'Notes with a hard privacy line', text: 'Private notes never leave your dashboard. Shared notes appear in the client portal and nowhere else.' },
  { title: 'Chat that stays in one place', text: 'Message clients between sessions without handing out your personal number.' },
  { title: 'Numbers you can act on', text: 'Revenue, active clients and no-show rate, calculated from your own sessions and payments.' },
];

function SlotChip({ children, active }) {
  return (
    <span className={`rounded-lg px-3 py-1.5 text-xs font-semibold ${active ? 'bg-brand text-white' : 'bg-mist text-ink/80'}`}>{children}</span>
  );
}

function LinkPreview() {
  return (
    <div className="relative mx-auto w-full max-w-md">
      <div className="absolute -left-6 -top-6 h-32 w-32 rounded-[42%_58%_40%_60%/55%_45%_55%_45%] bg-calm-soft" aria-hidden="true" />
      <div className="relative rounded-3xl border border-line bg-white p-5 shadow-[0_30px_60px_-30px_rgba(27,34,54,0.35)]">
        <div className="flex items-center gap-2 rounded-xl bg-mist px-3 py-2 text-sm">
          <span className="h-2 w-2 rounded-full bg-calm" />
          <span className="font-semibold">unfazed.in/<span className="text-brand">dr-sharma</span></span>
        </div>
        <div className="mt-5 flex items-center gap-4">
          <span className="flex h-16 w-16 items-center justify-center bg-brand-soft text-xl font-bold text-brand-dark" style={{ borderRadius: '38% 62% 55% 45% / 45% 40% 60% 55%' }}>MS</span>
          <div>
            <p className="font-display text-xl font-bold">Dr. Meera Sharma</p>
            <p className="text-sm text-muted">Clinical psychologist, Chennai</p>
          </div>
        </div>
        <p className="mt-5 text-sm font-semibold">Open this week</p>
        <div className="mt-2 flex flex-wrap gap-2">
          <SlotChip>Tue 10:00 am</SlotChip>
          <SlotChip active>Wed 3:00 pm</SlotChip>
          <SlotChip>Thu 11:15 am</SlotChip>
          <SlotChip>Sat 10:00 am</SlotChip>
        </div>
        <div className="mt-5 flex items-center justify-between rounded-2xl bg-brand-soft px-4 py-3">
          <div>
            <p className="text-sm font-bold">Individual session</p>
            <p className="text-xs text-muted">60 minutes</p>
          </div>
          <p className="font-bold">₹1,500</p>
        </div>
      </div>
    </div>
  );
}

function EnquiryForm() {
  const [done, setDone] = useState(false);
  const [serverError, setServerError] = useState('');
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm();

  const onSubmit = async (values) => {
    setServerError('');
    try {
      await api.post('/therapists/leads/enquiry', values, { skipAuthRedirect: true });
      reset();
      setDone(true);
    } catch (error) {
      setServerError(getErrorMessage(error));
    }
  };

  if (done) {
    return (
      <div className="rounded-3xl bg-white p-8 text-ink">
        <h3 className="text-2xl font-bold">Thanks, we have your details</h3>
        <p className="mt-2 text-muted">A therapist who fits what you described will reach out by email soon.</p>
        <Button className="mt-6" variant="outline" onClick={() => setDone(false)}>Send another enquiry</Button>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 rounded-3xl bg-white p-6 text-ink sm:p-8" noValidate>
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Your name" error={errors.name && errors.name.message} {...register('name', { required: 'Tell us your name' })} />
        <Input label="Email" type="email" error={errors.email && errors.email.message} {...register('email', { required: 'Enter your email address', pattern: { value: /^\S+@\S+\.\S+$/, message: 'Enter a valid email address' } })} />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <Select label="What would you like support with?" {...register('preferredSpecialization')}>
          <option value="">Not sure yet</option>
          {SPECIALIZATIONS.map((item) => <option key={item}>{item}</option>)}
        </Select>
        <Select label="Preferred language" {...register('preferredLanguage')}>
          <option value="">Any language</option>
          {LANGUAGES.map((item) => <option key={item}>{item}</option>)}
        </Select>
      </div>
      <Input label="Phone (optional)" type="tel" {...register('phone')} />
      <Textarea label="Anything you would like the therapist to know" rows={3} {...register('concern', { maxLength: { value: 1000, message: 'Please keep this under 1000 characters' } })} error={errors.concern && errors.concern.message} />
      {serverError && <p className="rounded-xl bg-danger-soft px-4 py-3 text-sm font-medium text-danger" role="alert">{serverError}</p>}
      <Button type="submit" size="lg" loading={isSubmitting} className="w-full sm:w-auto">Find me a therapist</Button>
    </form>
  );
}

export default function Landing() {
  return (
    <div className="min-h-screen bg-white">
      <Navbar />

      <section className="mx-auto grid max-w-6xl items-center gap-14 px-5 py-16 sm:py-24 lg:grid-cols-[1.1fr_1fr]">
        <div>
          <h1 className="text-4xl font-bold leading-[1.08] sm:text-6xl">Your whole practice, behind one link.</h1>
          <p className="mt-6 max-w-xl text-lg leading-relaxed text-muted">
            Unfazed is built for therapists in India who want to stop juggling WhatsApp, spreadsheets and payment links. Share your page and let bookings, payments, intake and notes follow.
          </p>
          <div className="mt-9 flex flex-wrap gap-3">
            <Link to="/register" className="btn btn-primary btn-lg">Create your link</Link>
            <a href="#find-a-therapist" className="btn btn-outline btn-lg">I am looking for a therapist</a>
          </div>
        </div>
        <LinkPreview />
      </section>

      <section className="border-y border-line bg-mist">
        <div className="mx-auto max-w-6xl px-5 py-16 sm:py-20">
          <h2 className="max-w-xl text-3xl font-bold sm:text-4xl">Everything between “I need help” and “see you next week”</h2>
          <dl className="mt-12 grid gap-x-12 gap-y-9 md:grid-cols-2">
            {capabilities.map((item) => (
              <div key={item.title} className="border-t border-line pt-5">
                <dt className="text-lg font-bold">{item.title}</dt>
                <dd className="mt-2 leading-relaxed text-muted">{item.text}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section id="find-a-therapist" className="bg-night">
        <div className="mx-auto grid max-w-6xl gap-10 px-5 py-16 sm:py-20 lg:grid-cols-[1fr_1.2fr]">
          <div className="text-white">
            <h2 className="text-3xl font-bold sm:text-4xl">Looking for a therapist?</h2>
            <p className="mt-4 max-w-md leading-relaxed text-white/70">
              Tell us a little about what you need. We match your enquiry to one therapist who works with it, speaks your language and has room for new clients.
            </p>
          </div>
          <EnquiryForm />
        </div>
      </section>

      <footer className="border-t border-line py-8">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4 px-5 text-sm text-muted">
          <Logo />
          <p>Built for independent therapists in India.</p>
        </div>
      </footer>
    </div>
  );
}
