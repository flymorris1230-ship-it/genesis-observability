/**
 * MonitoringAPI - REST API for agent monitoring and analytics
 * Provides endpoints for dashboard visualization
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';

export interface AgentStats {
  totalTasks: number;
  successRate: number;
  avgQualityScore: number;
  avgExecutionTime: number;
  period: string;
}

export interface QualityTrend {
  date: string;
  avgQuality: number;
  taskCount: number;
  successRate: number;
}

export interface CostTracking {
  date: string;
  totalExecutions: number;
  avgExecutionTimeMs: number;
  estimatedLLMCalls: number;
  estimatedCostUSD: number;
}

export interface LearningCurveData {
  weekNumber: number;
  avgQuality: number;
  taskCount: number;
  knowledgeGrowth: number;
  successRate: number;
}

export class MonitoringAPI {
  private supabase: SupabaseClient;

  constructor(supabaseUrl: string, supabaseKey: string) {
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * GET /api/agent-stats
   * Get aggregated agent execution statistics
   */
  async getAgentStats(days: number = 7): Promise<AgentStats> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    const { data: executions } = await this.supabase
      .from('agent_executions')
      .select('quality_score, execution_time_ms, status')
      .gte('created_at', since.toISOString());

    if (!executions || executions.length === 0) {
      return {
        totalTasks: 0,
        successRate: 0,
        avgQualityScore: 0,
        avgExecutionTime: 0,
        period: `${days} days`,
      };
    }

    const totalTasks = executions.length;
    const successCount = executions.filter((e) => e.status === 'success').length;
    const successRate = successCount / totalTasks;
    const avgQualityScore =
      executions.reduce((sum, e) => sum + (e.quality_score || 0), 0) / totalTasks;
    const avgExecutionTime =
      executions.reduce((sum, e) => sum + (e.execution_time_ms || 0), 0) / totalTasks;

    return {
      totalTasks,
      successRate: Math.round(successRate * 100) / 100,
      avgQualityScore: Math.round(avgQualityScore * 10) / 10,
      avgExecutionTime: Math.round(avgExecutionTime),
      period: `${days} days`,
    };
  }

  /**
   * GET /api/quality-trend
   * Get daily quality trend data
   */
  async getQualityTrend(days: number = 7): Promise<QualityTrend[]> {
    const { data, error } = await this.supabase.rpc('get_quality_trend', {
      days_ago: days,
    });

    if (error) {
      console.error('Failed to get quality trend:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      date: row.date,
      avgQuality: Math.round(row.avg_quality * 10) / 10,
      taskCount: row.task_count,
      successRate: Math.round(row.success_rate * 100) / 100,
    }));
  }

  /**
   * GET /api/cost-tracking
   * Get cost tracking data
   */
  async getCostTracking(days: number = 30): Promise<CostTracking[]> {
    const { data, error } = await this.supabase.rpc('get_cost_tracking', {
      days_ago: days,
    });

    if (error) {
      console.error('Failed to get cost tracking:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      date: row.date,
      totalExecutions: row.total_executions,
      avgExecutionTimeMs: Math.round(row.avg_execution_time_ms),
      estimatedLLMCalls: row.estimated_llm_calls,
      estimatedCostUSD: Math.round(row.estimated_cost_usd * 100) / 100,
    }));
  }

  /**
   * GET /api/learning-curve
   * Get learning curve metrics by phase
   */
  async getLearningCurve(phase: string): Promise<LearningCurveData[]> {
    const { data, error } = await this.supabase.rpc('get_learning_curve_metrics', {
      phase_name: phase,
    });

    if (error) {
      console.error('Failed to get learning curve:', error);
      return [];
    }

    return (data || []).map((row: any) => ({
      weekNumber: row.week_number,
      avgQuality: Math.round(row.avg_quality * 10) / 10,
      taskCount: row.task_count,
      knowledgeGrowth: row.knowledge_growth,
      successRate: Math.round(row.success_rate * 100) / 100,
    }));
  }

  /**
   * GET /api/knowledge-health
   * Get health scores for all active knowledge
   */
  async getKnowledgeHealth(): Promise<
    Array<{
      id: string;
      title: string;
      healthScore: number;
      avgRating: number;
      usageCount: number;
      failureRate: number;
    }>
  > {
    const { data: knowledge } = await this.supabase
      .from('knowledge_base')
      .select('id, title, avg_rating, usage_count, failure_rate')
      .eq('is_archived', false)
      .order('avg_rating', { ascending: false })
      .limit(50);

    if (!knowledge) return [];

    // Calculate health score for each item
    const healthScores = await Promise.all(
      knowledge.map(async (item) => {
        const { data } = await this.supabase.rpc('calculate_knowledge_health', {
          knowledge_id: item.id,
        });

        return {
          id: item.id,
          title: item.title,
          healthScore: Math.round((data || 0) * 10) / 10,
          avgRating: Math.round(item.avg_rating * 10) / 10,
          usageCount: item.usage_count || 0,
          failureRate: Math.round((item.failure_rate || 0) * 100) / 100,
        };
      })
    );

    return healthScores.sort((a, b) => b.healthScore - a.healthScore);
  }

  /**
   * GET /api/failure-analysis
   * Get failure analysis for debugging
   */
  async getFailureAnalysis(days: number = 7): Promise<{
    totalFailures: number;
    topReasons: Array<{ reason: string; count: number; percentage: number }>;
    recentFailures: Array<{
      id: string;
      taskDescription: string;
      errorMessage: string;
      timestamp: string;
    }>;
  }> {
    const since = new Date();
    since.setDate(since.getDate() - days);

    // Get all failures
    const { data: failures } = await this.supabase
      .from('task_failures')
      .select('*')
      .gte('timestamp', since.toISOString())
      .order('timestamp', { ascending: false });

    if (!failures || failures.length === 0) {
      return {
        totalFailures: 0,
        topReasons: [],
        recentFailures: [],
      };
    }

    // Categorize errors
    const errorCounts: Record<string, number> = {};
    for (const failure of failures) {
      const category = this.categorizeError(failure.error_message);
      errorCounts[category] = (errorCounts[category] || 0) + 1;
    }

    const topReasons = Object.entries(errorCounts)
      .map(([reason, count]) => ({
        reason,
        count,
        percentage: Math.round((count / failures.length) * 100 * 10) / 10,
      }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    const recentFailures = failures.slice(0, 10).map((f) => ({
      id: f.id,
      taskDescription: f.description.substring(0, 100),
      errorMessage: f.error_message.substring(0, 200),
      timestamp: f.timestamp,
    }));

    return {
      totalFailures: failures.length,
      topReasons,
      recentFailures,
    };
  }

  /**
   * Categorize error message into type
   */
  private categorizeError(errorMessage: string): string {
    const lower = errorMessage.toLowerCase();

    if (lower.includes('timeout')) return 'Timeout';
    if (lower.includes('network')) return 'Network';
    if (lower.includes('auth')) return 'Authentication';
    if (lower.includes('not found')) return 'Not Found';
    if (lower.includes('syntax')) return 'Syntax Error';
    if (lower.includes('type')) return 'Type Error';
    if (lower.includes('permission')) return 'Permission';

    return 'Other';
  }

  /**
   * GET /api/phase-comparison
   * Compare metrics across phases
   */
  async getPhaseComparison(): Promise<
    Array<{
      phase: string;
      totalTasks: number;
      avgQuality: number;
      successRate: number;
      knowledgeCount: number;
    }>
  > {
    const { data: executions } = await this.supabase
      .from('agent_executions')
      .select('phase, quality_score, status');

    const { data: knowledge } = await this.supabase
      .from('knowledge_base')
      .select('phase')
      .eq('type', 'learning');

    if (!executions) return [];

    const phases = new Set(executions.map((e) => e.phase).filter(Boolean));
    const results = [];

    for (const phase of phases) {
      const phaseExecs = executions.filter((e) => e.phase === phase);
      const phaseKnowledge = (knowledge || []).filter((k) => k.phase === phase);

      const totalTasks = phaseExecs.length;
      const successCount = phaseExecs.filter((e) => e.status === 'success').length;
      const avgQuality =
        phaseExecs.reduce((sum, e) => sum + (e.quality_score || 0), 0) / totalTasks;

      results.push({
        phase,
        totalTasks,
        avgQuality: Math.round(avgQuality * 10) / 10,
        successRate: Math.round((successCount / totalTasks) * 100) / 100,
        knowledgeCount: phaseKnowledge.length,
      });
    }

    return results.sort((a, b) => (a.phase || '').localeCompare(b.phase || ''));
  }
}
