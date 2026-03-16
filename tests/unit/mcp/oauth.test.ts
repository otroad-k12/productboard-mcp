import { describe, it, expect, beforeEach } from '@jest/globals';
import { SimpleOAuthProvider } from '../../../src/core/oauth.js';
import { InvalidTokenError } from '@modelcontextprotocol/sdk/server/auth/errors.js';

describe('SimpleOAuthProvider', () => {
  let provider: SimpleOAuthProvider;

  beforeEach(() => {
    provider = new SimpleOAuthProvider();
  });

  describe('verifyAccessToken', () => {
    it('should throw InvalidTokenError (not a plain Error) for unknown tokens', async () => {
      await expect(provider.verifyAccessToken('nonexistent-token')).rejects.toBeInstanceOf(InvalidTokenError);
    });

    it('should throw InvalidTokenError for expired tokens', async () => {
      // Manually insert an already-expired token into the provider
      const expiredInfo = {
        token: 'expired-token',
        clientId: 'test-client',
        scopes: [] as string[],
        expiresAt: Math.floor(Date.now() / 1000) - 1,
      };
      // Access private _tokens map via casting
      (provider as any)._tokens.set('expired-token', expiredInfo);

      await expect(provider.verifyAccessToken('expired-token')).rejects.toBeInstanceOf(InvalidTokenError);
    });

    it('should return AuthInfo for a valid non-expired token', async () => {
      const validInfo = {
        token: 'valid-token',
        clientId: 'test-client',
        scopes: [] as string[],
        expiresAt: Math.floor(Date.now() / 1000) + 3600,
      };
      (provider as any)._tokens.set('valid-token', validInfo);

      const result = await provider.verifyAccessToken('valid-token');
      expect(result).toEqual(validInfo);
    });

    it('should remove expired token from store after throwing', async () => {
      const expiredInfo = {
        token: 'expired-token',
        clientId: 'test-client',
        scopes: [] as string[],
        expiresAt: Math.floor(Date.now() / 1000) - 1,
      };
      (provider as any)._tokens.set('expired-token', expiredInfo);

      await expect(provider.verifyAccessToken('expired-token')).rejects.toBeInstanceOf(InvalidTokenError);
      expect((provider as any)._tokens.has('expired-token')).toBe(false);
    });
  });
});
