const { submitAnswer } = require('../../src/services/answerService');
const AppError = require('../../src/utils/AppError');

// Mock pointsEngine to avoid loading real User/UserRepository models
jest.mock('../../src/utils/pointsEngine', () => ({
  updatePoints: jest.fn().mockResolvedValue({}),
}));
const { updatePoints } = require('../../src/utils/pointsEngine');

const createMockAnswerRepo = (overrides = {}) => ({
  create: jest.fn().mockResolvedValue({ _id: 'a1', isCorrect: false }),
  findByUserAndQuestion: jest.fn(),
  ...overrides,
});

const createMockQuestionRepo = (overrides = {}) => ({
  findById: jest.fn(),
  findByIdWithPopulate: jest.fn(),
  create: jest.fn(),
  deleteById: jest.fn(),
  updateById: jest.fn().mockResolvedValue({}),
  findWithFilters: jest.fn(),
  addChallenge: jest.fn(),
  findChallengeById: jest.fn(),
  updateChallenge: jest.fn(),
  findChallengedQuestions: jest.fn(),
  save: jest.fn(),
  ...overrides,
});

const createMockUserRepo = (overrides = {}) => ({
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  findLeaderboard: jest.fn(),
  incrementFields: jest.fn().mockResolvedValue({}),
  atomicPointsUpdate: jest.fn(),
  save: jest.fn(),
  ...overrides,
});

const makeQuestion = (correctOptions = ['A']) => ({
  _id: 'q1',
  correctOptions,
  explanation: 'Test explanation',
  totalAttempts: 0,
  correctAttempts: 0,
});

