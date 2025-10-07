# GAC_FactoryOS 專案進度追蹤系統設計規範

## 🎯 目標

將 Genesis Observability 從單純的 LLM 使用追蹤升級為**完整的專案執行進度追蹤平台**，涵蓋：
- 開發進度追蹤（模組、Sprint、任務）
- 系統健康監控（API、數據庫、整合）
- Agent 執行狀態（任務、成功率、性能）
- LLM 使用分析（已有）

---

## 📊 追蹤維度

### 1. 開發進度追蹤 (Development Progress)

#### 模組進度 (Module Progress)
追蹤 4 大模組的開發狀態：

**資料模型**:
```typescript
interface ModuleProgress {
  project_id: string;          // "GAC_FactoryOS"
  module: string;              // "WMS" | "MES" | "QMS" | "R&D"
  version: string;             // "0.1.0"
  status: string;              // "in_progress" | "completed" | "blocked" | "planned"
  progress_percentage: number; // 0-100
  features_total: number;      // 總功能數
  features_completed: number;  // 已完成功能數
  features_in_progress: number;// 進行中功能數
  features_blocked: number;    // 阻塞中功能數
  last_updated: timestamp;
  metadata: {
    current_sprint?: string;
    assignees?: string[];
    blockers?: string[];
    estimated_completion?: timestamp;
  }
}
```

**追蹤指標**:
- 整體完成度：各模組加權平均
- 進度趨勢：每日進度變化
- 阻塞分析：識別阻塞因素
- 速度指標：功能完成速度

#### Sprint 進度 (Sprint Progress)
追蹤 Sprint 執行狀態：

**資料模型**:
```typescript
interface SprintProgress {
  project_id: string;
  sprint_name: string;         // "Sprint 1"
  sprint_day: number;          // 1-14
  status: string;              // "active" | "completed" | "planned"
  goals: string[];             // Sprint 目標
  completed_tasks: number;
  total_tasks: number;
  started_at: timestamp;
  ended_at: timestamp | null;
  velocity: number;            // 任務完成速度
  metadata: {
    focus_areas?: string[];
    achievements?: string[];
    learnings?: string[];
  }
}
```

#### 任務追蹤 (Task Tracking)
細粒度任務狀態：

**資料模型**:
```typescript
interface TaskProgress {
  project_id: string;
  task_id: string;
  task_name: string;
  task_type: string;           // "feature" | "bug" | "refactor" | "docs"
  status: string;              // "todo" | "in_progress" | "completed" | "blocked"
  priority: string;            // "high" | "medium" | "low"
  module: string;              // "WMS" | "MES" | "QMS" | "R&D"
  sprint: string | null;
  assignee: string | null;
  estimated_hours: number;
  actual_hours: number | null;
  created_at: timestamp;
  completed_at: timestamp | null;
  metadata: {
    blockers?: string[];
    dependencies?: string[];
    notes?: string;
  }
}
```

---

### 2. 系統健康監控 (System Health)

#### API 健康狀態
追蹤 Factory OS 各端點健康度：

**資料模型**:
```typescript
interface APIHealth {
  project_id: string;
  endpoint: string;            // "/api/trpc/material.list"
  status: string;              // "healthy" | "degraded" | "down"
  response_time_ms: number;
  success_rate: number;        // 0-100
  error_count: number;
  last_check: timestamp;
  uptime_percentage: number;   // Last 24h
  metadata: {
    error_types?: Record<string, number>;
    slowest_request?: number;
    fastest_request?: number;
  }
}
```

#### 數據庫健康
追蹤數據庫性能：

**資料模型**:
```typescript
interface DatabaseHealth {
  project_id: string;
  database: string;            // "factory_os" | "gac"
  status: string;              // "connected" | "slow" | "disconnected"
  connection_count: number;
  query_avg_ms: number;
  slow_queries_count: number;
  last_migration: string;
  last_check: timestamp;
  metadata: {
    pool_size?: number;
    waiting_connections?: number;
    deadlocks?: number;
  }
}
```

#### 整合狀態
追蹤系統間整合健康度：

**資料模型**:
```typescript
interface IntegrationHealth {
  project_id: string;
  integration_name: string;    // "GAC ↔ Factory OS" | "Factory OS ↔ Supabase"
  status: string;              // "operational" | "degraded" | "offline"
  success_rate: number;
  avg_latency_ms: number;
  last_successful_call: timestamp;
  last_failed_call: timestamp | null;
  error_count_24h: number;
  metadata: {
    capabilities?: string[];
    last_error?: string;
    version?: string;
  }
}
```

---

### 3. Agent 執行狀態 (Agent Execution)

#### Agent 任務追蹤
追蹤 AI Agent 執行情況：

