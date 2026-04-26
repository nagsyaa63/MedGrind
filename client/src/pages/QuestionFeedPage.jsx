import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { ALLOWED_SUBJECTS, DIFFICULTY_COLORS } from '../config/constants';

export default function QuestionFeedPage() {
  const [questions, setQuestions] = useState([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    const fetchQuestions = async () => {
      setLoading(true);
      setError('');
      try {
        const params = { page, limit, sortBy };
        if (subject) params.subject = subject;
        if (difficulty) params.difficulty = difficulty;
        const { data } = await apiClient.get('/questions', { params });
        setQuestions(data.questions);
        setTotal(data.total);
      } catch (err) {
        setError(err.response?.data?.error || 'Failed to load questions.');
      } finally {
        setLoading(false);
      }
    };
    fetchQuestions();
  }, [page, limit, subject, difficulty, sortBy]);

  const totalPages = Math.max(1, Math.ceil(total / limit));

  const handleFilterChange = (setter) => (e) => {
    setter(e.target.value);
    setPage(1);
  };

  return (
    <div>
      {/* Filter bar */}
      <div className="flex flex-wrap items-center gap-3 mb-6">
        <select
          value={subject}
          onChange={handleFilterChange(setSubject)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Subjects</option>
          {ALLOWED_SUBJECTS.map((s) => (
            <option key={s} value={s}>{s}</option>
          ))}
        </select>

        <select
          value={difficulty}
          onChange={handleFilterChange(setDifficulty)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="">All Difficulties</option>
          {['Easy', 'Medium', 'Hard'].map((d) => (
            <option key={d} value={d}>{d}</option>
          ))}
        </select>

        <select
          value={sortBy}
          onChange={handleFilterChange(setSortBy)}
          className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
        >
          <option value="newest">Newest</option>
          <option value="popular">Popular</option>
        </select>
      </div>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-md p-3 mb-4">{error}</div>
      )}

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
        </div>
      ) : questions.length === 0 ? (
        <div className="text-center py-12">
          <p className="text-gray-500 mb-4">No questions found. Be the first to contribute!</p>
          <button
            onClick={() => navigate('/questions/new')}
            className="bg-indigo-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
          >
            Create First Question
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {questions.map((q) => (
            <div
              key={q._id}
              onClick={() => navigate(`/questions/${q._id}`)}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow cursor-pointer"
            >
              <div className="flex items-start justify-between gap-3">
                <p className="text-gray-800 text-sm flex-1 line-clamp-2">
                  {q.questionText}
                </p>
                {q.isAnswered && (
                  <span className="shrink-0 text-xs bg-indigo-100 text-indigo-700 px-2 py-0.5 rounded-full font-medium">
                    Answered
                  </span>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 mt-3">
                <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">
                  {q.subject}
                </span>
                <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[q.difficulty]}`}>
                  {q.difficulty}
                </span>
              </div>

              <div className="flex flex-wrap items-center gap-4 mt-3 text-xs text-gray-500">
                <span>By {q.author?.name || 'Unknown'}</span>
                <span>👍 {q.likeCount || 0}</span>
                <span>👎 {q.downvoteCount || 0}</span>
                <span>✅ {q.approvalCount || 0}</span>
                <span>
                  {q.correctAttempts || 0}/{q.totalAttempts || 0} correct
                </span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="flex items-center justify-center gap-4 mt-6">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-gray-600">
            Page {page} of {totalPages}
          </span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}
