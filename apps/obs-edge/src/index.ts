/**
 * obs-edge - Cloudflare Worker for Genesis Observability
 * API endpoints: /ingest, /metrics, /costs
 */

import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';
import { ingestHandler } from './handlers/ingest';
import { metricsHandler } from './handlers/metrics';
import { costsHandler } from './handlers/costs';
import { authMiddleware } from './middleware/auth';
import { rateLimitMiddleware } from './middleware/rate-limit';

export interface Env {
  SUPABASE_URL: string;
  SUPABASE_SERVICE_KEY: string;
  API_KEY: string;
  RATE_LIMIT: KVNamespace;
  ENVIRONMENT: string;
}

const app = new Hono<{ Bindings: Env }>();

// Global middleware
app.use('*', logger());
app.use('*', cors({
  origin: [
    'http://localhost:3000',
    'https://observability.genesis.com',
    'https://genesis-observability-obs-dashboard.vercel.app',
  ],
  credentials: true,
  allowMethods: ['GET', 'POST', 'OPTIONS'],
  allowHeaders: ['Content-Type', 'Authorization'],
  exposeHeaders: ['Content-Length'],
  maxAge: 600,
}));

// Health check
app.get('/health', (c) => {
  return c.json({
    status: 'ok',
    environment: c.env.ENVIRONMENT,
    timestamp: new Date().toISOString(),
  });
});

// Protected routes (require API key + rate limiting)
app.use('/ingest', authMiddleware);
app.use('/ingest', rateLimitMiddleware);
app.post('/ingest', ingestHandler);

app.use('/metrics', authMiddleware);
app.use('/metrics', rateLimitMiddleware);
app.get('/metrics', metricsHandler);

app.use('/costs', authMiddleware);
app.use('/costs', rateLimitMiddleware);
app.get('/costs', costsHandler);

// 404 handler
app.notFound((c) => {
  return c.json({ error: 'Not Found' }, 404);
});

// Error handler
app.onError((err, c) => {
  console.error('Error:', err);
  return c.json({
    error: 'Internal Server Error',
    message: err.message,
  }, 500);
});

export default app;
