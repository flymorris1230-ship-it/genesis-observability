# Genesis Observability - 系統架構圖

**文件版本**: v1.0
**創建日期**: 2025-01-07
**專案**: Genesis Observability Platform
**目的**: 完整執行藍圖與架構設計文檔

---

## 🏗️ 整體系統架構

```mermaid
graph TB
    subgraph "開發層 (Development Layer)"
        CC[Claude Code<br/>主要開發者<br/>$0 成本]
        AAT[AI Agent Team<br/>12 Agents<br/>自主協作]
        MCP[MCP Servers<br/>6 Servers<br/>工具調用]
    end

    subgraph "Multi-LLM Router (智能路由)"
        MLR{LLM Router<br/>品質優先策略}
        Claude["Claude 3.5 Sonnet<br/>複雜度>=8 或安全任務<br/>$3/1M input, $15/1M output"]
        GPT["GPT-4o-mini<br/>UI 任務 & 複雜查詢<br/>$0.15/1M input, $0.60/1M output"]
        Gemini["Gemini Pro<br/>簡單查詢 & Embedding<br/>FREE (實驗性)"]
    end

    subgraph "知識循環系統 (Knowledge Circulation)"
        DevLog[DevJournalLogger<br/>開發日誌記錄]
        KB[(Supabase<br/>Knowledge Base<br/>向量搜索)]
        RAG[RAG Engine<br/>知識檢索]
        Train[AgentTrainingSystem<br/>AI 自主學習]
    end

    subgraph "Observability 核心 (Core Platform)"
        Edge[obs-edge<br/>Cloudflare Workers<br/>API + Metrics]
        Dashboard[obs-dashboard<br/>Cloudflare Pages<br/>Next.js UI]
        Collector[LLM Usage Collector<br/>SDK Library]
        DO[Durable Objects<br/>實時聚合]
    end

    subgraph "數據存儲 (Data Layer)"
        SupaDB[(Supabase PostgreSQL<br/>主數據庫)]
        SupaVec[(Supabase Vector<br/>pgvector)]
        CF_KV[(Cloudflare KV<br/>快取)]
        CF_R2[(Cloudflare R2<br/>長期存儲)]
    end

    subgraph "Factory OS 主專案 (Zero Conflict)"
        FOS[Factory OS<br/>WMS/MES/QMS/R&D<br/>獨立運行]
        FOS_DB[(Factory DB<br/>Supabase<br/>完全隔離)]
    end

    CC --> MLR
    AAT --> MLR
    MLR --> Claude
    MLR --> GPT
    MLR --> Gemini

    CC --> DevLog
    AAT --> DevLog
    DevLog --> KB
    KB --> RAG
    RAG --> Train
    Train --> AAT

    CC --> MCP
    MCP --> Edge
    MCP --> Dashboard

    Collector --> Edge
    Edge --> DO
    DO --> Dashboard
    Edge --> SupaDB
    Edge --> SupaVec
    Dashboard --> CF_KV
    Edge --> CF_R2

    FOS -.獨立運行.-> FOS_DB

    style CC fill:#9f7aea
    style Claude fill:#f56565
    style GPT fill:#48bb78
    style Gemini fill:#4299e1
    style KB fill:#ed8936
    style RAG fill:#ed8936
    style Edge fill:#38b2ac
    style Dashboard fill:#38b2ac
```

---

## 🎯 Multi-LLM Router 決策流程

```mermaid
flowchart TD
    Start[任務輸入] --> Preferred{是否有<br/>偏好 Provider?}

    Preferred -->|是| CheckHealth{Provider<br/>健康?}
    Preferred -->|否| TaskType{任務類型?}

    CheckHealth -->|是| UsePreferred[使用偏好 Provider]
    CheckHealth -->|否| TaskType

    TaskType -->|Embedding| UseGemini[使用 Gemini<br/>FREE Embedding]
    TaskType -->|Chat| Strategy{優化策略?}

    Strategy -->|Cost| UseCheap[Gemini 2.0 Flash<br/>FREE or 1.5 Flash 8B]
    Strategy -->|Performance| UseOpenAI[OpenAI GPT-4o<br/>最佳性能]
    Strategy -->|Balanced| Analyze[分析任務特性]

    Analyze --> Complexity{複雜度分析}
    Complexity -->|complexity >= 8| UseClaude[Claude 3.5 Sonnet<br/>最佳品質]
    Complexity -->|< 8| Security{安全任務?}

    Security -->|是| UseClaude
    Security -->|否| UITask{UI 任務?}

    UITask -->|是| UseGPT4mini[GPT-4o-mini<br/>良好前端經驗]
    UITask -->|否| Length{訊息長度?}

    Length -->|< 1000 chars| UseGeminiChat[Gemini Pro<br/>簡單查詢]
    Length -->|>= 1000 chars| UseGPT4mini

    UseClaude --> Execute[執行請求]
    UseGPT4mini --> Execute
    UseGemini --> Execute
    UseGeminiChat --> Execute
    UseCheap --> Execute
    UseOpenAI --> Execute
    UsePreferred --> Execute

    Execute --> Success{成功?}
    Success -->|是| UpdateMetrics[更新健康狀態<br/>記錄成本]
    Success -->|否| Retry{重試次數<br/>< Max?}

    Retry -->|是| Execute
    Retry -->|否| Fallback{啟用<br/>Fallback?}

    Fallback -->|是| GetFallback[選擇備用 Provider]
    Fallback -->|否| Error[拋出錯誤]

    GetFallback --> Execute
    UpdateMetrics --> End[返回結果]

    style UseClaude fill:#f56565
    style UseGPT4mini fill:#48bb78
    style UseGemini fill:#4299e1
    style UseGeminiChat fill:#4299e1
```

