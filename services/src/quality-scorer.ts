/**
 * QualityScorer - Automatic quality assessment for agent tasks
 * Evaluates task execution based on multiple metrics
 */

export interface QualityMetrics {
  executionTime: number; // milliseconds
  errorCount: number;
  knowledgeUsed: number;
  outputLength: number;
  hasTests: boolean;
  hasDocumentation: boolean;
}

export interface QualityScore {
  overall: number; // 0-10 scale
  breakdown: {
    efficiency: number; // Based on execution time
    reliability: number; // Based on error count
    knowledgeUtilization: number; // Based on knowledge usage
    completeness: number; // Based on output quality
  };
  feedback: string[];
}

export class QualityScorer {
  /**
   * Calculate overall quality score for a task
   */
  calculateQuality(metrics: QualityMetrics): QualityScore {
    const efficiency = this.scoreEfficiency(metrics.executionTime);
    const reliability = this.scoreReliability(metrics.errorCount);
    const knowledgeUtilization = this.scoreKnowledgeUse(metrics.knowledgeUsed);
    const completeness = this.scoreCompleteness(metrics);

    // Weighted average: 25% each
    const overall = (
      efficiency * 0.25 +
      reliability * 0.25 +
      knowledgeUtilization * 0.25 +
      completeness * 0.25
    );

    const feedback = this.generateFeedback({
      efficiency,
      reliability,
      knowledgeUtilization,
      completeness,
    });

    return {
      overall: Math.round(overall * 10) / 10, // Round to 1 decimal
      breakdown: {
        efficiency,
        reliability,
        knowledgeUtilization,
        completeness,
      },
      feedback,
    };
  }

  /**
   * Score efficiency based on execution time
   * < 1min: 10, 1-5min: 8, 5-15min: 6, 15-30min: 4, 30min+: 2
   */
  private scoreEfficiency(executionTimeMs: number): number {
    const minutes = executionTimeMs / 60000;

    if (minutes < 1) return 10;
    if (minutes < 5) return 8;
    if (minutes < 15) return 6;
    if (minutes < 30) return 4;
    return 2;
  }

  /**
   * Score reliability based on error count
   * 0 errors: 10, 1-2: 7, 3-5: 4, 6+: 1
   */
  private scoreReliability(errorCount: number): number {
    if (errorCount === 0) return 10;
    if (errorCount <= 2) return 7;
    if (errorCount <= 5) return 4;
    return 1;
  }

  /**
   * Score knowledge utilization
   * 3+ items: 10, 2 items: 8, 1 item: 6, 0 items: 3
   */
  private scoreKnowledgeUse(knowledgeCount: number): number {
    if (knowledgeCount >= 3) return 10;
    if (knowledgeCount === 2) return 8;
    if (knowledgeCount === 1) return 6;
    return 3; // No knowledge used (not ideal but acceptable)
  }

  /**
   * Score completeness based on output quality
   */
  private scoreCompleteness(metrics: QualityMetrics): number {
    let score = 5; // Base score

    // Output length bonus (indicates thoroughness)
    if (metrics.outputLength > 1000) score += 2;
    else if (metrics.outputLength > 500) score += 1;

    // Tests bonus
    if (metrics.hasTests) score += 2;

    // Documentation bonus
    if (metrics.hasDocumentation) score += 1;

    return Math.min(score, 10); // Cap at 10
  }

  /**
   * Generate actionable feedback based on scores
   */
  private generateFeedback(breakdown: QualityScore['breakdown']): string[] {
    const feedback: string[] = [];

    if (breakdown.efficiency < 6) {
      feedback.push('⏱️  Consider optimizing execution time. Look for inefficient loops or API calls.');
    }

    if (breakdown.reliability < 7) {
      feedback.push('🐛 High error count detected. Review error handling and edge cases.');
    }

    if (breakdown.knowledgeUtilization < 6) {
      feedback.push('📚 Low knowledge usage. Try searching for relevant past solutions.');
    }

    if (breakdown.completeness < 7) {
      feedback.push('📝 Output could be more complete. Consider adding tests and documentation.');
    }

    // Positive feedback
    if (breakdown.efficiency >= 8) {
      feedback.push('✅ Excellent execution efficiency!');
    }

    if (breakdown.reliability === 10) {
      feedback.push('✅ Perfect reliability - zero errors!');
    }

    if (breakdown.knowledgeUtilization >= 8) {
      feedback.push('✅ Great knowledge utilization!');
    }

    return feedback;
  }

  /**
   * Compare two quality scores to show improvement
   */
  compareScores(before: QualityScore, after: QualityScore): {
    improvement: number;
    message: string;
  } {
    const improvement = after.overall - before.overall;
    const percentage = ((improvement / before.overall) * 100).toFixed(1);

    let message: string;
    if (improvement > 1) {
      message = `🎉 Significant improvement: +${improvement.toFixed(1)} points (${percentage}%)`;
    } else if (improvement > 0) {
      message = `📈 Slight improvement: +${improvement.toFixed(1)} points (${percentage}%)`;
    } else if (improvement === 0) {
      message = `➡️  No change in quality score`;
    } else {
      message = `📉 Quality decreased: ${improvement.toFixed(1)} points (${percentage}%)`;
    }

    return { improvement, message };
  }
}
