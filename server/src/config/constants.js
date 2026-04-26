// server/src/config/constants.js

// === Point Values ===
const POINTS = {
  CORRECT_ANSWER: 10,
  ADD_QUESTION: 2,
  QUESTION_LIKED: 3,
  LIKE_REMOVED: -3,
  QUESTION_APPROVED: 5,
  APPROVAL_REMOVED: -5,
  QUESTION_DOWNVOTED: -3,
  DOWNVOTE_REMOVED: 3,
  QUESTION_AUTO_HIDDEN: -10,
  CHALLENGE_ACCEPTED: 7,
  DAILY_STREAK: 1,
};

// === Thresholds ===
const AUTO_HIDE_NET_DOWNVOTES = 5;
const CHALLENGE_THRESHOLD = 5;
const RESOLUTION_THRESHOLD = 10;

// === Pagination ===
const DEFAULT_PAGE_SIZE = 10;
const MAX_PAGE_SIZE = 50;
const LEADERBOARD_DEFAULT_LIMIT = 50;
const LEADERBOARD_MAX_LIMIT = 100;

// === Rate Limiting ===
const AUTH_RATE_LIMIT_WINDOW_MS = 15 * 60 * 1000;
const AUTH_RATE_LIMIT_MAX = 20;

// === Security ===
const BCRYPT_SALT_ROUNDS = 10;
const JWT_EXPIRY = '1d';

// === Firebase Auth Errors ===
const FIREBASE_TOKEN_MISSING_ERROR = 'Firebase ID token is required';
const FIREBASE_TOKEN_INVALID_ERROR = 'Invalid or expired Firebase token';

// === Onboarding ===
const MIN_YEAR = 1;
const MAX_YEAR = 6;

// === Field Limits ===
const MAX_QUESTION_TEXT_LENGTH = 1000;
const MAX_OPTION_TEXT_LENGTH = 300;
const MAX_EXPLANATION_LENGTH = 500;
const MAX_CHALLENGE_REASONING_LENGTH = 500;
const MAX_BIO_LENGTH = 200;

// === Enums ===
const ALLOWED_SUBJECTS = [
  'Anatomy', 'Physiology', 'Biochemistry', 'Pathology',
  'Pharmacology', 'Microbiology', 'Forensic Medicine',
  'Community Medicine', 'Medicine', 'Surgery',
  'Obstetrics & Gynecology', 'Pediatrics', 'Ophthalmology',
  'ENT', 'Orthopedics', 'Dermatology', 'Psychiatry',
  'Radiology', 'Anesthesiology', 'Other',
];
const DIFFICULTY_LEVELS = ['Easy', 'Medium', 'Hard'];
const OPTION_KEYS = ['A', 'B', 'C', 'D'];

module.exports = {
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
  JWT_EXPIRY,
  FIREBASE_TOKEN_MISSING_ERROR,
  FIREBASE_TOKEN_INVALID_ERROR,
  MIN_YEAR,
  MAX_YEAR,
  MAX_QUESTION_TEXT_LENGTH,
  MAX_OPTION_TEXT_LENGTH,
  MAX_EXPLANATION_LENGTH,
  MAX_CHALLENGE_REASONING_LENGTH,
  MAX_BIO_LENGTH,
  ALLOWED_SUBJECTS,
  DIFFICULTY_LEVELS,
  OPTION_KEYS,
};
