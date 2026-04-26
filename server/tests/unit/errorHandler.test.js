const errorHandler = require('../../src/middleware/errorHandler');
const AppError = require('../../src/utils/AppError');

// Mock config module
jest.mock('../../src/config', () => ({
  NODE_ENV: 'production',
}));
const config = require('../../src/config');

const createMockRes = () => {
  const res = {
    statusCode: null,
    body: null,
    status: jest.fn(function (code) {
      this.statusCode = code;
      return this;
    }),
    json: jest.fn(function (data) {
      this.body = data;
      return this;
    }),
  };
  return res;
};

const createMockReq = () => ({});
const createMockNext = () => jest.fn();

describe('Error Handler Middleware', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns { error: message } for AppError', () => {
    const err = new AppError('Not found', 404);
    const res = createMockRes();

    errorHandler(err, createMockReq(), res, createMockNext());

    expect(res.status).toHaveBeenCalledWith(404);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ error: 'Not found' }));
  });

  it('returns 400 for ValidationError', () => {
    const err = new Error('Validation failed');
    err.name = 'ValidationError';
    err.errors = {
      field1: { message: 'Field1 is required' },
      field2: { message: 'Field2 is invalid' },
    };
    const res = createMockRes();

    errorHandler(err, createMockReq(), res, createMockNext());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.error).toContain('Field1 is required');
    expect(res.body.error).toContain('Field2 is invalid');
  });

  it('returns 409 for duplicate key error (code 11000)', () => {
    const err = new Error('Duplicate');
    err.code = 11000;
    err.keyValue = { email: 'test@test.com' };
    const res = createMockRes();

    errorHandler(err, createMockReq(), res, createMockNext());

    expect(res.status).toHaveBeenCalledWith(409);
    expect(res.body.error).toMatch(/Duplicate value for email/);
  });

  it('returns 400 for CastError', () => {
    const err = new Error('Cast failed');
    err.name = 'CastError';
    const res = createMockRes();

    errorHandler(err, createMockReq(), res, createMockNext());

    expect(res.status).toHaveBeenCalledWith(400);
    expect(res.body.error).toBe('Invalid ID format');
  });

  it('returns 500 for unknown errors', () => {
    const err = new Error('Something broke');
    const res = createMockRes();

    errorHandler(err, createMockReq(), res, createMockNext());

    expect(res.status).toHaveBeenCalledWith(500);
    expect(res.body.error).toBe('Something broke');
  });

  it('includes stack in development mode', () => {
    // Temporarily set NODE_ENV to development
    config.NODE_ENV = 'development';

    const err = new AppError('Dev error', 400);
    const res = createMockRes();

    errorHandler(err, createMockReq(), res, createMockNext());

    expect(res.body).toHaveProperty('stack');
    expect(res.body.stack).toBeTruthy();

    // Restore
    config.NODE_ENV = 'production';
  });

  it('does not include stack in production mode', () => {
    config.NODE_ENV = 'production';

    const err = new AppError('Prod error', 400);
    const res = createMockRes();

    errorHandler(err, createMockReq(), res, createMockNext());

    expect(res.body).not.toHaveProperty('stack');
  });
});
