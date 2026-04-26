class AnswerRepository {
  constructor(Model) {
    this.Model = Model;
  }

  async create(data) {
    return this.Model.create(data);
  }

  async findByUserAndQuestion(userId, questionId) {
    return this.Model.findOne({ user: userId, question: questionId });
  }
}

module.exports = AnswerRepository;
