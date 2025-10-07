/**
 * Tests for /metrics handler
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Context } from 'hono';
import { metricsHandler } from '../../src/handlers/metrics';
import type { Env } from '../../src/index';

// Mock Supabase utilities
vi.mock('../../src/utils/supabase', () => ({
  getSupabaseClient: vi.fn(),
  getMetrics: vi.fn(),
}));

import { getSupabaseClient, getMetrics } from '../../src/utils/supabase';

describe('metricsHandler', () => {
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
        query: vi.fn(),
        header: vi.fn(),
      },
      json: vi.fn((data, status?) => ({ data, status })),
      env: mockEnv,
    };

    // Mock successful Supabase client
    vi.mocked(getSupabaseClient).mockReturnValue({} as any);
  });

  it('should successfully fetch metrics with all parameters', async () => {
    const mockMetrics = {
      total_requests: 150,
      total_tokens: 50000,
      total_cost: 1.25,
      avg_latency: 320,
      model_breakdown: {
        'gpt-4': 50,
        'gpt-3.5-turbo': 100,
      },
    };

    mockContext.req.query.mockImplementation((key: string) => {
      const params: Record<string, string> = {
        project_id: 'test-project',
        start_date: '2025-01-01',
        end_date: '2025-01-07',
      };
      return params[key];
    });

    vi.mocked(getMetrics).mockResolvedValue(mockMetrics);

    const response = await metricsHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data).toEqual({
      project_id: 'test-project',
      start_date: '2025-01-01T00:00:00.000Z',
      end_date: '2025-01-07T00:00:00.000Z',
      metrics: mockMetrics,
    });
    expect(getMetrics).toHaveBeenCalledWith(
      expect.any(Object),
      'test-project',
      '2025-01-01T00:00:00.000Z',
      '2025-01-07T00:00:00.000Z'
    );
  });

  it('should use default date range (last 7 days) when not specified', async () => {
    const mockMetrics = {
      total_requests: 50,
      total_tokens: 10000,
      total_cost: 0.30,
      avg_latency: 250,
    };

    mockContext.req.query.mockImplementation((key: string) => {
      return key === 'project_id' ? 'test-project' : undefined;
    });

    vi.mocked(getMetrics).mockResolvedValue(mockMetrics);

    const response = await metricsHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.project_id).toBe('test-project');
    expect(response.data.metrics).toEqual(mockMetrics);

    // Verify that date range is approximately last 7 days
    const endDate = new Date(response.data.end_date);
    const startDate = new Date(response.data.start_date);
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeCloseTo(7, 0);
  });

  it('should reject request without project_id', async () => {
    mockContext.req.query.mockReturnValue(undefined);

    const response = await metricsHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.error).toBe('Missing project_id parameter');
    expect(response.status).toBe(400);
    expect(getMetrics).not.toHaveBeenCalled();
  });

  it('should reject request with invalid start_date', async () => {
    mockContext.req.query.mockImplementation((key: string) => {
      const params: Record<string, string> = {
        project_id: 'test-project',
        start_date: 'invalid-date',
      };
      return params[key];
    });

    const response = await metricsHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.error).toBe('Invalid date format');
    expect(response.status).toBe(400);
    expect(getMetrics).not.toHaveBeenCalled();
  });

  it('should reject request with invalid end_date', async () => {
    mockContext.req.query.mockImplementation((key: string) => {
      const params: Record<string, string> = {
        project_id: 'test-project',
        end_date: 'not-a-date',
      };
      return params[key];
    });

    const response = await metricsHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.error).toBe('Invalid date format');
    expect(response.status).toBe(400);
  });

  it('should handle custom date range correctly', async () => {
    const mockMetrics = {
      total_requests: 200,
      total_tokens: 75000,
      total_cost: 2.5,
      avg_latency: 400,
    };

    mockContext.req.query.mockImplementation((key: string) => {
      const params: Record<string, string> = {
        project_id: 'test-project',
        start_date: '2024-12-01',
        end_date: '2024-12-31',
      };
      return params[key];
    });

    vi.mocked(getMetrics).mockResolvedValue(mockMetrics);

    const response = await metricsHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.start_date).toBe('2024-12-01T00:00:00.000Z');
    expect(response.data.end_date).toBe('2024-12-31T00:00:00.000Z');
    expect(response.data.metrics).toEqual(mockMetrics);
  });

  it('should handle Supabase query error', async () => {
    mockContext.req.query.mockImplementation((key: string) => {
      return key === 'project_id' ? 'test-project' : undefined;
    });

    vi.mocked(getMetrics).mockRejectedValue(new Error('Database query failed'));

    const response = await metricsHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.error).toBe('Failed to fetch metrics');
    expect(response.data.message).toBe('Database query failed');
    expect(response.status).toBe(500);
  });

  it('should handle empty metrics result', async () => {
    mockContext.req.query.mockImplementation((key: string) => {
      return key === 'project_id' ? 'empty-project' : undefined;
    });

    vi.mocked(getMetrics).mockResolvedValue({
      total_requests: 0,
      total_tokens: 0,
      total_cost: 0,
      avg_latency: 0,
    });

    const response = await metricsHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.metrics.total_requests).toBe(0);
    expect(response.data.metrics.total_tokens).toBe(0);
  });

  it('should handle ISO 8601 date format', async () => {
    const mockMetrics = { total_requests: 10 };

    mockContext.req.query.mockImplementation((key: string) => {
      const params: Record<string, string> = {
        project_id: 'test-project',
        start_date: '2025-01-01T12:30:00Z',
        end_date: '2025-01-07T18:45:00Z',
      };
      return params[key];
    });

    vi.mocked(getMetrics).mockResolvedValue(mockMetrics);

    const response = await metricsHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.start_date).toBe('2025-01-01T12:30:00.000Z');
    expect(response.data.end_date).toBe('2025-01-07T18:45:00.000Z');
  });

  it('should handle metrics with model breakdown', async () => {
    const mockMetrics = {
      total_requests: 100,
      total_tokens: 50000,
      total_cost: 1.5,
      avg_latency: 300,
      model_breakdown: {
        'gpt-4': 30,
        'gpt-3.5-turbo': 50,
        'claude-3-sonnet': 20,
      },
      provider_breakdown: {
        'openai': 80,
        'anthropic': 20,
      },
    };

    mockContext.req.query.mockImplementation((key: string) => {
      return key === 'project_id' ? 'test-project' : undefined;
    });

    vi.mocked(getMetrics).mockResolvedValue(mockMetrics);

    const response = await metricsHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.metrics.model_breakdown).toEqual({
      'gpt-4': 30,
      'gpt-3.5-turbo': 50,
      'claude-3-sonnet': 20,
    });
    expect(response.data.metrics.provider_breakdown).toEqual({
      'openai': 80,
      'anthropic': 20,
    });
  });
});
