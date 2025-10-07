/**
 * Authentication Middleware
 * Validates API key from Authorization header
 */

import { Context, Next } from 'hono';
import type { Env } from '../index';

export async function authMiddleware(c: Context<{ Bindings: Env }>, next: Next) {
  const authHeader = c.req.header('Authorization');

  if (!authHeader) {
    return c.json({ error: 'Missing Authorization header' }, 401);
  }

  // Expected format: "Bearer <api_key>"
  const [scheme, token] = authHeader.split(' ');

  if (scheme !== 'Bearer' || !token) {
    return c.json({ error: 'Invalid Authorization format' }, 401);
  }

  if (token !== c.env.API_KEY) {
    return c.json({ error: 'Invalid API key' }, 401);
  }

  await next();
}
