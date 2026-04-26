const mongoose = require('mongoose');

class QuestionRepository {
  constructor(Model) {
    this.Model = Model;
  }

  async findById(id) {
    return this.Model.findById(id);
  }

  async findByIdWithPopulate(id, populates = []) {
    let query = this.Model.findById(id);
    for (const pop of populates) {
      query = query.populate(pop);
    }
    return query;
  }

  async create(data) {
    return this.Model.create(data);
  }

  async deleteById(id) {
    return this.Model.findByIdAndDelete(id);
  }

  async updateById(id, update, options = {}) {
    return this.Model.findByIdAndUpdate(id, update, { new: true, ...options });
  }

  async findWithFilters({ subject, difficulty, sortBy = 'newest', page = 1, limit = 10 }, userId) {
    const skip = (page - 1) * limit;

    const matchStage = { isHidden: false };
    if (subject) matchStage.subject = subject;
    if (difficulty) matchStage.difficulty = difficulty;

    let sortStage;
    if (sortBy === 'popular') {
      sortStage = { isAnswered: 1, likeCount: -1, createdAt: -1 };
    } else {
      sortStage = { isAnswered: 1, createdAt: -1 };
    }

    const userObjectId = new mongoose.Types.ObjectId(userId);

    const pipeline = [
      { $match: matchStage },
      {
        $lookup: {
          from: 'answers',
          let: { questionId: '$_id' },
          pipeline: [
            { $match: { $expr: { $and: [{ $eq: ['$question', '$$questionId'] }, { $eq: ['$user', userObjectId] }] } } },
            { $limit: 1 },
          ],
          as: 'userAnswer',
        },
      },
      { $addFields: { isAnswered: { $gt: [{ $size: '$userAnswer' }, 0] } } },
      { $project: { userAnswer: 0 } },
      { $sort: sortStage },
      {
        $facet: {
          questions: [{ $skip: skip }, { $limit: limit }],
          total: [{ $count: 'count' }],
        },
      },
    ];

    const [result] = await this.Model.aggregate(pipeline);
    const questions = result.questions || [];
    const total = result.total[0]?.count || 0;

    await this.Model.populate(questions, { path: 'author', select: 'name collegeName currentYear points' });

    return { questions, total };
  }

  async addChallenge(questionId, challengeData) {
    const question = await this.Model.findById(questionId);
    if (!question) return null;
    question.challenges.push(challengeData);
    await question.save();
    return question.challenges[question.challenges.length - 1];
  }

  async findChallengeById(questionId, challengeId) {
    const question = await this.Model.findById(questionId);
    if (!question) return null;
    const challenge = question.challenges.id(challengeId);
    if (!challenge) return null;
    return { question, challenge };
  }

  async updateChallenge(questionId, challengeId, update) {
    const question = await this.Model.findById(questionId);
    if (!question) return null;
    const challenge = question.challenges.id(challengeId);
    if (!challenge) return null;
    Object.assign(challenge, update);
    await question.save();
    return { question, challenge };
  }

  async findChallengedQuestions(threshold) {
    const docs = await this.Model.aggregate([
      { $match: { isHidden: false } },
      { $addFields: { challengeCount: { $size: '$challenges' } } },
      { $match: { challengeCount: { $gte: threshold } } },
      { $sort: { challengeCount: -1, createdAt: -1 } },
    ]);
    return this.Model.populate(docs, [
      { path: 'author', select: 'name collegeName' },
      { path: 'challenges.user', select: 'name' },
    ]);
  }

  async save(doc) {
    return doc.save();
  }
}

module.exports = QuestionRepository;
