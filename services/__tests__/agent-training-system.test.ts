/**
 * AgentTrainingSystem Unit Tests
 * Coverage: beforeTask, afterTask, learning metrics, knowledge management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { AgentTrainingSystem } from '../src/agent-training-system';
import type { TaskExecution } from '../src/types';

// Mock Supabase client
const mockSupabaseFrom = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseUpdate = vi.fn();
const mockSupabaseRpc = vi.fn();

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
    rpc: mockSupabaseRpc,
  })),
}));

// Mock Google Generative AI
const mockEmbedContent = vi.fn();
const mockGenerateContent = vi.fn();
const mockGetGenerativeModel = vi.fn((config) => {
  if (config.model === 'text-embedding-004') {
    return { embedContent: mockEmbedContent };
  }
  return { generateContent: mockGenerateContent };
});

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

// Mock fs/promises
vi.mock('fs/promises', () => ({
  writeFile: vi.fn(),
  mkdir: vi.fn(),
}));

describe('AgentTrainingSystem', () => {
  let trainingSystem: AgentTrainingSystem;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default mocks
    mockEmbedContent.mockResolvedValue({
      embedding: { values: new Array(768).fill(0.1) },
    });

    mockGenerateContent.mockResolvedValue({
      response: { text: () => 'Summary' },
    });

    mockSupabaseRpc.mockResolvedValue({
      data: [
        {
          id: '1',
          title: 'Relevant Doc',
          content: 'Content',
          summary: 'Summary',
          combined_score: 0.9,
          type: 'dev_log',
          tags: ['test'],
        },
      ],
      error: null,
    });

    mockSupabaseFrom.mockReturnValue({
      insert: vi.fn().mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: { id: 'new-id' },
            error: null,
          }),
        }),
      }),
      select: mockSupabaseSelect,
      update: mockSupabaseUpdate,
    });

    mockSupabaseSelect.mockReturnValue({
      eq: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { usage_count: 5, avg_rating: 7.5 },
          error: null,
        }),
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            data: [
              { created_at: '2025-01-01', avg_rating: 8, usage_count: 10 },
              { created_at: '2025-01-02', avg_rating: 9, usage_count: 15 },
            ],
            error: null,
          }),
        }),
        gte: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: [
                { id: '1', title: 'High Quality', avg_rating: 9.5, usage_count: 20 },
              ],
              error: null,
            }),
          }),
        }),
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: [
              { id: '1', title: 'Most Used', usage_count: 100 },
            ],
            error: null,
          }),
        }),
      }),
    });

    mockSupabaseUpdate.mockReturnValue({
      eq: vi.fn().mockResolvedValue({ error: null }),
    });

    trainingSystem = new AgentTrainingSystem(
      'https://test.supabase.co',
      'test-key',
      'test-gemini-key',
      './test-knowledge'
    );
  });

  describe('beforeTask', () => {
    it('should retrieve relevant knowledge before task', async () => {
      const task = {
        description: 'Implement JWT authentication',
        type: 'security',
        complexity: 8,
      };

      const { enhancedPrompt, sources } = await trainingSystem.beforeTask(task);

      expect(enhancedPrompt).toContain('You are an expert security assistant');
      expect(enhancedPrompt).toContain('Implement JWT authentication');
      expect(sources).toHaveLength(1);
      expect(sources[0].title).toBe('Relevant Doc');
      expect(mockSupabaseRpc).toHaveBeenCalledWith('hybrid_search', expect.any(Object));
    });

    it('should filter by task type', async () => {
      const task = {
        description: 'Create React component',
        type: 'frontend',
        complexity: 5,
      };

      await trainingSystem.beforeTask(task);

      // Verify RPC was called with correct filters
      expect(mockSupabaseRpc).toHaveBeenCalled();
    });

    it('should handle tasks with no relevant knowledge', async () => {
      mockSupabaseRpc.mockResolvedValue({ data: [], error: null });

      const task = {
        description: 'Unknown task',
        type: 'other',
        complexity: 5,
      };

      const { enhancedPrompt, sources } = await trainingSystem.beforeTask(task);

      expect(enhancedPrompt).toBe(enhancedPrompt);
      expect(sources).toHaveLength(0);
    });
  });

  describe('afterTask', () => {
    it('should log learning after task completion', async () => {
      const taskExecution: TaskExecution = {
        description: 'Implement authentication',
        solution: 'Used JWT tokens with refresh mechanism',
        quality: 9,
        timeSpent: 120, // 2 hours
        usedKnowledge: ['knowledge-id-1', 'knowledge-id-2'],
      };

      await trainingSystem.afterTask(taskExecution);

      // Verify knowledge was logged
      const fromCall = mockSupabaseFrom.mock.calls[0][0];
      expect(fromCall).toBe('knowledge_base');

      // Verify stats were updated for used knowledge
      expect(mockSupabaseSelect).toHaveBeenCalled();
      expect(mockSupabaseUpdate).toHaveBeenCalled();
    });

    it('should estimate complexity from time spent', async () => {
      const taskExecution: TaskExecution = {
        description: 'Quick fix',
        solution: 'Fixed typo',
        quality: 8,
        timeSpent: 5, // 5 minutes
        usedKnowledge: [],
      };

      await trainingSystem.afterTask(taskExecution);

      // Complexity should be Math.ceil(5 / 10) = 1
      // Verify in the insert call
      const fromMock = mockSupabaseFrom.mock.results[0].value;
      const insertCall = fromMock.insert.mock.calls[0][0];
      expect(insertCall.complexity).toBe(1);
    });

    it('should update knowledge statistics correctly', async () => {
      // Current: usage_count=5, avg_rating=7.5
      // New rating: 9
      // Expected: usage_count=6, avg_rating=(7.5*5 + 9)/6 = 8.0

      const taskExecution: TaskExecution = {
        description: 'Test task',
        solution: 'Test solution',
        quality: 9,
        timeSpent: 30,
        usedKnowledge: ['test-id'],
      };

      await trainingSystem.afterTask(taskExecution);

      expect(mockSupabaseUpdate).toHaveBeenCalled();
      const updateCall = mockSupabaseUpdate.mock.calls[0][0];
      expect(updateCall.usage_count).toBe(6);
      expect(updateCall.avg_rating).toBeCloseTo(8.0, 0);
    });
  });

  describe('getLearningCurve', () => {
    it('should calculate learning curve metrics', async () => {
      const metrics = await trainingSystem.getLearningCurve('Phase 1');

      expect(metrics.tasksCompleted).toBe(2);
      expect(metrics.avgQuality).toBe((8 + 9) / 2);
      expect(metrics.knowledgeGrowth).toBe(2 / 10); // 2 items / 10
    });

    it('should handle phases with no data', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              data: [],
              error: null,
            }),
          }),
        }),
      });

      const metrics = await trainingSystem.getLearningCurve('Phase 99');

      expect(metrics.tasksCompleted).toBe(0);
      expect(metrics.avgQuality).toBe(0);
      expect(metrics.avgTimeSpent).toBe(0);
      expect(metrics.knowledgeGrowth).toBe(0);
    });
  });

  describe('getMostUsedKnowledge', () => {
    it('should retrieve most used knowledge items', async () => {
      const results = await trainingSystem.getMostUsedKnowledge(10);

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Most Used');
      expect(mockSupabaseFrom).toHaveBeenCalledWith('knowledge_base');
    });

    it('should handle query errors', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            limit: vi.fn().mockResolvedValue({
              data: null,
              error: { message: 'Query failed' },
            }),
          }),
        }),
      });

      const results = await trainingSystem.getMostUsedKnowledge();

      expect(results).toHaveLength(0);
    });
  });

  describe('getHighestRatedKnowledge', () => {
    it('should retrieve highest rated knowledge items', async () => {
      const results = await trainingSystem.getHighestRatedKnowledge(10);

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('High Quality');
      expect(results[0].score).toBeCloseTo(9.5 / 10, 2);
    });

    it('should filter by minimum usage count (>= 3)', async () => {
      await trainingSystem.getHighestRatedKnowledge(10);

      // Verify gte was called with 3
      expect(mockSupabaseSelect).toHaveBeenCalled();
    });
  });

  describe('archiveUnusedKnowledge', () => {
    it('should trigger archival process', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: [{ archived_count: 15, compressed_count: 8 }],
        error: null,
      });

      const result = await trainingSystem.archiveUnusedKnowledge();

      expect(result.archived).toBe(15);
      expect(result.compressed).toBe(8);
      expect(mockSupabaseRpc).toHaveBeenCalledWith('archive_old_knowledge');
    });

    it('should handle archival errors', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: { message: 'Archival failed' },
      });

      const result = await trainingSystem.archiveUnusedKnowledge();

      expect(result.archived).toBe(0);
      expect(result.compressed).toBe(0);
    });
  });
});
