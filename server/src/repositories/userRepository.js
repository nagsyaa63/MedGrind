class UserRepository {
  constructor(Model) {
    this.Model = Model;
  }

  async findById(id, selectFields = '') {
    return this.Model.findById(id).select(selectFields);
  }

  async findByEmail(email) {
    return this.Model.findOne({ email: email.toLowerCase() });
  }

  async create(data) {
    return this.Model.create(data);
  }

  async updateById(id, updateFields, options = {}) {
    return this.Model.findByIdAndUpdate(
      id,
      { $set: updateFields },
      { new: true, runValidators: true, ...options }
    );
  }

  async findLeaderboard(limit, selectFields = 'name collegeName points correctAnswers questionsAdded', sortBy = { points: -1 }) {
    return this.Model.find().select(selectFields).sort(sortBy).limit(limit);
  }

  async incrementFields(id, incObj) {
    return this.Model.findByIdAndUpdate(id, { $inc: incObj }, { new: true });
  }

  async atomicPointsUpdate(id, delta) {
    // Atomic increment
    await this.Model.updateOne({ _id: id }, { $inc: { points: delta } });
    // Enforce floor of 0
    const user = await this.Model.findOneAndUpdate(
      { _id: id, points: { $lt: 0 } },
      { $set: { points: 0 } },
      { new: true }
    );
    if (!user) {
      return this.Model.findById(id);
    }
    return user;
  }

  async save(doc) {
    return doc.save();
  }
}

module.exports = UserRepository;
