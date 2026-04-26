const { toggleLike, toggleDownvote, toggleApproval } = require('../../src/services/votingService');
const AppError = require('../../src/utils/AppError');

// Mock pointsEngine
jest.mock('../../src/utils/pointsEngine', () => ({
  updatePoints: jest.fn().mockResolvedValue({}),
}));
const { updatePoints } = require('../../src/utils/pointsEngine');

const createMockQuestionRepo = (overrides = {}) => ({
  findById: jest.fn(),
  findByIdWithPopulate: jest.fn(),
  create: jest.fn(),
  deleteById: jest.fn(),
  updateById: jest.fn(),
  findWithFilters: jest.fn(),
  addChallenge: jest.fn(),
  findChallengeById: jest.fn(),
  updateChallenge: jest.fn(),
  findChallengedQuestions: jest.fn(),
  save: jest.fn().mockImplementation(async (doc) => doc),
  ...overrides,
});

const makeQuestion = (overrides = {}) => ({
  _id: 'q1',
  author: { toString: () => 'author1' },
  likes: [],
  likeCount: 0,
  downvotes: [],
  downvoteCount: 0,
  approvals: [],
  approvalCount: 0,
  isHidden: false,
  ...overrides,
});

// Helper to make array-like with pull/push/some
const makeVoteArray = (ids = []) => {
  const arr = ids.map(id => ({ toString: () => id }));
  arr.some = function (fn) { return Array.prototype.some.call(this, fn); };
  arr.pull = jest.fn(function (id) {
    const idx = this.findIndex(item => item.toString() === id);
    if (idx !== -1) this.splice(idx, 1);
  });
  arr.push = jest.fn(function (...items) { Array.prototype.push.call(this, ...items); });
  return arr;
};

describe('Voting Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('toggleLike', () => {
    it('rejects self-vote with 403', async () => {
      const question = makeQuestion({ author: { toString: () => 'u1' } });
      const qRepo = createMockQuestionRepo({ findById: jest.fn().mockResolvedValue(question) });

      try {
        await toggleLike('q1', 'u1', { questionRepository: qRepo });
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(403);
      }
    });

    it('adds like and increments likeCount', async () => {
      const question = makeQuestion({
        likes: makeVoteArray([]),
        downvotes: makeVoteArray([]),
      });
      const qRepo = createMockQuestionRepo({ findById: jest.fn().mockResolvedValue(question) });

      await toggleLike('q1', 'u2', { questionRepository: qRepo });
      expect(question.likeCount).toBe(1);
      expect(qRepo.save).toHaveBeenCalled();
      expect(updatePoints).toHaveBeenCalledWith(question.author, 'QUESTION_LIKED');
    });

    it('removes like on second toggle', async () => {
      const question = makeQuestion({
        likes: makeVoteArray(['u2']),
        likeCount: 1,
        downvotes: makeVoteArray([]),
      });
      const qRepo = createMockQuestionRepo({ findById: jest.fn().mockResolvedValue(question) });

      await toggleLike('q1', 'u2', { questionRepository: qRepo });
      expect(question.likeCount).toBe(0);
      expect(updatePoints).toHaveBeenCalledWith(question.author, 'LIKE_REMOVED');
    });

    it('removes downvote when liking (mutual exclusivity)', async () => {
      const question = makeQuestion({
        likes: makeVoteArray([]),
        downvotes: makeVoteArray(['u2']),
        downvoteCount: 1,
      });
      const qRepo = createMockQuestionRepo({ findById: jest.fn().mockResolvedValue(question) });

      await toggleLike('q1', 'u2', { questionRepository: qRepo });
      expect(question.downvoteCount).toBe(0);
      expect(question.likeCount).toBe(1);
      expect(updatePoints).toHaveBeenCalledWith(question.author, 'DOWNVOTE_REMOVED');
      expect(updatePoints).toHaveBeenCalledWith(question.author, 'QUESTION_LIKED');
    });
  });

  describe('toggleDownvote', () => {
    it('adds downvote and increments downvoteCount', async () => {
      const question = makeQuestion({
        likes: makeVoteArray([]),
        downvotes: makeVoteArray([]),
      });
      const qRepo = createMockQuestionRepo({ findById: jest.fn().mockResolvedValue(question) });

      await toggleDownvote('q1', 'u2', { questionRepository: qRepo });
      expect(question.downvoteCount).toBe(1);
      expect(updatePoints).toHaveBeenCalledWith(question.author, 'QUESTION_DOWNVOTED');
    });

    it('removes like when downvoting (mutual exclusivity)', async () => {
      const question = makeQuestion({
        likes: makeVoteArray(['u2']),
        likeCount: 1,
        downvotes: makeVoteArray([]),
      });
      const qRepo = createMockQuestionRepo({ findById: jest.fn().mockResolvedValue(question) });

      await toggleDownvote('q1', 'u2', { questionRepository: qRepo });
      expect(question.likeCount).toBe(0);
      expect(question.downvoteCount).toBe(1);
      expect(updatePoints).toHaveBeenCalledWith(question.author, 'LIKE_REMOVED');
      expect(updatePoints).toHaveBeenCalledWith(question.author, 'QUESTION_DOWNVOTED');
    });

    it('triggers auto-hide at net downvotes >= 5', async () => {
      const question = makeQuestion({
        likes: makeVoteArray([]),
        downvotes: makeVoteArray([]),
        downvoteCount: 4,
        likeCount: 0,
        isHidden: false,
      });
      const qRepo = createMockQuestionRepo({ findById: jest.fn().mockResolvedValue(question) });

      await toggleDownvote('q1', 'u2', { questionRepository: qRepo });
      expect(question.downvoteCount).toBe(5);
      expect(question.isHidden).toBe(true);
      expect(updatePoints).toHaveBeenCalledWith(question.author, 'QUESTION_AUTO_HIDDEN');
    });
  });

  describe('toggleApproval', () => {
    it('adds approval independently of likes', async () => {
      const question = makeQuestion({
        likes: makeVoteArray(['u2']),
        likeCount: 1,
        downvotes: makeVoteArray([]),
        approvals: makeVoteArray([]),
      });
      const qRepo = createMockQuestionRepo({ findById: jest.fn().mockResolvedValue(question) });

      await toggleApproval('q1', 'u2', { questionRepository: qRepo });
      expect(question.approvalCount).toBe(1);
      expect(updatePoints).toHaveBeenCalledWith(question.author, 'QUESTION_APPROVED');
    });

    it('rejects self-vote with 403', async () => {
      const question = makeQuestion({ author: { toString: () => 'u1' } });
      const qRepo = createMockQuestionRepo({ findById: jest.fn().mockResolvedValue(question) });

      try {
        await toggleApproval('q1', 'u1', { questionRepository: qRepo });
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(403);
      }
    });
  });
});
