/**
 * FeedbackLoop - Continuous improvement through automated feedback
 * Analyzes task failures and optimizes knowledge quality
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import type { QualityScore } from './quality-scorer.js';

export interface TaskFailure {
  taskId: string;
  description: string;
  errorMessage: string;
  attemptedKnowledge: string[];
  timestamp: Date;
}

export interface KnowledgeOptimizationSuggestion {
  knowledgeId: string;
  currentRating: number;
  usageCount: number;
  failureRate: number;
  suggestion: 'improve' | 'archive' | 'split' | 'merge';
  reason: string;
}

export class FeedbackLoop {
  private supabase: SupabaseClient;
  private failureThreshold = 0.3; // 30% failure rate triggers action

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Record a task failure for learning
   */
  async recordFailure(failure: TaskFailure): Promise<void> {
    console.log(`❌ Recording task failure: ${failure.description.substring(0, 50)}...`);

    // Store failure in database
    await this.supabase.from('task_failures').insert({
      task_id: failure.taskId,
      description: failure.description,
      error_message: failure.errorMessage,
      attempted_knowledge: failure.attemptedKnowledge,
      timestamp: failure.timestamp.toISOString(),
    });

    // Update knowledge items used in failed task
    for (const knowledgeId of failure.attemptedKnowledge) {
      await this.updateKnowledgeFailureCount(knowledgeId);
    }

    console.log(`✅ Failure recorded, knowledge updated`);
  }

  /**
   * Update failure count for knowledge item
   */
  private async updateKnowledgeFailureCount(knowledgeId: string): Promise<void> {
    const { data: current } = await this.supabase
      .from('knowledge_base')
      .select('usage_count, failure_count')
      .eq('id', knowledgeId)
      .single();

    if (!current) return;

    const failureCount = (current.failure_count || 0) + 1;
    const failureRate = failureCount / (current.usage_count || 1);

    await this.supabase
      .from('knowledge_base')
      .update({
        failure_count: failureCount,
        failure_rate: failureRate,
      })
      .eq('id', knowledgeId);

    // Auto-downgrade if failure rate too high
    if (failureRate > this.failureThreshold) {
      await this.downgradeKnowledge(knowledgeId, failureRate);
    }
  }

  /**
   * Downgrade knowledge quality rating
   */
  private async downgradeKnowledge(knowledgeId: string, failureRate: number): Promise<void> {
    const { data: knowledge } = await this.supabase
      .from('knowledge_base')
      .select('avg_rating, title')
      .eq('id', knowledgeId)
      .single();

    if (!knowledge) return;

    // Reduce rating proportional to failure rate
    const penalty = failureRate * 5; // Up to -5 points for 100% failure
    const newRating = Math.max(1, knowledge.avg_rating - penalty);

    await this.supabase
      .from('knowledge_base')
      .update({ avg_rating: newRating })
      .eq('id', knowledgeId);

    console.log(
      `⚠️  Knowledge downgraded: "${knowledge.title}" (${knowledge.avg_rating.toFixed(1)} → ${newRating.toFixed(1)})`
    );
  }

  /**
   * Analyze knowledge and generate optimization suggestions
   */
  async generateOptimizationSuggestions(): Promise<KnowledgeOptimizationSuggestion[]> {
    const { data: knowledge } = await this.supabase
      .from('knowledge_base')
      .select('id, title, avg_rating, usage_count, failure_count, failure_rate')
      .eq('is_archived', false);

    if (!knowledge) return [];

    const suggestions: KnowledgeOptimizationSuggestion[] = [];

    for (const item of knowledge) {
      const failureRate = item.failure_rate || 0;
      const usageCount = item.usage_count || 0;
      const avgRating = item.avg_rating || 0;

      // High failure rate → improve or archive
      if (failureRate > 0.5 && usageCount >= 3) {
        suggestions.push({
          knowledgeId: item.id,
          currentRating: avgRating,
          usageCount,
          failureRate,
          suggestion: avgRating < 5 ? 'archive' : 'improve',
          reason:
            avgRating < 5
              ? 'High failure rate and low rating - consider archiving'
              : 'High failure rate but decent rating - needs improvement',
        });
      }

      // Low usage but high rating → might be too specific
      if (usageCount < 2 && avgRating > 8 && this.daysSinceCreation(item.created_at) > 30) {
        suggestions.push({
          knowledgeId: item.id,
          currentRating: avgRating,
          usageCount,
          failureRate,
          suggestion: 'split',
          reason: 'High quality but low usage - might be too specific, consider splitting',
        });
      }

      // High usage and high rating → potential for merging similar items
      if (usageCount > 20 && avgRating > 8) {
        suggestions.push({
          knowledgeId: item.id,
          currentRating: avgRating,
          usageCount,
          failureRate,
          suggestion: 'merge',
          reason: 'Very popular and high quality - check for similar items to merge',
        });
      }
    }

    return suggestions;
  }

  /**
   * Calculate days since knowledge creation
   */
  private daysSinceCreation(createdAt: string): number {
    const created = new Date(createdAt);
    const now = new Date();
    return Math.floor((now.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
  }

  /**
   * Get failure analysis for a time period
   */
  async getFailureAnalysis(days: number = 7): Promise<{
    totalFailures: number;
    topFailureReasons: { reason: string; count: number }[];
    mostProblematicKnowledge: { id: string; title: string; failureRate: number }[];
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get failures in time period
    const { data: failures } = await this.supabase
      .from('task_failures')
      .select('error_message, attempted_knowledge')
      .gte('timestamp', since.toISOString());

    if (!failures || failures.length === 0) {
      return {
        totalFailures: 0,
        topFailureReasons: [],
        mostProblematicKnowledge: [],
      };
    }

    // Analyze error messages
    const errorCounts: Record<string, number> = {};
    for (const failure of failures) {
      const errorType = this.categorizeError(failure.error_message);
      errorCounts[errorType] = (errorCounts[errorType] || 0) + 1;
    }

    const topFailureReasons = Object.entries(errorCounts)
      .map(([reason, count]) => ({ reason, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    // Find most problematic knowledge
    const { data: problematic } = await this.supabase
      .from('knowledge_base')
      .select('id, title, failure_rate')
      .gte('failure_rate', 0.2)
      .order('failure_rate', { ascending: false })
      .limit(5);

    return {
      totalFailures: failures.length,
      topFailureReasons,
      mostProblematicKnowledge: problematic || [],
    };
  }

  /**
   * Categorize error messages into types
   */
  private categorizeError(errorMessage: string): string {
    const lower = errorMessage.toLowerCase();

    if (lower.includes('timeout') || lower.includes('timed out')) return 'Timeout';
    if (lower.includes('network') || lower.includes('connection')) return 'Network Error';
    if (lower.includes('auth') || lower.includes('unauthorized')) return 'Authentication';
    if (lower.includes('not found') || lower.includes('404')) return 'Not Found';
    if (lower.includes('syntax') || lower.includes('parse')) return 'Syntax Error';
    if (lower.includes('type') || lower.includes('undefined')) return 'Type Error';
    if (lower.includes('permission') || lower.includes('forbidden')) return 'Permission Denied';

    return 'Other';
  }

  /**
   * Auto-apply optimization suggestions
   */
  async applyOptimizations(suggestions: KnowledgeOptimizationSuggestion[]): Promise<{
    archived: number;
    improved: number;
  }> {
    let archived = 0;
    let improved = 0;

    for (const suggestion of suggestions) {
      if (suggestion.suggestion === 'archive' && suggestion.currentRating < 4) {
        // Auto-archive low-quality, high-failure items
        await this.supabase
          .from('knowledge_base')
          .update({
            is_archived: true,
            archived_at: new Date().toISOString(),
          })
          .eq('id', suggestion.knowledgeId);

        archived++;
        console.log(`🗄️  Auto-archived knowledge: ${suggestion.knowledgeId}`);
      } else if (suggestion.suggestion === 'improve') {
        // Flag for manual improvement by adding tag
        const { data: current } = await this.supabase
          .from('knowledge_base')
          .select('tags')
          .eq('id', suggestion.knowledgeId)
          .single();

        if (current) {
          const newTags = [...(current.tags || []), 'needs-improvement'];
          await this.supabase
            .from('knowledge_base')
            .update({ tags: newTags })
            .eq('id', suggestion.knowledgeId);
        }

        improved++;
        console.log(`🔧 Flagged for improvement: ${suggestion.knowledgeId}`);
      }
    }

    return { archived, improved };
  }
}
