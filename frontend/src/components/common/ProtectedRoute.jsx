import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import { Spinner } from '@/components/ui/Feedback';

/**
 * Remembers the attempted URL in location.state so login can send the user
 * where they were actually going — the old guard always dropped them on the
 * dashboard.
 */
export function ProtectedRoute({ children }) {
  const { user, booting } = useAuth();
  const location = useLocation();

  if (booting) {
    return (
      <div className="flex min-h-dvh items-center justify-center bg-ground">
        <Spinner size={22} label="Restoring your session" />
      </div>
    );
  }

  if (!user) return <Navigate to="/login" replace state={{ from: location }} />;

  return children;
}

/** The mirror image: keeps a signed-in user out of the login/register screens. */
export function PublicOnlyRoute({ children }) {
  const { user, booting } = useAuth();
  if (booting) return null;
  return user ? <Navigate to="/" replace /> : children;
}
