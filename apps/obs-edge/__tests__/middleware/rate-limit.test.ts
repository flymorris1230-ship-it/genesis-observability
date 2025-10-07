/**
 * Tests for rate limiting middleware
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Context } from 'hono';
import { rateLimitMiddleware } from '../../src/middleware/rate-limit';
import type { Env } from '../../src/index';

describe('rateLimitMiddleware', () => {
  let mockContext: any;
  let mockNext: any;
  let mockEnv: Env;
  let mockKV: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockKV = {
      get: vi.fn(),
      put: vi.fn(),
    };

    mockEnv = {
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_KEY: 'test-key',
      API_KEY: 'test-api-key',
      RATE_LIMIT: mockKV,
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

  it('should allow first request from new IP', async () => {
    mockContext.req.header.mockImplementation((name: string) => {
      return name === 'CF-Connecting-IP' ? '192.168.1.100' : undefined;
    });

    mockKV.get.mockResolvedValue(null); // No existing rate limit record

    await rateLimitMiddleware(mockContext as Context<{ Bindings: Env }>, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockKV.put).toHaveBeenCalledWith(
      'rate_limit:192.168.1.100',
      '1',
      { expirationTtl: 60 }
    );
  });

  it('should allow request under rate limit', async () => {
    mockContext.req.header.mockImplementation((name: string) => {
      return name === 'CF-Connecting-IP' ? '192.168.1.100' : undefined;
    });

    mockKV.get.mockResolvedValue('50'); // 50 requests so far (under 100 limit)

    await rateLimitMiddleware(mockContext as Context<{ Bindings: Env }>, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockKV.put).toHaveBeenCalledWith(
      'rate_limit:192.168.1.100',
      '51',
      { expirationTtl: 60 }
    );
  });

  it('should allow request at rate limit boundary (99th request)', async () => {
    mockContext.req.header.mockImplementation((name: string) => {
      return name === 'CF-Connecting-IP' ? '192.168.1.100' : undefined;
    });

    mockKV.get.mockResolvedValue('99'); // 99 requests (just under limit)

    await rateLimitMiddleware(mockContext as Context<{ Bindings: Env }>, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockKV.put).toHaveBeenCalledWith(
      'rate_limit:192.168.1.100',
      '100',
      { expirationTtl: 60 }
    );
  });

  it('should reject request when rate limit is reached', async () => {
    mockContext.req.header.mockImplementation((name: string) => {
      return name === 'CF-Connecting-IP' ? '192.168.1.100' : undefined;
    });

    mockKV.get.mockResolvedValue('100'); // Already at limit

    const response = await rateLimitMiddleware(mockContext as Context<{ Bindings: Env }>, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(response.data.error).toBe('Rate limit exceeded');
    expect(response.status).toBe(429);
    expect(mockKV.put).not.toHaveBeenCalled();
  });

  it('should reject request when rate limit is exceeded', async () => {
    mockContext.req.header.mockImplementation((name: string) => {
      return name === 'CF-Connecting-IP' ? '192.168.1.100' : undefined;
    });

    mockKV.get.mockResolvedValue('150'); // Well over limit

    const response = await rateLimitMiddleware(mockContext as Context<{ Bindings: Env }>, mockNext);

    expect(mockNext).not.toHaveBeenCalled();
    expect(response.data.error).toBe('Rate limit exceeded');
    expect(response.status).toBe(429);
  });

  it('should use "unknown" as IP when CF-Connecting-IP header is missing', async () => {
    mockContext.req.header.mockReturnValue(undefined);
    mockKV.get.mockResolvedValue(null);

    await rateLimitMiddleware(mockContext as Context<{ Bindings: Env }>, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockKV.put).toHaveBeenCalledWith(
      'rate_limit:unknown',
      '1',
      { expirationTtl: 60 }
    );
  });

  it('should handle different IPs independently', async () => {
    // First IP
    mockContext.req.header.mockImplementation((name: string) => {
      return name === 'CF-Connecting-IP' ? '192.168.1.100' : undefined;
    });
    mockKV.get.mockResolvedValue('99');

    await rateLimitMiddleware(mockContext as Context<{ Bindings: Env }>, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockKV.put).toHaveBeenCalledWith(
      'rate_limit:192.168.1.100',
      '100',
      { expirationTtl: 60 }
    );

    // Reset mocks
    vi.clearAllMocks();
    mockNext = vi.fn();
    mockContext.req.header = vi.fn();

    // Second IP (different)
    mockContext.req.header.mockImplementation((name: string) => {
      return name === 'CF-Connecting-IP' ? '192.168.1.200' : undefined;
    });
    mockKV.get.mockResolvedValue(null);

    await rateLimitMiddleware(mockContext as Context<{ Bindings: Env }>, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockKV.put).toHaveBeenCalledWith(
      'rate_limit:192.168.1.200',
      '1',
      { expirationTtl: 60 }
    );
  });

  it('should fail open if KV.get fails', async () => {
    mockContext.req.header.mockImplementation((name: string) => {
      return name === 'CF-Connecting-IP' ? '192.168.1.100' : undefined;
    });

    mockKV.get.mockRejectedValue(new Error('KV unavailable'));

    await rateLimitMiddleware(mockContext as Context<{ Bindings: Env }>, mockNext);

    // Should allow request when KV fails (fail-open behavior)
    expect(mockNext).toHaveBeenCalled();
  });

  it('should fail open if KV.put fails', async () => {
    mockContext.req.header.mockImplementation((name: string) => {
      return name === 'CF-Connecting-IP' ? '192.168.1.100' : undefined;
    });

    mockKV.get.mockResolvedValue('50');
    mockKV.put.mockRejectedValue(new Error('KV write failed'));

    await rateLimitMiddleware(mockContext as Context<{ Bindings: Env }>, mockNext);

    // Should still allow request (fail-open)
    expect(mockNext).toHaveBeenCalled();
  });

  it('should handle IPv6 addresses', async () => {
    mockContext.req.header.mockImplementation((name: string) => {
      return name === 'CF-Connecting-IP' ? '2001:0db8:85a3::8a2e:0370:7334' : undefined;
    });

    mockKV.get.mockResolvedValue(null);

    await rateLimitMiddleware(mockContext as Context<{ Bindings: Env }>, mockNext);

    expect(mockNext).toHaveBeenCalled();
    expect(mockKV.put).toHaveBeenCalledWith(
      'rate_limit:2001:0db8:85a3::8a2e:0370:7334',
      '1',
      { expirationTtl: 60 }
    );
  });

  it('should set 60 second expiration on rate limit counter', async () => {
    mockContext.req.header.mockImplementation((name: string) => {
      return name === 'CF-Connecting-IP' ? '192.168.1.100' : undefined;
    });

    mockKV.get.mockResolvedValue(null);

    await rateLimitMiddleware(mockContext as Context<{ Bindings: Env }>, mockNext);

    expect(mockKV.put).toHaveBeenCalledWith(
      expect.any(String),
      expect.any(String),
      { expirationTtl: 60 }
    );
  });

  it('should handle non-numeric KV values gracefully', async () => {
    mockContext.req.header.mockImplementation((name: string) => {
      return name === 'CF-Connecting-IP' ? '192.168.1.100' : undefined;
    });

    mockKV.get.mockResolvedValue('invalid-number');

    await rateLimitMiddleware(mockContext as Context<{ Bindings: Env }>, mockNext);

    // NaN + 1 = NaN, which is stored as "NaN"
    expect(mockNext).toHaveBeenCalled();
    expect(mockKV.put).toHaveBeenCalledWith(
      'rate_limit:192.168.1.100',
      'NaN', // parseInt('invalid-number') + 1 = NaN
      { expirationTtl: 60 }
    );
  });
});
