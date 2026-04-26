/**
 * Firebase Auth Service Tests
 * Feature: firebase-google-auth
 *
 * Covers:
 *  - 6 property-based tests (Properties 1–6 from design.md)
 *  - Example-based unit tests for edge cases and migration logic
 */

const jwt = require('jsonwebtoken');
const fc = require('fast-check');
const AppError = require('../../src/utils/AppError');
const config = require('../../src/config');

// ─── Mock Firebase Admin ──────────────────────────────────────────────────────
// Must be declared before requiring authService so Jest hoists it correctly.
const mockVerifyIdToken = jest.fn();
jest.mock('../../src/config/firebase', () => ({
  auth: () => ({ verifyIdToken: mockVerifyIdToken }),
}));

// ─── Mock userService (for Property 6 streak side-effect) ────────────────────
jest.mock('../../src/services/userService', () => ({
  updateStreak: jest.fn().mockResolvedValue(undefined),
  getProfile: jest.fn(),
  updateProfile: jest.fn(),
  getLeaderboard: jest.fn(),
  updateStreak: jest.fn().mockResolvedValue(undefined),
}));

const { firebaseAuth } = require('../../src/services/authService');
const { updateProfile } = require('../../src/services/userService');
const auth = require('../../src/middleware/auth');

// ─── Helpers ──────────────────────────────────────────────────────────────────

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

const makeMockUser = (overrides = {}) => {
  const base = {
    _id: 'u1',
    email: 'test@example.com',
    firebaseUid: 'uid1',
    isOnboarded: false,
    points: 0,
    streak: 0,
    questionsAdded: 0,
    questionsAnswered: 0,
    correctAnswers: 0,
    ...overrides,
  };
  base.toJSON = () => ({ ...base });
  return base;
};

// ─── Property-Based Tests ─────────────────────────────────────────────────────