---

## 🔄 知識循環系統架構

```mermaid
graph TB
    subgraph "知識記錄層 (Knowledge Recording)"
        Task[開發任務開始]
        Logger[DevJournalLogger]
        MDFile[Markdown 日誌<br/>本地存儲]
    end

    subgraph "知識存儲層 (Knowledge Storage - Supabase)"
        DevLogs[(development_logs<br/>開發日誌)]
        ADR[(architecture_decisions<br/>架構決策)]
        ProbSol[(problem_solutions<br/>問題解決方案)]
        AgentLog[(agent_learning_log<br/>Agent 學習記錄)]
    end

    subgraph "向量化層 (Vectorization)"
        Embed[Embedding 生成<br/>Gemini text-embedding-004<br/>FREE]
        VecDB[(Supabase Vector<br/>pgvector<br/>向量搜索)]
    end

    subgraph "知識檢索層 (Knowledge Retrieval - RAG)"
        Query[任務前檢索]
        Search[向量相似度搜索<br/>Cosine Similarity]
        Context[上下文增強]
        Prompt[Enhanced Prompt]
    end

    subgraph "AI 訓練層 (AI Training)"
        Before[任務前知識檢索]
        Execute[Agent 執行任務]
        After[任務後記錄學習]
        Score[品質評分]
        Feedback[Feedback Loop]
    end

    subgraph "效果評估層 (Effectiveness Evaluation)"
        Metrics[學習曲線追蹤]
        Quality[品質趨勢分析]
        Cost[成本追蹤]
        Report[效果報告]
    end

    Task --> Logger
    Logger --> MDFile
    Logger --> DevLogs
    Logger --> ADR
    Logger --> ProbSol
    Logger --> AgentLog

    DevLogs --> Embed
    ADR --> Embed
    ProbSol --> Embed
    AgentLog --> Embed
    Embed --> VecDB

    Query --> Search
    Search --> VecDB
    VecDB --> Context
    Context --> Prompt

    Before --> Query
    Prompt --> Execute
    Execute --> After
    After --> Logger
    Execute --> Score
    Score --> Feedback
    Feedback --> Query

    Score --> Metrics
    Metrics --> Quality
    Quality --> Cost
    Cost --> Report

    style Logger fill:#ed8936
    style VecDB fill:#805ad5
    style Search fill:#805ad5
    style Execute fill:#38b2ac
```

---

## 🏭 Zero-Conflict 整合架構

