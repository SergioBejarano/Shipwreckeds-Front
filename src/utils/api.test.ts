import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import * as api from '../utils/api';
import type { LoginResponse, Match, CognitoTokens } from '../utils/api';

describe('API utilities', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
    vi.stubGlobal('fetch', vi.fn());
  });

  afterEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  describe('login', () => {
    it('sends login credentials and returns tokens', async () => {
      const mockResponse: LoginResponse = {
        player: { id: 1, username: 'testuser' },
        tokens: {
          accessToken: 'test-access-token',
          idToken: 'test-id-token',
          refreshToken: 'test-refresh-token',
          expiresIn: 3600,
          tokenType: 'Bearer',
        },
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockResponse,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const result = await api.login({ username: 'testuser', password: 'password123' });

      expect(result).toEqual(mockResponse);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/login'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ username: 'testuser', password: 'password123' }),
        })
      );
    });

    it('persists tokens to storage on successful login', async () => {
      const mockTokens: CognitoTokens = {
        accessToken: 'token123',
        refreshToken: 'refresh123',
        expiresIn: 3600,
        tokenType: 'Bearer',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          player: { id: 1, username: 'testuser' },
          tokens: mockTokens,
        }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      await api.login({ username: 'testuser', password: 'password' });

      const stored = localStorage.getItem('shipwreckeds:cognitoTokens');
      expect(stored).toBeTruthy();
      expect(JSON.parse(stored!)).toEqual(mockTokens);
    });

    it('throws error on failed login', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 401,
        statusText: 'Unauthorized',
        text: async () => 'Invalid credentials',
      });

      await expect(
        api.login({ username: 'testuser', password: 'wrong' })
      ).rejects.toThrow('Invalid credentials');
    });
  });

  describe('createMatch', () => {
    it('creates a match and returns match code', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 'ABCD12' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const result = await api.createMatch('testhost');

      expect(result).toEqual({ code: 'ABCD12' });
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/match/create'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ hostName: 'testhost' }),
        })
      );
    });

    it.skip('includes authorization header if tokens available', async () => {
      const mockTokens: CognitoTokens = {
        accessToken: 'test-token',
        tokenType: 'Bearer',
        refreshToken: 'refresh-token',
      };
      localStorage.setItem('shipwreckeds:cognitoTokens', JSON.stringify(mockTokens));

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 'ABCD12' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      await api.createMatch('host');

      const callArgs = (globalThis.fetch as any).mock.calls[0][1];
      expect(callArgs.headers.get('Authorization')).toBe('Bearer test-token');
    });
  });

  describe('joinMatch', () => {
    it('joins a match with code and username', async () => {
      const mockMatch: Match = {
        code: 'ABCD12',
        players: [{ id: 1, username: 'player1' }],
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMatch,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const result = await api.joinMatch('ABCD12', 'player2');

      expect(result).toEqual(mockMatch);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/match/join'),
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({ code: 'ABCD12', username: 'player2' }),
        })
      );
    });

    it('throws error on invalid match code', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        statusText: 'Not Found',
        text: async () => 'Match not found',
      });

      await expect(
        api.joinMatch('INVALID', 'player')
      ).rejects.toThrow('Match not found');
    });
  });

  describe('getMatch', () => {
    it('fetches match details by code', async () => {
      const mockMatch: Match = {
        code: 'ABCD12',
        players: [
          { id: 1, username: 'player1' },
          { id: 2, username: 'player2' },
        ],
        status: 'WAITING',
      };

      (globalThis.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMatch,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const result = await api.getMatch('ABCD12');

      expect(result).toEqual(mockMatch);
      expect((globalThis.fetch as any)).toHaveBeenCalled();
      const url = (globalThis.fetch as any).mock.calls[0][0];
      expect(url).toContain('ABCD12');
    });

    it('encodes match code in URL', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 'TEST@123' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      await api.getMatch('TEST@123');

      const url = (global.fetch as any).mock.calls[0][0];
      expect(url).toContain(encodeURIComponent('TEST@123'));
    });
  });

  describe('startMatch', () => {
    it('starts a match with code and host name', async () => {
      const mockMatch: Match = {
        code: 'ABCD12',
        players: [],
        status: 'STARTED',
      };

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => mockMatch,
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      const result = await api.startMatch('ABCD12', 'hostuser');

      expect(result).toEqual(mockMatch);
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/match/start/ABCD12'),
        expect.objectContaining({ method: 'POST' })
      );
    });

    it('includes host name in query parameters', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        json: async () => ({ code: 'ABCD12', status: 'STARTED' }),
        headers: new Headers({ 'content-type': 'application/json' }),
      });

      await api.startMatch('ABCD12', 'hostuser');

      const url = (global.fetch as any).mock.calls[0][0];
      expect(url).toContain('hostName=hostuser');
    });
  });

  describe('logout', () => {
    it('logs out user and clears tokens', async () => {
      localStorage.setItem('shipwreckeds:cognitoTokens', JSON.stringify({ accessToken: 'token' }));

      (global.fetch as any).mockResolvedValueOnce({
        ok: true,
        text: async () => '',
      });

      await api.logout('testuser');

      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/auth/logout/testuser'),
        expect.objectContaining({ method: 'POST' })
      );
      expect(localStorage.getItem('shipwreckeds:cognitoTokens')).toBeNull();
    });

    it('clears tokens even on 404 error', async () => {
      localStorage.setItem('shipwreckeds:cognitoTokens', JSON.stringify({ accessToken: 'token' }));

      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 404,
        text: async () => '',
      });

      await api.logout('testuser');

      expect(localStorage.getItem('shipwreckeds:cognitoTokens')).toBeNull();
    });

    it('throws error on non-404 failure', async () => {
      (global.fetch as any).mockResolvedValueOnce({
        ok: false,
        status: 500,
        statusText: 'Server Error',
        text: async () => 'Internal error',
      });

      await expect(api.logout('testuser')).rejects.toThrow('Internal error');
    });
  });

  describe('buildCognitoLoginUrl', () => {
    it('builds Cognito login URL with correct parameters', () => {
      const url = api.buildCognitoLoginUrl('http://localhost:5173');

      expect(url).toContain('client_id=4eobvf3hdfs4kk6edon0f6nmne');
      expect(url).toContain('response_type=code');
      expect(url).toContain('redirect_uri=http%3A%2F%2Flocalhost%3A5173');
      expect(url).toContain('scope=email+openid+phone');
    });

    it('uses default redirect URI if not provided', () => {
      const url = api.buildCognitoLoginUrl();

      expect(url).toContain('redirect_uri=');
    });
  });

  describe('getSessionTokens', () => {
    it.skip('returns stored tokens', () => {
      const mockTokens: CognitoTokens = {
        accessToken: 'token123',
        idToken: 'id123',
        refreshToken: 'refresh123',
      };

      localStorage.setItem('shipwreckeds:cognitoTokens', JSON.stringify(mockTokens));
      const tokens = api.getSessionTokens();
      // Verify the function works without throwing
      expect(tokens).toEqual(mockTokens);
    });

    it('returns null when no tokens stored', () => {
      const tokens = api.getSessionTokens();
      expect(tokens).toBeNull();
    });
  });

  describe('clearSessionTokens', () => {
    it('removes tokens from storage', () => {
      localStorage.setItem('shipwreckeds:cognitoTokens', JSON.stringify({ accessToken: 'token' }));

      api.clearSessionTokens();

      expect(localStorage.getItem('shipwreckeds:cognitoTokens')).toBeNull();
    });
  });
});
