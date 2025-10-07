/**
 * RAG Engine Unit Tests
 * Coverage: retrieve, enhancePrompt, search methods, filtering
 */

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { RAGEngine } from '../src/rag-engine';
import type { SearchOptions } from '../src/types';

// Mock Supabase client
const mockSupabaseRpc = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseFrom = vi.fn(() => ({
  select: mockSupabaseSelect,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    rpc: mockSupabaseRpc,
    from: mockSupabaseFrom,
  })),
}));

// Mock Google Generative AI
const mockEmbedContent = vi.fn();
const mockGetGenerativeModel = vi.fn(() => ({
  embedContent: mockEmbedContent,
}));

vi.mock('@google/generative-ai', () => ({
  GoogleGenerativeAI: vi.fn(() => ({
    getGenerativeModel: mockGetGenerativeModel,
  })),
}));

describe('RAGEngine', () => {
  let ragEngine: RAGEngine;

  beforeEach(() => {
    vi.clearAllMocks();

    // Setup default embedding mock
    mockEmbedContent.mockResolvedValue({
      embedding: { values: new Array(768).fill(0.1) },
    });

    ragEngine = new RAGEngine(
      'https://test.supabase.co',
      'test-key',
      'test-gemini-key'
    );
  });

  describe('retrieve', () => {
    it('should perform hybrid search with default options', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: [
          {
            id: '1',
            title: 'Test Document 1',
            content: 'Content 1',
            summary: 'Summary 1',
            combined_score: 0.85,
            type: 'dev_log',
            tags: ['test'],
          },
          {
            id: '2',
            title: 'Test Document 2',
            content: 'Content 2',
            summary: 'Summary 2',
            combined_score: 0.75,
            type: 'solution',
            tags: ['test'],
          },
        ],
        error: null,
      });

      const results = await ragEngine.retrieve('test query');

      expect(results).toHaveLength(2);
      expect(results[0].score).toBe(0.85);
      expect(mockSupabaseRpc).toHaveBeenCalledWith('hybrid_search', {
        query_text: 'test query',
        query_embedding: expect.any(Array),
        match_count: 10, // topK * 2
      });
    });

    it('should filter by tags', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: [
          {
            id: '1',
            title: 'Tagged Doc',
            content: 'Content',
            combined_score: 0.9,
            type: 'dev_log',
            tags: ['architecture', 'design'],
          },
          {
            id: '2',
            title: 'Untagged Doc',
            content: 'Content',
            combined_score: 0.88,
            type: 'dev_log',
            tags: ['other'],
          },
        ],
        error: null,
      });

      const options: SearchOptions = {
        filterTags: ['architecture'],
      };

      const results = await ragEngine.retrieve('test', options);

      expect(results).toHaveLength(1);
      expect(results[0].tags).toContain('architecture');
    });

    it('should filter by phase', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: [
          {
            id: '1',
            title: 'Phase 1 Doc',
            content: 'Content',
            combined_score: 0.9,
            type: 'dev_log',
            tags: [],
            phase: 'Phase 1',
          },
          {
            id: '2',
            title: 'Phase 2 Doc',
            content: 'Content',
            combined_score: 0.88,
            type: 'dev_log',
            tags: [],
            phase: 'Phase 2',
          },
        ],
        error: null,
      });

      const results = await ragEngine.retrieve('test', { filterPhase: 'Phase 1' });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Phase 1 Doc');
    });

    it('should filter by security level', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: [
          {
            id: '1',
            title: 'Public Doc',
            content: 'Content',
            combined_score: 0.9,
            type: 'dev_log',
            tags: [],
            security_level: 'public',
          },
          {
            id: '2',
            title: 'Confidential Doc',
            content: 'Content',
            combined_score: 0.95,
            type: 'dev_log',
            tags: [],
            security_level: 'confidential',
          },
        ],
        error: null,
      });

      const results = await ragEngine.retrieve('test', { securityLevel: 'public' });

      expect(results).toHaveLength(1);
      expect(results[0].title).toBe('Public Doc');
    });

    it('should filter by minimum similarity threshold', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: [
          { id: '1', title: 'High Score', content: 'Content', combined_score: 0.9, type: 'dev_log', tags: [] },
          { id: '2', title: 'Medium Score', content: 'Content', combined_score: 0.75, type: 'dev_log', tags: [] },
          { id: '3', title: 'Low Score', content: 'Content', combined_score: 0.5, type: 'dev_log', tags: [] },
        ],
        error: null,
      });

      const results = await ragEngine.retrieve('test', { minSimilarity: 0.7 });

      expect(results).toHaveLength(2); // Only scores >= 0.7
      expect(results.every((r) => r.score >= 0.7)).toBe(true);
    });

    it('should limit results to topK', async () => {
      const manyDocs = Array.from({ length: 20 }, (_, i) => ({
        id: `${i}`,
        title: `Doc ${i}`,
        content: 'Content',
        combined_score: 0.9 - i * 0.01,
        type: 'dev_log',
        tags: [],
      }));

      mockSupabaseRpc.mockResolvedValue({ data: manyDocs, error: null });

      const results = await ragEngine.retrieve('test', { topK: 5 });

      expect(results).toHaveLength(5);
    });

    it('should handle RPC errors gracefully', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: { message: 'RPC failed' },
      });

      const results = await ragEngine.retrieve('test');

      expect(results).toHaveLength(0);
    });
  });

  describe('enhancePrompt', () => {
    it('should enhance prompt with retrieved knowledge', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: [
          {
            id: '1',
            title: 'Relevant Knowledge 1',
            content: 'Important context about the task',
            summary: 'Context summary',
            combined_score: 0.9,
            type: 'dev_log',
            tags: [],
          },
          {
            id: '2',
            title: 'Relevant Knowledge 2',
            content: 'More context',
            summary: 'More context summary',
            combined_score: 0.85,
            type: 'solution',
            tags: [],
          },
        ],
        error: null,
      });

      const task = 'Implement authentication';
      const basePrompt = 'You are a security expert.';

      const { prompt, sources } = await ragEngine.enhancePrompt(task, basePrompt);

      expect(prompt).toContain(basePrompt);
      expect(prompt).toContain('## Relevant Knowledge Context');
      expect(prompt).toContain('Relevant Knowledge 1');
      expect(prompt).toContain('90.0%'); // Relevance percentage
      expect(prompt).toContain(task);
      expect(sources).toHaveLength(2);
    });

    it('should return original prompt if no knowledge found', async () => {
      mockSupabaseRpc.mockResolvedValue({ data: [], error: null });

      const task = 'Unknown task';
      const basePrompt = 'Original prompt';

      const { prompt, sources } = await ragEngine.enhancePrompt(task, basePrompt);

      expect(prompt).toBe(basePrompt);
      expect(sources).toHaveLength(0);
    });
  });

  describe('searchText', () => {
    it('should perform full-text search', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: [
          { id: '1', title: 'Text Match', content: 'Content', type: 'dev_log', tags: [] },
        ],
        error: null,
      });

      const results = await ragEngine.searchText('test query', 10);

      expect(results).toHaveLength(1);
      expect(mockSupabaseRpc).toHaveBeenCalledWith('search_knowledge', {
        query_text: 'test query',
        match_count: 10,
      });
    });

    it('should handle search errors', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: null,
        error: { message: 'Search failed' },
      });

      const results = await ragEngine.searchText('test');

      expect(results).toHaveLength(0);
    });
  });

  describe('searchVector', () => {
    it('should perform vector similarity search', async () => {
      mockSupabaseRpc.mockResolvedValue({
        data: [
          { id: '1', title: 'Similar Doc', content: 'Content', similarity: 0.92 },
        ],
        error: null,
      });

      const results = await ragEngine.searchVector('test query', 0.7, 5);

      expect(results).toHaveLength(1);
      expect(results[0].score).toBe(0.92);
      expect(mockSupabaseRpc).toHaveBeenCalledWith('match_knowledge', {
        query_embedding: expect.any(Array),
        match_threshold: 0.7,
        match_count: 5,
      });
    });
  });

  describe('getById', () => {
    it('should retrieve knowledge by ID', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: {
              id: 'test-id',
              title: 'Test Doc',
              content: 'Content',
              summary: 'Summary',
              type: 'dev_log',
              tags: ['test'],
            },
            error: null,
          }),
        }),
      });

      const result = await ragEngine.getById('test-id');

      expect(result).not.toBeNull();
      expect(result?.id).toBe('test-id');
      expect(result?.title).toBe('Test Doc');
    });

    it('should return null for non-existent ID', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Not found' },
          }),
        }),
      });

      const result = await ragEngine.getById('non-existent');

      expect(result).toBeNull();
    });
  });

  describe('getByTags', () => {
    it('should retrieve knowledge by tags', async () => {
      mockSupabaseSelect.mockReturnValue({
        contains: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: [
                  { id: '1', title: 'Tagged Doc', content: 'Content', type: 'dev_log', tags: ['architecture'] },
                ],
                error: null,
              }),
            }),
          }),
        }),
      });

      const results = await ragEngine.getByTags(['architecture'], 10);

      expect(results).toHaveLength(1);
      expect(results[0].tags).toContain('architecture');
    });

    it('should handle errors', async () => {
      mockSupabaseSelect.mockReturnValue({
        contains: vi.fn().mockReturnValue({
          eq: vi.fn().mockReturnValue({
            order: vi.fn().mockReturnValue({
              limit: vi.fn().mockResolvedValue({
                data: null,
                error: { message: 'Query failed' },
              }),
            }),
          }),
        }),
      });

      const results = await ragEngine.getByTags(['test']);

      expect(results).toHaveLength(0);
    });
  });
});
