import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

export default function EditProfilePage() {
  const { user, updateProfile } = useAuth();
  const navigate = useNavigate();

  const [name, setName] = useState(user?.name || '');
  const [collegeName, setCollegeName] = useState(user?.collegeName || '');
  const [currentYear, setCurrentYear] = useState(user?.currentYear || 1);
  const [bio, setBio] = useState(user?.bio || '');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) { setError('Name is required.'); return; }
    if (!collegeName.trim()) { setError('College name is required.'); return; }
    setError('');
    setLoading(true);
    try {
      await updateProfile({ name, collegeName, currentYear: Number(currentYear), bio });
      navigate(`/profile/${user._id}`);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update profile.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-lg mx-auto">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Edit Profile</h1>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-md p-3 mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-5">
        <div>
          <label htmlFor="name" className="block text-sm font-medium text-gray-700 mb-1">Name</label>
          <input
            id="name"
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="collegeName" className="block text-sm font-medium text-gray-700 mb-1">College Name</label>
          <input
            id="collegeName"
            type="text"
            value={collegeName}
            onChange={(e) => setCollegeName(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
          />
        </div>

        <div>
          <label htmlFor="currentYear" className="block text-sm font-medium text-gray-700 mb-1">Current Year</label>
          <select
            id="currentYear"
            value={currentYear}
            onChange={(e) => setCurrentYear(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            {[1, 2, 3, 4, 5, 6].map((y) => (
              <option key={y} value={y}>Year {y}</option>
            ))}
          </select>
        </div>

        <div>
          <label htmlFor="bio" className="block text-sm font-medium text-gray-700 mb-1">Bio</label>
          <textarea
            id="bio"
            rows={3}
            maxLength={200}
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            placeholder="Tell us about yourself..."
          />
          <p className="text-xs text-gray-400 text-right mt-1">{bio.length}/200</p>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Saving...' : 'Save Changes'}
        </button>
      </form>
    </div>
  );
}