```mermaid
graph TB
    subgraph "Genesis Observability (新專案)"
        subgraph "Git Repo 1"
            ObsRepo[genesis-observability<br/>獨立 Git Repo]
        end

        subgraph "Cloudflare Account"
            ObsWorker[obs-edge<br/>Cloudflare Workers<br/>獨立 API]
            ObsPages[obs-dashboard<br/>Cloudflare Pages<br/>獨立 Dashboard]
        end

        subgraph "Supabase Project 1"
            ObsDB[(obs_production<br/>獨立數據庫)]
        end
    end

    subgraph "Factory OS (主專案)"
        subgraph "Git Repo 2"
            FOSRepo[GAC_FactoryOS<br/>Monorepo<br/>ai-agent-team + factory-os]
        end

        subgraph "Cloudflare Workers"
            AAT_Worker[ai-agent-team<br/>12 AI Agents<br/>獨立 Worker]
            FOS_Worker[factory-os<br/>WMS/MES/QMS/R&D<br/>獨立 Worker]
        end

        subgraph "Supabase Project 2"
            FOS_DB[(factory_production<br/>工廠數據庫)]
        end
    end

    subgraph "共享資源 (Shared Resources)"
        MCP_Servers[MCP Servers<br/>6 Servers<br/>跨專案調用]
        AI_Router[Multi-LLM Router<br/>Claude + GPT + Gemini<br/>共享智能路由]
        Knowledge[(Knowledge Base<br/>可選擇性共享)]
    end

    ObsWorker --> ObsDB
    ObsPages --> ObsDB
    AAT_Worker --> FOS_DB
    FOS_Worker --> FOS_DB

    ObsWorker -.可選調用.-> MCP_Servers
    AAT_Worker --> MCP_Servers
    FOS_Worker --> MCP_Servers

    AAT_Worker --> AI_Router
    ObsWorker -.可選調用.-> AI_Router

    AAT_Worker -.寫入.-> Knowledge
    ObsWorker -.讀取.-> Knowledge

    style ObsRepo fill:#38b2ac
    style FOSRepo fill:#4299e1
    style ObsDB fill:#38b2ac
    style FOS_DB fill:#4299e1
    style MCP_Servers fill:#ed8936
    style AI_Router fill:#805ad5
    style Knowledge fill:#ed8936
```

---

## 📊 Phase-based Delivery 流程圖

```mermaid
graph TD
    Start([專案啟動]) --> P0_Plan[Phase 0 計畫<br/>Multi-LLM Router]

    P0_Plan --> P0_Dev[開發實作]
    P0_Dev --> P0_Test[測試驗證]
    P0_Test --> P0_Quality{品質分數<br/>>= 85?}

    P0_Quality -->|否| P0_Fix[修復問題]
    P0_Fix --> P0_Test

    P0_Quality -->|是| P0_Debt{技術債務<br/>Low?}
    P0_Debt -->|否| P0_Clean[清理債務]
    P0_Clean --> P0_Test

    P0_Debt -->|是| P0_Doc{文檔完整<br/>>= 90%?}
    P0_Doc -->|否| P0_Write[補充文檔]
    P0_Write --> P0_Test

    P0_Doc -->|是| P0_Report[產出品質報告]
    P0_Report --> P0_Review[人工審查]
    P0_Review --> P0_Approve{批准?}

    P0_Approve -->|否| P0_Fix
    P0_Approve -->|是| P0_Done[✅ Phase 0 完成]

    P0_Done --> P1_Plan[Phase 1 計畫<br/>知識循環基礎]
    P1_Plan --> P1_Dev[開發實作]
    P1_Dev --> P1_Test[測試驗證]
    P1_Test --> P1_Quality{品質分數<br/>>= 85?}

    P1_Quality -->|否| P1_Fix[修復問題]
    P1_Fix --> P1_Test

    P1_Quality -->|是| P1_Done[✅ Phase 1 完成]

    P1_Done --> P2_Plan[Phase 2 計畫<br/>AI 訓練系統]
    P2_Plan --> P2_Dev[開發實作]
    P2_Dev --> P2_Test[測試驗證]
    P2_Test --> P2_Quality{品質分數<br/>>= 85?}

    P2_Quality -->|否| P2_Fix[修復問題]
    P2_Fix --> P2_Test

    P2_Quality -->|是| P2_Done[✅ Phase 2 完成]

    P2_Done --> P3_Plan[Phase 3 計畫<br/>Observability 核心]
    P3_Plan --> P3_Dev[開發實作]
    P3_Dev --> P3_Test[測試驗證]
    P3_Test --> P3_Quality{品質分數<br/>>= 85?}

    P3_Quality -->|否| P3_Fix[修復問題]
    P3_Fix --> P3_Test

    P3_Quality -->|是| P3_Done[✅ Phase 3 完成]

    P3_Done --> End([🎉 專案交付])

    style P0_Done fill:#48bb78
    style P1_Done fill:#48bb78
    style P2_Done fill:#48bb78
    style P3_Done fill:#48bb78
    style End fill:#9f7aea
```

---

## 🎯 品質驗證體系

