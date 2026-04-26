/**
 * useTaxonomy
 *
 * Fetches the full subject→topic→subtopic tree from /api/taxonomy once
 * and caches it in module-level memory for the lifetime of the page session.
 *
 * Returns:
 *   taxonomy   — [{ subject, topics: [{ topic, subtopics: [] }] }]
 *   loading    — bool
 *   error      — string | null
 *   getTopics(subject)          — string[]
 *   getSubtopics(subject, topic) — string[]
 *   getAllSubtopics()            — string[] (flat list of all subtopics across all subjects)
 */
import { useState, useEffect } from 'react';
import apiClient from '../api/apiClient';

// Module-level cache — survives re-renders, cleared on page reload
let _cache = null;
let _promise = null;

async function fetchTaxonomy() {
  if (_cache) return _cache;
  if (!_promise) {
    _promise = apiClient.get('/taxonomy').then(({ data }) => {
      _cache = data;
      return data;
    });
  }
  return _promise;
}

export function useTaxonomy() {
  const [taxonomy, setTaxonomy] = useState(_cache || []);
  const [loading, setLoading] = useState(!_cache);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (_cache) {
      setTaxonomy(_cache);
      setLoading(false);
      return;
    }
    fetchTaxonomy()
      .then((data) => {
        setTaxonomy(data);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.response?.data?.error || 'Failed to load taxonomy');
        setLoading(false);
      });
  }, []);

  const getTopics = (subject) => {
    if (!subject) return [];
    const entry = taxonomy.find((s) => s.subject === subject);
    return entry?.topics.map((t) => t.topic) ?? [];
  };

  const getSubtopics = (subject, topic) => {
    if (!subject || !topic) return [];
    const entry = taxonomy.find((s) => s.subject === subject);
    const t = entry?.topics.find((t) => t.topic === topic);
    return t?.subtopics ?? [];
  };

  const getAllSubtopics = () => {
    const result = [];
    for (const s of taxonomy) {
      for (const t of s.topics) {
        result.push(...t.subtopics);
      }
    }
    return result;
  };

  return { taxonomy, loading, error, getTopics, getSubtopics, getAllSubtopics };
}
