/**
 * Tests for /costs handler
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { Context } from 'hono';
import { costsHandler } from '../../src/handlers/costs';
import type { Env } from '../../src/index';

// Mock Supabase utilities
vi.mock('../../src/utils/supabase', () => ({
  getSupabaseClient: vi.fn(),
  getCostSummary: vi.fn(),
}));

import { getSupabaseClient, getCostSummary } from '../../src/utils/supabase';

describe('costsHandler', () => {
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

  it('should successfully fetch cost summary with all parameters', async () => {
    const mockCostSummary = {
      total_cost: 15.75,
      by_provider: {
        openai: 10.50,
        anthropic: 5.25,
      },
      by_model: {
        'gpt-4': 8.00,
        'gpt-3.5-turbo': 2.50,
        'claude-3-sonnet': 5.25,
      },
      daily_breakdown: [
        { date: '2025-01-01', cost: 2.50 },
        { date: '2025-01-02', cost: 3.75 },
      ],
    };

    mockContext.req.query.mockImplementation((key: string) => {
      const params: Record<string, string> = {
        project_id: 'test-project',
        start_date: '2025-01-01',
        end_date: '2025-01-31',
      };
      return params[key];
    });

    vi.mocked(getCostSummary).mockResolvedValue(mockCostSummary);

    const response = await costsHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data).toEqual({
      project_id: 'test-project',
      start_date: '2025-01-01T00:00:00.000Z',
      end_date: '2025-01-31T00:00:00.000Z',
      summary: mockCostSummary,
    });
    expect(getCostSummary).toHaveBeenCalledWith(
      expect.any(Object),
      'test-project',
      '2025-01-01T00:00:00.000Z',
      '2025-01-31T00:00:00.000Z'
    );
  });

  it('should use default date range (last 30 days) when not specified', async () => {
    const mockCostSummary = {
      total_cost: 5.25,
      by_provider: { openai: 5.25 },
    };

    mockContext.req.query.mockImplementation((key: string) => {
      return key === 'project_id' ? 'test-project' : undefined;
    });

    vi.mocked(getCostSummary).mockResolvedValue(mockCostSummary);

    const response = await costsHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.project_id).toBe('test-project');
    expect(response.data.summary).toEqual(mockCostSummary);

    // Verify that date range is approximately last 30 days
    const endDate = new Date(response.data.end_date);
    const startDate = new Date(response.data.start_date);
    const daysDiff = (endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24);
    expect(daysDiff).toBeCloseTo(30, 0);
  });

  it('should reject request without project_id', async () => {
    mockContext.req.query.mockReturnValue(undefined);

    const response = await costsHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.error).toBe('Missing project_id parameter');
    expect(response.status).toBe(400);
    expect(getCostSummary).not.toHaveBeenCalled();
  });

  it('should reject request with invalid start_date', async () => {
    mockContext.req.query.mockImplementation((key: string) => {
      const params: Record<string, string> = {
        project_id: 'test-project',
        start_date: 'invalid-date',
      };
      return params[key];
    });

    const response = await costsHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.error).toBe('Invalid date format');
    expect(response.status).toBe(400);
    expect(getCostSummary).not.toHaveBeenCalled();
  });

  it('should reject request with invalid end_date', async () => {
    mockContext.req.query.mockImplementation((key: string) => {
      const params: Record<string, string> = {
        project_id: 'test-project',
        end_date: 'not-a-date',
      };
      return params[key];
    });

    const response = await costsHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.error).toBe('Invalid date format');
    expect(response.status).toBe(400);
  });

  it('should handle custom date range correctly', async () => {
    const mockCostSummary = {
      total_cost: 25.50,
      by_provider: { anthropic: 25.50 },
    };

    mockContext.req.query.mockImplementation((key: string) => {
      const params: Record<string, string> = {
        project_id: 'test-project',
        start_date: '2024-11-01',
        end_date: '2024-11-30',
      };
      return params[key];
    });

    vi.mocked(getCostSummary).mockResolvedValue(mockCostSummary);

    const response = await costsHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.start_date).toBe('2024-11-01T00:00:00.000Z');
    expect(response.data.end_date).toBe('2024-11-30T00:00:00.000Z');
    expect(response.data.summary).toEqual(mockCostSummary);
  });

  it('should handle Supabase query error', async () => {
    mockContext.req.query.mockImplementation((key: string) => {
      return key === 'project_id' ? 'test-project' : undefined;
    });

    vi.mocked(getCostSummary).mockRejectedValue(new Error('Database connection timeout'));

    const response = await costsHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.error).toBe('Failed to fetch costs');
    expect(response.data.message).toBe('Database connection timeout');
    expect(response.status).toBe(500);
  });

  it('should handle zero cost result', async () => {
    mockContext.req.query.mockImplementation((key: string) => {
      return key === 'project_id' ? 'new-project' : undefined;
    });

    vi.mocked(getCostSummary).mockResolvedValue({
      total_cost: 0,
      by_provider: {},
      by_model: {},
    });

    const response = await costsHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.summary.total_cost).toBe(0);
  });

  it('should handle ISO 8601 date format', async () => {
    const mockCostSummary = { total_cost: 3.50 };

    mockContext.req.query.mockImplementation((key: string) => {
      const params: Record<string, string> = {
        project_id: 'test-project',
        start_date: '2025-01-01T08:00:00Z',
        end_date: '2025-01-15T20:30:00Z',
      };
      return params[key];
    });

    vi.mocked(getCostSummary).mockResolvedValue(mockCostSummary);

    const response = await costsHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.start_date).toBe('2025-01-01T08:00:00.000Z');
    expect(response.data.end_date).toBe('2025-01-15T20:30:00.000Z');
  });

  it('should handle detailed cost breakdown', async () => {
    const mockCostSummary = {
      total_cost: 50.00,
      by_provider: {
        openai: 30.00,
        anthropic: 15.00,
        google: 5.00,
      },
      by_model: {
        'gpt-4': 25.00,
        'gpt-3.5-turbo': 5.00,
        'claude-3-opus': 10.00,
        'claude-3-sonnet': 5.00,
        'gemini-pro': 5.00,
      },
      daily_breakdown: [
        { date: '2025-01-01', cost: 10.00 },
        { date: '2025-01-02', cost: 12.50 },
        { date: '2025-01-03', cost: 15.00 },
        { date: '2025-01-04', cost: 12.50 },
      ],
    };

    mockContext.req.query.mockImplementation((key: string) => {
      return key === 'project_id' ? 'test-project' : undefined;
    });

    vi.mocked(getCostSummary).mockResolvedValue(mockCostSummary);

    const response = await costsHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.summary.by_provider).toHaveProperty('openai');
    expect(response.data.summary.by_provider).toHaveProperty('anthropic');
    expect(response.data.summary.by_provider).toHaveProperty('google');
    expect(response.data.summary.daily_breakdown).toHaveLength(4);
  });

  it('should handle very small costs (fractional cents)', async () => {
    const mockCostSummary = {
      total_cost: 0.0023,
      by_provider: {
        openai: 0.0023,
      },
    };

    mockContext.req.query.mockImplementation((key: string) => {
      return key === 'project_id' ? 'test-project' : undefined;
    });

    vi.mocked(getCostSummary).mockResolvedValue(mockCostSummary);

    const response = await costsHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.summary.total_cost).toBeCloseTo(0.0023, 4);
  });

  it('should handle large cost values', async () => {
    const mockCostSummary = {
      total_cost: 12500.75,
      by_provider: {
        openai: 8000.50,
        anthropic: 4500.25,
      },
    };

    mockContext.req.query.mockImplementation((key: string) => {
      return key === 'project_id' ? 'enterprise-project' : undefined;
    });

    vi.mocked(getCostSummary).mockResolvedValue(mockCostSummary);

    const response = await costsHandler(mockContext as Context<{ Bindings: Env }>);

    expect(response.data.summary.total_cost).toBe(12500.75);
  });
});
