/**
 * QuestionCard
 *
 * Full inline question card — shows question text, options, voting,
 * answer submission, and challenge section without navigating away.
 * Used in QuestionFeedPage.
 */
import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useAuth } from '../context/AuthContext';
import { OPTION_KEYS, DIFFICULTY_COLORS } from '../config/constants';

// ─── Challenge group helpers ──────────────────────────────────────────────────

const groupChallenges = (challenges = []) => {
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
  return Object.values(groups).sort((a, b) => b.totalVotes - a.totalVotes);
};

// ─── Option button styling ────────────────────────────────────────────────────

const getOptionClass = (key, answerResult, selectedOptions) => {
  const base = 'w-full text-left px-3 py-2 rounded-md border text-sm transition-colors ';
  if (!answerResult) {
    return base + (selectedOptions.includes(key)
      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
      : 'border-gray-200 hover:border-gray-300 bg-white text-gray-700');
  }
  const correct = answerResult.correctOptions || [];
  const selected = answerResult.selectedOptions || [];
  if (correct.includes(key)) return base + 'border-green-500 bg-green-50 text-green-700';
  if (selected.includes(key)) return base + 'border-red-400 bg-red-50 text-red-700';
  return base + 'border-gray-200 bg-gray-50 text-gray-400';
};

// ─── Main component ───────────────────────────────────────────────────────────