**資料模型**:
```typescript
interface AgentExecution {
  project_id: string;
  agent_name: string;          // "coordinator" | "pm" | "arch" | "dev" | "test"
  task_id: string;
  task_type: string;           // "feature_planning" | "code_gen" | "testing"
  status: string;              // "running" | "completed" | "failed"
  started_at: timestamp;
  completed_at: timestamp | null;
  duration_ms: number | null;
  llm_calls_count: number;
  tokens_used: number;
  cost_usd: number;
  success: boolean;
  metadata: {
    input?: string;
    output?: string;
    error?: string;
    context?: Record<string, any>;
  }
}
```

#### Agent 性能指標
聚合 Agent 性能數據：

**資料模型**:
```typescript
interface AgentPerformance {
  project_id: string;
  agent_name: string;
  period: string;              // "hour" | "day" | "week"
  total_executions: number;
  successful_executions: number;
  failed_executions: number;
  success_rate: number;
  avg_duration_ms: number;
  total_tokens: number;
  total_cost_usd: number;
  timestamp: timestamp;
}
```

---

## 🗄️ Supabase Schema 擴展

### 新增 Tables

```sql
-- 模組進度表
CREATE TABLE module_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT NOT NULL,
  module TEXT NOT NULL,
  version TEXT NOT NULL,
  status TEXT NOT NULL,
  progress_percentage INTEGER NOT NULL CHECK (progress_percentage >= 0 AND progress_percentage <= 100),
  features_total INTEGER NOT NULL DEFAULT 0,
  features_completed INTEGER NOT NULL DEFAULT 0,
  features_in_progress INTEGER NOT NULL DEFAULT 0,
  features_blocked INTEGER NOT NULL DEFAULT 0,
  last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB,
  UNIQUE(project_id, module)
);

-- Sprint 進度表
CREATE TABLE sprint_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT NOT NULL,
  sprint_name TEXT NOT NULL,
  sprint_day INTEGER,
  status TEXT NOT NULL,
  goals TEXT[],
  completed_tasks INTEGER NOT NULL DEFAULT 0,
  total_tasks INTEGER NOT NULL DEFAULT 0,
  started_at TIMESTAMPTZ NOT NULL,
  ended_at TIMESTAMPTZ,
  velocity DECIMAL,
  metadata JSONB,
  UNIQUE(project_id, sprint_name)
);

-- 任務追蹤表
CREATE TABLE task_progress (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT NOT NULL,
  task_id TEXT NOT NULL,
  task_name TEXT NOT NULL,
  task_type TEXT NOT NULL,
  status TEXT NOT NULL,
  priority TEXT NOT NULL,
  module TEXT,
  sprint TEXT,
  assignee TEXT,
  estimated_hours DECIMAL,
  actual_hours DECIMAL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  metadata JSONB,
  UNIQUE(project_id, task_id)
);

-- API 健康表
CREATE TABLE api_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT NOT NULL,
  endpoint TEXT NOT NULL,
  status TEXT NOT NULL,
  response_time_ms INTEGER NOT NULL,
  success_rate DECIMAL NOT NULL,
  error_count INTEGER NOT NULL DEFAULT 0,
  last_check TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  uptime_percentage DECIMAL,
  metadata JSONB
);

-- 數據庫健康表
CREATE TABLE database_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT NOT NULL,
  database TEXT NOT NULL,
  status TEXT NOT NULL,
  connection_count INTEGER,
  query_avg_ms DECIMAL,
  slow_queries_count INTEGER DEFAULT 0,
  last_migration TEXT,
  last_check TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata JSONB
);

-- 整合健康表
CREATE TABLE integration_health (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT NOT NULL,
  integration_name TEXT NOT NULL,
  status TEXT NOT NULL,
  success_rate DECIMAL NOT NULL,
  avg_latency_ms DECIMAL,
  last_successful_call TIMESTAMPTZ,
  last_failed_call TIMESTAMPTZ,
  error_count_24h INTEGER DEFAULT 0,
  metadata JSONB,
  UNIQUE(project_id, integration_name)
);

-- Agent 執行表
CREATE TABLE agent_executions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  task_id TEXT NOT NULL,
  task_type TEXT NOT NULL,
  status TEXT NOT NULL,
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  completed_at TIMESTAMPTZ,
  duration_ms INTEGER,
  llm_calls_count INTEGER DEFAULT 0,
  tokens_used INTEGER DEFAULT 0,
  cost_usd DECIMAL DEFAULT 0,
  success BOOLEAN,
  metadata JSONB
);

-- Agent 性能表
CREATE TABLE agent_performance (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id TEXT NOT NULL,
  agent_name TEXT NOT NULL,
  period TEXT NOT NULL,
  total_executions INTEGER NOT NULL,
  successful_executions INTEGER NOT NULL,
  failed_executions INTEGER NOT NULL,
  success_rate DECIMAL NOT NULL,
  avg_duration_ms DECIMAL,
  total_tokens INTEGER DEFAULT 0,
  total_cost_usd DECIMAL DEFAULT 0,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 索引
CREATE INDEX idx_module_progress_project ON module_progress(project_id);
CREATE INDEX idx_sprint_progress_project ON sprint_progress(project_id, status);
CREATE INDEX idx_task_progress_project ON task_progress(project_id, status);
CREATE INDEX idx_api_health_project ON api_health(project_id, last_check DESC);
CREATE INDEX idx_agent_executions_project ON agent_executions(project_id, started_at DESC);
CREATE INDEX idx_agent_performance_project ON agent_performance(project_id, agent_name, timestamp DESC);
```

