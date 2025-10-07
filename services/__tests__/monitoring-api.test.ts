/**
 * MonitoringAPI Unit Tests
 * Coverage: agent stats, quality trends, cost tracking, learning curves
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { MonitoringAPI } from '../src/monitoring-api';

// Mock Supabase
const mockSupabaseSelect = vi.fn();
const mockSupabaseFrom = vi.fn();
const mockSupabaseRpc = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
    rpc: mockSupabaseRpc,
  })),
}));

describe('MonitoringAPI', () => {
  let monitoringAPI: MonitoringAPI;

  beforeEach(() => {
    vi.clearAllMocks();
    monitoringAPI = new MonitoringAPI('https://test.supabase.co', 'test-key');
  });

  describe('getAgentStats', () => {
    it('should calculate aggregated statistics', async () => {
      const mockExecutions = [
        { quality_score: 8.0, execution_time_ms: 60000, status: 'success' },
        { quality_score: 9.0, execution_time_ms: 45000, status: 'success' },
        { quality_score: 6.0, execution_time_ms: 90000, status: 'failure' },
        { quality_score: 7.5, execution_time_ms: 55000, status: 'success' },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({
            data: mockExecutions,
            error: null,
          }),
        }),
      });

      const stats = await monitoringAPI.getAgentStats(7);

      expect(stats.totalTasks).toBe(4);
      expect(stats.successRate).toBe(0.75); // 3/4
      expect(stats.avgQualityScore).toBe(7.6); // (8+9+6+7.5)/4 = 7.625 → 7.6
      expect(stats.avgExecutionTime).toBe(62500); // (60+45+90+55)/4 = 62.5k
      expect(stats.period).toBe('7 days');
    });

    it('should handle no executions', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({
            data: [],
            error: null,
          }),
        }),
      });

      const stats = await monitoringAPI.getAgentStats(30);

      expect(stats.totalTasks).toBe(0);
      expect(stats.successRate).toBe(0);
      expect(stats.avgQualityScore).toBe(0);
      expect(stats.avgExecutionTime).toBe(0);
      expect(stats.period).toBe('30 days');
    });
  });

  describe('getQualityTrend', () => {
    it('should fetch quality trend from RPC function', async () => {
      const mockTrendData = [
        {
          date: '2025-10-07',
          avg_quality: 8.5,
          task_count: 15,
          success_rate: 0.933,
        },
        {
          date: '2025-10-06',
          avg_quality: 7.8,
          task_count: 12,
          success_rate: 0.917,
        },
      ];

      mockSupabaseRpc.mockResolvedValue({
        data: mockTrendData,
        error: null,
      });

      const trend = await monitoringAPI.getQualityTrend(7);

      expect(mockSupabaseRpc).toHaveBeenCalledWith('get_quality_trend', {
        days_ago: 7,
      });
      expect(trend).toHaveLength(2);
      expect(trend[0].date).toBe('2025-10-07');
      expect(trend[0].avgQuality).toBe(8.5);
      expect(trend[0].taskCount).toBe(15);
      expect(trend[0].successRate).toBe(0.93);
    });

    it('should handle RPC errors', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' },
      });

      const trend = await monitoringAPI.getQualityTrend(7);

      expect(trend).toEqual([]);
    });
  });

  describe('getCostTracking', () => {
    it('should fetch cost data from RPC function', async () => {
      const mockCostData = [
        {
          date: '2025-10-07',
          total_executions: 50,
          avg_execution_time_ms: 65000,
          estimated_llm_calls: 150,
          estimated_cost_usd: 0.05,
        },
      ];

      mockSupabaseRpc.mockResolvedValue({
        data: mockCostData,
        error: null,
      });

      const costs = await monitoringAPI.getCostTracking(30);

      expect(mockSupabaseRpc).toHaveBeenCalledWith('get_cost_tracking', {
        days_ago: 30,
      });
      expect(costs).toHaveLength(1);
      expect(costs[0].date).toBe('2025-10-07');
      expect(costs[0].totalExecutions).toBe(50);
      expect(costs[0].avgExecutionTimeMs).toBe(65000);
      expect(costs[0].estimatedLLMCalls).toBe(150);
      expect(costs[0].estimatedCostUSD).toBe(0.05);
    });
  });

  describe('getLearningCurve', () => {
    it('should fetch learning curve metrics by phase', async () => {
      const mockLearningData = [
        {
          week_number: 42,
          avg_quality: 8.2,
          task_count: 25,
          knowledge_growth: 5,
          success_rate: 0.92,
        },
        {
          week_number: 41,
          avg_quality: 7.5,
          task_count: 20,
          knowledge_growth: 4,
          success_rate: 0.85,
        },
      ];

      mockSupabaseRpc.mockResolvedValue({
        data: mockLearningData,
        error: null,
      });

      const curve = await monitoringAPI.getLearningCurve('Phase 2');

      expect(mockSupabaseRpc).toHaveBeenCalledWith('get_learning_curve_metrics', {
        phase_name: 'Phase 2',
      });
      expect(curve).toHaveLength(2);
      expect(curve[0].weekNumber).toBe(42);
      expect(curve[0].avgQuality).toBe(8.2);
      expect(curve[0].knowledgeGrowth).toBe(5);
    });
  });

  describe('getKnowledgeHealth', () => {
    it('should calculate health scores for all knowledge', async () => {
      const mockKnowledge = [
        {
          id: 'k1',
          title: 'Healthy Knowledge',
          avg_rating: 9.0,
          usage_count: 20,
          failure_rate: 0.1,
        },
        {
          id: 'k2',
          title: 'Moderate Knowledge',
          avg_rating: 6.0,
          usage_count: 10,
          failure_rate: 0.3,
        },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: mockKnowledge,
                error: null,
              }),
            }),
          }),
        }),
      });

      mockSupabaseRpc.mockResolvedValueOnce({ data: 8.5, error: null });
      mockSupabaseRpc.mockResolvedValueOnce({ data: 5.2, error: null });

      const health = await monitoringAPI.getKnowledgeHealth();

      expect(health).toHaveLength(2);
      expect(health[0].healthScore).toBeGreaterThan(health[1].healthScore); // Sorted by health
      expect(health[0].id).toBe('k1');
      expect(health[0].title).toBe('Healthy Knowledge');
    });
  });

  describe('getFailureAnalysis', () => {
    it('should analyze task failures', async () => {
      const mockFailures = [
        {
          id: '1',
          description: 'Task 1 failed',
          error_message: 'Connection timeout',
          timestamp: '2025-10-07T10:00:00Z',
        },
        {
          id: '2',
          description: 'Task 2 failed',
          error_message: 'Network error',
          timestamp: '2025-10-07T11:00:00Z',
        },
        {
          id: '3',
          description: 'Task 3 failed',
          error_message: 'Request timed out',
          timestamp: '2025-10-07T12:00:00Z',
        },
      ];

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockFailures,
              error: null,
            }),
          }),
        }),
      });

      const analysis = await monitoringAPI.getFailureAnalysis(7);

      expect(analysis.totalFailures).toBe(3);
      expect(analysis.topReasons.length).toBeGreaterThanOrEqual(1); // At least Timeout or Network
      expect(analysis.topReasons[0].reason).toMatch(/Timeout|Network/);
      expect(analysis.topReasons[0].count).toBeGreaterThanOrEqual(1);
      expect(analysis.recentFailures).toHaveLength(3);
      expect(analysis.recentFailures[0].id).toBe('1');
    });

    it('should limit recent failures to 10', async () => {
      const mockFailures = Array.from({ length: 15 }, (_, i) => ({
        id: `${i + 1}`,
        description: `Task ${i + 1} failed`,
        error_message: 'Error',
        timestamp: new Date().toISOString(),
      }));

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: mockFailures,
              error: null,
            }),
          }),
        }),
      });

      const analysis = await monitoringAPI.getFailureAnalysis(7);

      expect(analysis.recentFailures).toHaveLength(10);
    });
  });

  describe('getPhaseComparison', () => {
    it('should compare metrics across phases', async () => {
      const mockExecutions = [
        { phase: 'Phase 1', quality_score: 7.0, status: 'success' },
        { phase: 'Phase 1', quality_score: 8.0, status: 'success' },
        { phase: 'Phase 1', quality_score: 6.0, status: 'failure' },
        { phase: 'Phase 2', quality_score: 9.0, status: 'success' },
        { phase: 'Phase 2', quality_score: 8.5, status: 'success' },
      ];

      const mockKnowledge = [
        { phase: 'Phase 1' },
        { phase: 'Phase 1' },
        { phase: 'Phase 2' },
      ];

      mockSupabaseFrom
        .mockReturnValueOnce({
          select: vi.fn().mockResolvedValue({
            data: mockExecutions,
            error: null,
          }),
        })
        .mockReturnValueOnce({
          select: vi.fn().mockReturnValue({
            eq: vi.fn().mockResolvedValue({
              data: mockKnowledge,
              error: null,
            }),
          }),
        });

      const comparison = await monitoringAPI.getPhaseComparison();

      expect(comparison).toHaveLength(2);
      expect(comparison[0].phase).toBe('Phase 1');
      expect(comparison[0].totalTasks).toBe(3);
      expect(comparison[0].avgQuality).toBe(7.0); // (7+8+6)/3
      expect(comparison[0].successRate).toBe(0.67); // 2/3
      expect(comparison[0].knowledgeCount).toBe(2);

      expect(comparison[1].phase).toBe('Phase 2');
      expect(comparison[1].totalTasks).toBe(2);
      expect(comparison[1].avgQuality).toBe(8.8); // (9+8.5)/2
      expect(comparison[1].successRate).toBe(1); // 2/2
      expect(comparison[1].knowledgeCount).toBe(1);
    });
  });
});
