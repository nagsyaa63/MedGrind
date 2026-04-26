/**
 * AdminQuestionFeed
 *
 * Admin view of all questions (including hidden).
 * Supports inline edit (question text, difficulty, isHidden) and delete.
 * Uses the same cascading filters as the user feed.
 */
import { useState, useEffect, useCallback } from 'react';
import apiClient from '../../api/apiClient';
import { useTaxonomy } from '../../hooks/useTaxonomy';
import SearchableSelect from '../SearchableSelect';
import LoadingSpinner from '../LoadingSpinner';
import { OPTION_KEYS, DIFFICULTY_COLORS } from '../../config/constants';

const PAGE_SIZE = 20;

// ─── Inline edit modal ────────────────────────────────────────────────────────

function EditModal({ question, onClose, onSaved }) {
  const [questionText, setQuestionText] = useState(question.questionText);
  const [difficulty, setDifficulty] = useState(question.difficulty);
  const [isHidden, setIsHidden] = useState(question.isHidden);
  const [explanation, setExplanation] = useState(question.explanation || '');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  const handleSave = async () => {
    if (!questionText.trim()) { setError('Question text is required.'); return; }
    setSaving(true);
    setError('');
    try {
      const { data } = await apiClient.patch(`/questions/${question._id}`, {
        questionText,
        difficulty,
        isHidden,
        explanation,
      });
      onSaved(data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to save.');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between p-5 border-b">
          <h2 className="text-base font-semibold text-gray-800">Edit Question</h2>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {error && <div className="bg-red-50 text-red-600 text-sm rounded p-3">{error}</div>}

          {/* Tags (read-only) */}
          <div className="flex items-center gap-2 flex-wrap">
            <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{question.subject}</span>
            {question.topic && <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{question.topic}</span>}
            {question.subtopic && <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{question.subtopic}</span>}
          </div>

          {/* Question text */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Question Text</label>
            <textarea
              rows={4}
              maxLength={1000}
              value={questionText}
              onChange={(e) => setQuestionText(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
            <p className="text-xs text-gray-400 text-right">{questionText.length}/1000</p>
          </div>

          {/* Options (read-only in edit — changing options requires re-validation) */}
          <div className="space-y-1">
            <p className="text-xs font-medium text-gray-600">Options (read-only)</p>
            {OPTION_KEYS.map((key) => (
              <div
                key={key}
                className={`px-3 py-2 rounded-md text-xs ${
                  question.correctOptions?.includes(key)
                    ? 'bg-green-50 border border-green-300 text-green-700'
                    : 'bg-gray-50 border border-gray-200 text-gray-600'
                }`}
              >
                <span className="font-medium mr-2">{key}.</span>{question.options?.[key]}
              </div>
            ))}
          </div>

          {/* Difficulty */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Difficulty</label>
            <select
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value)}
              className="border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              {['Easy', 'Medium', 'Hard'].map((d) => <option key={d} value={d}>{d}</option>)}
            </select>
          </div>

          {/* Explanation */}
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Explanation</label>
            <textarea
              rows={3}
              maxLength={500}
              value={explanation}
              onChange={(e) => setExplanation(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
            />
          </div>

          {/* Hidden toggle */}
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isHidden}
              onChange={(e) => setIsHidden(e.target.checked)}
              className="h-4 w-4 text-red-600 border-gray-300 rounded"
            />
            <span className="text-sm text-gray-700">Mark as hidden</span>
          </label>
        </div>

        <div className="flex justify-end gap-3 p-5 border-t">
          <button onClick={onClose} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50">
            Cancel
          </button>
          <button
            onClick={handleSave}
            disabled={saving}
            className="px-4 py-2 text-sm bg-indigo-600 text-white rounded-md hover:bg-indigo-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ─── Question row card ────────────────────────────────────────────────────────

function AdminQuestionRow({ question, onEdit, onDelete }) {
  return (
    <div className={`bg-white border rounded-lg p-4 space-y-2 ${question.isHidden ? 'border-amber-300 bg-amber-50/30' : 'border-gray-200'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{question.subject}</span>
          {question.topic && <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{question.topic}</span>}
          {question.subtopic && <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{question.subtopic}</span>}
          <span className={`text-xs px-2 py-0.5 rounded-full font-medium ${DIFFICULTY_COLORS[question.difficulty]}`}>{question.difficulty}</span>
          {question.isHidden && <span className="text-xs bg-amber-100 text-amber-700 px-2 py-0.5 rounded-full font-medium">Hidden</span>}
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button
            onClick={() => onEdit(question)}
            className="text-xs text-indigo-600 hover:text-indigo-800 border border-indigo-200 px-2.5 py-1 rounded-md transition-colors"
          >
            Edit
          </button>
          <button
            onClick={() => onDelete(question)}
            className="text-xs text-red-500 hover:text-red-700 border border-red-200 px-2.5 py-1 rounded-md transition-colors"
          >
            Delete
          </button>
        </div>
      </div>

      <p className="text-sm text-gray-800 leading-relaxed">{question.questionText}</p>

      <div className="flex items-center gap-4 text-xs text-gray-400">
        <span>By {question.author?.name || 'Unknown'}</span>
        <span>👍 {question.likeCount || 0}</span>
        <span>👎 {question.downvoteCount || 0}</span>
        <span>✅ {question.approvalCount || 0}</span>
        <span>{question.correctAttempts || 0}/{question.totalAttempts || 0} correct</span>
        <span>{question.challenges?.length || 0} challenge{question.challenges?.length !== 1 ? 's' : ''}</span>
      </div>
    </div>
  );
}

// ─── Main component ───────────────────────────────────────────────────────────

export default function AdminQuestionFeed() {
  const { taxonomy, loading: taxonomyLoading, getTopics, getSubtopics } = useTaxonomy();

  const [filters, setFilters] = useState({ subject: '', topic: '', subtopic: '', difficulty: '', sortBy: 'newest', page: 1 });
  const [questions, setQuestions] = useState([]);
  const [total, setTotal] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [editingQuestion, setEditingQuestion] = useState(null);
  const [deletingId, setDeletingId] = useState(null);

  const subjectOptions = taxonomy.map((s) => s.subject);
  const topicOptions = getTopics(filters.subject);
  const subtopicOptions = getSubtopics(filters.subject, filters.topic);

  const handleSubjectChange = (val) => setFilters((f) => ({ ...f, subject: val, topic: '', subtopic: '', page: 1 }));
  const handleTopicChange = (val) => setFilters((f) => ({ ...f, topic: val, subtopic: '', page: 1 }));

  const fetchQuestions = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = { limit: PAGE_SIZE, ...filters };
      Object.keys(params).forEach((k) => params[k] === '' && delete params[k]);
      const { data } = await apiClient.get('/admin/questions', { params });
      setQuestions(data.questions || []);
      setTotal(data.total || 0);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load questions.');
    } finally {
      setLoading(false);
    }
  }, [filters]);

  useEffect(() => { fetchQuestions(); }, [fetchQuestions]);

  const handleSaved = (updated) => {
    setQuestions((prev) => prev.map((q) => q._id === updated._id ? updated : q));
    setEditingQuestion(null);
  };

  const handleDelete = async (question) => {
    if (!window.confirm(`Delete "${question.questionText.slice(0, 60)}..."?`)) return;
    setDeletingId(question._id);
    try {
      await apiClient.delete(`/questions/${question._id}`);
      setQuestions((prev) => prev.filter((q) => q._id !== question._id));
      setTotal((t) => t - 1);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to delete.');
    } finally {
      setDeletingId(null);
    }
  };

  const totalPages = Math.ceil(total / PAGE_SIZE) || 1;

  return (
    <div className="space-y-5">
      {/* Filters */}
      <div className="bg-white border border-gray-200 rounded-lg p-4">
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Subject</label>
            <SearchableSelect value={filters.subject} onChange={handleSubjectChange} options={subjectOptions} placeholder="All" disabled={taxonomyLoading} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Topic</label>
            <SearchableSelect value={filters.topic} onChange={handleTopicChange} options={topicOptions} placeholder={filters.subject ? 'All' : '—'} disabled={!filters.subject} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Subtopic</label>
            <SearchableSelect value={filters.subtopic} onChange={(val) => setFilters((f) => ({ ...f, subtopic: val, page: 1 }))} options={subtopicOptions} placeholder={filters.topic ? 'All' : '—'} disabled={!filters.topic} />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Difficulty</label>
            <SearchableSelect value={filters.difficulty} onChange={(val) => setFilters((f) => ({ ...f, difficulty: val, page: 1 }))} options={['Easy', 'Medium', 'Hard']} placeholder="All" />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-500 mb-1">Sort</label>
            <select value={filters.sortBy} onChange={(e) => setFilters((f) => ({ ...f, sortBy: e.target.value, page: 1 }))} className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500">
              <option value="newest">Newest</option>
              <option value="popular">Popular</option>
            </select>
          </div>
        </div>
      </div>

      {/* Count */}
      {!loading && <p className="text-sm text-gray-500">{total} question{total !== 1 ? 's' : ''} (including hidden)</p>}

      {error && <div className="bg-red-50 text-red-600 text-sm rounded p-3">{error}</div>}
      {loading && <LoadingSpinner />}

      {!loading && questions.length === 0 && !error && (
        <div className="text-center py-12 text-gray-400 text-sm">No questions found.</div>
      )}

      {!loading && (
        <div className="space-y-3">
          {questions.map((q) => (
            <div key={q._id} className={deletingId === q._id ? 'opacity-40 pointer-events-none' : ''}>
              <AdminQuestionRow question={q} onEdit={setEditingQuestion} onDelete={handleDelete} />
            </div>
          ))}
        </div>
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="flex items-center justify-between pt-2">
          <button onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))} disabled={filters.page <= 1} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40">← Previous</button>
          <span className="text-sm text-gray-500">Page {filters.page} of {totalPages}</span>
          <button onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))} disabled={filters.page >= totalPages} className="px-4 py-2 text-sm border border-gray-300 rounded-md hover:bg-gray-50 disabled:opacity-40">Next →</button>
        </div>
      )}

      {/* Edit modal */}
      {editingQuestion && (
        <EditModal question={editingQuestion} onClose={() => setEditingQuestion(null)} onSaved={handleSaved} />
      )}
    </div>
  );
}