---

## 🔌 API Endpoints (obs-edge Worker)

### 開發進度端點

```typescript
// GET /progress/modules?project_id=GAC_FactoryOS
// 返回所有模組的進度
interface ModulesProgressResponse {
  project_id: string;
  modules: ModuleProgress[];
  overall_progress: number;
  last_updated: string;
}

// GET /progress/sprint?project_id=GAC_FactoryOS&sprint_name=Sprint%201
// 返回 Sprint 進度
interface SprintProgressResponse {
  project_id: string;
  sprint: SprintProgress;
  tasks: TaskProgress[];
  completion_rate: number;
}

// GET /progress/tasks?project_id=GAC_FactoryOS&status=in_progress
// 返回任務列表
interface TasksProgressResponse {
  project_id: string;
  tasks: TaskProgress[];
  summary: {
    total: number;
    by_status: Record<string, number>;
    by_module: Record<string, number>;
    by_priority: Record<string, number>;
  };
}

// POST /progress/update
// 更新進度（從 GAC_FactoryOS 調用）
interface ProgressUpdateRequest {
  project_id: string;
  type: "module" | "sprint" | "task";
  data: ModuleProgress | SprintProgress | TaskProgress;
}
```

### 系統健康端點

```typescript
// GET /health/system?project_id=GAC_FactoryOS
// 返回完整系統健康度
interface SystemHealthResponse {
  project_id: string;
  overall_status: "healthy" | "degraded" | "critical";
  api: APIHealth[];
  database: DatabaseHealth[];
  integrations: IntegrationHealth[];
  last_check: string;
}

// POST /health/report
// 上報健康數據（定期調用）
interface HealthReportRequest {
  project_id: string;
  api_health?: APIHealth[];
  database_health?: DatabaseHealth[];
  integration_health?: IntegrationHealth[];
}
```

### Agent 執行端點

```typescript
// GET /agents/executions?project_id=GAC_FactoryOS&agent_name=coordinator
// 返回 Agent 執行歷史
interface AgentExecutionsResponse {
  project_id: string;
  agent_name: string;
  executions: AgentExecution[];
  summary: {
    total: number;
    success_rate: number;
    avg_duration_ms: number;
  };
}

// GET /agents/performance?project_id=GAC_FactoryOS&period=day
// 返回 Agent 性能數據
interface AgentPerformanceResponse {
  project_id: string;
  period: string;
  agents: AgentPerformance[];
  insights: {
    best_performer: string;
    needs_attention: string[];
  };
}

// POST /agents/execution/start
// Agent 開始執行時調用
interface AgentExecutionStartRequest {
  project_id: string;
  agent_name: string;
  task_id: string;
  task_type: string;
  metadata?: Record<string, any>;
}

// POST /agents/execution/complete
// Agent 完成執行時調用
interface AgentExecutionCompleteRequest {
  project_id: string;
  task_id: string;
  success: boolean;
  llm_calls_count?: number;
  tokens_used?: number;
  cost_usd?: number;
  metadata?: Record<string, any>;
}
```

---

## 📱 Dashboard UI 設計

### 新增頁面

#### 1. 總覽頁面 (Overview)
**路徑**: `/`

**佈局**:
```
┌───────────────────────────────────────────────────────┐
│  專案總覽                                              │
├─────────────┬─────────────┬─────────────┬─────────────┤
│  整體進度   │  系統健康   │  Agent狀態  │  LLM成本    │
│    65%      │   Healthy   │    95%      │   $12.50    │
└─────────────┴─────────────┴─────────────┴─────────────┘

┌───────────────────────────────────────────────────────┐
│  模組進度 (Progress by Module)                        │
│  ▓▓▓▓▓▓▓▓░░ WMS  80%                                 │
│  ▓▓▓▓░░░░░░ MES  40%                                 │
│  ▓░░░░░░░░░ QMS  10%                                 │
│  ░░░░░░░░░░ R&D   0%                                 │
└───────────────────────────────────────────────────────┘

┌─────────────────────────┬─────────────────────────────┐
│  當前 Sprint            │  系統健康指標                │
│  Sprint 1 - Day 4       │  API: 12/12 Healthy         │
│  完成: 8/15 任務        │  DB: Connected              │
│  速度: 2 tasks/day      │  整合: 2/2 Operational      │
└─────────────────────────┴─────────────────────────────┘
```

