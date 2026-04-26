const { createChallenge, voteChallenge } = require('../../src/services/challengeService');
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

describe('Challenge Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('createChallenge', () => {
    it('rejects reasoning > 500 chars with 400', async () => {
      const qRepo = createMockQuestionRepo();
      try {
        await createChallenge('q1', 'u1', {
          reasoning: 'x'.repeat(501),
          suggestedCorrectOptions: ['A'],
        }, { questionRepository: qRepo });
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(400);
        expect(err.message).toMatch(/500/);
      }
    });

    it('rejects empty suggestedCorrectOptions with 400', async () => {
      const qRepo = createMockQuestionRepo();
      try {
        await createChallenge('q1', 'u1', {
          reasoning: 'Valid reasoning',
          suggestedCorrectOptions: [],
        }, { questionRepository: qRepo });
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(400);
      }
    });

    it('rejects invalid option letters with 400', async () => {
      const qRepo = createMockQuestionRepo();
      try {
        await createChallenge('q1', 'u1', {
          reasoning: 'Valid reasoning',
          suggestedCorrectOptions: ['X'],
        }, { questionRepository: qRepo });
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(400);
      }
    });

    it('creates challenge on valid input', async () => {
      const mockChallenge = { _id: 'c1', user: 'u1', suggestedCorrectOptions: ['B'] };
      const qRepo = createMockQuestionRepo({
        addChallenge: jest.fn().mockResolvedValue(mockChallenge),
      });

      const result = await createChallenge('q1', 'u1', {
        reasoning: 'I think B is correct',
        suggestedCorrectOptions: ['B'],
      }, { questionRepository: qRepo });

      expect(result).toEqual(mockChallenge);
      expect(qRepo.addChallenge).toHaveBeenCalledWith('q1', {
        user: 'u1',
        reasoning: 'I think B is correct',
        suggestedCorrectOptions: ['B'],
      });
    });

    it('throws 404 for non-existent question', async () => {
      const qRepo = createMockQuestionRepo({
        addChallenge: jest.fn().mockResolvedValue(null),
      });

      try {
        await createChallenge('q1', 'u1', {
          reasoning: 'Reason',
          suggestedCorrectOptions: ['A'],
        }, { questionRepository: qRepo });
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(404);
      }
    });
  });

  describe('voteChallenge', () => {
    it('throws 404 for non-existent question/challenge', async () => {
      const qRepo = createMockQuestionRepo({
        findChallengeById: jest.fn().mockResolvedValue(null),
      });

      try {
        await voteChallenge('q1', 'c1', 'u1', { questionRepository: qRepo });
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(404);
      }
    });

    it('throws 400 if any challenge is already resolved', async () => {
      const qRepo = createMockQuestionRepo({
        findChallengeById: jest.fn().mockResolvedValue({
          question: {
            challenges: [
              { resolved: true, suggestedCorrectOptions: ['A'], voteCount: 10, votes: [] },
            ],
          },
          challenge: {
            votes: [],
            voteCount: 0,
            suggestedCorrectOptions: ['B'],
          },
        }),
      });

      try {
        await voteChallenge('q1', 'c1', 'u1', { questionRepository: qRepo });
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(400);
        expect(err.message).toMatch(/already been resolved/);
      }
    });

    it('throws 409 on duplicate vote', async () => {
      const qRepo = createMockQuestionRepo({
        findChallengeById: jest.fn().mockResolvedValue({
          question: {
            challenges: [
              { resolved: false, suggestedCorrectOptions: ['B'], voteCount: 1, votes: [{ toString: () => 'u1' }] },
            ],
          },
          challenge: {
            votes: [{ toString: () => 'u1' }],
            voteCount: 1,
            suggestedCorrectOptions: ['B'],
          },
        }),
      });

      try {
        await voteChallenge('q1', 'c1', 'u1', { questionRepository: qRepo });
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(409);
      }
    });

    it('records vote and increments voteCount', async () => {
      const challenge = {
        votes: [],
        voteCount: 0,
        suggestedCorrectOptions: ['B'],
      };
      challenge.votes.some = function (fn) { return Array.prototype.some.call(this, fn); };
      challenge.votes.push = jest.fn(function (...items) { Array.prototype.push.call(this, ...items); });

      const question = {
        challenges: [challenge],
        correctOptions: ['A'],
        questionType: 'single',
      };

      const qRepo = createMockQuestionRepo({
        findChallengeById: jest.fn().mockResolvedValue({ question, challenge }),
      });

      const result = await voteChallenge('q1', 'c1', 'u2', { questionRepository: qRepo });
      expect(challenge.voteCount).toBe(1);
      expect(challenge.votes.push).toHaveBeenCalledWith('u2');
      expect(qRepo.save).toHaveBeenCalledWith(question);
    });

    it('triggers resolution when group votes reach RESOLUTION_THRESHOLD', async () => {
      const challenge = {
        votes: [],
        voteCount: 9,
        suggestedCorrectOptions: ['B'],
        user: 'challenger1',
      };
      challenge.votes.some = function (fn) { return Array.prototype.some.call(this, fn); };
      challenge.votes.push = jest.fn(function (...items) { Array.prototype.push.call(this, ...items); });
      challenge.resolved = false;

      const question = {
        challenges: [challenge],
        correctOptions: ['A'],
        questionType: 'single',
      };

      const qRepo = createMockQuestionRepo({
        findChallengeById: jest.fn().mockResolvedValue({ question, challenge }),
      });

      const result = await voteChallenge('q1', 'c1', 'u10', { questionRepository: qRepo });
      expect(challenge.voteCount).toBe(10);
      expect(result.resolved).toBe(true);
      expect(question.correctOptions).toEqual(['B']);
      expect(challenge.resolved).toBe(true);
      expect(updatePoints).toHaveBeenCalledWith('challenger1', 'CHALLENGE_ACCEPTED');
    });
  });
});
