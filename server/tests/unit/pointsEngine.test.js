const { updatePoints, POINTS } = require('../../src/utils/pointsEngine');

const createMockUserRepo = (overrides = {}) => ({
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  findLeaderboard: jest.fn(),
  incrementFields: jest.fn(),
  atomicPointsUpdate: jest.fn().mockResolvedValue({ _id: 'u1', points: 100 }),
  save: jest.fn(),
  ...overrides,
});

describe('Points Engine', () => {
  describe('POINTS map', () => {
    it('has exactly 11 point actions defined', () => {
      expect(Object.keys(POINTS)).toHaveLength(11);
    });

    it.each([
      ['CORRECT_ANSWER', 10],
      ['ADD_QUESTION', 2],
      ['QUESTION_LIKED', 3],
      ['LIKE_REMOVED', -3],
      ['QUESTION_APPROVED', 5],
      ['APPROVAL_REMOVED', -5],
      ['QUESTION_DOWNVOTED', -3],
      ['DOWNVOTE_REMOVED', 3],
      ['QUESTION_AUTO_HIDDEN', -10],
      ['CHALLENGE_ACCEPTED', 7],
      ['DAILY_STREAK', 1],
    ])('%s maps to %d', (action, expected) => {
      expect(POINTS[action]).toBe(expected);
    });
  });

  describe('updatePoints', () => {
    it('throws an error for unknown action', async () => {
      const mockRepo = createMockUserRepo();
      await expect(
        updatePoints('u1', 'NONEXISTENT_ACTION', { userRepository: mockRepo })
      ).rejects.toThrow('Unknown points action: NONEXISTENT_ACTION');
    });

    it('calls atomicPointsUpdate with correct userId and delta for CORRECT_ANSWER', async () => {
      const mockRepo = createMockUserRepo();
      await updatePoints('u1', 'CORRECT_ANSWER', { userRepository: mockRepo });
      expect(mockRepo.atomicPointsUpdate).toHaveBeenCalledWith('u1', 10);
    });

    it('calls atomicPointsUpdate with correct delta for QUESTION_DOWNVOTED', async () => {
      const mockRepo = createMockUserRepo();
      await updatePoints('u1', 'QUESTION_DOWNVOTED', { userRepository: mockRepo });
      expect(mockRepo.atomicPointsUpdate).toHaveBeenCalledWith('u1', -3);
    });

    it('calls atomicPointsUpdate with correct delta for QUESTION_AUTO_HIDDEN', async () => {
      const mockRepo = createMockUserRepo();
      await updatePoints('u1', 'QUESTION_AUTO_HIDDEN', { userRepository: mockRepo });
      expect(mockRepo.atomicPointsUpdate).toHaveBeenCalledWith('u1', -10);
    });

    it('returns the result from atomicPointsUpdate', async () => {
      const mockRepo = createMockUserRepo({
        atomicPointsUpdate: jest.fn().mockResolvedValue({ _id: 'u1', points: 50 }),
      });
      const result = await updatePoints('u1', 'ADD_QUESTION', { userRepository: mockRepo });
      expect(result).toEqual({ _id: 'u1', points: 50 });
    });
  });
});
