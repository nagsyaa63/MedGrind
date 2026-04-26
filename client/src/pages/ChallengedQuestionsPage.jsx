import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import LoadingSpinner from '../components/LoadingSpinner';
import { OPTION_KEYS, DIFFICULTY_COLORS } from '../config/constants';

const groupChallenges = (challenges) => {
  const groups = {};
  for (const c of challenges) {
    const key = [...c.suggestedCorrectOptions].sort().join(',');
    if (!groups[key]) {
      groups[key] = { key, options: [...c.suggestedCorrectOptions].sort(), totalVotes: 0, challengeIds: [], resolved: false };
    }
    groups[key].totalVotes += c.voteCount || 0;
    groups[key].challengeIds.push(c._id);
    if (c.resolved) groups[key].resolved = true;
  }
  return Object.values(groups);
};

export default function ChallengedQuestionsPage() {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groupFeedback, setGroupFeedback] = useState({});

  const fetchChallenged = async () => {
    try {
      const { data } = await apiClient.get('/questions/challenged');
      setQuestions(data.questions || data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load challenged questions.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchChallenged();
  }, []);

  const handleVoteGroup = async (questionId, group) => {
    const feedbackKey = `${questionId}-${group.key}`;
    const challengeId = group.challengeIds[0];
    try {
      await apiClient.post(`/questions/${questionId}/challenge/${challengeId}/vote`);
      await fetchChallenged();
    } catch (err) {
      if (err.response?.status === 409) {
        setGroupFeedback((prev) => ({ ...prev, [feedbackKey]: 'Already voted' }));
      } else if (err.response?.status === 400) {
        setGroupFeedback((prev) => ({ ...prev, [feedbackKey]: 'This challenge has been resolved' }));
      } else {
        setError(err.response?.data?.error || 'Failed to vote on challenge.');
      }
    }
  };

  if (loading) return <LoadingSpinner />;

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <h1 className="text-xl font-bold text-gray-800">Challenged Questions</h1>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-md p-3">{error}</div>
      )}

      {questions.length === 0 && !error && (
        <p className="text-gray-500 text-sm">No challenged questions yet.</p>
      )}

      {questions.map((q) => {
        const groups = groupChallenges(q.challenges || []);
        return (
          <div key={q._id} className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{q.subject}</span>
              <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[q.difficulty]}`}>
                {q.difficulty}
              </span>
            </div>

            <Link to={`/questions/${q._id}`} className="block text-gray-800 text-base leading-relaxed hover:text-indigo-600">
              {q.questionText}
            </Link>

            {/* Options A-D with correct highlighted */}
            <div className="space-y-1">
              {OPTION_KEYS.map((key) => (
                <div
                  key={key}
                  className={`px-3 py-2 rounded-md text-sm ${
                    q.correctOptions?.includes(key)
                      ? 'bg-green-50 border border-green-300 text-green-700'
                      : 'bg-gray-50 border border-gray-200 text-gray-600'
                  }`}
                >
                  <span className="font-medium mr-2">{key}.</span>
                  {q.options?.[key]}
                </div>
              ))}
            </div>

            {/* Challenge groups */}
            {groups.length > 0 && (
              <div className="flex flex-wrap gap-2 pt-2">
                {groups.map((group) => {
                  const feedbackKey = `${q._id}-${group.key}`;
                  return (
                    <div key={group.key} className="relative">
                      <button
                        onClick={() => handleVoteGroup(q._id, group)}
                        disabled={group.resolved}
                        className={`px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
                          group.resolved
                            ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                            : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-400'
                        }`}
                      >
                        {group.options.join(',')} — {group.totalVotes} vote{group.totalVotes !== 1 ? 's' : ''}
                      </button>
                      {groupFeedback[feedbackKey] && (
                        <span className="block text-xs text-amber-600 mt-1">{groupFeedback[feedbackKey]}</span>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
