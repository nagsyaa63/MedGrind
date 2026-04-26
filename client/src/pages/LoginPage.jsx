import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { signInWithGoogle, isAuthenticated, isOnboarded, loading: authLoading } = useAuth();
  const navigate = useNavigate();

  // Already authenticated — redirect immediately (handles page refresh while logged in)
  if (!authLoading && isAuthenticated) {
    return <Navigate to={isOnboarded ? '/questions' : '/onboarding'} replace />;
  }

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    try {
      // signInWithGoogle returns the user object so we can read isOnboarded immediately
      const signedInUser = await signInWithGoogle();
      const destination = signedInUser?.isOnboarded ? '/questions' : '/onboarding';
      navigate(destination, { replace: true });
    } catch (err) {
      // popup-closed-by-user is silently ignored inside signInWithGoogle
      setError(err.response?.data?.error || 'Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center text-indigo-600 mb-2">MedGrind</h1>
        <p className="text-center text-gray-500 mb-8">Sign in to your account</p>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded-md p-3 mb-6">
            {error}
          </div>
        )}

        <button
          type="button"
          onClick={handleGoogleSignIn}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 border border-gray-300 bg-white text-gray-700 py-2.5 rounded-md text-sm font-medium hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {/* Google "G" icon */}
          <svg
            aria-hidden="true"
            width="18"
            height="18"
            viewBox="0 0 18 18"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z"
              fill="#4285F4"
            />
            <path
              d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z"
              fill="#34A853"
            />
            <path
              d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z"
              fill="#FBBC05"
            />
            <path
              d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z"
              fill="#EA4335"
            />
          </svg>
          {loading ? 'Signing in...' : 'Sign in with Google'}
        </button>
      </div>
    </div>
  );
}
