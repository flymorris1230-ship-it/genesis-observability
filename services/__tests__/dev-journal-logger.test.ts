/**
 * DevJournalLogger Unit Tests
 * Coverage: logDevelopment, logADR, logSolution, queries, error handling
 */

import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import { DevJournalLogger } from '../src/dev-journal-logger';
import type { DevLogEntry, ADRDecision } from '../src/types';

// Mock Supabase client
const mockSupabaseInsert = vi.fn();
const mockSupabaseSelect = vi.fn();
const mockSupabaseFrom = vi.fn(() => ({
  insert: mockSupabaseInsert,
  select: mockSupabaseSelect,
}));

vi.mock('@supabase/supabase-js', () => ({
  createClient: vi.fn(() => ({
    from: mockSupabaseFrom,
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

describe('DevJournalLogger', () => {
  let logger: DevJournalLogger;
  let mockWriteFile: any;
  let mockMkdir: any;

  beforeEach(async () => {
    // Reset all mocks
    vi.clearAllMocks();

    // Get mock references
    const fsPromises = await import('fs/promises');
    mockWriteFile = fsPromises.writeFile as any;
    mockMkdir = fsPromises.mkdir as any;

    // Setup default mock responses
    mockEmbedContent.mockResolvedValue({
      embedding: { values: new Array(768).fill(0.1) },
    });

    mockGenerateContent.mockResolvedValue({
      response: {
        text: () => 'Generated summary in 2-3 sentences.',
      },
    });

    mockSupabaseInsert.mockReturnValue({
      select: vi.fn().mockReturnValue({
        single: vi.fn().mockResolvedValue({
          data: { id: 'test-id-123' },
          error: null,
        }),
      }),
    });

    mockSupabaseSelect.mockReturnValue({
      order: vi.fn().mockReturnValue({
        limit: vi.fn().mockResolvedValue({
          data: [{ id: '1', title: 'Test' }],
          error: null,
        }),
      }),
      eq: vi.fn().mockReturnValue({
        order: vi.fn().mockReturnValue({
          data: [{ id: '1', phase: 'Phase 1' }],
          error: null,
        }),
      }),
    });

    mockMkdir.mockResolvedValue(undefined);
    mockWriteFile.mockResolvedValue(undefined);

    logger = new DevJournalLogger(
      'https://test.supabase.co',
      'test-key',
      'test-gemini-key',
      './test-knowledge'
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('logDevelopment', () => {
    it('should successfully log development entry', async () => {
      const entry: DevLogEntry = {
        title: 'Test Knowledge Entry',
        content: 'This is a test content for knowledge entry.',
        type: 'dev_log',
        phase: 'Phase 1',
        tags: ['test', 'unit-test'],
        complexity: 5,
      };

      const id = await logger.logDevelopment(entry);

      expect(id).toBe('test-id-123');
      expect(mockMkdir).toHaveBeenCalled();
      expect(mockWriteFile).toHaveBeenCalled();
      expect(mockEmbedContent).toHaveBeenCalledWith(entry.content);
      expect(mockGenerateContent).toHaveBeenCalled();
      expect(mockSupabaseFrom).toHaveBeenCalledWith('knowledge_base');
    });

    it('should save Markdown backup to local filesystem', async () => {
      const entry: DevLogEntry = {
        title: 'Markdown Test',
        content: 'Testing markdown backup functionality.',
        type: 'solution',
      };

      await logger.logDevelopment(entry);

      expect(mockMkdir).toHaveBeenCalledWith(
        expect.stringContaining('test-knowledge'),
        { recursive: true }
      );
      expect(mockWriteFile).toHaveBeenCalledWith(
        expect.stringContaining('markdown-test.md'),
        expect.stringContaining('# Markdown Test')
      );
    });

    it('should generate 768-dimensional embedding', async () => {
      const entry: DevLogEntry = {
        title: 'Embedding Test',
        content: 'Testing embedding generation with Gemini.',
        type: 'learning',
      };

      await logger.logDevelopment(entry);

      expect(mockEmbedContent).toHaveBeenCalledWith(entry.content);
      expect(mockGetGenerativeModel).toHaveBeenCalledWith({
        model: 'text-embedding-004',
      });
    });

    it('should generate summary for long content', async () => {
      const longContent = 'A'.repeat(500);
      const entry: DevLogEntry = {
        title: 'Summary Test',
        content: longContent,
        type: 'dev_log',
      };

      await logger.logDevelopment(entry);

      expect(mockGenerateContent).toHaveBeenCalled();
      expect(mockGetGenerativeModel).toHaveBeenCalledWith({ model: 'gemini-pro' });
    });

    it('should handle Supabase insert errors', async () => {
      mockSupabaseInsert.mockReturnValue({
        select: vi.fn().mockReturnValue({
          single: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Insert failed' },
          }),
        }),
      });

      const entry: DevLogEntry = {
        title: 'Error Test',
        content: 'This should fail.',
        type: 'dev_log',
      };

      await expect(logger.logDevelopment(entry)).rejects.toThrow(
        'Failed to store knowledge: Insert failed'
      );
    });
  });

  describe('logADR', () => {
    it('should log Architecture Decision Record', async () => {
      const decision: ADRDecision = {
        title: 'Use PostgreSQL for primary database',
        context: 'We need a reliable relational database.',
        decision: 'We will use PostgreSQL with pgvector.',
        consequences: 'Better performance and vector search support.',
        alternatives: 'MySQL, MongoDB were considered.',
      };

      const id = await logger.logADR(decision);

      expect(id).toBe('test-id-123');
      expect(mockSupabaseFrom).toHaveBeenCalledWith('knowledge_base');

      // Verify ADR-specific formatting
      const insertCall = mockSupabaseInsert.mock.calls[0][0];
      expect(insertCall.title).toContain('ADR:');
      expect(insertCall.type).toBe('adr');
      expect(insertCall.tags).toContain('architecture');
      expect(insertCall.tags).toContain('decision-record');
      expect(insertCall.complexity).toBe(8);
    });

    it('should format ADR content correctly', async () => {
      const decision: ADRDecision = {
        title: 'Test ADR',
        context: 'Test context',
        decision: 'Test decision',
        consequences: 'Test consequences',
      };

      await logger.logADR(decision);

      const insertCall = mockSupabaseInsert.mock.calls[0][0];
      expect(insertCall.content).toContain('## Context');
      expect(insertCall.content).toContain('## Decision');
      expect(insertCall.content).toContain('## Consequences');
      expect(insertCall.content).not.toContain('## Alternatives');
    });
  });

  describe('logSolution', () => {
    it('should log problem-solution pair', async () => {
      const problem = 'TypeScript type errors in production build';
      const solution = 'Enable strict mode in tsconfig.json';
      const tags = ['typescript', 'debugging'];

      const id = await logger.logSolution(problem, solution, tags);

      expect(id).toBe('test-id-123');

      const insertCall = mockSupabaseInsert.mock.calls[0][0];
      expect(insertCall.title).toContain('Solution:');
      expect(insertCall.type).toBe('solution');
      expect(insertCall.tags).toEqual(tags);
      expect(insertCall.complexity).toBe(6);
      expect(insertCall.content).toContain('## Problem');
      expect(insertCall.content).toContain('## Solution');
    });

    it('should use default tags if not provided', async () => {
      await logger.logSolution('Test problem', 'Test solution');

      const insertCall = mockSupabaseInsert.mock.calls[0][0];
      expect(insertCall.tags).toEqual(['problem-solving']);
    });
  });

  describe('queryRecent', () => {
    it('should query recent knowledge entries', async () => {
      const results = await logger.queryRecent(10);

      expect(results).toHaveLength(1);
      expect(mockSupabaseFrom).toHaveBeenCalledWith('knowledge_base');
      expect(mockSupabaseSelect).toHaveBeenCalledWith('*');
    });

    it('should handle query errors', async () => {
      mockSupabaseSelect.mockReturnValue({
        order: vi.fn().mockReturnValue({
          limit: vi.fn().mockResolvedValue({
            data: null,
            error: { message: 'Query failed' },
          }),
        }),
      });

      await expect(logger.queryRecent()).rejects.toThrow(
        'Failed to query knowledge: Query failed'
      );
    });
  });

  describe('queryByPhase', () => {
    it('should query knowledge by phase', async () => {
      const results = await logger.queryByPhase('Phase 1');

      expect(results).toHaveLength(1);
      expect(results[0]).toHaveProperty('phase', 'Phase 1');
    });

    it('should handle empty results', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn().mockReturnValue({
          order: vi.fn().mockReturnValue({
            data: [],
            error: null,
          }),
        }),
      });

      const results = await logger.queryByPhase('Phase 99');
      expect(results).toHaveLength(0);
    });
  });

  describe('getCostByPhase', () => {
    it('should calculate cost by phase', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: [{ id: '1' }, { id: '2' }, { id: '3' }],
          error: null,
        }),
      });

      const cost = await logger.getCostByPhase('Phase 1');

      // 3 items * $0.001 = $0.003
      expect(cost).toBe(0.003);
    });

    it('should return 0 for phases with no knowledge', async () => {
      mockSupabaseSelect.mockReturnValue({
        eq: vi.fn().mockResolvedValue({
          data: null,
          error: null,
        }),
      });

      const cost = await logger.getCostByPhase('Phase 99');
      expect(cost).toBe(0);
    });
  });
});