describe('Firebase Auth Service — Property-Based Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  // ── Property 1: Upsert Always Returns User and Token ─────────────────────
  // Feature: firebase-google-auth, Property 1
  // Validates: Requirements 13.1
  it('Property 1: upsert always returns { user, token } for any valid decoded payload', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          uid: fc.string({ minLength: 1 }),
          email: fc.emailAddress(),
          name: fc.string(),
        }),
        async ({ uid, email, name }) => {
          const mockUser = makeMockUser({ _id: `id-${uid}`, email, firebaseUid: uid });
          mockVerifyIdToken.mockResolvedValue({ uid, email, name });

          const repo = createMockUserRepo({
            findByFirebaseUid: jest.fn().mockResolvedValue(mockUser),
          });

          const result = await firebaseAuth('any-token', { userRepository: repo });

          return (
            result !== null &&
            typeof result === 'object' &&
            result.user !== undefined &&
            typeof result.token === 'string' &&
            result.token.length > 0
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  // ── Property 2: Invalid Tokens Always Rejected with 401 ──────────────────
  // Feature: firebase-google-auth, Property 2
  // Validates: Requirements 13.2
  it('Property 2: any token that fails verifyIdToken throws AppError 401', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string(),
        async (badToken) => {
          mockVerifyIdToken.mockRejectedValue(new Error('Token expired or invalid'));

          const repo = createMockUserRepo();

          try {
            await firebaseAuth(badToken || 'non-empty', { userRepository: repo });
            return false; // should have thrown
          } catch (err) {
            return err instanceof AppError && err.statusCode === 401;
          }
        }
      ),
      { numRuns: 100 }
    );
  });

  // ── Property 3: JWT userId Matches Returned User _id ─────────────────────
  // Feature: firebase-google-auth, Property 3
  // Validates: Requirements 13.3
  it('Property 3: decoded JWT userId always equals returned user._id', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (userId) => {
          const mockUser = makeMockUser({ _id: userId, firebaseUid: 'uid-fixed' });
          mockVerifyIdToken.mockResolvedValue({
            uid: 'uid-fixed',
            email: 'u@test.com',
            name: 'Test User',
          });

          const repo = createMockUserRepo({
            findByFirebaseUid: jest.fn().mockResolvedValue(mockUser),
          });

          const { token, user } = await firebaseAuth('token', { userRepository: repo });
          const decoded = jwt.verify(token, config.JWT_SECRET);

          return String(decoded.userId) === String(user._id);
        }
      ),
      { numRuns: 100 }
    );
  });

  // ── Property 4: Onboarding Sets and Preserves isOnboarded ────────────────
  // Feature: firebase-google-auth, Property 4
  // Validates: Requirements 13.4
  // NOTE: This property is tested in the 'userService.updateProfile' describe block below,
  // which loads the real (unmocked) userService. See "Property 4 (onboarding idempotence)".
  it.todo('Property 4: tested in userService.updateProfile describe block below');

  // ── Property 5: Re-authentication Preserves User Stats ───────────────────
  // Feature: firebase-google-auth, Property 5
  // Validates: Requirements 13.5
  it('Property 5: re-auth always returns identical stat fields for existing user', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.record({
          points: fc.nat(),
          streak: fc.nat(),
          questionsAdded: fc.nat(),
          questionsAnswered: fc.nat(),
          correctAnswers: fc.nat(),
        }),
        async (stats) => {
          const mockUser = makeMockUser({ ...stats, firebaseUid: 'uid-stats' });
          mockVerifyIdToken.mockResolvedValue({
            uid: 'uid-stats',
            email: 'u@test.com',
            name: 'Stats User',
          });

          const repo = createMockUserRepo({
            findByFirebaseUid: jest.fn().mockResolvedValue(mockUser),
          });

          const { user } = await firebaseAuth('token', { userRepository: repo });

          return (
            user.points === stats.points &&
            user.streak === stats.streak &&
            user.questionsAdded === stats.questionsAdded &&
            user.questionsAnswered === stats.questionsAnswered &&
            user.correctAnswers === stats.correctAnswers
          );
        }
      ),
      { numRuns: 100 }
    );
  });

  // ── Property 6: Auth Middleware Sets req.user.id from JWT ─────────────────
  // Feature: firebase-google-auth, Property 6
  // Validates: Requirements 13.6
  it('Property 6: auth middleware always sets req.user.id equal to JWT userId', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.string({ minLength: 1 }),
        async (userId) => {
          const token = jwt.sign(
            { userId, email: 'u@test.com' },
            config.JWT_SECRET,
            { expiresIn: '1h' }
          );

          const req = { headers: { authorization: `Bearer ${token}` } };
          const res = {};
          let nextCalled = false;

          await auth(req, res, () => { nextCalled = true; });

          return nextCalled && req.user && req.user.id === userId;
        }
      ),
      { numRuns: 100 }
    );
  });
});

// ─── Example-Based Unit Tests ─────────────────────────────────────────────────

