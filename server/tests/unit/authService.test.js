const { getMe } = require('../../src/services/authService');
const AppError = require('../../src/utils/AppError');

const createMockUserRepo = (overrides = {}) => ({
  findById: jest.fn(),
  findByEmail: jest.fn(),
  findByFirebaseUid: jest.fn(),
  findByEmailAndSetFirebaseUid: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  findLeaderboard: jest.fn(),
  incrementFields: jest.fn(),
  atomicPointsUpdate: jest.fn(),
  save: jest.fn(),
  ...overrides,
});

describe('Auth Service', () => {
  // NOTE: register and login were removed as part of the Firebase Google OAuth migration.
  // See authService.firebase.test.js for the new firebaseAuth tests.

  describe('getMe', () => {
    it('returns user for valid ID', async () => {
      const mockUser = { _id: 'u1', name: 'Test User' };
      const repo = createMockUserRepo({
        findById: jest.fn().mockResolvedValue(mockUser),
      });
      const result = await getMe('u1', { userRepository: repo });
      expect(result).toEqual(mockUser);
      expect(repo.findById).toHaveBeenCalledWith('u1', '-password');
    });

    it('throws 404 for non-existent user', async () => {
      const repo = createMockUserRepo({
        findById: jest.fn().mockResolvedValue(null),
      });
      try {
        await getMe('nonexistent', { userRepository: repo });
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(404);
      }
    });
  });
});
