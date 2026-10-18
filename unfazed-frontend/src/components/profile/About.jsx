export default function About({ therapist }) {
  const paragraphs = therapist.bio ? therapist.bio.split(/\n{2,}/) : [];
  return (
    <div className="space-y-10">
      {paragraphs.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold">About</h2>
          <div className="mt-4 max-w-prose space-y-4 leading-relaxed text-ink/85">
            {paragraphs.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </section>
      )}

      {therapist.specializations.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold">What I work with</h2>
          <ul className="mt-4 flex flex-wrap gap-2">
            {therapist.specializations.map((item) => (
              <li key={item} className="rounded-xl border border-line bg-white px-4 py-2 text-sm font-semibold">{item}</li>
            ))}
          </ul>
        </section>
      )}

      {therapist.qualifications.length > 0 && (
        <section>
          <h2 className="text-2xl font-bold">Training and credentials</h2>
          <ul className="mt-4 space-y-2.5">
            {therapist.qualifications.map((item) => (
              <li key={item} className="flex gap-3 text-ink/85">
                <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-brand" />
                {item}
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  );
}
