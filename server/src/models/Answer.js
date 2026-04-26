const mongoose = require('mongoose');

const answerSchema = new mongoose.Schema({
  user:            { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  question:        { type: mongoose.Schema.Types.ObjectId, ref: 'Question', required: true },
  selectedOptions: [{ type: String, enum: ['A', 'B', 'C', 'D'], required: true }],
  isCorrect:       { type: Boolean, required: true },
}, { timestamps: true });

// Compound unique index: one answer per user per question
answerSchema.index({ user: 1, question: 1 }, { unique: true });

module.exports = mongoose.model('Answer', answerSchema);
