/**
 * collegeService.js
 *
 * Loads colleges.json at startup and serves the list from memory.
 * Read-only singleton — no DB round-trips needed for college queries.
 */

const fs = require('fs');
const path = require('path');

const DATA_FILE = path.join(__dirname, '../data/colleges.json');

// ─── Singleton ────────────────────────────────────────────────────────────────

let _colleges = null; // string[]

function _load() {
  if (_colleges) return; // already loaded

  try {
    const raw = fs.readFileSync(DATA_FILE, 'utf8');
    const data = JSON.parse(raw);

    if (!Array.isArray(data.colleges)) {
      console.warn('[colleges] Unexpected format in colleges.json — expected { colleges: [] }');
      _colleges = [];
      return;
    }

    _colleges = data.colleges;
    console.log(`[colleges] Loaded ${_colleges.length} colleges`);
  } catch (err) {
    console.error('[colleges] Failed to load colleges.json:', err.message);
    _colleges = [];
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Returns the full list of college name strings.
 * Shape: string[]
 */
function getAll() {
  _load();
  return _colleges;
}

module.exports = { getAll };
