import { Link, Navigate, Route, Routes, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.jsx';
import Loader from '../components/common/Loader.jsx';
import TherapistLayout from '../components/common/TherapistLayout.jsx';
import Landing from '../pages/public/Landing.jsx';
import ProfilePage from '../pages/public/ProfilePage.jsx';
import Login from '../pages/auth/Login.jsx';
import Register from '../pages/auth/Register.jsx';
import Dashboard from '../pages/therapist/Dashboard.jsx';
import Clients from '../pages/therapist/Clients.jsx';
import ClientDetail from '../pages/therapist/ClientDetail.jsx';
import Schedule from '../pages/therapist/Schedule.jsx';
import Notes from '../pages/therapist/Notes.jsx';
import Analytics from '../pages/therapist/Analytics.jsx';
import Settings from '../pages/therapist/Settings.jsx';
import BookingPage from '../pages/client/BookingPage.jsx';
import ClientPortal from '../pages/client/ClientPortal.jsx';
import Payment from '../pages/client/Payment.jsx';

function RequireTherapist({ children }) {
  const { therapist, loading } = useAuth();
  const location = useLocation();
  if (loading) return <Loader fullPage label="Signing you in" />;
  if (!therapist) return <Navigate to="/login" replace state={{ from: location }} />;
  return children;
}

function GuestOnly({ children }) {
  const { therapist, loading } = useAuth();
  if (loading) return <Loader fullPage />;
  if (therapist) return <Navigate to="/dashboard" replace />;
  return children;
}

function NotFound() {
  return (
    <div className="flex min-h-screen flex-col items-center justify-center px-6 text-center">
      <h1 className="text-5xl font-bold">404</h1>
      <p className="mt-3 text-muted">This page does not exist.</p>
      <Link to="/" className="btn btn-primary mt-6">Back to home</Link>
    </div>
  );
}

export default function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Landing />} />
      <Route path="/login" element={<GuestOnly><Login /></GuestOnly>} />
      <Route path="/register" element={<GuestOnly><Register /></GuestOnly>} />

      <Route path="/dashboard" element={<RequireTherapist><TherapistLayout /></RequireTherapist>}>
        <Route index element={<Dashboard />} />
        <Route path="clients" element={<Clients />} />
        <Route path="clients/:id" element={<ClientDetail />} />
        <Route path="schedule" element={<Schedule />} />
        <Route path="notes" element={<Notes />} />
        <Route path="analytics" element={<Analytics />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      <Route path="/:slug" element={<ProfilePage />} />
      <Route path="/:slug/book" element={<BookingPage />} />
      <Route path="/:slug/pay" element={<Payment />} />
      <Route path="/:slug/portal" element={<ClientPortal />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
