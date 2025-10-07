/**
 * QualityScorer Unit Tests
 * Coverage: quality calculation, scoring logic, feedback generation
 */

import { describe, it, expect } from 'vitest';
import { QualityScorer } from '../src/quality-scorer';
import type { QualityMetrics } from '../src/types';

describe('QualityScorer', () => {
  const scorer = new QualityScorer();

  describe('calculateQuality', () => {
    it('should calculate perfect score for excellent metrics', () => {
      const metrics: QualityMetrics = {
        executionTime: 30000, // 30 seconds
        errorCount: 0,
        knowledgeUsed: 3,
        outputLength: 1500,
        hasTests: true,
        hasDocumentation: true,
      };

      const score = scorer.calculateQuality(metrics);

      expect(score.overall).toBe(10);
      expect(score.breakdown.efficiency).toBe(10); // < 1min
      expect(score.breakdown.reliability).toBe(10); // 0 errors
      expect(score.breakdown.knowledgeUtilization).toBe(10); // 3+ items
      expect(score.breakdown.completeness).toBe(10); // long + tests + docs
      expect(score.feedback).toContain('✅ Excellent execution efficiency!');
      expect(score.feedback).toContain('✅ Perfect reliability - zero errors!');
    });

    it('should calculate low score for poor metrics', () => {
      const metrics: QualityMetrics = {
        executionTime: 2000000, // 33+ minutes
        errorCount: 8,
        knowledgeUsed: 0,
        outputLength: 100,
        hasTests: false,
        hasDocumentation: false,
      };

      const score = scorer.calculateQuality(metrics);

      expect(score.overall).toBeLessThan(4);
      expect(score.breakdown.efficiency).toBe(2); // 30min+
      expect(score.breakdown.reliability).toBe(1); // 6+ errors
      expect(score.breakdown.knowledgeUtilization).toBe(3); // 0 items
      expect(score.breakdown.completeness).toBe(5); // minimal
      expect(score.feedback.length).toBeGreaterThan(2); // Multiple improvement suggestions
    });

    it('should score efficiency correctly', () => {
      const testCases = [
        { time: 30000, expected: 10 }, // 30 sec
        { time: 180000, expected: 8 }, // 3 min
        { time: 600000, expected: 6 }, // 10 min
        { time: 1200000, expected: 4 }, // 20 min
        { time: 2000000, expected: 2 }, // 33+ min
      ];

      for (const { time, expected } of testCases) {
        const metrics: QualityMetrics = {
          executionTime: time,
          errorCount: 0,
          knowledgeUsed: 1,
          outputLength: 500,
          hasTests: false,
          hasDocumentation: false,
        };

        const score = scorer.calculateQuality(metrics);
        expect(score.breakdown.efficiency).toBe(expected);
      }
    });

    it('should score reliability correctly', () => {
      const testCases = [
        { errors: 0, expected: 10 },
        { errors: 1, expected: 7 },
        { errors: 2, expected: 7 },
        { errors: 3, expected: 4 },
        { errors: 5, expected: 4 },
        { errors: 6, expected: 1 },
        { errors: 10, expected: 1 },
      ];

      for (const { errors, expected } of testCases) {
        const metrics: QualityMetrics = {
          executionTime: 60000,
          errorCount: errors,
          knowledgeUsed: 1,
          outputLength: 500,
          hasTests: false,
          hasDocumentation: false,
        };

        const score = scorer.calculateQuality(metrics);
        expect(score.breakdown.reliability).toBe(expected);
      }
    });

    it('should score knowledge utilization correctly', () => {
      const testCases = [
        { knowledge: 0, expected: 3 },
        { knowledge: 1, expected: 6 },
        { knowledge: 2, expected: 8 },
        { knowledge: 3, expected: 10 },
        { knowledge: 5, expected: 10 },
      ];

      for (const { knowledge, expected } of testCases) {
        const metrics: QualityMetrics = {
          executionTime: 60000,
          errorCount: 0,
          knowledgeUsed: knowledge,
          outputLength: 500,
          hasTests: false,
          hasDocumentation: false,
        };

        const score = scorer.calculateQuality(metrics);
        expect(score.breakdown.knowledgeUtilization).toBe(expected);
      }
    });

    it('should score completeness correctly', () => {
      const baseMetrics: Omit<QualityMetrics, 'outputLength' | 'hasTests' | 'hasDocumentation'> = {
        executionTime: 60000,
        errorCount: 0,
        knowledgeUsed: 1,
      };

      // Base score: 5
      let metrics: QualityMetrics = {
        ...baseMetrics,
        outputLength: 100,
        hasTests: false,
        hasDocumentation: false,
      };
      expect(scorer.calculateQuality(metrics).breakdown.completeness).toBe(5);

      // +1 for medium output
      metrics = { ...baseMetrics, outputLength: 600, hasTests: false, hasDocumentation: false };
      expect(scorer.calculateQuality(metrics).breakdown.completeness).toBe(6);

      // +2 for long output
      metrics = { ...baseMetrics, outputLength: 1500, hasTests: false, hasDocumentation: false };
      expect(scorer.calculateQuality(metrics).breakdown.completeness).toBe(7);

      // +2 for tests
      metrics = { ...baseMetrics, outputLength: 1500, hasTests: true, hasDocumentation: false };
      expect(scorer.calculateQuality(metrics).breakdown.completeness).toBe(9);

      // +1 for docs (capped at 10)
      metrics = { ...baseMetrics, outputLength: 1500, hasTests: true, hasDocumentation: true };
      expect(scorer.calculateQuality(metrics).breakdown.completeness).toBe(10);
    });
  });

  describe('generateFeedback', () => {
    it('should provide improvement suggestions for low scores', () => {
      const metrics: QualityMetrics = {
        executionTime: 1000000, // 16+ min
        errorCount: 4,
        knowledgeUsed: 0,
        outputLength: 200,
        hasTests: false,
        hasDocumentation: false,
      };

      const score = scorer.calculateQuality(metrics);

      expect(score.feedback).toContain('⏱️  Consider optimizing execution time. Look for inefficient loops or API calls.');
      expect(score.feedback).toContain('🐛 High error count detected. Review error handling and edge cases.');
      expect(score.feedback).toContain('📚 Low knowledge usage. Try searching for relevant past solutions.');
      expect(score.feedback).toContain('📝 Output could be more complete. Consider adding tests and documentation.');
    });

    it('should provide positive feedback for high scores', () => {
      const metrics: QualityMetrics = {
        executionTime: 40000, // < 1min
        errorCount: 0,
        knowledgeUsed: 3,
        outputLength: 1000,
        hasTests: true,
        hasDocumentation: false,
      };

      const score = scorer.calculateQuality(metrics);

      expect(score.feedback).toContain('✅ Excellent execution efficiency!');
      expect(score.feedback).toContain('✅ Perfect reliability - zero errors!');
      expect(score.feedback).toContain('✅ Great knowledge utilization!');
    });
  });

  describe('compareScores', () => {
    it('should detect significant improvement', () => {
      const before = scorer.calculateQuality({
        executionTime: 1000000,
        errorCount: 5,
        knowledgeUsed: 0,
        outputLength: 100,
        hasTests: false,
        hasDocumentation: false,
      });

      const after = scorer.calculateQuality({
        executionTime: 50000,
        errorCount: 0,
        knowledgeUsed: 3,
        outputLength: 1500,
        hasTests: true,
        hasDocumentation: true,
      });

      const comparison = scorer.compareScores(before, after);

      expect(comparison.improvement).toBeGreaterThan(5);
      expect(comparison.message).toContain('🎉 Significant improvement');
    });

    it('should detect slight improvement', () => {
      const before = scorer.calculateQuality({
        executionTime: 120000,
        errorCount: 1,
        knowledgeUsed: 2,
        outputLength: 800,
        hasTests: false,
        hasDocumentation: false,
      });

      const after = scorer.calculateQuality({
        executionTime: 90000,
        errorCount: 0,
        knowledgeUsed: 2,
        outputLength: 900,
        hasTests: true,
        hasDocumentation: false,
      });

      const comparison = scorer.compareScores(before, after);

      expect(comparison.improvement).toBeGreaterThan(0);
      expect(comparison.improvement).toBeLessThanOrEqual(2); // Allow up to 2 points improvement
      expect(comparison.message).toContain('improvement');
    });

    it('should detect no change', () => {
      const score1 = scorer.calculateQuality({
        executionTime: 60000,
        errorCount: 0,
        knowledgeUsed: 2,
        outputLength: 500,
        hasTests: true,
        hasDocumentation: false,
      });

      const score2 = scorer.calculateQuality({
        executionTime: 60000,
        errorCount: 0,
        knowledgeUsed: 2,
        outputLength: 500,
        hasTests: true,
        hasDocumentation: false,
      });

      const comparison = scorer.compareScores(score1, score2);

      expect(comparison.improvement).toBe(0);
      expect(comparison.message).toContain('➡️  No change');
    });

    it('should detect quality decrease', () => {
      const before = scorer.calculateQuality({
        executionTime: 50000,
        errorCount: 0,
        knowledgeUsed: 3,
        outputLength: 1000,
        hasTests: true,
        hasDocumentation: true,
      });

      const after = scorer.calculateQuality({
        executionTime: 500000,
        errorCount: 3,
        knowledgeUsed: 1,
        outputLength: 300,
        hasTests: false,
        hasDocumentation: false,
      });

      const comparison = scorer.compareScores(before, after);

      expect(comparison.improvement).toBeLessThan(0);
      expect(comparison.message).toContain('📉 Quality decreased');
    });
  });
});
