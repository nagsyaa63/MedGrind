import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { useTaxonomy } from '../hooks/useTaxonomy';
import SearchableSelect from '../components/SearchableSelect';
import { OPTION_KEYS } from '../config/constants';

export default function CreateQuestionPage() {
  const navigate = useNavigate();
  const { taxonomy, loading: taxonomyLoading, getTopics, getSubtopics } = useTaxonomy();

  // Taxonomy selection (cascading)
  const [subject, setSubject] = useState('');
  const [topic, setTopic] = useState('');
  const [subtopic, setSubtopic] = useState('');

  // Question fields
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState({ A: '', B: '', C: '', D: '' });
  const [correctOptions, setCorrectOptions] = useState([]);
  const [difficulty, setDifficulty] = useState('');
  const [explanation, setExplanation] = useState('');

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  // Derived cascading options
  const subjectOptions = taxonomy.map((s) => s.subject);
  const topicOptions = getTopics(subject);
  const subtopicOptions = getSubtopics(subject, topic);

  const handleSubjectChange = (val) => {
    setSubject(val);
    setTopic('');
    setSubtopic('');
  };
  const handleTopicChange = (val) => {
    setTopic(val);
    setSubtopic('');
  };

  const handleOptionChange = (key, value) => {
    setOptions((prev) => ({ ...prev, [key]: value }));
  };

  const toggleCorrect = (key) => {
    setCorrectOptions((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const validate = () => {
    if (!questionText.trim()) return 'Question text is required.';
    if (questionText.length > 1000) return 'Question text must not exceed 1000 characters.';
    for (const key of OPTION_KEYS) {
      if (!options[key].trim()) return `Option ${key} is required.`;
      if (options[key].length > 300) return `Option ${key} must not exceed 300 characters.`;
    }
    if (correctOptions.length === 0) return 'Select at least one correct option.';
    if (!subtopic) return 'Subtopic is required. Please select Subject → Topic → Subtopic.';
    if (!difficulty) return 'Difficulty is required.';
    if (explanation.length > 500) return 'Explanation must not exceed 500 characters.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }
    setError('');
    setLoading(true);
    try {
      // Send subtopic only — backend resolves subject + topic from taxonomy
      await apiClient.post('/questions', {
        questionText,
        options,
        correctOptions,
        subtopic,
        difficulty,
        explanation: explanation || undefined,
      });
      navigate('/questions');
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to create question.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-gray-800 mb-6">Create Question</h1>

      {error && (
        <div className="bg-red-50 text-red-600 text-sm rounded-md p-3 mb-4">{error}</div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6" noValidate>

        {/* ── Taxonomy selection ── */}
        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 space-y-4">
          <p className="text-sm font-medium text-gray-700">Tag this question</p>
          <p className="text-xs text-gray-500 -mt-2">
            Select Subject → Topic → Subtopic. The question will be tagged and filterable by all three.
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            {/* Subject */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Subject</label>
              <SearchableSelect
                id="create-subject"
                value={subject}
                onChange={handleSubjectChange}
                options={subjectOptions}
                placeholder="Select subject"
                disabled={taxonomyLoading}
              />
            </div>

            {/* Topic */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Topic</label>
              <SearchableSelect
                id="create-topic"
                value={topic}
                onChange={handleTopicChange}
                options={topicOptions}
                placeholder={subject ? 'Select topic' : '—'}
                disabled={!subject || taxonomyLoading}
              />
            </div>

            {/* Subtopic */}
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">
                Subtopic <span className="text-red-500">*</span>
              </label>
              <SearchableSelect
                id="create-subtopic"
                value={subtopic}
                onChange={setSubtopic}
                options={subtopicOptions}
                placeholder={topic ? 'Select subtopic' : '—'}
                disabled={!topic || taxonomyLoading}
              />
            </div>
          </div>

          {/* Resolved tag preview */}
          {subtopic && (
            <div className="flex items-center gap-2 flex-wrap pt-1">
              <span className="text-xs text-gray-500">Tagged as:</span>
              <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full">{subject}</span>
              <span className="text-gray-300 text-xs">›</span>
              <span className="text-xs bg-indigo-50 text-indigo-600 px-2 py-0.5 rounded-full">{topic}</span>
              <span className="text-gray-300 text-xs">›</span>
              <span className="text-xs bg-purple-50 text-purple-600 px-2 py-0.5 rounded-full">{subtopic}</span>
            </div>
          )}
        </div>

        {/* ── Question text ── */}
        <div>
          <label htmlFor="questionText" className="block text-sm font-medium text-gray-700 mb-1">
            Question Text <span className="text-red-500">*</span>
          </label>
          <textarea
            id="questionText"
            rows={4}
            maxLength={1000}
            value={questionText}
            onChange={(e) => setQuestionText(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            placeholder="Enter your question..."
          />
          <p className="text-xs text-gray-400 text-right mt-1">{questionText.length}/1000</p>
        </div>

        {/* ── Options ── */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">
            Options <span className="text-xs font-normal text-gray-400">(check correct answer(s))</span>
          </p>
          {OPTION_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-3">
              <input
                type="checkbox"
                id={`correct-${key}`}
                checked={correctOptions.includes(key)}
                onChange={() => toggleCorrect(key)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor={`correct-${key}`} className="text-sm font-medium text-gray-600 w-6 shrink-0">
                {key}
              </label>
              <input
                type="text"
                maxLength={300}
                value={options[key]}
                onChange={(e) => handleOptionChange(key, e.target.value)}
                className="flex-1 border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent"
                placeholder={`Option ${key}`}
              />
              <span className="text-xs text-gray-400 w-14 text-right shrink-0">{options[key].length}/300</span>
            </div>
          ))}
        </div>

        {/* ── Difficulty ── */}
        <div className="max-w-xs">
          <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">
            Difficulty <span className="text-red-500">*</span>
          </label>
          <select
            id="difficulty"
            value={difficulty}
            onChange={(e) => setDifficulty(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
          >
            <option value="">Select difficulty</option>
            {['Easy', 'Medium', 'Hard'].map((d) => (
              <option key={d} value={d}>{d}</option>
            ))}
          </select>
        </div>

        {/* ── Explanation ── */}
        <div>
          <label htmlFor="explanation" className="block text-sm font-medium text-gray-700 mb-1">
            Explanation <span className="text-gray-400 font-normal">(optional)</span>
          </label>
          <textarea
            id="explanation"
            rows={3}
            maxLength={500}
            value={explanation}
            onChange={(e) => setExplanation(e.target.value)}
            className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent resize-none"
            placeholder="Explain the correct answer..."
          />
          <p className="text-xs text-gray-400 text-right mt-1">{explanation.length}/500</p>
        </div>

        <button
          type="submit"
          disabled={loading || taxonomyLoading}
          className="w-full bg-indigo-600 text-white py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Submitting...' : 'Create Question'}
        </button>
      </form>
    </div>
  );
}
