import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api, { getErrorMessage } from '../../api/axiosInstance.js';
import Hero from '../../components/profile/Hero.jsx';
import About from '../../components/profile/About.jsx';
import ServiceCard from '../../components/profile/ServiceCard.jsx';
import PackageCard from '../../components/profile/PackageCard.jsx';
import Loader from '../../components/common/Loader.jsx';
import EmptyState from '../../components/common/EmptyState.jsx';
import Logo from '../../components/common/Logo.jsx';
import setPageMeta from '../../utils/setPageMeta.js';
import { assetUrl } from '../../utils/format.js';

export default function ProfilePage() {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [state, setState] = useState({ loading: true, error: '', data: null });

  useEffect(() => {
    let active = true;
    setState({ loading: true, error: '', data: null });
    api
      .get(`/therapists/public/${slug}`, { skipAuthRedirect: true })
      .then(({ data }) => active && setState({ loading: false, error: '', data }))
      .catch((error) => active && setState({ loading: false, error: getErrorMessage(error), data: null }));
    return () => {
      active = false;
    };
  }, [slug]);

  useEffect(() => {
    if (!state.data) return;
    const { therapist } = state.data;
    setPageMeta({
      title: `${therapist.name} | Book a session`,
      description: therapist.headline || therapist.bio.slice(0, 160),
      image: therapist.photoUrl ? assetUrl(therapist.photoUrl) : '',
      url: window.location.href,
    });
  }, [state.data]);

  if (state.loading) return <Loader fullPage label="Loading profile" />;

  if (!state.data) {
    return (
      <div className="flex min-h-screen flex-col">
        <div className="mx-auto w-full max-w-6xl px-5 py-5"><Logo /></div>
        <div className="flex flex-1 items-center justify-center">
          <EmptyState title="We could not find this page" message={state.error} action={<Link to="/" className="btn btn-primary">Back to home</Link>} />
        </div>
      </div>
    );
  }

  const { therapist, packages } = state.data;
  const goToBooking = (service) => navigate(`/${slug}/book${service ? `?service=${service._id}` : ''}`);

  return (
    <div className="min-h-screen bg-mist">
      <div className="border-b border-line bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <Logo />
          <Link to={`/${slug}/portal`} className="text-sm font-semibold text-brand hover:underline">Client sign in</Link>
        </div>
      </div>

      <Hero therapist={therapist} onBook={() => goToBooking(therapist.services[0])} />

      <div className="mx-auto grid max-w-6xl gap-12 px-5 py-14 lg:grid-cols-[1fr_24rem]">
        <About therapist={therapist} />

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <div className="card p-5">
            <h2 className="text-xl font-bold">Sessions</h2>
            <p className="mt-1 text-sm text-muted">Pick a session type to see open times.</p>
            <div className="mt-4 space-y-3">
              {therapist.services.length ? (
                therapist.services.map((service) => <ServiceCard key={service._id} service={service} onSelect={goToBooking} />)
              ) : (
                <p className="text-sm text-muted">Sessions will appear here soon.</p>
              )}
            </div>

            {packages.length > 0 && (
              <>
                <h3 className="mt-7 text-base font-bold">Session packages</h3>
                <p className="mt-1 text-sm text-muted">Buy ahead from your client portal and book with credits.</p>
                <div className="mt-3 space-y-3">
                  {packages.map((pkg) => <PackageCard key={pkg._id} pkg={pkg} />)}
                </div>
              </>
            )}
          </div>
        </aside>
      </div>

      <footer className="border-t border-line bg-white py-6 text-center text-xs text-muted">
        Practice page powered by <Link to="/" className="font-semibold text-ink">Unfazed</Link>
      </footer>
    </div>
  );
}
