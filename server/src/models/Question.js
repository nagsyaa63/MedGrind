const mongoose = require('mongoose');
const crypto = require('crypto');
const {
  ALLOWED_SUBJECTS,
  OPTION_KEYS,
  MAX_QUESTION_TEXT_LENGTH,
  MAX_OPTION_TEXT_LENGTH,
  MAX_EXPLANATION_LENGTH,
  MAX_CHALLENGE_REASONING_LENGTH,
} = require('../config/constants');

/**
 * Generates a stable content hash for deduplication.
 * Normalizes questionText: lowercase + collapse whitespace.
 * Stored on the document and indexed as a unique sparse field.
 */
function generateContentHash(questionText) {
  const normalized = questionText.toLowerCase().replace(/\s+/g, ' ').trim();
  return crypto.createHash('sha256').update(normalized).digest('hex');
}

const challengeSubSchema = new mongoose.Schema({
  user:                    { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  reasoning:               { type: String, default: '', maxlength: MAX_CHALLENGE_REASONING_LENGTH },
  suggestedCorrectOptions: [{ type: String, enum: OPTION_KEYS }],
  votes:                   [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  voteCount:               { type: Number, default: 0 },
  resolved:                { type: Boolean, default: false },
}, { timestamps: true });

const questionSchema = new mongoose.Schema({
  author:          { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  questionText:    { type: String, required: true, maxlength: MAX_QUESTION_TEXT_LENGTH },
  contentHash:     { type: String },  // SHA-256 of normalized questionText — deduplication key
  options: {
    A: { type: String, required: true, maxlength: MAX_OPTION_TEXT_LENGTH },
    B: { type: String, required: true, maxlength: MAX_OPTION_TEXT_LENGTH },
    C: { type: String, required: true, maxlength: MAX_OPTION_TEXT_LENGTH },
    D: { type: String, required: true, maxlength: MAX_OPTION_TEXT_LENGTH },
  },
  correctOptions:  [{ type: String, enum: OPTION_KEYS, required: true }],
  questionType:    { type: String, enum: ['single', 'multiple'], required: true },
  subject:         { type: String, required: true, enum: ALLOWED_SUBJECTS },
  topic:           { type: String, default: '' },
  subtopic:        { type: String, default: '' },
  difficulty:      { type: String, required: true, enum: ['Easy', 'Medium', 'Hard'] },
  explanation:     { type: String, default: '', maxlength: MAX_EXPLANATION_LENGTH },

  // Voting
  likes:           [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  likeCount:       { type: Number, default: 0 },
  downvotes:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  downvoteCount:   { type: Number, default: 0 },
  approvals:       [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  approvalCount:   { type: Number, default: 0 },
  isHidden:        { type: Boolean, default: false },

  // Attempts
  totalAttempts:   { type: Number, default: 0 },
  correctAttempts: { type: Number, default: 0 },

  // Challenges
  challenges:      [challengeSubSchema],
}, { timestamps: true });

// Indexes
questionSchema.index({ subject: 1, difficulty: 1 });
questionSchema.index({ subject: 1, topic: 1 });
questionSchema.index({ subject: 1, topic: 1, subtopic: 1 });
questionSchema.index({ createdAt: -1 });
questionSchema.index({ isHidden: 1 });
// Unique sparse index on contentHash — enforces deduplication at DB level.
// Sparse = existing documents without contentHash are not affected.
questionSchema.index({ contentHash: 1 }, { unique: true, sparse: true });

module.exports = mongoose.model('Question', questionSchema);
module.exports.ALLOWED_SUBJECTS = ALLOWED_SUBJECTS;
module.exports.generateContentHash = generateContentHash;