describe('Firebase Auth Service — Example-Based Tests', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('firebaseAuth', () => {
    it('throws AppError 400 with FIREBASE_TOKEN_MISSING_ERROR when token is absent', async () => {
      const repo = createMockUserRepo();
      await expect(firebaseAuth(undefined, { userRepository: repo }))
        .rejects.toMatchObject({ statusCode: 400, message: 'Firebase ID token is required' });
    });

    it('throws AppError 400 with FIREBASE_TOKEN_MISSING_ERROR when token is empty string', async () => {
      const repo = createMockUserRepo();
      await expect(firebaseAuth('', { userRepository: repo }))
        .rejects.toMatchObject({ statusCode: 400, message: 'Firebase ID token is required' });
    });

    it('throws AppError 401 with FIREBASE_TOKEN_INVALID_ERROR when verifyIdToken throws', async () => {
      mockVerifyIdToken.mockRejectedValue(new Error('Firebase: token expired'));
      const repo = createMockUserRepo();
      await expect(firebaseAuth('bad-token', { userRepository: repo }))
        .rejects.toMatchObject({ statusCode: 401, message: 'Invalid or expired Firebase token' });
    });

    it('returns existing user when found by firebaseUid (no writes)', async () => {
      const existingUser = makeMockUser({ _id: 'u-existing', firebaseUid: 'uid-abc' });
      mockVerifyIdToken.mockResolvedValue({ uid: 'uid-abc', email: 'e@test.com', name: 'Existing' });

      const repo = createMockUserRepo({
        findByFirebaseUid: jest.fn().mockResolvedValue(existingUser),
      });

      const result = await firebaseAuth('valid-token', { userRepository: repo });

      expect(result.user._id).toBe('u-existing');
      expect(repo.findByEmailAndSetFirebaseUid).not.toHaveBeenCalled();
      expect(repo.create).not.toHaveBeenCalled();
    });

    it('legacy migration: calls findByEmailAndSetFirebaseUid with correct args when uid lookup misses', async () => {
      const legacyUser = makeMockUser({ _id: 'u-legacy', firebaseUid: 'uid-new', email: 'legacy@test.com' });
      mockVerifyIdToken.mockResolvedValue({ uid: 'uid-new', email: 'legacy@test.com', name: 'Legacy' });

      const repo = createMockUserRepo({
        findByFirebaseUid: jest.fn().mockResolvedValue(null),
        findByEmailAndSetFirebaseUid: jest.fn().mockResolvedValue(legacyUser),
      });

      const result = await firebaseAuth('valid-token', { userRepository: repo });

      expect(repo.findByEmailAndSetFirebaseUid).toHaveBeenCalledWith('legacy@test.com', 'uid-new');
      expect(repo.create).not.toHaveBeenCalled();
      expect(result.user._id).toBe('u-legacy');
    });

    it('new user creation: calls repo.create when both lookups return null', async () => {
      const newUser = makeMockUser({ _id: 'u-new', firebaseUid: 'uid-brand-new', email: 'new@test.com', name: 'New User' });
      mockVerifyIdToken.mockResolvedValue({ uid: 'uid-brand-new', email: 'new@test.com', name: 'New User' });

      const repo = createMockUserRepo({
        findByFirebaseUid: jest.fn().mockResolvedValue(null),
        findByEmailAndSetFirebaseUid: jest.fn().mockResolvedValue(null),
        create: jest.fn().mockResolvedValue(newUser),
      });

      const result = await firebaseAuth('valid-token', { userRepository: repo });

      expect(repo.create).toHaveBeenCalledWith({
        firebaseUid: 'uid-brand-new',
        email: 'new@test.com',
        name: 'New User',
      });
      expect(result.user._id).toBe('u-new');
    });

    it('legacy user with complete profile: sets isOnboarded: true during migration', async () => {
      const legacyUser = makeMockUser({
        _id: 'u-complete',
        firebaseUid: 'uid-complete',
        email: 'complete@test.com',
        collegeName: 'AIIMS Delhi',
        currentYear: 3,
      });
      const updatedUser = makeMockUser({ ...legacyUser, isOnboarded: true });
      mockVerifyIdToken.mockResolvedValue({ uid: 'uid-complete', email: 'complete@test.com', name: 'Complete' });

      const repo = createMockUserRepo({
        findByFirebaseUid: jest.fn().mockResolvedValue(null),
        findByEmailAndSetFirebaseUid: jest.fn().mockResolvedValue(legacyUser),
        updateById: jest.fn().mockResolvedValue(updatedUser),
      });

      const result = await firebaseAuth('valid-token', { userRepository: repo });

      expect(repo.updateById).toHaveBeenCalledWith('u-complete', { isOnboarded: true });
      expect(result.user.isOnboarded).toBe(true);
    });

    it('legacy user without complete profile: does NOT set isOnboarded during migration', async () => {
      const legacyUser = makeMockUser({
        _id: 'u-incomplete',
        firebaseUid: 'uid-incomplete',
        email: 'incomplete@test.com',
        collegeName: null,
        currentYear: null,
      });
      mockVerifyIdToken.mockResolvedValue({ uid: 'uid-incomplete', email: 'incomplete@test.com', name: 'Incomplete' });

      const repo = createMockUserRepo({
        findByFirebaseUid: jest.fn().mockResolvedValue(null),
        findByEmailAndSetFirebaseUid: jest.fn().mockResolvedValue(legacyUser),
      });

      await firebaseAuth('valid-token', { userRepository: repo });

      expect(repo.updateById).not.toHaveBeenCalled();
    });
  });

  describe('userService.updateProfile — onboarding validation', () => {
    // Re-require the real userService (not the mock used for auth middleware tests)
    let realUpdateProfile;

    beforeAll(() => {
      jest.unmock('../../src/services/userService');
      realUpdateProfile = require('../../src/services/userService').updateProfile;
    });

    // ── Property 4: Onboarding Sets and Preserves isOnboarded ──────────────
    // Feature: firebase-google-auth, Property 4
    // Validates: Requirements 13.4
    it('Property 4: updateProfile with valid collegeName + currentYear always sets isOnboarded: true', async () => {
      // collegeName must be a non-empty, non-whitespace-only string (matches validation rule)
      const nonBlankString = fc.string({ minLength: 1 }).filter(s => s.trim().length > 0);

      await fc.assert(
        fc.asyncProperty(
          nonBlankString,
          fc.integer({ min: 1, max: 6 }),
          async (collegeName, currentYear) => {
            let capturedUpdate = null;

            const repo = createMockUserRepo({
              findById: jest.fn().mockResolvedValue({
                _id: 'u1',
                collegeName: null,
                currentYear: null,
              }),
              updateById: jest.fn().mockImplementation((_id, fields) => {
                capturedUpdate = fields;
                const updated = { _id: 'u1', ...fields };
                updated.toObject = () => ({ ...updated });
                return Promise.resolve(updated);
              }),
            });

            await realUpdateProfile('u1', { collegeName, currentYear }, { userRepository: repo });

            return capturedUpdate !== null && capturedUpdate.isOnboarded === true;
          }
        ),
        { numRuns: 100 }
      );
    });

    it('throws AppError 400 when currentYear is 0', async () => {
      const repo = createMockUserRepo({
        findById: jest.fn().mockResolvedValue({ _id: 'u1', collegeName: 'Test', currentYear: 3 }),
      });
      await expect(realUpdateProfile('u1', { currentYear: 0 }, { userRepository: repo }))
        .rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws AppError 400 when currentYear is 7', async () => {
      const repo = createMockUserRepo({
        findById: jest.fn().mockResolvedValue({ _id: 'u1', collegeName: 'Test', currentYear: 3 }),
      });
      await expect(realUpdateProfile('u1', { currentYear: 7 }, { userRepository: repo }))
        .rejects.toMatchObject({ statusCode: 400 });
    });

    it('throws AppError 400 with "College name is required" when collegeName is empty string', async () => {
      const repo = createMockUserRepo({
        findById: jest.fn().mockResolvedValue({ _id: 'u1', collegeName: 'Test', currentYear: 3 }),
      });
      await expect(realUpdateProfile('u1', { collegeName: '' }, { userRepository: repo }))
        .rejects.toMatchObject({ statusCode: 400, message: 'College name is required' });
    });

    it('throws AppError 400 with "College name is required" when collegeName is whitespace only', async () => {
      const repo = createMockUserRepo({
        findById: jest.fn().mockResolvedValue({ _id: 'u1', collegeName: 'Test', currentYear: 3 }),
      });
      await expect(realUpdateProfile('u1', { collegeName: '   ' }, { userRepository: repo }))
        .rejects.toMatchObject({ statusCode: 400, message: 'College name is required' });
    });
  });
});
