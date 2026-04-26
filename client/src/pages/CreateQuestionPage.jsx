import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import apiClient from '../api/apiClient';
import { ALLOWED_SUBJECTS, OPTION_KEYS } from '../config/constants';

export default function CreateQuestionPage() {
  const [questionText, setQuestionText] = useState('');
  const [options, setOptions] = useState({ A: '', B: '', C: '', D: '' });
  const [correctOptions, setCorrectOptions] = useState([]);
  const [subject, setSubject] = useState('');
  const [difficulty, setDifficulty] = useState('');
  const [explanation, setExplanation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

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
    if (!subject) return 'Subject is required.';
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
      await apiClient.post('/questions', {
        questionText,
        options,
        correctOptions,
        subject,
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

      <form onSubmit={handleSubmit} className="space-y-5">
        {/* Question text */}
        <div>
          <label htmlFor="questionText" className="block text-sm font-medium text-gray-700 mb-1">
            Question Text
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

        {/* Options */}
        <div className="space-y-3">
          <p className="text-sm font-medium text-gray-700">Options</p>
          {OPTION_KEYS.map((key) => (
            <div key={key} className="flex items-center gap-3">
              <input
                type="checkbox"
                id={`correct-${key}`}
                checked={correctOptions.includes(key)}
                onChange={() => toggleCorrect(key)}
                className="h-4 w-4 text-indigo-600 border-gray-300 rounded focus:ring-indigo-500"
              />
              <label htmlFor={`correct-${key}`} className="text-sm font-medium text-gray-600 w-6">
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
              <span className="text-xs text-gray-400 w-14 text-right">{options[key].length}/300</span>
            </div>
          ))}
          <p className="text-xs text-gray-400">Check the box next to each correct option.</p>
        </div>

        {/* Subject & Difficulty */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label htmlFor="subject" className="block text-sm font-medium text-gray-700 mb-1">Subject</label>
            <select
              id="subject"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full border border-gray-300 rounded-md px-3 py-2 text-sm bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
            >
              <option value="">Select subject</option>
              {ALLOWED_SUBJECTS.map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
          </div>
          <div>
            <label htmlFor="difficulty" className="block text-sm font-medium text-gray-700 mb-1">Difficulty</label>
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
        </div>

        {/* Explanation */}
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
          disabled={loading}
          className="w-full bg-indigo-600 text-white py-2 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
        >
          {loading ? 'Submitting...' : 'Create Question'}
        </button>
      </form>
    </div>
  );
}
