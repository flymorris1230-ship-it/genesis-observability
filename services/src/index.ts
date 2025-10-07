/**
 * Genesis Observability - Knowledge Circulation Services
 * Main entry point for knowledge management system
 */

// Phase 1: Core Services
export { DevJournalLogger } from './dev-journal-logger.js';
export { RAGEngine } from './rag-engine.js';
export { AgentTrainingSystem } from './agent-training-system.js';

// Phase 2: Quality & Monitoring
export { QualityScorer } from './quality-scorer.js';
export { FeedbackLoop } from './feedback-loop.js';
export { MonitoringAPI } from './monitoring-api.js';

// Type Exports
export type {
  // Phase 1 Types
  KnowledgeType,
  SecurityLevel,
  KnowledgeBase,
  DevLogEntry,
  RetrievedDocument,
  SearchOptions,
  ADRDecision,
  LearningCurveMetrics,
  TaskExecution,
  // Phase 2 Types
  QualityMetrics,
  QualityScore,
  TaskFailure,
  KnowledgeOptimizationSuggestion,
  AgentStats,
  QualityTrend,
  CostTracking,
  LearningCurveData,
} from './types.js';
