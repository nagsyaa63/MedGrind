const mongoose = require('mongoose');
const {
  ALLOWED_SUBJECTS,
  OPTION_KEYS,
  MAX_QUESTION_TEXT_LENGTH,
  MAX_OPTION_TEXT_LENGTH,
  MAX_EXPLANATION_LENGTH,
  MAX_CHALLENGE_REASONING_LENGTH,
} = require('../config/constants');

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

module.exports = mongoose.model('Question', questionSchema);
module.exports.ALLOWED_SUBJECTS = ALLOWED_SUBJECTS;
