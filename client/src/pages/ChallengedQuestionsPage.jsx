import { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import apiClient from '../api/apiClient';
import LoadingSpinner from '../components/LoadingSpinner';
import { useAuth } from '../context/AuthContext';
import { OPTION_KEYS, DIFFICULTY_COLORS, ALLOWED_SUBJECTS } from '../config/constants';

// ─── Helpers ──────────────────────────────────────────────────────────────────

/**
 * Group challenge subdocuments by their suggestedCorrectOptions (sorted).
 * Returns an array of groups, each with:
 *   key, options, totalVotes, challengeIds, resolved, challengers (names), reasonings
 */
const groupChallenges = (challenges = []) => {
  const groups = {};
  for (const c of challenges) {
    const key = [...c.suggestedCorrectOptions].sort().join(',');
    if (!groups[key]) {
      groups[key] = {
        key,
        options: [...c.suggestedCorrectOptions].sort(),
        totalVotes: 0,
        challengeIds: [],
        resolved: false,
        challengers: [],
        reasonings: [],
      };
    }
    groups[key].totalVotes += c.voteCount || 0;
    groups[key].challengeIds.push(c._id);
    if (c.resolved) groups[key].resolved = true;
    if (c.user?.name) groups[key].challengers.push(c.user.name);
    if (c.reasoning?.trim()) groups[key].reasonings.push(c.reasoning.trim());
  }
  return Object.values(groups).sort((a, b) => b.totalVotes - a.totalVotes);
};

// ─── Sub-components ───────────────────────────────────────────────────────────

function FilterBar({ filters, onChange }) {
  return (
    <div className="flex flex-wrap gap-3 items-center">
      {/* Subject */}
      <select
        value={filters.subject}
        onChange={(e) => onChange({ ...filters, subject: e.target.value, page: 1 })}
        className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">All Subjects</option>
        {ALLOWED_SUBJECTS.map((s) => (
          <option key={s} value={s}>{s}</option>
        ))}
      </select>

      {/* Difficulty */}
      <select
        value={filters.difficulty}
        onChange={(e) => onChange({ ...filters, difficulty: e.target.value, page: 1 })}
        className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="">All Difficulties</option>
        <option value="Easy">Easy</option>
        <option value="Medium">Medium</option>
        <option value="Hard">Hard</option>
      </select>

      {/* Sort */}
      <select
        value={filters.sortBy}
        onChange={(e) => onChange({ ...filters, sortBy: e.target.value, page: 1 })}
        className="text-sm border border-gray-300 rounded-md px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        <option value="mostChallenged">Most Challenged</option>
        <option value="mostVoted">Most Voted</option>
        <option value="newest">Newest</option>
      </select>

      {/* Clear filters */}
      {(filters.subject || filters.difficulty || filters.sortBy !== 'mostChallenged') && (
        <button
          onClick={() => onChange({ subject: '', difficulty: '', sortBy: 'mostChallenged', page: 1 })}
          className="text-xs text-indigo-600 hover:text-indigo-800 underline"
        >
          Clear filters
        </button>
      )}
    </div>
  );
}

function ChallengeGroup({ group, questionId, onVote, feedback }) {
  const [expanded, setExpanded] = useState(false);
  const hasReasoning = group.reasonings.length > 0;

  return (
    <div className="space-y-1">
      <div className="flex items-center gap-2 flex-wrap">
        {/* Vote button */}
        <button
          onClick={() => onVote(questionId, group)}
          disabled={group.resolved || !!feedback}
          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium border transition-colors ${
            group.resolved
              ? 'bg-green-50 border-green-300 text-green-700 cursor-not-allowed'
              : feedback
              ? 'bg-gray-100 border-gray-200 text-gray-400 cursor-not-allowed'
              : 'border-amber-300 bg-amber-50 text-amber-700 hover:bg-amber-100 hover:border-amber-400 cursor-pointer'
          }`}
        >
          {group.resolved && (
            <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
            </svg>
          )}
          <span>
            Suggest: <strong>{group.options.join(', ')}</strong>
          </span>
          <span className="text-xs opacity-75">
            · {group.totalVotes} vote{group.totalVotes !== 1 ? 's' : ''}
          </span>
        </button>

        {/* Expand reasoning toggle */}
        {hasReasoning && (
          <button
            onClick={() => setExpanded((v) => !v)}
            className="text-xs text-gray-400 hover:text-gray-600 underline"
          >
            {expanded ? 'Hide reasoning' : `View reasoning (${group.reasonings.length})`}
          </button>
        )}
      </div>

      {/* Feedback message */}
      {feedback && (
        <p className="text-xs text-amber-600 pl-1">{feedback}</p>
      )}

      {/* Expanded reasonings */}
      {expanded && hasReasoning && (
        <div className="ml-1 mt-1 space-y-1.5 border-l-2 border-amber-200 pl-3">
          {group.reasonings.map((r, i) => (
            <p key={i} className="text-xs text-gray-600 italic">"{r}"</p>
          ))}
        </div>
      )}
    </div>
  );
}

function QuestionCard({ q, onVote, groupFeedback }) {
  const groups = groupChallenges(q.challenges);
  const hasResolved = groups.some((g) => g.resolved);

  return (
    <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
      {/* Header row */}
      <div className="flex items-start justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{q.subject}</span>
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[q.difficulty]}`}>
            {q.difficulty}
          </span>
          {hasResolved && (
            <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded-full font-medium">
              ✓ Resolved
            </span>
          )}
        </div>

        {/* Challenge stats */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            {/* challenge icon */}
            <svg className="w-3.5 h-3.5 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01M10.29 3.86L1.82 18a2 2 0 001.71 3h16.94a2 2 0 001.71-3L13.71 3.86a2 2 0 00-3.42 0z" />
            </svg>
            <strong className="text-amber-600">{q.challengeCount}</strong> challenge{q.challengeCount !== 1 ? 's' : ''}
          </span>
          <span className="flex items-center gap-1">
            {/* users icon */}
            <svg className="w-3.5 h-3.5 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <strong className="text-indigo-500">{q.uniqueChallengers}</strong> student{q.uniqueChallengers !== 1 ? 's' : ''}
          </span>
          {q.totalChallengeVotes > 0 && (
            <span>{q.totalChallengeVotes} total vote{q.totalChallengeVotes !== 1 ? 's' : ''}</span>
          )}
        </div>
      </div>

      {/* Author */}
      {q.author && (
        <p className="text-xs text-gray-400">
          By <span className="font-medium text-gray-500">{q.author.name}</span>
          {q.author.collegeName && ` · ${q.author.collegeName}`}
        </p>
      )}

      {/* Question text */}
      <Link
        to={`/questions/${q._id}`}
        className="block text-gray-800 text-base leading-relaxed hover:text-indigo-600 transition-colors"
      >
        {q.questionText}
      </Link>

      {/* Options A–D */}
      <div className="space-y-1.5">
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

      {/* Explanation (if resolved) */}
      {hasResolved && q.explanation && (
        <div className="bg-blue-50 border border-blue-200 rounded-md px-3 py-2 text-xs text-blue-700">
          <span className="font-medium">Explanation: </span>{q.explanation}
        </div>
      )}

      {/* Challenge groups */}
      {groups.length > 0 && (
        <div className="pt-1 space-y-2">
          <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">Suggested corrections</p>
          {groups.map((group) => {
            const feedbackKey = `${q._id}-${group.key}`;
            return (
              <ChallengeGroup
                key={group.key}
                group={group}
                questionId={q._id}
                onVote={onVote}
                feedback={groupFeedback[feedbackKey]}
              />
            );
          })}
        </div>
      )}

      {/* Footer: link to full detail */}
      <div className="pt-1">
        <Link
          to={`/questions/${q._id}`}
          className="text-xs text-indigo-500 hover:text-indigo-700 font-medium"
        >
          View full question →
        </Link>
      </div>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function ChallengedQuestionsPage() {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [groupFeedback, setGroupFeedback] = useState({});
  const [filters, setFilters] = useState({
    subject: '',
    difficulty: '',
    sortBy: 'mostChallenged',
    page: 1,
  });

  const PAGE_SIZE = 10;

  const fetchChallenged = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: PAGE_SIZE, ...filters };
      // strip empty strings so they don't pollute the query
      Object.keys(params).forEach((k) => params[k] === '' && delete params[k]);
      const { data } = await apiClient.get('/questions/challenged', { params });
      setQuestions(data.questions || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load challenged questions.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => {
    fetchChallenged();
  }, [fetchChallenged]);

  const handleVoteGroup = async (questionId, group) => {
    const feedbackKey = `${questionId}-${group.key}`;
    const challengeId = group.challengeIds[0];
    try {
      await apiClient.post(`/questions/${questionId}/challenge/${challengeId}/vote`);
      // Refresh list to reflect new vote counts
      await fetchChallenged();
    } catch (err) {
      if (err.response?.status === 409) {
        setGroupFeedback((prev) => ({ ...prev, [feedbackKey]: 'You already voted on this' }));
      } else if (err.response?.status === 400) {
        setGroupFeedback((prev) => ({ ...prev, [feedbackKey]: 'This challenge has been resolved' }));
      } else {
        setError(err.response?.data?.error || 'Failed to vote on challenge.');
      }
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE);

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      {/* Page header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div>
          <h1 className="text-xl font-bold text-gray-800">Challenged Questions</h1>
          {!loading && (
            <p className="text-sm text-gray-500 mt-0.5">
              {total === 0
                ? 'No challenged questions yet'
                : `${total} question${total !== 1 ? 's' : ''} being disputed by the community`}
            </p>
          )}
        </div>
      </div>

      {/* Filters */}
      <FilterBar filters={filters} onChange={setFilters} />

      {/* Error */}
      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-md p-3">{error}</div>
      )}

      {/* Loading */}
      {loading && <LoadingSpinner />}

      {/* Empty state */}
      {!loading && questions.length === 0 && !error && (
        <div className="text-center py-16 text-gray-400">
          <svg className="w-12 h-12 mx-auto mb-3 opacity-40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium">No challenged questions found</p>
          <p className="text-xs mt-1">
            {filters.subject || filters.difficulty
              ? 'Try clearing your filters'
              : 'When students challenge a question, it will appear here'}
          </p>
        </div>
      )}

      {/* Question cards */}
      {!loading && questions.map((q) => (
        <QuestionCard
          key={q._id}
          q={q}
          onVote={handleVoteGroup}
          groupFeedback={groupFeedback}
        />
      ))}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
            disabled={filters.page <= 1}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            ← Previous
          </button>
          <span className="text-sm text-gray-500">
            Page {filters.page} of {totalPages}
          </span>
          <button
            onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
            disabled={filters.page >= totalPages}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md disabled:opacity-40 hover:bg-gray-50 transition-colors"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
