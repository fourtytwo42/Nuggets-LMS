import {
  AuthenticationError,
  AuthorizationError,
  TokenExpiredError,
  InvalidTokenError,
} from '@/lib/auth/errors';

describe('Auth Errors Extended Tests', () => {
  describe('AuthenticationError', () => {
    it('should create error with message', () => {
      const error = new AuthenticationError('Invalid credentials');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('AuthenticationError');
      expect(error.message).toBe('Invalid credentials');
    });

    it('should be throwable', () => {
      expect(() => {
        throw new AuthenticationError('Test error');
      }).toThrow(AuthenticationError);
    });
  });

  describe('AuthorizationError', () => {
    it('should create error with message', () => {
      const error = new AuthorizationError('Insufficient permissions');
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('AuthorizationError');
      expect(error.message).toBe('Insufficient permissions');
    });

    it('should be throwable', () => {
      expect(() => {
        throw new AuthorizationError('Test error');
      }).toThrow(AuthorizationError);
    });
  });

  describe('TokenExpiredError', () => {
    it('should create error with default message', () => {
      const error = new TokenExpiredError();
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('TokenExpiredError');
      expect(error.message).toBe('Token has expired');
    });

    it('should create error with custom message', () => {
      const error = new TokenExpiredError('Custom expired message');
      expect(error.message).toBe('Custom expired message');
    });

    it('should be throwable', () => {
      expect(() => {
        throw new TokenExpiredError();
      }).toThrow(TokenExpiredError);
    });
  });

  describe('InvalidTokenError', () => {
    it('should create error with default message', () => {
      const error = new InvalidTokenError();
      expect(error).toBeInstanceOf(Error);
      expect(error.name).toBe('InvalidTokenError');
      expect(error.message).toBe('Invalid token');
    });

    it('should create error with custom message', () => {
      const error = new InvalidTokenError('Custom invalid message');
      expect(error.message).toBe('Custom invalid message');
    });

    it('should be throwable', () => {
      expect(() => {
        throw new InvalidTokenError();
      }).toThrow(InvalidTokenError);
    });
  });
});
