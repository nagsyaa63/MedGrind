const { getProfile, updateProfile, getLeaderboard, updateStreak } = require('../../src/services/userService');
const AppError = require('../../src/utils/AppError');

// Mock pointsEngine
jest.mock('../../src/utils/pointsEngine', () => ({
  updatePoints: jest.fn().mockResolvedValue({}),
}));
const { updatePoints } = require('../../src/utils/pointsEngine');

const createMockUserRepo = (overrides = {}) => ({
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  findLeaderboard: jest.fn().mockResolvedValue([]),
  incrementFields: jest.fn(),
  atomicPointsUpdate: jest.fn(),
  save: jest.fn().mockImplementation(async (doc) => doc),
  ...overrides,
});

describe('User Service', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  describe('getProfile', () => {
    it('returns user without password', async () => {
      const mockUser = { _id: 'u1', name: 'Test', email: 'test@test.com' };
      const repo = createMockUserRepo({ findById: jest.fn().mockResolvedValue(mockUser) });

      const result = await getProfile('u1', { userRepository: repo });
      expect(result).toEqual(mockUser);
      expect(repo.findById).toHaveBeenCalledWith('u1', '-password');
    });

    it('throws 404 for non-existent user', async () => {
      const repo = createMockUserRepo({ findById: jest.fn().mockResolvedValue(null) });

      try {
        await getProfile('nonexistent', { userRepository: repo });
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(404);
      }
    });
  });

  describe('updateProfile', () => {
    it('rejects bio > 200 chars with 400', async () => {
      const repo = createMockUserRepo();
      try {
        await updateProfile('u1', { bio: 'x'.repeat(201) }, { userRepository: repo });
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(400);
        expect(err.message).toMatch(/200/);
      }
    });

    it('rejects currentYear outside 1-6 with 400', async () => {
      const repo = createMockUserRepo();
      try {
        await updateProfile('u1', { currentYear: 0 }, { userRepository: repo });
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(400);
      }
    });

    it('updates valid fields', async () => {
      const updatedUser = {
        _id: 'u1',
        name: 'New Name',
        bio: 'New bio',
        toObject: () => ({ _id: 'u1', name: 'New Name', bio: 'New bio' }),
      };
      const repo = createMockUserRepo({
        updateById: jest.fn().mockResolvedValue(updatedUser),
      });

      const result = await updateProfile('u1', { name: 'New Name', bio: 'New bio' }, { userRepository: repo });
      expect(result.name).toBe('New Name');
      expect(repo.updateById).toHaveBeenCalledWith('u1', { name: 'New Name', bio: 'New bio' });
    });
  });

  describe('getLeaderboard', () => {
    it('calls findLeaderboard with correct limit', async () => {
      const repo = createMockUserRepo();
      await getLeaderboard(25, { userRepository: repo });
      expect(repo.findLeaderboard).toHaveBeenCalledWith(25);
    });

    it('caps limit at LEADERBOARD_MAX_LIMIT (100)', async () => {
      const repo = createMockUserRepo();
      await getLeaderboard(200, { userRepository: repo });
      expect(repo.findLeaderboard).toHaveBeenCalledWith(100);
    });
  });

  describe('updateStreak', () => {
    it('sets streak to 1 on first activity (null lastActiveDate)', async () => {
      const user = { _id: 'u1', lastActiveDate: null, streak: 0 };
      const repo = createMockUserRepo({ findById: jest.fn().mockResolvedValue(user) });

      // Mock Date to a fixed time
      const fixedDate = new Date('2024-06-15T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation((...args) => {
        if (args.length === 0) return fixedDate;
        return new (Function.prototype.bind.apply(Date.__proto__.constructor || OriginalDate, [null, ...args]))();
      });
      // We need the real Date constructor for new Date(year, month, day)
      jest.restoreAllMocks();

      // Simpler approach: just mock Date once
      const RealDate = global.Date;
      const mockNow = new RealDate('2024-06-15T12:00:00Z');
      jest.spyOn(global, 'Date').mockImplementation(function (...args) {
        if (args.length === 0) return mockNow;
        return new RealDate(...args);
      });

      await updateStreak('u1', { userRepository: repo });
      expect(user.streak).toBe(1);
      expect(user.lastActiveDate).toBeTruthy();
      expect(repo.save).toHaveBeenCalledWith(user);

      jest.restoreAllMocks();
    });

    it('increments streak on consecutive day', async () => {
      const RealDate = global.Date;
      const mockNow = new RealDate('2024-06-15T12:00:00Z');

      const user = {
        _id: 'u1',
        lastActiveDate: new RealDate('2024-06-14T10:00:00Z'),
        streak: 3,
      };
      const repo = createMockUserRepo({ findById: jest.fn().mockResolvedValue(user) });

      jest.spyOn(global, 'Date').mockImplementation(function (...args) {
        if (args.length === 0) return mockNow;
        return new RealDate(...args);
      });

      await updateStreak('u1', { userRepository: repo });
      expect(user.streak).toBe(4);
      expect(repo.save).toHaveBeenCalledWith(user);
      expect(updatePoints).toHaveBeenCalledWith('u1', 'DAILY_STREAK');

      jest.restoreAllMocks();
    });

    it('no-op on same day', async () => {
      const RealDate = global.Date;
      const mockNow = new RealDate('2024-06-15T18:00:00Z');

      const user = {
        _id: 'u1',
        lastActiveDate: new RealDate('2024-06-15T08:00:00Z'),
        streak: 5,
      };
      const repo = createMockUserRepo({ findById: jest.fn().mockResolvedValue(user) });

      jest.spyOn(global, 'Date').mockImplementation(function (...args) {
        if (args.length === 0) return mockNow;
        return new RealDate(...args);
      });

      await updateStreak('u1', { userRepository: repo });
      expect(user.streak).toBe(5);
      expect(repo.save).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });

    it('resets streak on gap > 1 day', async () => {
      const RealDate = global.Date;
      const mockNow = new RealDate('2024-06-15T12:00:00Z');

      const user = {
        _id: 'u1',
        lastActiveDate: new RealDate('2024-06-13T10:00:00Z'),
        streak: 10,
      };
      const repo = createMockUserRepo({ findById: jest.fn().mockResolvedValue(user) });

      jest.spyOn(global, 'Date').mockImplementation(function (...args) {
        if (args.length === 0) return mockNow;
        return new RealDate(...args);
      });

      await updateStreak('u1', { userRepository: repo });
      expect(user.streak).toBe(1);
      expect(repo.save).toHaveBeenCalledWith(user);
      expect(updatePoints).not.toHaveBeenCalled();

      jest.restoreAllMocks();
    });
  });
});
