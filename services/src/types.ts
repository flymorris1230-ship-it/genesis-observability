/**
 * Knowledge Base Types
 * Type definitions for knowledge circulation system
 */

export type KnowledgeType = 'dev_log' | 'adr' | 'solution' | 'learning' | 'prompt_template';
export type SecurityLevel = 'public' | 'internal' | 'confidential' | 'restricted';

export interface KnowledgeBase {
  id: string;
  created_at: string;
  updated_at: string;
  title: string;
  content: string;
  summary: string | null;
  type: KnowledgeType;
  embedding: number[] | null;
  phase: string | null;
  tags: string[];
  author: string | null;
  complexity: number | null;
  security_level: SecurityLevel;
  parent_id: string | null;
  related_commits: string[];
  related_docs: string[];
  usage_count: number;
  avg_rating: number;
  last_used_at: string | null;
  is_archived: boolean;
  archived_at: string | null;
  retention_days: number;
}

export interface DevLogEntry {
  title: string;
  content: string;
  type: KnowledgeType;
  phase?: string;
  tags?: string[];
  complexity?: number;
  securityLevel?: SecurityLevel;
  relatedCommits?: string[];
}

export interface RetrievedDocument {
  id: string;
  title: string;
  content: string;
  summary: string | null;
  score: number;
  type: KnowledgeType;
  tags: string[];
}

export interface SearchOptions {
  topK?: number;
  minSimilarity?: number;
  filterTags?: string[];
  filterPhase?: string;
  securityLevel?: SecurityLevel;
}

export interface ADRDecision {
  title: string;
  context: string;
  decision: string;
  consequences: string;
  alternatives?: string;
}

export interface LearningCurveMetrics {
  tasksCompleted: number;
  avgQuality: number;
  avgTimeSpent: number;
  knowledgeGrowth: number;
}

export interface TaskExecution {
  description: string;
  solution: string;
  quality: number; // 1-10
  timeSpent: number; // minutes
  usedKnowledge: string[]; // IDs of used knowledge
}

// Phase 2: Quality Scoring Types
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
    efficiency: number;
    reliability: number;
    knowledgeUtilization: number;
    completeness: number;
  };
  feedback: string[];
}

// Phase 2: Feedback Loop Types
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

// Phase 2: Monitoring API Types
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
