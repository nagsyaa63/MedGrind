import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import LoadingSpinner from '../components/LoadingSpinner';

export default function LeaderboardPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLeaderboard = async () => {
      try {
        const { data } = await apiClient.get('/users/leaderboard');
        setUsers(data);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load leaderboard.');
      } finally {
        setLoading(false);
      }
    };
    fetchLeaderboard();
  }, []);

  if (loading) return <LoadingSpinner />;
  if (error) return <div className="bg-red-50 text-red-600 text-sm rounded-md p-4">{error}</div>;

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-800 mb-6">Leaderboard</h1>

      {users.length === 0 ? (
        <p className="text-center text-gray-500 py-12">No users yet.</p>
      ) : (
        <div className="overflow-x-auto bg-white border border-gray-200 rounded-lg">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                <th className="px-4 py-3">Rank</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">College</th>
                <th className="px-4 py-3 text-right">Points</th>
                <th className="px-4 py-3 text-right">Correct Answers</th>
                <th className="px-4 py-3 text-right">Questions Added</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u, i) => (
                <tr
                  key={u._id}
                  onClick={() => navigate(`/profile/${u._id}`)}
                  className={`cursor-pointer hover:bg-indigo-50 transition-colors ${i % 2 === 0 ? 'bg-white' : 'bg-gray-50'}`}
                >
                  <td className="px-4 py-3 font-medium text-gray-700">{i + 1}</td>
                  <td className="px-4 py-3 text-indigo-600 font-medium">{u.name}</td>
                  <td className="px-4 py-3 text-gray-600">{u.collegeName}</td>
                  <td className="px-4 py-3 text-right font-semibold text-gray-800">{u.points}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{u.correctAnswers}</td>
                  <td className="px-4 py-3 text-right text-gray-600">{u.questionsAdded}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
