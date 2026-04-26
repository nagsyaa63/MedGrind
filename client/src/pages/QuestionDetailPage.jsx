import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
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

export default function QuestionDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [question, setQuestion] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Answer state
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [answerResult, setAnswerResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Inline challenge state
  const [showChallengeDropdown, setShowChallengeDropdown] = useState(false);
  const [challengeOptions, setChallengeOptions] = useState([]);
  const [challengeSubmitting, setChallengeSubmitting] = useState(false);
  const [hasChallenged, setHasChallenged] = useState(false);
  const [challengeTooltip, setChallengeTooltip] = useState('');

  // Vote feedback per group
  const [groupFeedback, setGroupFeedback] = useState({});

  // Delete state
  const [deleting, setDeleting] = useState(false);

  const isAuthor = user && question && question.author?._id === user._id;

  const fetchQuestion = useCallback(async () => {
    try {
      const { data } = await apiClient.get(`/questions/${id}`);
      setQuestion(data);
      // Check if user already challenged this question
      if (data.challenges && user) {
        const userChallenge = data.challenges.some(
          (c) => c.user?._id === user._id || c.user === user._id
        );
        setHasChallenged(userChallenge);
      }
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load question.');
    } finally {
      setLoading(false);
    }
  }, [id, user]);

  useEffect(() => {
    fetchQuestion();
  }, [fetchQuestion]);

  const toggleOption = (key) => {
    if (answerResult) return;
    setSelectedOptions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSubmitAnswer = async () => {
    if (selectedOptions.length === 0 || submitting || answerResult) return;
    setSubmitting(true);
    try {
      const { data } = await apiClient.post(`/questions/${id}/answer`, { selectedOptions });
      setAnswerResult({
        isCorrect: data.isCorrect,
        correctOptions: data.correctOptions,
        explanation: data.explanation,
        selectedOptions,
      });
    } catch (err) {
      if (err.response?.status === 409) {
        setAnswerResult({
          isCorrect: null,
          correctOptions: question.correctOptions,
          explanation: question.explanation,
          selectedOptions: [],
          alreadyAnswered: true,
        });
      } else {
        setError(err.response?.data?.error || 'Failed to submit answer.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // Voting handlers
  const handleVote = async (type) => {
    if (isAuthor) return;
    try {
      const { data } = await apiClient.post(`/questions/${id}/${type}`);
      setQuestion(data);
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${type}.`);
    }
  };

  // Inline challenge handlers
  const handleChallengeClick = () => {
    if (hasChallenged) {
      setChallengeTooltip('Already challenged');
      setTimeout(() => setChallengeTooltip(''), 2000);
      return;
    }
    setShowChallengeDropdown((v) => !v);
  };

  const toggleChallengeOption = (key) => {
    setChallengeOptions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSubmitChallenge = async () => {
    if (challengeOptions.length === 0 || challengeSubmitting) return;
    setChallengeSubmitting(true);
    try {
      await apiClient.post(`/questions/${id}/challenge`, {
        suggestedCorrectOptions: challengeOptions,
      });
      setHasChallenged(true);
      setShowChallengeDropdown(false);
      setChallengeOptions([]);
      await fetchQuestion();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit challenge.');
    } finally {
      setChallengeSubmitting(false);
    }
  };

  // Vote on a challenge group
  const handleVoteGroup = async (group) => {
    const challengeId = group.challengeIds[0];
    try {
      await apiClient.post(`/questions/${id}/challenge/${challengeId}/vote`);
      await fetchQuestion();
    } catch (err) {
      if (err.response?.status === 409) {
        setGroupFeedback((prev) => ({ ...prev, [group.key]: 'Already voted' }));
      } else if (err.response?.status === 400) {
        setGroupFeedback((prev) => ({ ...prev, [group.key]: 'This challenge has been resolved' }));
      } else {
        setError(err.response?.data?.error || 'Failed to vote on challenge.');
      }
    }
  };

  // Delete handler
  const handleDelete = async () => {
    if (!window.confirm('Are you sure you want to delete this question?')) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/questions/${id}`);
      navigate('/questions');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete question.');
      setDeleting(false);
    }
  };

  const getOptionClass = (key) => {
    const base = 'w-full text-left px-4 py-3 rounded-lg border text-sm transition-colors ';
    if (!answerResult) {
      return base + (selectedOptions.includes(key)
        ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
        : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700');
    }
    const correct = answerResult.correctOptions || [];
    const selected = answerResult.selectedOptions || [];
    if (correct.includes(key)) return base + 'border-green-500 bg-green-50 text-green-700';
    if (selected.includes(key)) return base + 'border-red-500 bg-red-50 text-red-700';
    return base + 'border-gray-200 bg-gray-50 text-gray-400';
  };

  const userHasLiked = question?.likes?.some((lid) => lid === user?._id || lid?._id === user?._id);
  const userHasDownvoted = question?.downvotes?.some((did) => did === user?._id || did?._id === user?._id);
  const userHasApproved = question?.approvals?.some((aid) => aid === user?._id || aid?._id === user?._id);

  const challengeGroups = question?.challenges ? groupChallenges(question.challenges) : [];

  if (loading) return <LoadingSpinner />;
  if (error && !question) return <div className="bg-red-50 text-red-600 text-sm rounded-md p-4">{error}</div>;
  if (!question) return <div className="text-gray-500 text-center py-12">Question not found.</div>;

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <Link to="/questions" className="text-sm text-indigo-600 hover:underline">← Back to Feed</Link>

      {/* Hidden warning */}
      {question.isHidden && (
        <div className="bg-amber-50 border border-amber-300 text-amber-800 text-sm rounded-lg p-3 flex items-center gap-2">
          <span>⚠️</span>
          <span>This question has been hidden due to community downvotes.</span>
        </div>
      )}

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-md p-3">{error}</div>
      )}

      {/* Question card */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="flex items-center gap-2 mb-3 flex-wrap">
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{question.subject}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[question.difficulty]}`}>
            {question.difficulty}
          </span>
          <span className="text-xs text-gray-400">
            {question.correctAttempts}/{question.totalAttempts} correct
          </span>
        </div>

        <p className="text-gray-800 text-base leading-relaxed mb-4">{question.questionText}</p>

        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span>By </span>
          <Link to={`/profile/${question.author?._id}`} className="text-indigo-600 hover:underline font-medium">
            {question.author?.name || 'Unknown'}
          </Link>
        </div>
      </div>

      {/* Answer section */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">
          {answerResult ? 'Your Answer' : 'Select your answer'}
        </h2>

        {answerResult?.alreadyAnswered && (
          <div className="bg-blue-50 text-blue-700 text-sm rounded-md p-3 mb-4">
            You have already answered this question.
          </div>
        )}

        <div className="space-y-2 mb-4">
          {OPTION_KEYS.map((key) => (
            <button
              key={key}
              onClick={() => toggleOption(key)}
              disabled={!!answerResult}
              className={getOptionClass(key)}
            >
              <span className="font-medium mr-2">{key}.</span>
              {question.options[key]}
            </button>
          ))}
        </div>

        {!answerResult && (
          <button
            onClick={handleSubmitAnswer}
            disabled={selectedOptions.length === 0 || submitting}
            className="bg-indigo-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            {submitting ? 'Submitting...' : 'Submit Answer'}
          </button>
        )}

        {answerResult && !answerResult.alreadyAnswered && (
          <div className={`rounded-md p-3 text-sm mt-2 ${answerResult.isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
            {answerResult.isCorrect ? '✅ Correct!' : '❌ Incorrect'}
          </div>
        )}

        {answerResult?.explanation && (
          <div className="bg-gray-50 rounded-md p-3 text-sm text-gray-700 mt-3">
            <span className="font-medium">Explanation: </span>{answerResult.explanation}
          </div>
        )}
      </div>

      {/* Voting section with inline Challenge button */}
      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <h2 className="text-sm font-semibold text-gray-700 mb-4">Votes</h2>
        <div className="flex items-center gap-3 flex-wrap">
          <button
            onClick={() => handleVote('like')}
            disabled={isAuthor}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-colors ${
              userHasLiked
                ? 'bg-indigo-50 border-indigo-300 text-indigo-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            👍 <span>{question.likeCount || 0}</span>
          </button>
          <button
            onClick={() => handleVote('downvote')}
            disabled={isAuthor}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-colors ${
              userHasDownvoted
                ? 'bg-red-50 border-red-300 text-red-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            👎 <span>{question.downvoteCount || 0}</span>
          </button>
          <button
            onClick={() => handleVote('approve')}
            disabled={isAuthor}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-colors ${
              userHasApproved
                ? 'bg-green-50 border-green-300 text-green-700'
                : 'border-gray-200 text-gray-600 hover:bg-gray-50'
            } disabled:opacity-40 disabled:cursor-not-allowed`}
          >
            ✅ <span>{question.approvalCount || 0}</span>
          </button>

          {/* Inline Challenge button */}
          <div className="relative">
            <button
              onClick={handleChallengeClick}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm border transition-colors ${
                hasChallenged
                  ? 'bg-amber-500 border-amber-500 text-white'
                  : 'border-gray-300 text-gray-600 hover:border-amber-400 hover:text-amber-600'
              }`}
            >
              {hasChallenged ? '⚡ Challenged' : '⚡ Challenge'}
            </button>
            {challengeTooltip && (
              <span className="absolute top-full left-0 mt-1 text-xs text-amber-600 bg-amber-50 border border-amber-200 rounded px-2 py-1 whitespace-nowrap z-10">
                {challengeTooltip}
              </span>
            )}
            {showChallengeDropdown && !hasChallenged && (
              <div className="absolute top-full left-0 mt-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-10 w-56">
                <p className="text-xs font-medium text-gray-600 mb-2">Suggested correct options:</p>
                <div className="flex gap-3 mb-3">
                  {OPTION_KEYS.map((key) => (
                    <label key={key} className="flex items-center gap-1 text-sm text-gray-700">
                      <input
                        type="checkbox"
                        checked={challengeOptions.includes(key)}
                        onChange={() => toggleChallengeOption(key)}
                        className="h-4 w-4 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                      />
                      {key}
                    </label>
                  ))}
                </div>
                <button
                  onClick={handleSubmitChallenge}
                  disabled={challengeOptions.length === 0 || challengeSubmitting}
                  className="w-full bg-amber-500 text-white px-3 py-1.5 rounded-md text-sm font-medium hover:bg-amber-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  {challengeSubmitting ? 'Submitting...' : 'Submit'}
                </button>
              </div>
            )}
          </div>
        </div>
        {isAuthor && (
          <p className="text-xs text-gray-400 mt-2">You cannot vote on your own question.</p>
        )}
      </div>

      {/* Challenge suggestions grouped by suggestedCorrectOptions */}
      {challengeGroups.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-lg p-6">
          <h2 className="text-sm font-semibold text-gray-700 mb-4">Challenge Suggestions</h2>
          <div className="flex flex-wrap gap-3">
            {challengeGroups.map((group) => (
              <div key={group.key} className="relative">
                <button
                  onClick={() => handleVoteGroup(group)}
                  disabled={group.resolved}
                  className={`px-4 py-2 rounded-lg border text-sm font-medium transition-colors ${
                    group.resolved
                      ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                      : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-400'
                  }`}
                >
                  {group.options.join(',')} — {group.totalVotes} vote{group.totalVotes !== 1 ? 's' : ''}
                </button>
                {groupFeedback[group.key] && (
                  <span className="block text-xs text-amber-600 mt-1">{groupFeedback[group.key]}</span>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Delete button for author */}
      {isAuthor && (
        <div className="flex justify-end">
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="bg-red-600 text-white px-4 py-2 rounded-md text-sm font-medium hover:bg-red-700 disabled:opacity-50 transition-colors"
          >
            {deleting ? 'Deleting...' : 'Delete Question'}
          </button>
        </div>
      )}
    </div>
  );
}
