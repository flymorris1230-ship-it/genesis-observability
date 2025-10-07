/**
 * AgentTrainingSystem - AI Training Loop
 * Before-task knowledge retrieval + After-task learning logging
 */

import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { RAGEngine } from './rag-engine.js';
import { DevJournalLogger } from './dev-journal-logger.js';
import type { RetrievedDocument, TaskExecution, LearningCurveMetrics } from './types.js';

interface Task {
  description: string;
  type: string;
  complexity: number;
}

export class AgentTrainingSystem {
  private rag: RAGEngine;
  private logger: DevJournalLogger;
  private supabase: SupabaseClient;

  constructor(
    supabaseUrl: string,
    supabaseKey: string,
    geminiApiKey: string,
    knowledgeBaseDir = './knowledge'
  ) {
    this.rag = new RAGEngine(supabaseUrl, supabaseKey, geminiApiKey);
    this.logger = new DevJournalLogger(
      supabaseUrl,
      supabaseKey,
      geminiApiKey,
      knowledgeBaseDir
    );
    this.supabase = createClient(supabaseUrl, supabaseKey);
  }

  /**
   * Before task execution: Retrieve relevant knowledge
   */
  async beforeTask(task: Task): Promise<{ enhancedPrompt: string; sources: RetrievedDocument[] }> {
    console.log(`🔍 Retrieving knowledge for task: ${task.description.substring(0, 50)}...`);

    // Retrieve relevant knowledge
    const knowledge = await this.rag.retrieve(task.description, {
      topK: 5,
      filterTags: [task.type],
      minSimilarity: 0.6,
    });

    // Enhance prompt
    const { prompt, sources } = await this.rag.enhancePrompt(
      task.description,
      `You are an expert ${task.type} assistant. Your task complexity is ${task.complexity}/10.`
    );

    console.log(`✅ Retrieved ${sources.length} relevant documents`);
    sources.forEach((s, i) => {
      console.log(`   ${i + 1}. ${s.title} (${(s.score * 100).toFixed(1)}% relevance)`);
    });

    return { enhancedPrompt: prompt, sources };
  }

  /**
   * After task execution: Log learning and feedback
   */
  async afterTask(task: TaskExecution): Promise<void> {
    console.log(`📝 Logging learning from task...`);

    // Log the solution as new knowledge
    await this.logger.logDevelopment({
      title: `Solution: ${task.description.substring(0, 80)}`,
      content: task.solution,
      type: 'learning',
      tags: ['solution', 'training'],
      complexity: Math.ceil(task.timeSpent / 10), // Estimate complexity from time
      phase: process.env.CURRENT_PHASE || 'Unknown',
    });

    // Update usage statistics for used knowledge
    for (const knowledgeId of task.usedKnowledge) {
      await this.updateKnowledgeStats(knowledgeId, task.quality);
    }

    console.log(`✅ Learning logged, knowledge stats updated`);
  }

  /**
   * Update knowledge usage statistics
   */
  private async updateKnowledgeStats(knowledgeId: string, quality: number): Promise<void> {
    const { data: current } = await this.supabase
      .from('knowledge_base')
      .select('usage_count, avg_rating')
      .eq('id', knowledgeId)
      .single();

    if (!current) return;

    const usageCount = (current.usage_count || 0) + 1;
    const avgRating = ((current.avg_rating || 0) * (usageCount - 1) + quality) / usageCount;

    await this.supabase
      .from('knowledge_base')
      .update({
        usage_count: usageCount,
        avg_rating: avgRating,
        last_used_at: new Date().toISOString(),
      })
      .eq('id', knowledgeId);
  }

  /**
   * Calculate learning curve metrics for a phase
   */
  async getLearningCurve(phase: string): Promise<LearningCurveMetrics> {
    const { data: knowledge } = await this.supabase
      .from('knowledge_base')
      .select('created_at, avg_rating, usage_count')
      .eq('phase', phase)
      .eq('type', 'learning')
      .order('created_at', { ascending: true });

    if (!knowledge || knowledge.length === 0) {
      return {
        tasksCompleted: 0,
        avgQuality: 0,
        avgTimeSpent: 0,
        knowledgeGrowth: 0,
      };
    }

    return {
      tasksCompleted: knowledge.length,
      avgQuality:
        knowledge.reduce((sum: number, k: any) => sum + (k.avg_rating || 0), 0) /
        knowledge.length,
      avgTimeSpent: 0, // TODO: Calculate from logs
      knowledgeGrowth: knowledge.length / 10, // Knowledge items per 10 tasks
    };
  }

  /**
   * Get most used knowledge items (popularity)
   */
  async getMostUsedKnowledge(limit = 10): Promise<RetrievedDocument[]> {
    const { data, error } = await this.supabase
      .from('knowledge_base')
      .select('*')
      .eq('is_archived', false)
      .order('usage_count', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get most used knowledge:', error);
      return [];
    }

    return (data || []).map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      summary: doc.summary,
      score: doc.usage_count / 100, // Normalize to 0-1 range
      type: doc.type,
      tags: doc.tags,
    }));
  }

  /**
   * Get highest rated knowledge items (quality)
   */
  async getHighestRatedKnowledge(limit = 10): Promise<RetrievedDocument[]> {
    const { data, error } = await this.supabase
      .from('knowledge_base')
      .select('*')
      .eq('is_archived', false)
      .gte('usage_count', 3) // At least 3 uses to be considered
      .order('avg_rating', { ascending: false })
      .limit(limit);

    if (error) {
      console.error('Failed to get highest rated knowledge:', error);
      return [];
    }

    return (data || []).map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      content: doc.content,
      summary: doc.summary,
      score: doc.avg_rating / 10, // Normalize to 0-1 range
      type: doc.type,
      tags: doc.tags,
    }));
  }

  /**
   * Archive unused knowledge (manual trigger)
   */
  async archiveUnusedKnowledge(): Promise<{ archived: number; compressed: number }> {
    const { data, error } = await this.supabase.rpc('archive_old_knowledge');

    if (error) {
      console.error('Failed to archive knowledge:', error);
      return { archived: 0, compressed: 0 };
    }

    const result = data[0] || { archived_count: 0, compressed_count: 0 };

    console.log(
      `🗄️  Archived ${result.archived_count} items, compressed ${result.compressed_count} items`
    );

    return {
      archived: result.archived_count,
      compressed: result.compressed_count,
    };
  }
}