export default function QuestionCard({ question: initialQuestion, onDeleted }) {
  const { user } = useAuth();
  const [question, setQuestion] = useState(initialQuestion);
  const [expanded, setExpanded] = useState(false);

  // Answer state
  const [selectedOptions, setSelectedOptions] = useState([]);
  const [answerResult, setAnswerResult] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  // Challenge state
  const [showChallengeDropdown, setShowChallengeDropdown] = useState(false);
  const [challengeOptions, setChallengeOptions] = useState([]);
  const [challengeSubmitting, setChallengeSubmitting] = useState(false);
  const [hasChallenged, setHasChallenged] = useState(
    () => question.challenges?.some((c) => c.user?._id === user?._id || c.user === user?._id) ?? false
  );

  // Feedback
  const [groupFeedback, setGroupFeedback] = useState({});
  const [error, setError] = useState('');
  const [deleting, setDeleting] = useState(false);

  const isAuthor = user && question.author?._id === user._id;

  const refreshQuestion = useCallback(async () => {
    try {
      const { data } = await apiClient.get(`/questions/${question._id}`);
      setQuestion(data);
    } catch {
      // silently ignore refresh errors
    }
  }, [question._id]);

  // ── Answer ──────────────────────────────────────────────────────────────────

  const toggleOption = (key) => {
    if (answerResult) return;
    setSelectedOptions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSubmitAnswer = async () => {
    if (selectedOptions.length === 0 || submitting || answerResult) return;
    setSubmitting(true);
    setError('');
    try {
      const { data } = await apiClient.post(`/questions/${question._id}/answer`, { selectedOptions });
      setAnswerResult({ isCorrect: data.isCorrect, correctOptions: data.correctOptions, explanation: data.explanation, selectedOptions });
    } catch (err) {
      if (err.response?.status === 409) {
        setAnswerResult({ isCorrect: null, correctOptions: question.correctOptions, explanation: question.explanation, selectedOptions: [], alreadyAnswered: true });
      } else {
        setError(err.response?.data?.error || 'Failed to submit answer.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  // ── Voting ──────────────────────────────────────────────────────────────────

  const handleVote = async (type) => {
    if (isAuthor) return;
    setError('');
    try {
      const { data } = await apiClient.post(`/questions/${question._id}/${type}`);
      setQuestion(data);
    } catch (err) {
      setError(err.response?.data?.error || `Failed to ${type}.`);
    }
  };

  // ── Challenge ───────────────────────────────────────────────────────────────

  const toggleChallengeOption = (key) => {
    setChallengeOptions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleSubmitChallenge = async () => {
    if (challengeOptions.length === 0 || challengeSubmitting) return;
    setChallengeSubmitting(true);
    setError('');
    try {
      await apiClient.post(`/questions/${question._id}/challenge`, { suggestedCorrectOptions: challengeOptions });
      setHasChallenged(true);
      setShowChallengeDropdown(false);
      setChallengeOptions([]);
      await refreshQuestion();
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to submit challenge.');
    } finally {
      setChallengeSubmitting(false);
    }
  };

  const handleVoteGroup = async (group) => {
    const feedbackKey = group.key;
    try {
      await apiClient.post(`/questions/${question._id}/challenge/${group.challengeIds[0]}/vote`);
      await refreshQuestion();
    } catch (err) {
      if (err.response?.status === 409) {
        setGroupFeedback((prev) => ({ ...prev, [feedbackKey]: 'Already voted' }));
      } else if (err.response?.status === 400) {
        setGroupFeedback((prev) => ({ ...prev, [feedbackKey]: 'Challenge resolved' }));
      } else {
        setError(err.response?.data?.error || 'Failed to vote.');
      }
    }
  };

  // ── Delete ──────────────────────────────────────────────────────────────────

  const handleDelete = async () => {
    if (!window.confirm('Delete this question?')) return;
    setDeleting(true);
    try {
      await apiClient.delete(`/questions/${question._id}`);
      onDeleted?.(question._id);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete.');
      setDeleting(false);
    }
  };

  const userHasLiked = question.likes?.some((id) => id === user?._id || id?._id === user?._id);
  const userHasDownvoted = question.downvotes?.some((id) => id === user?._id || id?._id === user?._id);
  const userHasApproved = question.approvals?.some((id) => id === user?._id || id?._id === user?._id);
  const challengeGroups = groupChallenges(question.challenges);

  return (
    <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
      {/* ── Header ── */}
      <div className="p-4 pb-3">
        {/* Tags row */}
        <div className="flex items-center gap-2 flex-wrap mb-2">
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{question.subject}</span>
          {question.topic && (
            <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{question.topic}</span>
          )}
          {question.subtopic && (
            <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{question.subtopic}</span>
          )}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[question.difficulty]}`}>
            {question.difficulty}
          </span>
          {question.isAnswered && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">Answered</span>
          )}
          {question.isHidden && (
            <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Hidden</span>
          )}
        </div>

        {/* Question text */}
        <p className="text-gray-800 text-sm leading-relaxed mb-2">{question.questionText}</p>

        {/* Author + stats */}
        <div className="flex items-center gap-3 text-xs text-gray-400 flex-wrap">
          <span>
            By{' '}
            <Link to={`/profile/${question.author?._id}`} className="text-indigo-500 hover:underline font-medium" onClick={(e) => e.stopPropagation()}>
              {question.author?.name || 'Unknown'}
            </Link>
          </span>
          <span>{question.correctAttempts || 0}/{question.totalAttempts || 0} correct</span>
        </div>
      </div>

      {/* ── Expand toggle ── */}
      <button
        onClick={() => setExpanded((v) => !v)}
        className="w-full flex items-center justify-between px-4 py-2 bg-gray-50 border-t border-gray-100 text-xs text-gray-500 hover:bg-gray-100 transition-colors"
      >
        <span>{expanded ? 'Hide options & actions' : 'Show options & answer'}</span>
        <svg className={`w-4 h-4 transition-transform ${expanded ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
        </svg>
      </button>

      {/* ── Expanded section ── */}
      {expanded && (
        <div className="p-4 space-y-4 border-t border-gray-100">
          {error && <div className="bg-red-50 text-red-600 text-xs rounded p-2">{error}</div>}

          {/* Options */}
          <div className="space-y-1.5">
            {OPTION_KEYS.map((key) => (
              <button
                key={key}
                onClick={() => toggleOption(key)}
                disabled={!!answerResult}
                className={getOptionClass(key, answerResult, selectedOptions)}
              >
                <span className="font-medium mr-2">{key}.</span>
                {question.options[key]}
              </button>
            ))}
          </div>

          {/* Already answered notice */}
          {answerResult?.alreadyAnswered && (
            <div className="bg-blue-50 text-blue-700 text-xs rounded p-2">Already answered this question.</div>
          )}

          {/* Submit answer */}
          {!answerResult && (
            <button
              onClick={handleSubmitAnswer}
              disabled={selectedOptions.length === 0 || submitting}
              className="bg-indigo-600 text-white px-4 py-1.5 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              {submitting ? 'Submitting...' : 'Submit Answer'}
            </button>
          )}

          {/* Answer result */}
          {answerResult && !answerResult.alreadyAnswered && (
            <div className={`rounded p-2 text-sm ${answerResult.isCorrect ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
              {answerResult.isCorrect ? '✅ Correct!' : '❌ Incorrect'}
            </div>
          )}
          {answerResult?.explanation && (
            <div className="bg-gray-50 rounded p-2 text-xs text-gray-700">
              <span className="font-medium">Explanation: </span>{answerResult.explanation}
            </div>
          )}

          {/* Voting row */}
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {[
              { type: 'like', icon: '👍', count: question.likeCount || 0, active: userHasLiked, activeClass: 'bg-indigo-50 border-indigo-300 text-indigo-700' },
              { type: 'downvote', icon: '👎', count: question.downvoteCount || 0, active: userHasDownvoted, activeClass: 'bg-red-50 border-red-300 text-red-700' },
              { type: 'approve', icon: '✅', count: question.approvalCount || 0, active: userHasApproved, activeClass: 'bg-green-50 border-green-300 text-green-700' },
            ].map(({ type, icon, count, active, activeClass }) => (
              <button
                key={type}
                onClick={() => handleVote(type)}
                disabled={isAuthor}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border transition-colors
                  ${active ? activeClass : 'border-gray-200 text-gray-600 hover:bg-gray-50'}
                  disabled:opacity-40 disabled:cursor-not-allowed`}
              >
                {icon} {count}
              </button>
            ))}

            {/* Challenge button */}
            <div className="relative">
              <button
                onClick={() => !hasChallenged && setShowChallengeDropdown((v) => !v)}
                className={`flex items-center gap-1 px-2.5 py-1 rounded-md text-xs border transition-colors
                  ${hasChallenged ? 'bg-amber-500 border-amber-500 text-white' : 'border-gray-300 text-gray-600 hover:border-amber-400 hover:text-amber-600'}`}
              >
                ⚡ {hasChallenged ? 'Challenged' : 'Challenge'}
              </button>
              {showChallengeDropdown && !hasChallenged && (
                <div className="absolute bottom-full left-0 mb-2 bg-white border border-gray-200 rounded-lg shadow-lg p-3 z-20 w-52">
                  <p className="text-xs font-medium text-gray-600 mb-2">Suggest correct options:</p>
                  <div className="flex gap-2 mb-3">
                    {OPTION_KEYS.map((key) => (
                      <label key={key} className="flex items-center gap-1 text-xs text-gray-700 cursor-pointer">
                        <input
                          type="checkbox"
                          checked={challengeOptions.includes(key)}
                          onChange={() => toggleChallengeOption(key)}
                          className="h-3.5 w-3.5 text-amber-600 border-gray-300 rounded"
                        />
                        {key}
                      </label>
                    ))}
                  </div>
                  <button
                    onClick={handleSubmitChallenge}
                    disabled={challengeOptions.length === 0 || challengeSubmitting}
                    className="w-full bg-amber-500 text-white px-2 py-1 rounded text-xs font-medium hover:bg-amber-600 disabled:opacity-50 transition-colors"
                  >
                    {challengeSubmitting ? 'Submitting...' : 'Submit'}
                  </button>
                </div>
              )}
            </div>

            {/* View full detail link */}
            <Link
              to={`/questions/${question._id}`}
              className="ml-auto text-xs text-indigo-500 hover:text-indigo-700 font-medium"
              onClick={(e) => e.stopPropagation()}
            >
              Full view →
            </Link>
          </div>

          {isAuthor && <p className="text-xs text-gray-400">You cannot vote on your own question.</p>}

          {/* Challenge groups */}
          {challengeGroups.length > 0 && (
            <div className="pt-1 space-y-1.5">
              <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Suggested corrections</p>
              <div className="flex flex-wrap gap-2">
                {challengeGroups.map((group) => (
                  <div key={group.key}>
                    <button
                      onClick={() => handleVoteGroup(group)}
                      disabled={group.resolved || !!groupFeedback[group.key]}
                      className={`px-2.5 py-1 rounded-full text-xs font-medium border transition-colors
                        ${group.resolved
                          ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
                          : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
                    >
                      {group.options.join(',')} — {group.totalVotes} vote{group.totalVotes !== 1 ? 's' : ''}
                    </button>
                    {groupFeedback[group.key] && (
                      <span className="block text-xs text-amber-600 mt-0.5">{groupFeedback[group.key]}</span>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Delete */}
          {isAuthor && (
            <div className="flex justify-end pt-1">
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-3 py-1 rounded-md transition-colors disabled:opacity-50"
              >
                {deleting ? 'Deleting...' : 'Delete Question'}
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
