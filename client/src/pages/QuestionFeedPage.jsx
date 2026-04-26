import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useTaxonomy } from '../hooks/useTaxonomy';
import SearchableSelect from '../components/SearchableSelect';
import QuestionCard from '../components/QuestionCard';
import LoadingSpinner from '../components/LoadingSpinner';

const PAGE_SIZE = 10;

export default function QuestionFeedPage() {
  const navigate = useNavigate();
  const { taxonomy, loading: taxonomyLoading, getTopics, getSubtopics } = useTaxonomy();

  // Filters
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [subtopic, setSubtopic] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [sortBy, setSortBy] = useState('newest');
  const [page, setPage] = useState(1);

  // Data
  const [questions, setQuestions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Derived cascading options
  const subjectOptions = taxonomy.map((s) => s.subject);
  const topicOptions = getTopics(subject);
  const subtopicOptions = getSubtopics(subject, topic);

  // Reset downstream filters when parent changes
  const handleSubjectChange = (val) => {
    setSubject(val);
    setTopic('');
    setSubtopic('');
    setPage(1);
  };
  const handleTopicChange = (val) => {
    setTopic(val);
    setSubtopic('');
    setPage(1);
  };
  const handleSubtopicChange = (val) => {
    setSubtopic(val);
    setPage(1);
  };

  const clearAllFilters = () => {
    setSubject('');
    setTopic('');
    setSubtopic('');
    setDifficulty('');
    setSortBy('newest');
    setPage(1);
  };

  const hasActiveFilters = subject || topic || subtopic || difficulty || sortBy !== 'newest';

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { page, limit: PAGE_SIZE, sortBy };
      if (subject) params.subject = subject;
      if (topic) params.topic = topic;
      if (subtopic) params.subtopic = subtopic;
      if (difficulty) params.difficulty = difficulty;
      const { data } = await apiClient.get('/questions', { params });
      setQuestions(data.questions);
      setTotal(data.total);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load questions.');
    } finally {
      setLoading(false);
    }
  }, [page, subject, topic, subtopic, difficulty, sortBy]);

  useEffect(() => {
    fetchQuestions();
  }, [fetchQuestions]);

  const handleDeleted = (deletedId) => {
    setQuestions((prev) => prev.filter((q) => q._id !== deletedId));
    setTotal((t) => t - 1);
  };

  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));

  return (
    <div className="max-w-4xl mx-auto space-y-5">
      {/* ── Filter bar ── */}
      <div className="bg-white border border-gray-200 rounded-lg p-4 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {/* Subject */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
            <SearchableSelect
              id="filter-subject"
              value={subject}
              onChange={handleSubjectChange}
              options={subjectOptions}
              placeholder="All Subjects"
              disabled={taxonomyLoading}
            />
          </div>

          {/* Topic — only enabled when subject selected */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Topic</label>
            <SearchableSelect
              id="filter-topic"
              value={topic}
              onChange={handleTopicChange}
              options={topicOptions}
              placeholder={subject ? 'All Topics' : 'Select subject first'}
              disabled={!subject || taxonomyLoading}
            />
          </div>

          {/* Subtopic — only enabled when topic selected */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Subtopic</label>
            <SearchableSelect
              id="filter-subtopic"
              value={subtopic}
              onChange={handleSubtopicChange}
              options={subtopicOptions}
              placeholder={topic ? 'All Subtopics' : 'Select topic first'}
              disabled={!topic || taxonomyLoading}
            />
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Difficulty</label>
            <SearchableSelect
              id="filter-difficulty"
              value={difficulty}
              onChange={(val) => { setDifficulty(val); setPage(1); }}
              options={['Easy', 'Medium', 'Hard']}
              placeholder="All Difficulties"
            />
          </div>

          {/* Sort */}
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Sort by</label>
            <select
              value={sortBy}
              onChange={(e) => { setSortBy(e.target.value); setPage(1); }}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="newest">Newest</option>
              <option value="popular">Popular</option>
            </select>
          </div>
        </div>

        {/* Active filter chips + clear */}
        {hasActiveFilters && (
          <div className="flex items-center gap-2 flex-wrap pt-1">
            {[
              subject && { label: subject, clear: () => handleSubjectChange('') },
              topic && { label: topic, clear: () => handleTopicChange('') },
              subtopic && { label: subtopic, clear: () => handleSubtopicChange('') },
              difficulty && { label: difficulty, clear: () => { setDifficulty(''); setPage(1); } },
              sortBy !== 'newest' && { label: `Sort: ${sortBy}`, clear: () => { setSortBy('newest'); setPage(1); } },
            ].filter(Boolean).map((chip) => (
              <span
                key={chip.label}
                className="inline-flex items-center gap-1 text-xs bg-indigo-50 text-indigo-700 border border-indigo-200 px-2 py-0.5 rounded-full"
              >
                {chip.label}
                <button onClick={chip.clear} className="hover:text-indigo-900" aria-label={`Remove ${chip.label} filter`}>
                  <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </span>
            ))}
            <button onClick={clearAllFilters} className="text-xs text-gray-400 hover:text-gray-600 underline ml-1">
              Clear all
            </button>
          </div>
        )}
      </div>

      {/* ── Result count ── */}
      {!loading && (
        <p className="text-sm text-gray-500">
          {total === 0 ? 'No questions found' : `${total} question${total !== 1 ? 's' : ''}`}
        </p>
      )}

      {/* ── Error ── */}
      {error && <div className="bg-red-50 text-red-600 text-sm rounded-md p-3">{error}</div>}

      {/* ── Loading ── */}
      {loading && <LoadingSpinner />}

      {/* ── Empty state ── */}
      {!loading && questions.length === 0 && !error && (
        <div className="text-center py-16">
          <p className="text-gray-500 mb-4">
            {hasActiveFilters ? 'No questions match your filters.' : 'No questions yet. Be the first to contribute!'}
          </p>
          {!hasActiveFilters && (
            <button
              onClick={() => navigate('/questions/new')}
              className="bg-indigo-600 text-white px-6 py-2 rounded-md text-sm font-medium hover:bg-indigo-700 transition-colors"
            >
              Create First Question
            </button>
          )}
          {hasActiveFilters && (
            <button onClick={clearAllFilters} className="text-indigo-600 text-sm underline">
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* ── Question cards ── */}
      {!loading && (
        <div className="space-y-4">
          {questions.map((q) => (
            <QuestionCard key={q._id} question={q} onDeleted={handleDeleted} />
          ))}
        </div>
      )}

      {/* ── Pagination ── */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button
            onClick={() => setPage((p) => Math.max(1, p - 1))}
            disabled={page <= 1}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            ← Previous
          </button>
          <span className="text-sm text-gray-500">Page {page} of {totalPages}</span>
          <button
            onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
            disabled={page >= totalPages}
            className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed"
          >
            Next →
          </button>
        </div>
      )}
    </div>
  );
}
