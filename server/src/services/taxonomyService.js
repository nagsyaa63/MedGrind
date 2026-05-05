/**
 * taxonomyService.js
 *
 * Loads all subject JSON files from server/src/data/subjects/ at startup
 * and builds an in-memory lookup map. This is a read-only singleton —
 * no DB round-trips needed for taxonomy queries.
 *
 * Map structure:
 *   subjectMap[subjectName] = {
 *     topics: [
 *       { topic: String, subtopics: [String] }
 *     ],
 *     subtopicIndex: Map<subtopicName, topicName>   ← O(1) reverse lookup
 *   }
 */

const fs = require('fs');
const path = require('path');

const DATA_DIR = path.join(__dirname, '../data/subjects');

// ─── Singleton ────────────────────────────────────────────────────────────────

let _subjectMap = null; // { [subjectName]: { topics, subtopicIndex } }
let _allSubjects = null; // string[]

function _load() {
  if (_subjectMap) return; // already loaded

  _subjectMap = {};
  _allSubjects = [];

  const files = fs.readdirSync(DATA_DIR).filter((f) => f.endsWith('.json'));

  for (const file of files) {
    try {
      const raw = fs.readFileSync(path.join(DATA_DIR, file), 'utf8');
      const data = JSON.parse(raw);
      const subjectName = data.subject;
      // Support both 'topics' (old format) and 'mappings' (new format)
      const topicsArray = data.topics || data.mappings;

      if (!subjectName || !Array.isArray(topicsArray)) {
        console.warn(`[taxonomy] Skipping malformed file: ${file}`);
        continue;
      }

      // Build reverse subtopic → topic index for O(1) lookup
      const subtopicIndex = new Map();
      for (const t of topicsArray) {
        for (const st of t.subtopics || []) {
          subtopicIndex.set(st, t.topic);
        }
      }

      _subjectMap[subjectName] = {
        topics: topicsArray,
        subtopicIndex,
      };
      _allSubjects.push(subjectName);
    } catch (err) {
      console.error(`[taxonomy] Failed to load ${file}:`, err.message);
    }
  }

  _allSubjects.sort();
  console.log(`[taxonomy] Loaded ${_allSubjects.length} subjects`);
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the full taxonomy tree for all subjects.
 * Shape: [{ subject, topics: [{ topic, subtopics: [] }] }]
 */
function getAllSubjects() {
  _load();
  return _allSubjects.map((s) => ({
    subject: s,
    topics: _subjectMap[s].topics,
  }));
}

/**
 * Returns topics for a given subject.
 * Shape: [{ topic, subtopics: [] }]
 */
function getTopicsForSubject(subject) {
  _load();
  return _subjectMap[subject]?.topics ?? [];
}

/**
 * Returns subtopics for a given subject + topic.
 * Shape: string[]
 */
function getSubtopicsForTopic(subject, topic) {
  _load();
  const entry = _subjectMap[subject];
  if (!entry) return [];
  const t = entry.topics.find((t) => t.topic === topic);
  return t?.subtopics ?? [];
}

/**
 * Given a subtopic string, resolves { subject, topic } by searching all subjects.
 * Returns null if not found.
 */
function resolveSubtopic(subtopic) {
  _load();
  for (const [subject, entry] of Object.entries(_subjectMap)) {
    const topic = entry.subtopicIndex.get(subtopic);
    if (topic) return { subject, topic };
  }
  return null;
}

/**
 * Validates that a subtopic exists under the given subject.
 * Returns { valid, topic } or { valid: false }.
 */
function validateSubtopic(subject, subtopic) {
  _load();
  const entry = _subjectMap[subject];
  if (!entry) return { valid: false };
  const topic = entry.subtopicIndex.get(subtopic);
  if (!topic) return { valid: false };
  return { valid: true, topic };
}

/**
 * Checks whether a subject name is valid.
 */
function isValidSubject(subject) {
  _load();
  return subject in _subjectMap;
}

/**
 * Checks whether a topic exists under a subject.
 */
function isValidTopic(subject, topic) {
  _load();
  const entry = _subjectMap[subject];
  if (!entry) return false;
  return entry.topics.some((t) => t.topic === topic);
}

module.exports = {
  getAllSubjects,
  getTopicsForSubject,
  getSubtopicsForTopic,
  resolveSubtopic,
  validateSubtopic,
  isValidSubject,
  isValidTopic,
};
