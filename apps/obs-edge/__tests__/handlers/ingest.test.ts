/**
 * Tests for /ingest handler
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Context } from 'hono';
import { ingestHandler } from '../../src/handlers/ingest';
import type { Env } from '../../src/index';

// Mock Supabase utilities
vi.mock('../../src/utils/supabase', () => ({
  getSupabaseClient: vi.fn(),
  insertLLMUsage: vi.fn(),
}));

import { getSupabaseClient, insertLLMUsage } from '../../src/utils/supabase';

describe('ingestHandler', () => {
  let mockContext: any;
  let mockEnv: Env;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEnv = {
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_KEY: 'test-key',
      API_KEY: 'test-api-key',
      RATE_LIMIT: {} as any,
    };

    mockContext = {
      req: {
        json: vi.fn(),
        query: vi.fn(),
        header: vi.fn(),
      },
      json: vi.fn((data, status?) => ({ data, status })),
      env: mockEnv,
    };

    // Mock successful Supabase client
    vi.mocked(getSupabaseClient).mockReturnValue({} as any);
  });

  it('should successfully ingest valid LLM usage data', async () => {
    const requestBody = {
      project_id: 'test-project',
      model: 'gpt-4',
      provider: 'openai',
      input_tokens: 100,
      output_tokens: 50,
      cost_usd: 0.015,
      latency_ms: 250,
      metadata: { user: 'test-user' },
    };

    mockContext.req.json.mockResolvedValue(requestBody);
    vi.mocked(insertLLMUsage).mockResolvedValue({
      success: true,
      id: 'test-id-123',
    });

    const response = await ingestHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data).toEqual({
      success: true,
      id: 'test-id-123',
      tokens: 150,
      cost_usd: 0.015,
    });
    expect(response.status).toBe(201);
    expect(insertLLMUsage).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        project_id: 'test-project',
        model: 'gpt-4',
        provider: 'openai',
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150,
        cost_usd: 0.015,
        latency_ms: 250,
        metadata: { user: 'test-user' },
      })
    );
  });

  it('should auto-calculate cost if not provided (OpenAI)', async () => {
    const requestBody = {
      project_id: 'test-project',
      model: 'gpt-4',
      provider: 'openai',
      input_tokens: 1000,
      output_tokens: 500,
    };

    mockContext.req.json.mockResolvedValue(requestBody);
    vi.mocked(insertLLMUsage).mockResolvedValue({
      success: true,
      id: 'test-id-456',
    });

    const response = await ingestHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.success).toBe(true);
    expect(response.data.cost_usd).toBeGreaterThan(0);
    // 1500 tokens / 1M * $30 = $0.045
    expect(response.data.cost_usd).toBeCloseTo(0.045, 4);
  });

  it('should auto-calculate cost if not provided (Anthropic)', async () => {
    const requestBody = {
      project_id: 'test-project',
      model: 'claude-3-sonnet',
      provider: 'anthropic',
      input_tokens: 1000000,
      output_tokens: 500000,
    };

    mockContext.req.json.mockResolvedValue(requestBody);
    vi.mocked(insertLLMUsage).mockResolvedValue({
      success: true,
      id: 'test-id-789',
    });

    const response = await ingestHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.success).toBe(true);
    // 1.5M tokens * $3/M = $4.50
    expect(response.data.cost_usd).toBeCloseTo(4.5, 2);
  });

  it('should use default cost for unknown models', async () => {
    const requestBody = {
      project_id: 'test-project',
      model: 'unknown-model',
      provider: 'unknown-provider',
      input_tokens: 1000000,
      output_tokens: 0,
    };

    mockContext.req.json.mockResolvedValue(requestBody);
    vi.mocked(insertLLMUsage).mockResolvedValue({
      success: true,
      id: 'test-id-default',
    });

    const response = await ingestHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.success).toBe(true);
    // 1M tokens * $1/M (default) = $1.00
    expect(response.data.cost_usd).toBeCloseTo(1.0, 2);
  });

  it('should reject request with missing project_id', async () => {
    const requestBody = {
      model: 'gpt-4',
      provider: 'openai',
      input_tokens: 100,
      output_tokens: 50,
    };

    mockContext.req.json.mockResolvedValue(requestBody);

    const response = await ingestHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.error).toBe('Missing required fields: project_id, model, provider');
    expect(response.status).toBe(400);
    expect(insertLLMUsage).not.toHaveBeenCalled();
  });

  it('should reject request with missing model', async () => {
    const requestBody = {
      project_id: 'test-project',
      provider: 'openai',
      input_tokens: 100,
      output_tokens: 50,
    };

    mockContext.req.json.mockResolvedValue(requestBody);

    const response = await ingestHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.error).toBe('Missing required fields: project_id, model, provider');
    expect(response.status).toBe(400);
  });

  it('should reject request with invalid token types', async () => {
    const requestBody = {
      project_id: 'test-project',
      model: 'gpt-4',
      provider: 'openai',
      input_tokens: 'invalid',
      output_tokens: 50,
    };

    mockContext.req.json.mockResolvedValue(requestBody);

    const response = await ingestHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.error).toBe('input_tokens and output_tokens must be numbers');
    expect(response.status).toBe(400);
  });

  it('should handle Supabase insertion failure', async () => {
    const requestBody = {
      project_id: 'test-project',
      model: 'gpt-4',
      provider: 'openai',
      input_tokens: 100,
      output_tokens: 50,
    };

    mockContext.req.json.mockResolvedValue(requestBody);
    vi.mocked(insertLLMUsage).mockResolvedValue({
      success: false,
      error: 'Database connection failed',
    });

    const response = await ingestHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.error).toBe('Failed to insert data');
    expect(response.data.message).toBe('Database connection failed');
    expect(response.status).toBe(500);
  });

  it('should handle invalid JSON request', async () => {
    mockContext.req.json.mockRejectedValue(new Error('Invalid JSON'));

    const response = await ingestHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.error).toBe('Invalid request');
    expect(response.data.message).toBe('Invalid JSON');
    expect(response.status).toBe(400);
  });

  it('should round cost to 4 decimal places', async () => {
    const requestBody = {
      project_id: 'test-project',
      model: 'gpt-4',
      provider: 'openai',
      input_tokens: 333,
      output_tokens: 333,
    };

    mockContext.req.json.mockResolvedValue(requestBody);
    vi.mocked(insertLLMUsage).mockResolvedValue({
      success: true,
      id: 'test-id-round',
    });

    const response = await ingestHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.success).toBe(true);
    // Check that cost has at most 4 decimal places
    const costStr = response.data.cost_usd.toString();
    const decimalPart = costStr.split('.')[1] || '';
    expect(decimalPart.length).toBeLessThanOrEqual(4);
  });

  it('should default latency_ms to 0 if not provided', async () => {
    const requestBody = {
      project_id: 'test-project',
      model: 'gpt-4',
      provider: 'openai',
      input_tokens: 100,
      output_tokens: 50,
      cost_usd: 0.01,
    };

    mockContext.req.json.mockResolvedValue(requestBody);
    vi.mocked(insertLLMUsage).mockResolvedValue({
      success: true,
      id: 'test-id-latency',
    });

    await ingestHandler(mockContext as Context<{ Bindings: Env }>);

    expect(insertLLMUsage).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        latency_ms: 0,
      })
    );
  });

  it('should default metadata to empty object if not provided', async () => {
    const requestBody = {
      project_id: 'test-project',
      model: 'gpt-4',
      provider: 'openai',
      input_tokens: 100,
      output_tokens: 50,
    };

    mockContext.req.json.mockResolvedValue(requestBody);
    vi.mocked(insertLLMUsage).mockResolvedValue({
      success: true,
      id: 'test-id-metadata',
    });

    await ingestHandler(mockContext as Context<{ Bindings: Env }>);

    expect(insertLLMUsage).toHaveBeenCalledWith(
      expect.any(Object),
      expect.objectContaining({
        metadata: {},
      })
    );
  });
});