describe('Answer Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('rejects empty selectedOptions with 400', async () => {
    const aRepo = createMockAnswerRepo();
    const qRepo = createMockQuestionRepo();
    const uRepo = createMockUserRepo();
    try {
      await submitAnswer('q1', 'u1', [], { answerRepository: aRepo, questionRepository: qRepo, userRepository: uRepo });
      throw new Error('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(400);
    }
  });

  it('rejects invalid option letters with 400', async () => {
    const aRepo = createMockAnswerRepo();
    const qRepo = createMockQuestionRepo();
    const uRepo = createMockUserRepo();
    try {
      await submitAnswer('q1', 'u1', ['X'], { answerRepository: aRepo, questionRepository: qRepo, userRepository: uRepo });
      throw new Error('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(400);
    }
  });

  it('rejects non-existent question with 404', async () => {
    const qRepo = createMockQuestionRepo({ findById: jest.fn().mockResolvedValue(null) });
    const aRepo = createMockAnswerRepo();
    const uRepo = createMockUserRepo();
    try {
      await submitAnswer('q1', 'u1', ['A'], { answerRepository: aRepo, questionRepository: qRepo, userRepository: uRepo });
      throw new Error('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(404);
    }
  });

  describe('isCorrect determination via set equality', () => {
    it('[A] vs [A] = true', async () => {
      const question = makeQuestion(['A']);
      const qRepo = createMockQuestionRepo({ findById: jest.fn().mockResolvedValue(question) });
      const aRepo = createMockAnswerRepo({
        create: jest.fn().mockResolvedValue({ _id: 'a1', isCorrect: true }),
      });
      const uRepo = createMockUserRepo();

      const result = await submitAnswer('q1', 'u1', ['A'], {
        answerRepository: aRepo, questionRepository: qRepo, userRepository: uRepo,
      });
      expect(result.isCorrect).toBe(true);
    });

    it('[A,B] vs [B,A] = true (order independent)', async () => {
      const question = makeQuestion(['A', 'B']);
      const qRepo = createMockQuestionRepo({ findById: jest.fn().mockResolvedValue(question) });
      const aRepo = createMockAnswerRepo({
        create: jest.fn().mockResolvedValue({ _id: 'a1', isCorrect: true }),
      });
      const uRepo = createMockUserRepo();

      const result = await submitAnswer('q1', 'u1', ['B', 'A'], {
        answerRepository: aRepo, questionRepository: qRepo, userRepository: uRepo,
      });
      expect(result.isCorrect).toBe(true);
    });

    it('[A] vs [B] = false', async () => {
      const question = makeQuestion(['A']);
      const qRepo = createMockQuestionRepo({ findById: jest.fn().mockResolvedValue(question) });
      const aRepo = createMockAnswerRepo({
        create: jest.fn().mockResolvedValue({ _id: 'a1', isCorrect: false }),
      });
      const uRepo = createMockUserRepo();

      const result = await submitAnswer('q1', 'u1', ['B'], {
        answerRepository: aRepo, questionRepository: qRepo, userRepository: uRepo,
      });
      expect(result.isCorrect).toBe(false);
    });

    it('[A,B] vs [A] = false (subset mismatch)', async () => {
      const question = makeQuestion(['A', 'B']);
      const qRepo = createMockQuestionRepo({ findById: jest.fn().mockResolvedValue(question) });
      const aRepo = createMockAnswerRepo({
        create: jest.fn().mockResolvedValue({ _id: 'a1', isCorrect: false }),
      });
      const uRepo = createMockUserRepo();

      const result = await submitAnswer('q1', 'u1', ['A'], {
        answerRepository: aRepo, questionRepository: qRepo, userRepository: uRepo,
      });
      expect(result.isCorrect).toBe(false);
    });
  });

  it('handles duplicate answer (11000 error → 409)', async () => {
    const question = makeQuestion(['A']);
    const qRepo = createMockQuestionRepo({ findById: jest.fn().mockResolvedValue(question) });
    const dupError = new Error('Duplicate');
    dupError.code = 11000;
    const aRepo = createMockAnswerRepo({ create: jest.fn().mockRejectedValue(dupError) });
    const uRepo = createMockUserRepo();

    try {
      await submitAnswer('q1', 'u1', ['A'], { answerRepository: aRepo, questionRepository: qRepo, userRepository: uRepo });
      throw new Error('Should have thrown');
    } catch (err) {
      expect(err).toBeInstanceOf(AppError);
      expect(err.statusCode).toBe(409);
    }
  });

  it('increments totalAttempts always (correct answer)', async () => {
    const question = makeQuestion(['A']);
    const qRepo = createMockQuestionRepo({ findById: jest.fn().mockResolvedValue(question) });
    const aRepo = createMockAnswerRepo({
      create: jest.fn().mockResolvedValue({ _id: 'a1', isCorrect: true }),
    });
    const uRepo = createMockUserRepo();

    await submitAnswer('q1', 'u1', ['A'], {
      answerRepository: aRepo, questionRepository: qRepo, userRepository: uRepo,
    });
    expect(qRepo.updateById).toHaveBeenCalledWith('q1', expect.objectContaining({
      $inc: expect.objectContaining({ totalAttempts: 1 }),
    }));
  });

  it('increments totalAttempts always (wrong answer)', async () => {
    const question = makeQuestion(['A']);
    const qRepo = createMockQuestionRepo({ findById: jest.fn().mockResolvedValue(question) });
    const aRepo = createMockAnswerRepo({
      create: jest.fn().mockResolvedValue({ _id: 'a1', isCorrect: false }),
    });
    const uRepo = createMockUserRepo();

    await submitAnswer('q1', 'u1', ['B'], {
      answerRepository: aRepo, questionRepository: qRepo, userRepository: uRepo,
    });
    expect(qRepo.updateById).toHaveBeenCalledWith('q1', expect.objectContaining({
      $inc: expect.objectContaining({ totalAttempts: 1 }),
    }));
  });

  it('increments correctAttempts only when correct', async () => {
    const question = makeQuestion(['A']);
    const qRepo = createMockQuestionRepo({ findById: jest.fn().mockResolvedValue(question) });
    const aRepo = createMockAnswerRepo({
      create: jest.fn().mockResolvedValue({ _id: 'a1', isCorrect: true }),
    });
    const uRepo = createMockUserRepo();

    await submitAnswer('q1', 'u1', ['A'], {
      answerRepository: aRepo, questionRepository: qRepo, userRepository: uRepo,
    });
    expect(qRepo.updateById).toHaveBeenCalledWith('q1', {
      $inc: { totalAttempts: 1, correctAttempts: 1 },
    });
  });

  it('does not increment correctAttempts when wrong', async () => {
    const question = makeQuestion(['A']);
    const qRepo = createMockQuestionRepo({ findById: jest.fn().mockResolvedValue(question) });
    const aRepo = createMockAnswerRepo({
      create: jest.fn().mockResolvedValue({ _id: 'a1', isCorrect: false }),
    });
    const uRepo = createMockUserRepo();

    await submitAnswer('q1', 'u1', ['B'], {
      answerRepository: aRepo, questionRepository: qRepo, userRepository: uRepo,
    });
    expect(qRepo.updateById).toHaveBeenCalledWith('q1', {
      $inc: { totalAttempts: 1 },
    });
  });

  it('awards 10 points only when correct', async () => {
    const question = makeQuestion(['A']);
    const qRepo = createMockQuestionRepo({ findById: jest.fn().mockResolvedValue(question) });
    const aRepo = createMockAnswerRepo({
      create: jest.fn().mockResolvedValue({ _id: 'a1', isCorrect: true }),
    });
    const uRepo = createMockUserRepo();

    await submitAnswer('q1', 'u1', ['A'], {
      answerRepository: aRepo, questionRepository: qRepo, userRepository: uRepo,
    });
    expect(updatePoints).toHaveBeenCalledWith('u1', 'CORRECT_ANSWER');
  });

  it('does not award points when wrong', async () => {
    const question = makeQuestion(['A']);
    const qRepo = createMockQuestionRepo({ findById: jest.fn().mockResolvedValue(question) });
    const aRepo = createMockAnswerRepo({
      create: jest.fn().mockResolvedValue({ _id: 'a1', isCorrect: false }),
    });
    const uRepo = createMockUserRepo();

    await submitAnswer('q1', 'u1', ['B'], {
      answerRepository: aRepo, questionRepository: qRepo, userRepository: uRepo,
    });
    expect(updatePoints).not.toHaveBeenCalled();
  });
});
