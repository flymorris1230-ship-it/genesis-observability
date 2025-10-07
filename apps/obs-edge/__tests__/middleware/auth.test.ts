/**
 * Tests for authentication middleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Context } from 'hono';
import { authMiddleware } from '../../src/middleware/auth';
import type { Env } from '../../src/index';

describe('authMiddleware', () => {
  let mockContext: any;
  let mockNext: any;
  let mockEnv: Env;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEnv = {
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_KEY: 'test-key',
      API_KEY: 'valid-api-key-123',
      RATE_LIMIT: {} as any,
    };

    mockNext = vi.fn();

    mockContext = {
      req: {
        header: vi.fn(),
      },
      json: vi.fn((data, status?) => ({ data, status })),
      env: mockEnv,
    };
  });

  it('should allow request with valid Bearer token', async () => {
    mockContext.req.header.mockReturnValue('Bearer valid-api-key-123');

    await authMiddleware(mockContext as Context<{ Bindings: Env }>, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockContext.json).not.toHaveBeenCalled();
  });

  it('should reject request without Authorization header', async () => {
    mockContext.req.header.mockReturnValue(undefined);

    const response = await authMiddleware(mockContext as Context<{ Bindings: Env }>, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(response.data.error).toBe('Missing Authorization header');
    expect(response.status).toBe(401);
  });

  it('should reject request with invalid token format (no scheme)', async () => {
    mockContext.req.header.mockReturnValue('valid-api-key-123');

    const response = await authMiddleware(mockContext as Context<{ Bindings: Env }>, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(response.data.error).toBe('Invalid Authorization format');
    expect(response.status).toBe(401);
  });

  it('should reject request with wrong scheme (not Bearer)', async () => {
    mockContext.req.header.mockReturnValue('Basic valid-api-key-123');

    const response = await authMiddleware(mockContext as Context<{ Bindings: Env }>, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(response.data.error).toBe('Invalid Authorization format');
    expect(response.status).toBe(401);
  });

  it('should reject request with invalid API key', async () => {
    mockContext.req.header.mockReturnValue('Bearer invalid-key');

    const response = await authMiddleware(mockContext as Context<{ Bindings: Env }>, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(response.data.error).toBe('Invalid API key');
    expect(response.status).toBe(401);
  });

  it('should reject request with empty token', async () => {
    mockContext.req.header.mockReturnValue('Bearer ');

    const response = await authMiddleware(mockContext as Context<{ Bindings: Env }>, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(response.data.error).toBe('Invalid Authorization format');
    expect(response.status).toBe(401);
  });

  it('should be case-sensitive for Bearer scheme', async () => {
    mockContext.req.header.mockReturnValue('bearer valid-api-key-123');

    const response = await authMiddleware(mockContext as Context<{ Bindings: Env }>, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(response.data.error).toBe('Invalid Authorization format');
    expect(response.status).toBe(401);
  });

  it('should handle token with extra spaces', async () => {
    mockContext.req.header.mockReturnValue('Bearer  valid-api-key-123');

    const response = await authMiddleware(mockContext as Context<{ Bindings: Env }>, mockNext);

    // Extra space means second split element is empty string
    expect(mockNext).not.toHaveBeenCalled();
    expect(response.data.error).toBe('Invalid Authorization format');
    expect(response.status).toBe(401);
  });

  it('should allow request with complex API key', async () => {
    mockEnv.API_KEY = 'sk-proj-abc123_def456-ghi789';
    mockContext.req.header.mockReturnValue('Bearer sk-proj-abc123_def456-ghi789');

    await authMiddleware(mockContext as Context<{ Bindings: Env }>, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });

  it('should reject request with partial match of API key', async () => {
    mockEnv.API_KEY = 'valid-api-key-123';
    mockContext.req.header.mockReturnValue('Bearer valid-api-key');

    const response = await authMiddleware(mockContext as Context<{ Bindings: Env }>, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(response.data.error).toBe('Invalid API key');
    expect(response.status).toBe(401);
  });

  it('should handle Authorization header case-insensitively (HTTP standard)', async () => {
    // Note: Hono typically normalizes headers to lowercase
    mockContext.req.header.mockImplementation((name: string) => {
      if (name.toLowerCase() === 'authorization') {
        return 'Bearer valid-api-key-123';
      }
      return undefined;
    });

    await authMiddleware(mockContext as Context<{ Bindings: Env }>, mockNext);

    expect(mockNext).toHaveBeenCalled();
  });
});
