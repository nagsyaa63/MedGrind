import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import LoadingSpinner from '../components/LoadingSpinner';

export default function ProfilePage() {
  const { userId } = useParams();
  const { user: authUser } = useAuth();
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const isOwnProfile = authUser && authUser._id === userId;

  useEffect(() => {
    const fetchProfile = async () => {
      setLoading(true);
      setError('');
      try {
        const { data } = await apiClient.get(`/users/${userId}`);
        setProfile(data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load profile.');
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, [userId]);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="bg-red-50 text-red-600 text-sm rounded-md p-4">{error}</div>;
  if (!profile) return <div className="text-gray-500 text-center py-12">User not found.</div>;

  const memberSince = new Date(profile.createdAt).toLocaleDateString('en-US', {
    year: 'numeric', month: 'long', day: 'numeric',
  });

  const stats = [
    { label: 'Points', value: profile.points },
    { label: 'Questions Added', value: profile.questionsAdded },
    { label: 'Questions Answered', value: profile.questionsAnswered },
    { label: 'Correct Answers', value: profile.correctAnswers },
    { label: 'Streak', value: `${profile.streak} day${profile.streak === 1 ? '' : 's'}` },
  ];

  return (
    <div className="max-w-2xl mx-auto">
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-start justify-between mb-4">
          <div>
            <h1 className="text-xl font-bold text-gray-800">{profile.name}</h1>
            <p className="text-sm text-gray-500">{profile.collegeName} · Year {profile.currentYear}</p>
          </div>
          {isOwnProfile && (
            <Link
              to="/profile/edit"
              className="bg-indigo-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Edit Profile
            </Link>
          )}
        </div>

        {profile.bio && (
          <p className="text-sm text-gray-600 mb-4">{profile.bio}</p>
        )}

        <p className="text-xs text-gray-400 mb-6">Member since {memberSince}</p>

        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
          {stats.map((s) => (
            <div key={s.label} className="bg-gray-50 rounded-lg p-3 text-center">
              <p className="text-lg font-bold text-gray-800">{s.value}</p>
              <p className="text-xs text-gray-500">{s.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
