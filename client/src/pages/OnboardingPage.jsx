import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function OnboardingPage() {
  const { isAuthenticated, loading, updateProfile } = useAuth();
  const navigate = useNavigate();
  const [collegeName, setCollegeName] = useState('');
  const [currentYear, setCurrentYear] = useState('');
  const [collegeNameError, setCollegeNameError] = useState('');
  const [currentYearError, setCurrentYearError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [apiError, setApiError] = useState('');

  // Redirect unauthenticated users to login
  if (!loading && !isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  const validate = () => {
    let valid = true;
    setCollegeNameError('');
    setCurrentYearError('');

    if (!collegeName.trim()) {
      setCollegeNameError('College name is required');
      valid = false;
    }

    const yearNum = parseInt(currentYear, 10);
    if (!currentYear || isNaN(yearNum) || yearNum < 1 || yearNum > 6) {
      setCurrentYearError('Year must be between 1 and 6');
      valid = false;
    }

    return valid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setApiError('');
    setSubmitting(true);
    try {
      await updateProfile({ collegeName: collegeName.trim(), currentYear: parseInt(currentYear, 10) });
      // updateProfile sets user in context with isOnboarded: true — navigate immediately
      navigate('/questions', { replace: true });
    } catch (err) {
      setApiError(err.response?.data?.error || 'Something went wrong. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-lg shadow-md p-8">
        <h1 className="text-2xl font-bold text-center text-indigo-600 mb-2">Almost there!</h1>
        <p className="text-center text-gray-500 mb-6">
          Tell us a bit about yourself to complete your profile.
        </p>

        {apiError && (
          <div className="bg-red-50 text-red-600 text-sm rounded-md p-3 mb-4">
            {apiError}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-5" noValidate>
          <div>
            <label htmlFor="collegeName" className="block text-sm font-medium text-gray-700 mb-1">
              College / Institution
            </label>
            <input
              id="collegeName"
              type="text"
              value={collegeName}
              onChange={(e) => setCollegeName(e.target.value)}
              className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                collegeNameError ? 'border-red-400' : 'border-gray-300'
              }`}
              placeholder="e.g. AIIMS Delhi"
            />
            {collegeNameError && (
              <p className="text-red-500 text-xs mt-1">{collegeNameError}</p>
            )}
          </div>

          <div>
            <label htmlFor="currentYear" className="block text-sm font-medium text-gray-700 mb-1">
              Year of Study (1–6)
            </label>
            <input
              id="currentYear"
              type="number"
              min="1"
              max="6"
              value={currentYear}
              onChange={(e) => setCurrentYear(e.target.value)}
              className={`w-full border rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent ${
                currentYearError ? 'border-red-400' : 'border-gray-300'
              }`}
              placeholder="e.g. 2"
            />
            {currentYearError && (
              <p className="text-red-500 text-xs mt-1">{currentYearError}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full bg-indigo-600 text-white py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Saving...' : 'Complete Profile'}
          </button>
        </form>
      </div>
    </div>
  );
}
