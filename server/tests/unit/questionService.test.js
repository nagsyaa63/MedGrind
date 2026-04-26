const { createQuestion, deleteQuestion, getChallengedQuestions } = require('../../src/services/questionService');
const AppError = require('../../src/utils/AppError');

// Mock pointsEngine
jest.mock('../../src/utils/pointsEngine', () => ({
  updatePoints: jest.fn().mockResolvedValue({}),
}));

// Mock taxonomyService so tests don't depend on JSON files on disk
jest.mock('../../src/services/taxonomyService', () => ({
  resolveSubtopic: jest.fn((subtopic) => {
    if (subtopic === 'Mitochondria and Oxidative Phosphorylation') {
      return { subject: 'Biochemistry', topic: 'Bioenergetics' };
    }
    if (subtopic === 'Brachial Plexus') {
      return { subject: 'Anatomy', topic: 'Upper Limb' };
    }
    return null; // unknown subtopic
  }),
}));

const createMockQuestionRepo = (overrides = {}) => ({
  findById: jest.fn(),
  findByIdWithPopulate: jest.fn(),
  create: jest.fn().mockResolvedValue({ _id: 'q1', questionText: 'Test' }),
  deleteById: jest.fn().mockResolvedValue({}),
  updateById: jest.fn(),
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

// Valid input now uses subtopic (subject is derived from taxonomy)
const validQuestionData = {
  questionText: 'What is the powerhouse of the cell?',
  options: {
    A: 'Nucleus',
    B: 'Mitochondria',
    C: 'Ribosome',
    D: 'Golgi apparatus',
  },
  correctOptions: ['B'],
  subtopic: 'Mitochondria and Oxidative Phosphorylation',
  difficulty: 'Easy',
  explanation: 'Mitochondria produce ATP.',
};

describe('Question Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createQuestion', () => {
    it('rejects missing required fields with 400', async () => {
      const qRepo = createMockQuestionRepo();
      const uRepo = createMockUserRepo();
      await expect(
        createQuestion({ questionText: 'Test' }, 'u1', { questionRepository: qRepo, userRepository: uRepo })
      ).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/Missing required fields/) });
    });

    it('rejects invalid option keys with 400', async () => {
      const qRepo = createMockQuestionRepo();
      const uRepo = createMockUserRepo();
      await expect(
        createQuestion({ ...validQuestionData, options: { A: 'a', B: 'b', C: 'c', E: 'e' } }, 'u1', {
          questionRepository: qRepo, userRepository: uRepo,
        })
      ).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/keys A, B, C, D/) });
    });

    it('rejects questionText > 1000 chars with 400', async () => {
      const qRepo = createMockQuestionRepo();
      const uRepo = createMockUserRepo();
      await expect(
        createQuestion({ ...validQuestionData, questionText: 'x'.repeat(1001) }, 'u1', {
          questionRepository: qRepo, userRepository: uRepo,
        })
      ).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/1000/) });
    });

    it('rejects option text > 300 chars with 400', async () => {
      const qRepo = createMockQuestionRepo();
      const uRepo = createMockUserRepo();
      await expect(
        createQuestion({ ...validQuestionData, options: { A: 'x'.repeat(301), B: 'b', C: 'c', D: 'd' } }, 'u1', {
          questionRepository: qRepo, userRepository: uRepo,
        })
      ).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/300/) });
    });

    it('rejects invalid subtopic with 400', async () => {
      const qRepo = createMockQuestionRepo();
      const uRepo = createMockUserRepo();
      await expect(
        createQuestion({ ...validQuestionData, subtopic: 'Astrology 101' }, 'u1', {
          questionRepository: qRepo, userRepository: uRepo,
        })
      ).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/Invalid subtopic/) });
    });

    it('rejects invalid difficulty with 400', async () => {
      const qRepo = createMockQuestionRepo();
      const uRepo = createMockUserRepo();
      await expect(
        createQuestion({ ...validQuestionData, difficulty: 'Extreme' }, 'u1', {
          questionRepository: qRepo, userRepository: uRepo,
        })
      ).rejects.toMatchObject({ statusCode: 400, message: expect.stringMatching(/Easy, Medium, or Hard/) });
    });

    it('resolves subject and topic from subtopic and stores them', async () => {
      const qRepo = createMockQuestionRepo();
      const uRepo = createMockUserRepo();

      await createQuestion(validQuestionData, 'u1', { questionRepository: qRepo, userRepository: uRepo });

      expect(qRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({
          subject: 'Biochemistry',
          topic: 'Bioenergetics',
          subtopic: 'Mitochondria and Oxidative Phosphorylation',
        })
      );
    });

    it('sets questionType to single for 1 correct option', async () => {
      const qRepo = createMockQuestionRepo();
      const uRepo = createMockUserRepo();

      await createQuestion(validQuestionData, 'u1', { questionRepository: qRepo, userRepository: uRepo });

      expect(qRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ questionType: 'single' })
      );
    });

    it('sets questionType to multiple for 2+ correct options', async () => {
      const qRepo = createMockQuestionRepo();
      const uRepo = createMockUserRepo();

      await createQuestion({ ...validQuestionData, correctOptions: ['A', 'B'] }, 'u1', {
        questionRepository: qRepo, userRepository: uRepo,
      });

      expect(qRepo.create).toHaveBeenCalledWith(
        expect.objectContaining({ questionType: 'multiple' })
      );
    });
  });

  describe('deleteQuestion', () => {
    it('throws 404 for non-existent question', async () => {
      const qRepo = createMockQuestionRepo({ findById: jest.fn().mockResolvedValue(null) });
      await expect(deleteQuestion('q1', 'u1', { questionRepository: qRepo }))
        .rejects.toMatchObject({ statusCode: 404 });
    });

    it('throws 403 for non-author', async () => {
      const qRepo = createMockQuestionRepo({
        findById: jest.fn().mockResolvedValue({ _id: 'q1', author: { toString: () => 'author1' } }),
      });
      await expect(deleteQuestion('q1', 'u2', { questionRepository: qRepo }))
        .rejects.toMatchObject({ statusCode: 403 });
    });

    it('deletes for author', async () => {
      const qRepo = createMockQuestionRepo({
        findById: jest.fn().mockResolvedValue({ _id: 'q1', author: { toString: () => 'u1' } }),
      });
      const result = await deleteQuestion('q1', 'u1', { questionRepository: qRepo });
      expect(result).toEqual({ message: 'Question deleted' });
      expect(qRepo.deleteById).toHaveBeenCalledWith('q1');
    });
  });

  describe('getChallengedQuestions', () => {
    it('returns paginated result from repository', async () => {
      const mockResult = { questions: [{ _id: 'q1', challengeCount: 3 }], total: 1, page: 1, limit: 10 };
      const qRepo = createMockQuestionRepo({
        findChallengedQuestions: jest.fn().mockResolvedValue(mockResult),
      });

      const result = await getChallengedQuestions({}, 'u1', { questionRepository: qRepo });
      expect(result).toEqual(mockResult);
      expect(qRepo.findChallengedQuestions).toHaveBeenCalledWith(
        expect.objectContaining({ page: 1, limit: 10, sortBy: 'mostChallenged' })
      );
    });

    it('passes subject and difficulty filters through', async () => {
      const qRepo = createMockQuestionRepo({
        findChallengedQuestions: jest.fn().mockResolvedValue({ questions: [], total: 0, page: 1, limit: 10 }),
      });
      await getChallengedQuestions({ subject: 'Anatomy', difficulty: 'Hard' }, 'u1', { questionRepository: qRepo });
      expect(qRepo.findChallengedQuestions).toHaveBeenCalledWith(
        expect.objectContaining({ subject: 'Anatomy', difficulty: 'Hard' })
      );
    });

    it('clamps limit to MAX_PAGE_SIZE', async () => {
      const qRepo = createMockQuestionRepo({
        findChallengedQuestions: jest.fn().mockResolvedValue({ questions: [], total: 0, page: 1, limit: 50 }),
      });
      await getChallengedQuestions({ limit: '999' }, 'u1', { questionRepository: qRepo });
      expect(qRepo.findChallengedQuestions).toHaveBeenCalledWith(
        expect.objectContaining({ limit: 50 })
      );
    });
  });
});
