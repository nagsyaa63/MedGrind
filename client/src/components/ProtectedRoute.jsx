import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from './LoadingSpinner';

export default function ProtectedRoute({ children }) {
  const { isAuthenticated, loading, isOnboarded, isAdmin } = useAuth();

  if (loading) return <LoadingSpinner />;
  if (!isAuthenticated) return <Navigate to="/" replace />;
  // Admins bypass onboarding — they don't need college/year details
  if (!isAdmin && !isOnboarded) return <Navigate to="/onboarding" replace />;
  return children;
}
