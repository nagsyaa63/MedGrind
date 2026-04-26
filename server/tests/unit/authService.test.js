const { register, login, getMe } = require('../../src/services/authService');
const AppError = require('../../src/utils/AppError');

const createMockUserRepo = (overrides = {}) => ({
  findById: jest.fn(),
  findByEmail: jest.fn(),
  create: jest.fn(),
  updateById: jest.fn(),
  findLeaderboard: jest.fn(),
  incrementFields: jest.fn(),
  atomicPointsUpdate: jest.fn(),
  save: jest.fn(),
  ...overrides,
});

describe('Auth Service', () => {
  describe('register', () => {
    const validInput = {
      name: 'Test User',
      email: 'test@example.com',
      password: 'password123',
      collegeName: 'Test College',
      currentYear: 3,
    };

    it('rejects missing fields with 400', async () => {
      const repo = createMockUserRepo();
      try {
        await register({ name: 'Test' }, { userRepository: repo });
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(400);
      }
    });

    it('rejects invalid email format with 400', async () => {
      const repo = createMockUserRepo();
      try {
        await register({ ...validInput, email: 'not-an-email' }, { userRepository: repo });
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(400);
        expect(err.message).toMatch(/valid email/i);
      }
    });

    it('rejects short password < 6 chars with 400', async () => {
      const repo = createMockUserRepo();
      try {
        await register({ ...validInput, password: '12345' }, { userRepository: repo });
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(400);
        expect(err.message).toMatch(/6 characters/);
      }
    });

    it('rejects currentYear outside 1-6 with 400 (year=0)', async () => {
      const repo = createMockUserRepo();
      try {
        await register({ ...validInput, currentYear: 0 }, { userRepository: repo });
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(400);
      }
    });

    it('rejects currentYear outside 1-6 with 400 (year=7)', async () => {
      const repo = createMockUserRepo();
      try {
        await register({ ...validInput, currentYear: 7 }, { userRepository: repo });
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(400);
      }
    });

    it('rejects duplicate email with 409', async () => {
      const repo = createMockUserRepo({
        findByEmail: jest.fn().mockResolvedValue({ _id: 'existing' }),
      });
      try {
        await register(validInput, { userRepository: repo });
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(409);
      }
    });

    it('creates user and returns token on valid input', async () => {
      const mockUser = {
        _id: 'u1',
        name: 'Test User',
        email: 'test@example.com',
        toJSON: () => ({ _id: 'u1', name: 'Test User', email: 'test@example.com' }),
      };
      const repo = createMockUserRepo({
        findByEmail: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await register(validInput, { userRepository: repo });
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user._id).toBe('u1');
      expect(repo.create).toHaveBeenCalledTimes(1);
    });
  });

  describe('login', () => {
    it('rejects missing email/password with 400', async () => {
      const repo = createMockUserRepo();
      try {
        await login(null, null, { userRepository: repo });
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(400);
      }
    });

    it('rejects non-existent email with 401', async () => {
      const repo = createMockUserRepo({
        findByEmail: jest.fn().mockResolvedValue(null),
      });
      try {
        await login('no@user.com', 'password', { userRepository: repo });
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(401);
        expect(err.message).toBe('Invalid credentials');
      }
    });

    it('rejects wrong password with 401', async () => {
      const repo = createMockUserRepo({
        findByEmail: jest.fn().mockResolvedValue({
          _id: 'u1',
          comparePassword: jest.fn().mockResolvedValue(false),
        }),
      });
      try {
        await login('test@example.com', 'wrongpass', { userRepository: repo });
        throw new Error('Should have thrown');
      } catch (err) {
        expect(err).toBeInstanceOf(AppError);
        expect(err.statusCode).toBe(401);
        expect(err.message).toBe('Invalid credentials');
      }
    });

    it('returns token on valid credentials', async () => {
      const mockUser = {
        _id: 'u1',
        email: 'test@example.com',
        comparePassword: jest.fn().mockResolvedValue(true),
        toJSON: () => ({ _id: 'u1', email: 'test@example.com' }),
      };
      const repo = createMockUserRepo({
        findByEmail: jest.fn().mockResolvedValue(mockUser),
      });

      const result = await login('test@example.com', 'password123', { userRepository: repo });
      expect(result).toHaveProperty('token');
      expect(result).toHaveProperty('user');
      expect(result.user._id).toBe('u1');
    });
  });

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
