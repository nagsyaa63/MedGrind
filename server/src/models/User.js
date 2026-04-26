const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { BCRYPT_SALT_ROUNDS, MAX_BIO_LENGTH } = require('../config/constants');

const userSchema = new mongoose.Schema({
  name:             { type: String, required: true, trim: true },
  email:            { type: String, required: true, unique: true, lowercase: true, trim: true, match: [/^[^\s@]+@[^\s@]+\.[^\s@]+$/, 'Please provide a valid email address'] },
  password:         { type: String, minlength: 6 },
  collegeName:      { type: String, trim: true },
  currentYear:      { type: Number, min: 1, max: 6 },
  firebaseUid:      { type: String },
  isOnboarded:      { type: Boolean, default: false },
  bio:              { type: String, default: '', maxlength: MAX_BIO_LENGTH },
  points:           { type: Number, default: 0, min: 0 },
  questionsAdded:   { type: Number, default: 0 },
  questionsAnswered:{ type: Number, default: 0 },
  correctAnswers:   { type: Number, default: 0 },
  streak:           { type: Number, default: 0 },
  lastActiveDate:   { type: Date, default: null },
}, { timestamps: true });

// Indexes
// NOTE: email unique index is declared inline above via `unique: true` — do NOT add it again here
userSchema.index({ points: -1 });
userSchema.index({ firebaseUid: 1 }, { unique: true, sparse: true });

// Pre-save hook for password hashing
userSchema.pre('save', async function(next) {
  if (!this.isModified('password')) return next();
  this.password = await bcrypt.hash(this.password, BCRYPT_SALT_ROUNDS);
  next();
});

// Method to compare passwords
userSchema.methods.comparePassword = async function(candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// Remove password from JSON output
userSchema.methods.toJSON = function() {
  const obj = this.toObject();
  delete obj.password;
  return obj;
};

module.exports = mongoose.model('User', userSchema);
