/**
 * AdminBulkUpload
 *
 * Allows admin to upload a CSV file with questions.
 * Shows a live result summary: inserted count, failed rows with error details.
 *
 * CSV format (download template button provided):
 *   action, question_text, option_a, option_b, option_c, option_d,
 *   correct_options, subtopic, difficulty, explanation
 */
import { useState, useRef } from 'react';
import apiClient from '../../api/apiClient';

const TEMPLATE_HEADERS = [
  'action',
  'question_text',
  'option_a',
  'option_b',
  'option_c',
  'option_d',
  'correct_options',
  'subtopic',
  'difficulty',
  'explanation',
];

const TEMPLATE_EXAMPLE = [
  'add',
  'Which nerve is most commonly injured in a mid-shaft humeral fracture?',
  'Radial nerve',
  'Ulnar nerve',
  'Median nerve',
  'Musculocutaneous nerve',
  'A',
  'Brachial Plexus',
  'Easy',
  'The radial nerve winds around the humerus in the spiral groove.',
];

function downloadTemplate() {
  const rows = [TEMPLATE_HEADERS.join(','), TEMPLATE_EXAMPLE.map(v => `"${v}"`).join(',')];
  const blob = new Blob([rows.join('\n')], { type: 'text/csv' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'medgrind_questions_template.csv';
  a.click();
  URL.revokeObjectURL(url);
}

export default function AdminBulkUpload() {
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [result, setResult] = useState(null);
  const [error, setError] = useState('');
  const [showAllFailed, setShowAllFailed] = useState(false);
  const inputRef = useRef(null);

  const handleFileChange = (e) => {
    const f = e.target.files?.[0];
    if (!f) return;
    if (!f.name.toLowerCase().endsWith('.csv')) {
      setError('Only CSV files are accepted.');
      setFile(null);
      return;
    }
    setFile(f);
    setError('');
    setResult(null);
  };

  const handleUpload = async () => {
    if (!file) return;
    setUploading(true);
    setError('');
    setResult(null);

    const formData = new FormData();
    formData.append('file', file);

    try {
      const { data } = await apiClient.post('/admin/questions/bulk', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
      setResult(data);
      setFile(null);
      if (inputRef.current) inputRef.current.value = '';
    } catch (err) {
      setError(err.response?.data?.error || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const visibleFailed = showAllFailed ? result?.failed : result?.failed?.slice(0, 20);

  return (
    <div className="space-y-6">
      {/* Instructions */}
      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 space-y-2">
        <p className="text-sm font-medium text-blue-800">CSV Format Requirements</p>
        <div className="text-xs text-blue-700 space-y-1">
          <p>Required columns (header row must match exactly):</p>
          <code className="block bg-blue-100 rounded px-2 py-1 font-mono text-xs break-all">
            {TEMPLATE_HEADERS.join(', ')}
          </code>
          <ul className="list-disc list-inside space-y-0.5 mt-2">
            <li><strong>action</strong> — must be <code>add</code></li>
            <li><strong>correct_options</strong> — comma-separated, e.g. <code>A</code> or <code>A,C</code></li>
            <li><strong>subtopic</strong> — must exactly match a subtopic in the taxonomy</li>
            <li><strong>difficulty</strong> — one of <code>Easy</code>, <code>Medium</code>, <code>Hard</code></li>
            <li><strong>explanation</strong> — optional, can be empty</li>
          </ul>
        </div>
        <button
          onClick={downloadTemplate}
          className="inline-flex items-center gap-1.5 text-xs text-blue-700 font-medium hover:text-blue-900 underline mt-1"
        >
          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
          </svg>
          Download template CSV
        </button>
      </div>

      {/* Upload area */}
      <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
        <div
          className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center hover:border-indigo-400 transition-colors cursor-pointer"
          onClick={() => inputRef.current?.click()}
        >
          <svg className="w-10 h-10 mx-auto text-gray-300 mb-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
          </svg>
          {file ? (
            <div>
              <p className="text-sm font-medium text-indigo-600">{file.name}</p>
              <p className="text-xs text-gray-400 mt-1">{(file.size / 1024).toFixed(1)} KB</p>
            </div>
          ) : (
            <div>
              <p className="text-sm text-gray-500">Click to select a CSV file</p>
              <p className="text-xs text-gray-400 mt-1">Max 50 MB</p>
            </div>
          )}
          <input
            ref={inputRef}
            type="file"
            accept=".csv,text/csv"
            onChange={handleFileChange}
            className="hidden"
          />
        </div>

        {error && (
          <div className="bg-red-50 text-red-600 text-sm rounded p-3">{error}</div>
        )}

        <button
          onClick={handleUpload}
          disabled={!file || uploading}
          className="w-full bg-indigo-600 text-white py-2.5 rounded-md text-sm font-medium hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center justify-center gap-2"
        >
          {uploading ? (
            <>
              <svg className="animate-spin w-4 h-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
              Processing...
            </>
          ) : (
            'Upload & Process'
          )}
        </button>
      </div>

      {/* Result summary */}
      {result && (
        <div className="bg-white border border-gray-200 rounded-lg p-6 space-y-4">
          <p className="text-sm font-semibold text-gray-800">Upload Result</p>

          <div className="grid grid-cols-3 gap-4">
            <div className="bg-green-50 border border-green-200 rounded-lg p-4 text-center">
              <p className="text-3xl font-bold text-green-600">{result.inserted}</p>
              <p className="text-xs text-green-700 mt-1">Inserted</p>
            </div>
            <div className={`border rounded-lg p-4 text-center ${result.skipped?.length > 0 ? 'bg-amber-50 border-amber-200' : 'bg-gray-50 border-gray-200'}`}>
              <p className={`text-3xl font-bold ${result.skipped?.length > 0 ? 'text-amber-600' : 'text-gray-400'}`}>{result.skipped?.length || 0}</p>
              <p className={`text-xs mt-1 ${result.skipped?.length > 0 ? 'text-amber-700' : 'text-gray-500'}`}>Duplicates skipped</p>
            </div>
            <div className={`border rounded-lg p-4 text-center ${result.failed.length > 0 ? 'bg-red-50 border-red-200' : 'bg-gray-50 border-gray-200'}`}>
              <p className={`text-3xl font-bold ${result.failed.length > 0 ? 'text-red-600' : 'text-gray-400'}`}>{result.failed.length}</p>
              <p className={`text-xs mt-1 ${result.failed.length > 0 ? 'text-red-700' : 'text-gray-500'}`}>Errors</p>
            </div>
          </div>

          {result.skipped?.length > 0 && (
            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-700">
              <p className="font-medium mb-1">ℹ️ {result.skipped.length} duplicate{result.skipped.length !== 1 ? 's' : ''} skipped</p>
              <p>These questions already exist in the database (matched by question text). No action taken — existing data is unchanged.</p>
            </div>
          )}

          {result.failed.length > 0 && (
            <div className="space-y-2">
              <p className="text-xs font-medium text-gray-600 uppercase tracking-wide">Failed rows</p>
              <div className="border border-red-100 rounded-lg overflow-hidden">
                <table className="w-full text-xs">
                  <thead className="bg-red-50">
                    <tr>
                      <th className="text-left px-3 py-2 text-red-700 font-medium w-16">Row</th>
                      <th className="text-left px-3 py-2 text-red-700 font-medium">Error</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-red-50">
                    {visibleFailed.map((f) => (
                      <tr key={f.row} className="bg-white">
                        <td className="px-3 py-2 text-gray-500 font-mono">{f.row}</td>
                        <td className="px-3 py-2 text-red-600">{f.error}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              {result.failed.length > 20 && (
                <button
                  onClick={() => setShowAllFailed((v) => !v)}
                  className="text-xs text-indigo-600 hover:text-indigo-800 underline"
                >
                  {showAllFailed ? 'Show less' : `Show all ${result.failed.length} failed rows`}
                </button>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
