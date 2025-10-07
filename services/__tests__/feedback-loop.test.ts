/**
 * FeedbackLoop Unit Tests
 * Coverage: failure recording, knowledge downgrading, optimization suggestions
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { FeedbackLoop } from '../src/feedback-loop';
import type { TaskFailure } from '../src/types';

// Mock Supabase
const mockSupabaseInsert = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseUpdate = vi.fn();
const mockSupabaseFrom = vi.fn();
const mockSupabaseRpc = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
    rpc: mockSupabaseRpc,
  })),
}));

describe('FeedbackLoop', () => {
  let feedbackLoop: FeedbackLoop;

  beforeEach(() => {
    vi.clearAllMocks();

    mockSupabaseFrom.mockReturnValue({
      insert: mockSupabaseInsert,
      select: mockSupabaseSelect,
      update: mockSupabaseUpdate,
    });

    mockSupabaseInsert.mockResolvedValue({ data: {}, error: null });

    mockSupabaseSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { usage_count: 10, failure_count: 2, avg_rating: 8.0, title: 'Test Knowledge' },
          error: null,
        }),
      }),
    });

    mockSupabaseUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    feedbackLoop = new FeedbackLoop('https://test.supabase.co', 'test-key');
  });

  describe('recordFailure', () => {
    it('should record task failure', async () => {
      const failure: TaskFailure = {
        taskId: 'task-123',
        description: 'Failed to implement feature X',
        errorMessage: 'TypeError: Cannot read property of undefined',
        attemptedKnowledge: ['knowledge-1', 'knowledge-2'],
        timestamp: new Date('2025-10-07T12:00:00Z'),
      };

      await feedbackLoop.recordFailure(failure);

      expect(mockSupabaseFrom).toHaveBeenCalledWith('task_failures');
      expect(mockSupabaseInsert).toHaveBeenCalledWith({
        task_id: 'task-123',
        description: 'Failed to implement feature X',
        error_message: 'TypeError: Cannot read property of undefined',
        attempted_knowledge: ['knowledge-1', 'knowledge-2'],
        timestamp: '2025-10-07T12:00:00.000Z',
      });
    });

    it('should update failure count for attempted knowledge', async () => {
      const failure: TaskFailure = {
        taskId: 'task-456',
        description: 'Test failure',
        errorMessage: 'Error',
        attemptedKnowledge: ['knowledge-abc'],
        timestamp: new Date(),
      };

      await feedbackLoop.recordFailure(failure);

      expect(mockSupabaseSelect).toHaveBeenCalled();
      expect(mockSupabaseUpdate).toHaveBeenCalled();
    });
  });

  describe('generateOptimizationSuggestions', () => {
    it('should suggest archive for high failure rate and low rating', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'knowledge-1',
                title: 'Bad Knowledge',
                avg_rating: 3.0,
                usage_count: 10,
                failure_count: 6,
                failure_rate: 0.6,
                created_at: '2025-01-01',
              },
            ],
            error: null,
          }),
        }),
      });

      const suggestions = await feedbackLoop.generateOptimizationSuggestions();

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].suggestion).toBe('archive');
      expect(suggestions[0].reason).toContain('High failure rate and low rating');
    });

    it('should suggest improve for high failure rate but decent rating', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'knowledge-2',
                title: 'Needs Improvement',
                avg_rating: 6.0,
                usage_count: 10,
                failure_count: 6,
                failure_rate: 0.6,
                created_at: '2025-01-01',
              },
            ],
            error: null,
          }),
        }),
      });

      const suggestions = await feedbackLoop.generateOptimizationSuggestions();

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].suggestion).toBe('improve');
      expect(suggestions[0].reason).toContain('needs improvement');
    });

    it('should suggest split for high quality but low usage', async () => {
      const thirtyDaysAgo = new Date();
      thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 31);

      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'knowledge-3',
                title: 'Too Specific',
                avg_rating: 9.0,
                usage_count: 1,
                failure_count: 0,
                failure_rate: 0,
                created_at: thirtyDaysAgo.toISOString(),
              },
            ],
            error: null,
          }),
        }),
      });

      const suggestions = await feedbackLoop.generateOptimizationSuggestions();

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].suggestion).toBe('split');
      expect(suggestions[0].reason).toContain('too specific');
    });

    it('should suggest merge for very popular high-quality knowledge', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          eq: vi.fn().mockResolvedValue({
            data: [
              {
                id: 'knowledge-4',
                title: 'Popular Knowledge',
                avg_rating: 9.5,
                usage_count: 25,
                failure_count: 0,
                failure_rate: 0,
                created_at: '2025-01-01',
              },
            ],
            error: null,
          }),
        }),
      });

      const suggestions = await feedbackLoop.generateOptimizationSuggestions();

      expect(suggestions).toHaveLength(1);
      expect(suggestions[0].suggestion).toBe('merge');
      expect(suggestions[0].reason).toContain('check for similar items');
    });
  });

  describe('getFailureAnalysis', () => {
    it('should analyze failures and categorize errors', async () => {
      const mockFailures = [
        {
          id: '1',
          error_message: 'Connection timeout after 30s',
          attempted_knowledge: ['k1'],
          timestamp: new Date().toISOString(),
        },
        {
          id: '2',
          error_message: 'Network connection failed',
          attempted_knowledge: ['k2'],
          timestamp: new Date().toISOString(),
        },
        {
          id: '3',
          error_message: 'Request timed out',
          attempted_knowledge: ['k3'],
          timestamp: new Date().toISOString(),
        },
      ];

      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({
            data: mockFailures,
            error: null,
          }),
        }),
      });

      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      });

      const analysis = await feedbackLoop.getFailureAnalysis(7);

      expect(analysis.totalFailures).toBe(3);
      expect(analysis.topFailureReasons).toHaveLength(2); // Timeout and Network
      expect(analysis.topFailureReasons[0].reason).toBe('Timeout');
      expect(analysis.topFailureReasons[0].count).toBe(2);
    });

    it('should handle no failures', async () => {
      mockSupabaseFrom.mockReturnValue({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockResolvedValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      const analysis = await feedbackLoop.getFailureAnalysis(7);

      expect(analysis.totalFailures).toBe(0);
      expect(analysis.topFailureReasons).toHaveLength(0);
      expect(analysis.mostProblematicKnowledge).toHaveLength(0);
    });
  });

  describe('applyOptimizations', () => {
    it('should auto-archive low-quality items', async () => {
      const suggestions = [
        {
          knowledgeId: 'bad-knowledge',
          currentRating: 3.0,
          usageCount: 5,
          failureRate: 0.7,
          suggestion: 'archive' as const,
          reason: 'Low quality',
        },
      ];

      const result = await feedbackLoop.applyOptimizations(suggestions);

      expect(result.archived).toBe(1);
      expect(result.improved).toBe(0);
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        is_archived: true,
        archived_at: expect.any(String),
      });
    });

    it('should flag items for improvement', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { tags: ['existing-tag'] },
            error: null,
          }),
        }),
      });

      const suggestions = [
        {
          knowledgeId: 'needs-work',
          currentRating: 6.0,
          usageCount: 10,
          failureRate: 0.5,
          suggestion: 'improve' as const,
          reason: 'High failure rate',
        },
      ];

      const result = await feedbackLoop.applyOptimizations(suggestions);

      expect(result.archived).toBe(0);
      expect(result.improved).toBe(1);
      expect(mockSupabaseUpdate).toHaveBeenCalledWith({
        tags: ['existing-tag', 'needs-improvement'],
      });
    });

    it('should not archive items with rating >= 4', async () => {
      const suggestions = [
        {
          knowledgeId: 'moderate-knowledge',
          currentRating: 5.0,
          usageCount: 10,
          failureRate: 0.6,
          suggestion: 'archive' as const,
          reason: 'High failure rate',
        },
      ];

      const result = await feedbackLoop.applyOptimizations(suggestions);

      expect(result.archived).toBe(0);
    });
  });

  describe('error categorization', () => {
    it('should categorize timeout and network errors', async () => {
      const mockFailures = [
        { error_message: 'Connection timeout', timestamp: new Date().toISOString() },
        { error_message: 'Network error', timestamp: new Date().toISOString() },
      ];

      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockResolvedValue({
            data: mockFailures,
            error: null,
          }),
        }),
      });

      mockSupabaseFrom.mockReturnValueOnce({
        select: vi.fn().mockReturnValue({
          gte: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [],
                error: null,
              }),
            }),
          }),
        }),
      });

      const analysis = await feedbackLoop.getFailureAnalysis(1);

      expect(analysis.totalFailures).toBe(2);
      expect(analysis.topFailureReasons).toHaveLength(2);
      const reasons = analysis.topFailureReasons.map(r => r.reason);
      expect(reasons).toContain('Timeout');
      expect(reasons).toContain('Network Error');
    });
  });
});