```mermaid
graph LR
    subgraph "品質維度 (Quality Dimensions)"
        F[功能完整性<br/>25%]
        T[測試覆蓋率<br/>20%]
        C[代碼品質<br/>20%]
        P[性能指標<br/>15%]
        S[安全性<br/>10%]
        D[文檔完整度<br/>10%]
    end

    subgraph "驗證工具 (Validation Tools)"
        V1[功能測試<br/>E2E Testing]
        V2[單元測試<br/>Vitest/Jest]
        V3[TypeScript<br/>tsc --noEmit]
        V4[壓力測試<br/>Load Testing]
        V5[安全掃描<br/>npm audit]
        V6[文檔審查<br/>Peer Review]
    end

    subgraph "品質閘門 (Quality Gate)"
        Score[品質分數計算]
        Threshold{>= 85/100?}
        Pass[✅ 通過<br/>進入下階段]
        Fail[❌ 不通過<br/>返回修復]
    end

    F --> V1
    T --> V2
    C --> V3
    P --> V4
    S --> V5
    D --> V6

    V1 --> Score
    V2 --> Score
    V3 --> Score
    V4 --> Score
    V5 --> Score
    V6 --> Score

    Score --> Threshold
    Threshold -->|是| Pass
    Threshold -->|否| Fail

    style Pass fill:#48bb78
    style Fail fill:#f56565
```

---

## 🚀 技術棧總覽

### 前端 (Frontend)
- **Framework**: Next.js 15 (React 18)
- **Language**: TypeScript 5
- **Styling**: Tailwind CSS 3
- **State**: React Query (TanStack Query)
- **Deployment**: Cloudflare Pages

### 後端 (Backend)
- **Runtime**: Cloudflare Workers (Edge Computing)
- **API**: tRPC 11 (Type-safe API)
- **Realtime**: Durable Objects
- **Language**: TypeScript 5

### 數據庫 (Database)
- **Primary DB**: Supabase PostgreSQL
- **Vector DB**: Supabase Vector (pgvector)
- **Cache**: Cloudflare KV
- **Storage**: Cloudflare R2

### AI/LLM Stack
- **Claude**: 3.5 Sonnet (複雜任務)
- **OpenAI**: GPT-4o-mini (UI & 標準任務)
- **Google**: Gemini Pro (簡單任務 & Embedding)
- **Router**: 自建 Multi-LLM Router

### 開發工具 (DevTools)
- **MCP Servers**: 6 Servers (Cloudflare, Supabase, PostgreSQL, GitHub, Playwright, Gemini)
- **Testing**: Vitest + Playwright
- **CI/CD**: GitHub Actions
- **Monorepo**: Turborepo
- **Package Manager**: pnpm

---

## 📈 成本估算

### LLM 成本 (每專案階段)

| Provider | 用途 | 預估用量 | 單價 | 成本 |
|----------|------|----------|------|------|
| **Claude 3.5 Sonnet** | 複雜任務 & 安全 | 5M input + 2M output | $3/$15 per 1M | $45 |
| **GPT-4o-mini** | UI & 標準開發 | 20M input + 10M output | $0.15/$0.60 per 1M | $9 |
| **Gemini Pro** | 簡單查詢 & Docs | FREE (實驗性) | $0 | $0 |
| **Gemini Embedding** | 向量生成 | FREE | $0 | $0 |
| **總計** | - | - | - | **$54/階段** |

### 基礎設施成本 (每月)

| 服務 | 用途 | 方案 | 成本 |
|------|------|------|------|
| **Cloudflare Workers** | Edge API | Free (100K req/day) | $0 |
| **Cloudflare Pages** | Frontend | Free | $0 |
| **Cloudflare KV** | Cache | Free (1GB) | $0 |
| **Cloudflare R2** | Storage | Free (10GB) | $0 |
| **Supabase** | Database | Free (500MB) | $0 |
| **GitHub** | Code hosting | Free | $0 |
| **總計** | - | - | **$0/月** |

**專案總預算**: ~$216 (4 Phases × $54)
**運行成本**: $0/月 (Free Tier)

---

## 🔐 安全架構

```mermaid
graph TB
    subgraph "邊界安全 (Perimeter Security)"
        CF_WAF[Cloudflare WAF<br/>DDoS 防護]
        RateLimit[Rate Limiting<br/>Upstash Redis]
    end

    subgraph "應用安全 (Application Security)"
        Auth[Supabase Auth<br/>JWT 驗證]
        RLS[Row Level Security<br/>Database Policies]
        CORS[CORS 配置<br/>Domain Whitelist]
    end

    subgraph "數據安全 (Data Security)"
        Encrypt[傳輸加密<br/>TLS 1.3]
        Storage[數據加密<br/>AES-256]
        Backup[定期備份<br/>Point-in-time Recovery]
    end

    subgraph "API 安全 (API Security)"
        APIKey[API Key 管理<br/>環境變數]
        Validation[輸入驗證<br/>Zod Schema]
        Sanitize[SQL Injection 防護<br/>Parameterized Queries]
    end

    CF_WAF --> Auth
    RateLimit --> Auth
    Auth --> RLS
    RLS --> Validation
    CORS --> Validation
    Validation --> Sanitize
    Sanitize --> Encrypt
    Encrypt --> Storage
    Storage --> Backup

    style CF_WAF fill:#f56565
    style Auth fill:#f56565
    style RLS fill:#f56565
    style Encrypt fill:#f56565
```