#### 2. 模組進度頁面 (Modules)
**路徑**: `/modules`

**功能**:
- 顯示 4 大模組詳細進度
- 功能清單與完成狀態
- 阻塞因素分析
- 進度趨勢圖表

#### 3. Sprint 追蹤頁面 (Sprint)
**路徑**: `/sprint`

**功能**:
- 當前 Sprint 詳情
- 任務看板（Todo, In Progress, Done, Blocked）
- Burndown Chart
- 速度指標

#### 4. 系統健康頁面 (Health)
**路徑**: `/health`

**功能**:
- API 端點健康狀態列表
- 數據庫性能指標
- 整合狀態監控
- 實時錯誤日誌

#### 5. Agent 監控頁面 (Agents)
**路徑**: `/agents`

**功能**:
- 各 Agent 執行統計
- 成功率趨勢
- 性能比較
- 最近執行日誌

#### 6. LLM 分析頁面 (LLM) - 現有
**路徑**: `/llm`

**功能**:
- Token 使用分析（現有）
- 成本趨勢（現有）
- 模型性能（現有）

---

## 🔄 整合方式

### 從 GAC_FactoryOS 上報數據

#### 1. 在 LLM Router 中整合
已整合 LLM 追蹤，繼續添加 Agent 追蹤：

```typescript
// apps/ai-agent-team/src/main/js/llm/router.ts
import { trackAgentExecution } from '../utils/observability';

class LLMRouter {
  async executeAgent(agentName: string, task: Task) {
    const executionId = await trackAgentExecution.start({
      project_id: 'GAC_FactoryOS',
      agent_name: agentName,
      task_id: task.id,
      task_type: task.type,
    });

    try {
      const result = await this.runAgent(agentName, task);

      await trackAgentExecution.complete({
        project_id: 'GAC_FactoryOS',
        task_id: executionId,
        success: true,
        llm_calls_count: result.llmCalls,
        tokens_used: result.tokens,
        cost_usd: result.cost,
      });

      return result;
    } catch (error) {
      await trackAgentExecution.complete({
        project_id: 'GAC_FactoryOS',
        task_id: executionId,
        success: false,
        metadata: { error: error.message },
      });
      throw error;
    }
  }
}
```

#### 2. 在 Factory OS 中上報健康數據
添加定期健康檢查：

```typescript
// apps/factory-os/src/lib/health-reporter.ts
export async function reportSystemHealth() {
  const health = await collectHealthMetrics();

  await fetch(`${OBSERVABILITY_URL}/health/report`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${OBSERVABILITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      project_id: 'GAC_FactoryOS',
      api_health: health.api,
      database_health: health.database,
      integration_health: health.integrations,
    }),
  });
}

// 每 5 分鐘執行一次
setInterval(reportSystemHealth, 5 * 60 * 1000);
```

#### 3. 手動更新進度
提供 CLI 工具或 UI 更新模組/Sprint 進度：

```typescript
// apps/factory-os/scripts/update-progress.ts
import { updateModuleProgress } from '../lib/progress-reporter';

await updateModuleProgress({
  project_id: 'GAC_FactoryOS',
  module: 'WMS',
  progress_percentage: 80,
  features_completed: 12,
  features_total: 15,
  features_in_progress: 3,
});
```

---

## 📐 實現優先級

### Phase 1: 核心追蹤 (本次實現)
- [x] 設計資料模型
- [ ] 擴展 Supabase Schema
- [ ] 實現進度 API endpoints
- [ ] 實現健康監控 API
- [ ] 創建總覽 Dashboard
- [ ] 整合 Agent 執行追蹤

### Phase 2: 進階功能
- [ ] 實現 Sprint 追蹤頁面
- [ ] 添加任務看板
- [ ] 實現 Burndown Chart
- [ ] 添加告警系統

### Phase 3: 自動化與智能化
- [ ] 自動健康檢查
- [ ] 異常檢測與告警
- [ ] AI 驅動的進度預測
- [ ] 自動化報告生成

---

## 🎯 成功指標

1. **可見性**: 所有關鍵指標在 Dashboard 一目了然
2. **實時性**: 數據延遲 < 5 分鐘
3. **準確性**: 進度數據與實際情況誤差 < 5%
4. **可操作性**: 識別阻塞並提供建議
5. **整合度**: 與 GAC_FactoryOS 無縫整合

---

**版本**: 1.0
**狀態**: 設計完成，待實現
**作者**: Claude Code
**日期**: 2025-10-07
