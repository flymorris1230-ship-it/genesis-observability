/**
 * Rate Limiting Middleware
 * Uses Cloudflare KV for distributed rate limiting
 * Limit: 100 requests per minute per IP
 */

import { Context, Next } from 'hono';
import type { Env } from '../index';

const RATE_LIMIT = 100; // requests per minute
const WINDOW = 60; // seconds

export async function rateLimitMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const ip = c.req.header('CF-Connecting-IP') || 'unknown';
  const key = `rate_limit:${ip}`;

  try {
    // Get current count from KV
    const countStr = await c.env.RATE_LIMIT.get(key);
    const count = countStr ? parseInt(countStr, 10) : 0;

    if (count >= RATE_LIMIT) {
      return c.json({
        error: 'Rate limit exceeded',
        limit: RATE_LIMIT,
        window: `${WINDOW}s`,
        retryAfter: WINDOW,
      }, 429);
    }

    // Increment counter
    const newCount = count + 1;
    await c.env.RATE_LIMIT.put(key, newCount.toString(), {
      expirationTtl: WINDOW,
    });

    // Add rate limit headers
    c.header('X-RateLimit-Limit', RATE_LIMIT.toString());
    c.header('X-RateLimit-Remaining', (RATE_LIMIT - newCount).toString());
    c.header('X-RateLimit-Reset', (Date.now() + WINDOW * 1000).toString());

    await next();
  } catch (error) {
    console.error('Rate limit error:', error);
    // On error, allow request (fail open)
    await next();
  }
}