---

## 📝 部署流程

```mermaid
sequenceDiagram
    participant Dev as 開發者
    participant Git as GitHub
    participant CI as GitHub Actions
    participant Test as Testing Suite
    participant CF as Cloudflare
    participant SB as Supabase

    Dev->>Git: git push origin main
    Git->>CI: Trigger workflow
    CI->>CI: Install dependencies
    CI->>Test: Run tests
    Test-->>CI: Tests passed ✅
    CI->>CI: Build production
    CI->>CF: Deploy to Workers
    CF-->>CI: Deployment successful
    CI->>CF: Deploy to Pages
    CF-->>CI: Deployment successful
    CI->>SB: Run migrations
    SB-->>CI: Migrations applied
    CI->>Git: Update deployment status
    Git->>Dev: Deployment complete 🚀
```

---

## 🎯 監控與可觀測性

```mermaid
graph TB
    subgraph "Metrics 收集 (Metrics Collection)"
        App[Application Code]
        Collector[LLM Usage Collector SDK]
        Worker[obs-edge Worker]
    end

    subgraph "實時聚合 (Realtime Aggregation)"
        DO[Durable Objects<br/>時間窗口聚合]
        Buffer[緩衝隊列]
    end

    subgraph "數據存儲 (Data Storage)"
        Hot[(Hot Storage<br/>Supabase<br/>7天)]
        Cold[(Cold Storage<br/>R2<br/>長期)]
    end

    subgraph "可視化 (Visualization)"
        Dashboard[obs-dashboard<br/>即時圖表]
        Alert[告警系統<br/>Email/Slack]
    end

    App --> Collector
    Collector --> Worker
    Worker --> DO
    DO --> Buffer
    Buffer --> Hot
    Hot --> Cold
    Hot --> Dashboard
    Dashboard --> Alert

    style Worker fill:#38b2ac
    style Dashboard fill:#38b2ac
```

---

## 🎓 知識累積效果預期

```mermaid
graph LR
    subgraph "Week 1"
        W1_Q[品質: 70/100]
        W1_T[任務時間: 4h]
        W1_K[知識量: 0]
    end

    subgraph "Week 2"
        W2_Q[品質: 78/100]
        W2_T[任務時間: 3h]
        W2_K[知識量: 50]
    end

    subgraph "Week 3"
        W3_Q[品質: 85/100]
        W3_T[任務時間: 2h]
        W3_K[知識量: 150]
    end

    subgraph "Week 4"
        W4_Q[品質: 90/100]
        W4_T[任務時間: 1.5h]
        W4_K[知識量: 300]
    end

    W1_Q --> W2_Q
    W2_Q --> W3_Q
    W3_Q --> W4_Q

    W1_T --> W2_T
    W2_T --> W3_T
    W3_T --> W4_T

    W1_K --> W2_K
    W2_K --> W3_K
    W3_K --> W4_K

    style W4_Q fill:#48bb78
    style W4_T fill:#48bb78
    style W4_K fill:#48bb78
```

---

## 📋 總結

### 核心設計原則
1. **品質優先**: LLM 路由以品質與成本平衡為主，不犧牲代碼品質
2. **知識累積**: 所有開發知識即時記錄，投入 AI 自主訓練強化
3. **階段交付**: 小步快跑，每階段獨立驗證，品質分數 >= 85/100
4. **零衝突**: 與 Factory OS 完全隔離，獨立 Git Repo、數據庫、Worker
5. **自動化**: GitHub 定時備份，CI/CD 自動化部署，知識自動循環

### 交付時程
- **Phase 0**: Multi-LLM Router (2-3 天) ✅ **已完成**
- **Phase 1**: 知識循環基礎 (3-4 天)
- **Phase 2**: AI 訓練系統 (3-4 天)
- **Phase 3**: Observability 核心 (5-7 天)
- **總計**: 13-18 天

### 預期成果
- **零技術債**: 每階段清理技術債，維持高代碼品質
- **知識增長**: 4 週後 AI 品質提升至 90/100，開發效率提升 2.5 倍
- **成本控制**: LLM 成本 ~$216，基礎設施 $0/月
- **高可用性**: Edge Computing + 全球分發，P95 延遲 < 400ms

---

**文檔版本**: v1.0
**最後更新**: 2025-01-07
**維護者**: Claude Code + AI Agent Team
**審核狀態**: ⏳ 待審核

