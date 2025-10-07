/**
 * Tests for Supabase utilities
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { getSupabaseClient, insertLLMUsage, getMetrics, getCostSummary } from '../../src/utils/supabase';
import type { Env } from '../../src/index';

// Mock @supabase/supabase-js
vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(),
}));

import { createClient } from '@supabase/supabase-js';

describe('Supabase Utilities', () => {
  let mockEnv: Env;
  let mockSupabaseClient: any;

  beforeEach(() => {
    vi.clearAllMocks();

    mockEnv = {
      SUPABASE_URL: 'https://test.supabase.co',
      SUPABASE_SERVICE_KEY: 'test-service-key',
      API_KEY: 'test-api-key',
      RATE_LIMIT: {} as any,
    };

    mockSupabaseClient = {
      from: vi.fn(),
    };

    vi.mocked(createClient).mockReturnValue(mockSupabaseClient);
  });

  afterEach(async () => {
    // Reset singleton client by reimporting the module
    vi.resetModules();
  });

  describe('getSupabaseClient', () => {
    it('should create Supabase client with correct configuration', () => {
      getSupabaseClient(mockEnv);

      expect(createClient).toHaveBeenCalledWith(
        'https://test.supabase.co',
        'test-service-key',
        {
          auth: {
            persistSession: false,
            autoRefreshToken: false,
          },
        }
      );
    });

    it('should cache and reuse client instance (singleton behavior)', () => {
      // Clear any existing calls
      vi.mocked(createClient).mockClear();

      const client1 = getSupabaseClient(mockEnv);
      const firstCallCount = vi.mocked(createClient).mock.calls.length;

      const client2 = getSupabaseClient(mockEnv);
      const secondCallCount = vi.mocked(createClient).mock.calls.length;

      // Both calls should return the same instance
      expect(client1).toBe(client2);
      // createClient should only be called once (on first getSupabaseClient call)
      expect(secondCallCount).toBe(firstCallCount);
    });
  });

  describe('insertLLMUsage', () => {
    it('should successfully insert LLM usage data', async () => {
      const usageData = {
        project_id: 'test-project',
        model: 'gpt-4',
        provider: 'openai',
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150,
        cost_usd: 0.015,
        latency_ms: 250,
        timestamp: '2025-01-07T12:00:00Z',
        metadata: { user: 'test-user' },
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'test-id-123' },
            error: null,
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
      });

      const result = await insertLLMUsage(mockSupabaseClient, usageData);

      expect(result).toEqual({
        success: true,
        id: 'test-id-123',
      });
      expect(mockSupabaseClient.from).toHaveBeenCalledWith('llm_usage');
      expect(mockInsert).toHaveBeenCalledWith(usageData);
    });

    it('should handle insertion error', async () => {
      const usageData = {
        project_id: 'test-project',
        model: 'gpt-4',
        provider: 'openai',
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150,
        cost_usd: 0.015,
        latency_ms: 250,
        timestamp: '2025-01-07T12:00:00Z',
      };

      const mockInsert = vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Duplicate key violation' },
          }),
        }),
      });

      mockSupabaseClient.from.mockReturnValue({
        insert: mockInsert,
      });

      const result = await insertLLMUsage(mockSupabaseClient, usageData);

      expect(result).toEqual({
        success: false,
        error: 'Duplicate key violation',
      });
    });

    it('should handle exception during insertion', async () => {
      const usageData = {
        project_id: 'test-project',
        model: 'gpt-4',
        provider: 'openai',
        input_tokens: 100,
        output_tokens: 50,
        total_tokens: 150,
        cost_usd: 0.015,
        latency_ms: 250,
        timestamp: '2025-01-07T12:00:00Z',
      };

      mockSupabaseClient.from.mockImplementation(() => {
        throw new Error('Network error');
      });

      const result = await insertLLMUsage(mockSupabaseClient, usageData);

      expect(result).toEqual({
        success: false,
        error: 'Network error',
      });
    });
  });

  describe('getMetrics', () => {
    it('should successfully fetch and aggregate metrics', async () => {
      const mockData = [
        {
          timestamp: '2025-01-01T10:00:00Z',
          total_tokens: 100,
          cost_usd: 0.01,
          latency_ms: 200,
          model: 'gpt-4',
        },
        {
          timestamp: '2025-01-01T11:00:00Z',
          total_tokens: 150,
          cost_usd: 0.015,
          latency_ms: 300,
          model: 'gpt-4',
        },
        {
          timestamp: '2025-01-01T12:00:00Z',
          total_tokens: 50,
          cost_usd: 0.005,
          latency_ms: 100,
          model: 'gpt-3.5-turbo',
        },
      ];

      const mockOrder = vi.fn().mockResolvedValue({
        data: mockData,
        error: null,
      });

      const mockLte = vi.fn().mockReturnValue({
        order: mockOrder,
      });

      const mockGte = vi.fn().mockReturnValue({
        lte: mockLte,
      });

      const mockEq = vi.fn().mockReturnValue({
        gte: mockGte,
      });

      const mockSelect = vi.fn().mockReturnValue({
        eq: mockEq,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: mockSelect,
      });

      const metrics = await getMetrics(
        mockSupabaseClient,
        'test-project',
        '2025-01-01',
        '2025-01-07'
      );

      expect(metrics.totalRequests).toBe(3);
      expect(metrics.totalTokens).toBe(300);
      expect(metrics.totalCost).toBe(0.03);
      expect(metrics.avgLatency).toBe(200); // (200 + 300 + 100) / 3
      expect(metrics.modelBreakdown).toEqual({
        'gpt-4': { count: 2, tokens: 250, cost: 0.025 },
        'gpt-3.5-turbo': { count: 1, tokens: 50, cost: 0.005 },
      });
      expect(metrics.dataPoints).toHaveLength(3);
    });

    it('should handle empty result set', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: [],
        error: null,
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                order: mockOrder,
              }),
            }),
          }),
        }),
      });

      const metrics = await getMetrics(
        mockSupabaseClient,
        'empty-project',
        '2025-01-01',
        '2025-01-07'
      );

      expect(metrics.totalRequests).toBe(0);
      expect(metrics.totalTokens).toBe(0);
      expect(metrics.totalCost).toBe(0);
      expect(metrics.avgLatency).toBe(0);
      expect(metrics.modelBreakdown).toEqual({});
    });

    it('should throw error on database failure', async () => {
      const mockOrder = vi.fn().mockResolvedValue({
        data: null,
        error: { message: 'Connection timeout' },
      });

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                order: mockOrder,
              }),
            }),
          }),
        }),
      });

      await expect(
        getMetrics(mockSupabaseClient, 'test-project', '2025-01-01', '2025-01-07')
      ).rejects.toThrow('Failed to fetch metrics: Connection timeout');
    });

    it('should round cost to 2 decimal places', async () => {
      const mockData = [
        {
          timestamp: '2025-01-01T10:00:00Z',
          total_tokens: 333,
          cost_usd: 0.333333,
          latency_ms: 200,
          model: 'gpt-4',
        },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockData,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const metrics = await getMetrics(
        mockSupabaseClient,
        'test-project',
        '2025-01-01',
        '2025-01-07'
      );

      expect(metrics.totalCost).toBe(0.33);
    });
  });

  describe('getCostSummary', () => {
    it('should successfully fetch and aggregate cost summary', async () => {
      const mockData = [
        {
          timestamp: '2025-01-01T10:00:00Z',
          cost_usd: 0.50,
          provider: 'openai',
          model: 'gpt-4',
        },
        {
          timestamp: '2025-01-01T15:00:00Z',
          cost_usd: 0.75,
          provider: 'openai',
          model: 'gpt-3.5-turbo',
        },
        {
          timestamp: '2025-01-02T10:00:00Z',
          cost_usd: 1.00,
          provider: 'anthropic',
          model: 'claude-3-sonnet',
        },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockData,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const summary = await getCostSummary(
        mockSupabaseClient,
        'test-project',
        '2025-01-01',
        '2025-01-07'
      );

      expect(summary.totalCost).toBe(2.25);
      expect(summary.dailyCosts).toHaveLength(2);
      expect(summary.dailyCosts).toContainEqual({
        date: '2025-01-01',
        cost: 1.25,
      });
      expect(summary.dailyCosts).toContainEqual({
        date: '2025-01-02',
        cost: 1.00,
      });
      expect(summary.providerCosts).toHaveLength(2);
      expect(summary.providerCosts).toContainEqual({
        provider: 'openai',
        cost: 1.25,
      });
      expect(summary.providerCosts).toContainEqual({
        provider: 'anthropic',
        cost: 1.00,
      });
    });

    it('should handle empty cost data', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: [],
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const summary = await getCostSummary(
        mockSupabaseClient,
        'empty-project',
        '2025-01-01',
        '2025-01-07'
      );

      expect(summary.totalCost).toBe(0);
      expect(summary.dailyCosts).toEqual([]);
      expect(summary.providerCosts).toEqual([]);
    });

    it('should throw error on database failure', async () => {
      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: null,
                  error: { message: 'Query timeout' },
                }),
              }),
            }),
          }),
        }),
      });

      await expect(
        getCostSummary(mockSupabaseClient, 'test-project', '2025-01-01', '2025-01-07')
      ).rejects.toThrow('Failed to fetch cost summary: Query timeout');
    });

    it('should round costs to 2 decimal places', async () => {
      const mockData = [
        {
          timestamp: '2025-01-01T10:00:00Z',
          cost_usd: 0.123456,
          provider: 'openai',
          model: 'gpt-4',
        },
      ];

      mockSupabaseClient.from.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            gte: vi.fn().mockReturnValue({
              lte: vi.fn().mockReturnValue({
                order: vi.fn().mockResolvedValue({
                  data: mockData,
                  error: null,
                }),
              }),
            }),
          }),
        }),
      });

      const summary = await getCostSummary(
        mockSupabaseClient,
        'test-project',
        '2025-01-01',
        '2025-01-07'
      );

      expect(summary.totalCost).toBe(0.12);
      expect(summary.dailyCosts[0].cost).toBe(0.12);
    });
  });
});
