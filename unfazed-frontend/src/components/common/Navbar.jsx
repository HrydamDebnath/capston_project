import { Link } from 'react-router-dom';
import Logo from './Logo.jsx';
import { useAuth } from '../../context/AuthContext.jsx';

export default function Navbar() {
  const { therapist } = useAuth();
  return (
    <header className="border-b border-line bg-white/80 backdrop-blur">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-5">
        <Logo />
        <nav className="flex items-center gap-2">
          {therapist ? (
            <Link to="/dashboard" className="btn btn-primary btn-sm">Open dashboard</Link>
          ) : (
            <>
              <Link to="/login" className="btn btn-outline btn-sm">Sign in</Link>
              <Link to="/register" className="btn btn-primary btn-sm">Create your link</Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}
