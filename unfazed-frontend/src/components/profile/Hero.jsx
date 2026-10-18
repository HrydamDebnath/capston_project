import Avatar from '../common/Avatar.jsx';
import { pluralize } from '../../utils/format.js';

export default function Hero({ therapist, onBook }) {
  const facts = [
    therapist.city,
    therapist.yearsOfExperience ? `${pluralize(therapist.yearsOfExperience, 'year')} in practice` : '',
    therapist.languages.length ? therapist.languages.join(', ') : '',
  ].filter(Boolean);

  return (
    <section className="relative overflow-hidden bg-brand-soft">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-14 sm:py-20 md:grid-cols-[1fr_auto]">
        <div className="max-w-2xl">
          <h1 className="text-4xl font-bold sm:text-5xl">{therapist.name}</h1>
          {therapist.headline && <p className="mt-4 text-lg leading-relaxed text-ink/80">{therapist.headline}</p>}
          {facts.length > 0 && (
            <ul className="mt-6 flex flex-wrap gap-2">
              {facts.map((fact) => (
                <li key={fact} className="rounded-full bg-white px-3.5 py-1.5 text-sm font-medium text-ink/80">{fact}</li>
              ))}
            </ul>
          )}
          <button type="button" onClick={onBook} className="btn btn-primary btn-lg mt-8">Book a session</button>
        </div>
        <div className="hidden md:block">
          <Avatar name={therapist.name} src={therapist.photoUrl} size={220} className="!bg-white" />
        </div>
      </div>
    </section>
  );
}
