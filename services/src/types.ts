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
