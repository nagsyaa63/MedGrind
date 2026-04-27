/**
 * useColleges
 *
 * Fetches the full list of college name strings from /api/colleges once
 * and caches it in module-level memory for the lifetime of the page session.
 *
 * Returns:
 *   colleges  — string[]
 *   loading   — bool
 *   error     — string | null
 */
import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

// Module-level cache — survives re-renders, cleared on page reload
let _cache = null;
let _promise = null;

async function fetchColleges() {
  if (_cache) return _cache;
  if (!_promise) {
    _promise = apiClient.get('/colleges').then(({ data }) => {
      _cache = data;
      return data;
    });
  }
  return _promise;
}

export function useColleges() {
  const [colleges, setColleges] = useState(_cache || []);
  const [loading, setLoading] = useState(!_cache);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (_cache) {
      setColleges(_cache);
      setLoading(false);
      return;
    }
    fetchColleges()
      .then((data) => {
        setColleges(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Failed to load colleges');
        setLoading(false);
      });
  }, []);

  return { colleges, loading, error };
}
