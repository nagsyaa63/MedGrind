const {
  POINTS,
  AUTO_HIDE_NET_DOWNVOTES,
  CHALLENGE_THRESHOLD,
  RESOLUTION_THRESHOLD,
  DEFAULT_PAGE_SIZE,
  MAX_PAGE_SIZE,
  LEADERBOARD_DEFAULT_LIMIT,
  LEADERBOARD_MAX_LIMIT,
  AUTH_RATE_LIMIT_WINDOW_MS,
  AUTH_RATE_LIMIT_MAX,
  BCRYPT_SALT_ROUNDS,
  MAX_QUESTION_TEXT_LENGTH,
  MAX_OPTION_TEXT_LENGTH,
  MAX_EXPLANATION_LENGTH,
  MAX_CHALLENGE_REASONING_LENGTH,
  MAX_BIO_LENGTH,
  ALLOWED_SUBJECTS,
  DIFFICULTY_LEVELS,
  OPTION_KEYS,
} = require('../../src/config/constants');

describe('Constants', () => {
  describe('POINTS', () => {
    const expectedKeys = [
      'CORRECT_ANSWER',
      'ADD_QUESTION',
      'QUESTION_LIKED',
      'LIKE_REMOVED',
      'QUESTION_APPROVED',
      'APPROVAL_REMOVED',
      'QUESTION_DOWNVOTED',
      'DOWNVOTE_REMOVED',
      'QUESTION_AUTO_HIDDEN',
      'CHALLENGE_ACCEPTED',
      'DAILY_STREAK',
    ];

    it('has all expected keys', () => {
      for (const key of expectedKeys) {
        expect(POINTS).toHaveProperty(key);
      }
    });

    it.each([
      ['CORRECT_ANSWER', 10],
      ['ADD_QUESTION', 2],
      ['QUESTION_LIKED', 3],
      ['LIKE_REMOVED', -3],
      ['QUESTION_APPROVED', 5],
      ['APPROVAL_REMOVED', -5],
      ['QUESTION_DOWNVOTED', -3],
      ['DOWNVOTE_REMOVED', 3],
      ['QUESTION_AUTO_HIDDEN', -10],
      ['CHALLENGE_ACCEPTED', 7],
      ['DAILY_STREAK', 1],
    ])('%s has correct value %d', (key, value) => {
      expect(POINTS[key]).toBe(value);
    });
  });

  describe('ALLOWED_SUBJECTS', () => {
    it('has 20 entries', () => {
      expect(ALLOWED_SUBJECTS).toHaveLength(20);
    });

    it('includes key medical subjects', () => {
      expect(ALLOWED_SUBJECTS).toContain('Anatomy');
      expect(ALLOWED_SUBJECTS).toContain('Pharmacology');
      expect(ALLOWED_SUBJECTS).toContain('ENT (Otorhinolaryngology)');
      expect(ALLOWED_SUBJECTS).toContain('Community Medicine (PSM)');
      expect(ALLOWED_SUBJECTS).toContain('Forensic Medicine & Toxicology');
      expect(ALLOWED_SUBJECTS).toContain('Ethics, Biostatistics, Research Methodology & Jurisprudence');
    });
  });

  describe('DIFFICULTY_LEVELS', () => {
    it('has 3 entries', () => {
      expect(DIFFICULTY_LEVELS).toHaveLength(3);
    });

    it('contains Easy, Medium, Hard', () => {
      expect(DIFFICULTY_LEVELS).toEqual(['Easy', 'Medium', 'Hard']);
    });
  });

  describe('OPTION_KEYS', () => {
    it('has 4 entries [A, B, C, D]', () => {
      expect(OPTION_KEYS).toEqual(['A', 'B', 'C', 'D']);
    });
  });

  describe('Threshold values', () => {
    it.each([
      ['AUTO_HIDE_NET_DOWNVOTES', AUTO_HIDE_NET_DOWNVOTES],
      ['CHALLENGE_THRESHOLD', CHALLENGE_THRESHOLD],
      ['RESOLUTION_THRESHOLD', RESOLUTION_THRESHOLD],
    ])('%s is a positive number', (name, value) => {
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThan(0);
    });
  });

  describe('Field limit values', () => {
    it.each([
      ['MAX_QUESTION_TEXT_LENGTH', MAX_QUESTION_TEXT_LENGTH],
      ['MAX_OPTION_TEXT_LENGTH', MAX_OPTION_TEXT_LENGTH],
      ['MAX_EXPLANATION_LENGTH', MAX_EXPLANATION_LENGTH],
      ['MAX_CHALLENGE_REASONING_LENGTH', MAX_CHALLENGE_REASONING_LENGTH],
      ['MAX_BIO_LENGTH', MAX_BIO_LENGTH],
      ['DEFAULT_PAGE_SIZE', DEFAULT_PAGE_SIZE],
      ['MAX_PAGE_SIZE', MAX_PAGE_SIZE],
      ['LEADERBOARD_DEFAULT_LIMIT', LEADERBOARD_DEFAULT_LIMIT],
      ['LEADERBOARD_MAX_LIMIT', LEADERBOARD_MAX_LIMIT],
      ['AUTH_RATE_LIMIT_WINDOW_MS', AUTH_RATE_LIMIT_WINDOW_MS],
      ['AUTH_RATE_LIMIT_MAX', AUTH_RATE_LIMIT_MAX],
      ['BCRYPT_SALT_ROUNDS', BCRYPT_SALT_ROUNDS],
    ])('%s is a positive number', (name, value) => {
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThan(0);
    });
  });
});
