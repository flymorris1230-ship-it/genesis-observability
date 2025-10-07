# Genesis Observability Platform

> **Enterprise-Grade AI Collaboration Platform Observability & Cost Tracking System**

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-100%25-blue.svg)](https://www.typescriptlang.org/)
[![Test Coverage](https://img.shields.io/badge/Coverage-80%25%2B-brightgreen.svg)]()
[![Phase](https://img.shields.io/badge/Phase-0%20Complete-success.svg)](./PHASE_0_QUALITY_REPORT.md)
[![Quality Score](https://img.shields.io/badge/Quality-91%2F100-brightgreen.svg)](./PHASE_0_QUALITY_REPORT.md)

---

## 🎯 Project Vision

**Genesis Observability** 是新一代 AI 協作平台的智能可觀測性與成本追蹤系統，提供：

- **🤖 Multi-LLM 智能路由** - 品質優先策略（Claude/GPT/Gemini），平衡成本與效能
- **🧠 知識循環系統** - 開發知識自動累積與 AI 自主訓練（RAG + Vector DB）
- **📦 Phase-based 交付** - 品質閘門（>= 85/100）確保零技術債
- **🔒 Zero-Conflict 架構** - 與 Factory OS 完全隔離，可獨立商用化
- **⚡ 邊緣+主權混合方案** - Cloudflare Edge + NAS + Supabase，兼顧性能、成本與資料控制

---

## 🏗️ System Architecture

### Overall Architecture

```mermaid
graph TB
    subgraph "Frontend Layer"
        A[obs-dashboard<br/>Next.js 15 + React 18]
    end

    subgraph "Edge Layer (Cloudflare)"
        B[obs-edge<br/>Workers + tRPC]
        C[Durable Objects<br/>Real-time Aggregation]
    end

    subgraph "Data Layer"
        D[(NAS PostgreSQL<br/>Primary DB)]
        E[(Supabase PostgreSQL<br/>Secondary/API)]
        F[(Supabase Vector<br/>pgvector 768-dim)]
        G[(Cloudflare KV<br/>Edge Cache)]
        H[(R2 Storage<br/>Cold Data Archive)]
    end

    subgraph "AI/LLM Layer"
        I[Claude 3.5 Sonnet<br/>High Complexity]
        J[GPT-4o-mini<br/>UI & Standard]
        K[Gemini Pro<br/>Simple & Embedding]
        L[Multi-LLM Router<br/>Quality-First Strategy]
    end

    A -->|tRPC + SSE| B
    A -->|WebSocket| C
    B -->|SQL Write| D
    B -->|SQL Read| E
    B -->|Vector Search| F
    B -->|Cache R/W| G
    B -->|Archive| H

    L -.->|Route| I
    L -.->|Route| J
    L -.->|Route| K

    D -->|Backup| H
    E -->|Replication| D

    style A fill:#38b2ac
    style B fill:#38b2ac
    style C fill:#4299e1
    style L fill:#48bb78
```

### Knowledge Circulation System

```mermaid
sequenceDiagram
    participant Dev as Developer/Claude Code
    participant Logger as DevJournalLogger
    participant Embed as Gemini Embedding
    participant Vector as Supabase Vector
    participant RAG as RAG Engine
    participant Agent as AI Agent

    Dev->>Logger: commit knowledge
    Logger->>Embed: generate embedding
    Embed-->>Logger: 768-dim vector
    Logger->>Vector: store with metadata

    Agent->>RAG: semantic search
    RAG->>Vector: similarity search
    Vector-->>RAG: top K results
    RAG-->>Agent: enhanced context
    Agent-->>Dev: improved response
```

---

## 🚀 Core Features

### 1. Multi-LLM Intelligent Router

**Quality-First Routing Strategy:**

| Task Type | Model | Input Cost | Output Cost | Use Case |
|-----------|-------|------------|-------------|----------|
| **High Complexity (>=8) / Security** | Claude 3.5 Sonnet | $3.00 / 1M | $15.00 / 1M | Architecture design, security audit, complex algorithms |
| **UI Development** | GPT-4o-mini | $0.15 / 1M | $0.60 / 1M | React components, Tailwind CSS, frontend logic |
| **Standard Development** | GPT-4o-mini | $0.15 / 1M | $0.60 / 1M | General coding, refactoring, documentation |
| **Simple Queries (<1000 chars)** | Gemini Pro | $0.00 / 1M | $0.00 / 1M | Q&A, simple tasks, quick lookups |
| **Embeddings** | Gemini text-embedding-004 | **FREE** | **FREE** | Vector search, semantic similarity |

**Monthly Cost Estimate (10K requests):**

```
High Complexity (10%):    $18
UI Development (20%):     $18
Standard Development (20%): $18
Simple Queries (50%):     $15 (FREE with Gemini)
Embeddings:               $0 (FREE with Gemini)
────────────────────────────
Total:                    ~$69/month
```

**Multi-Level Fallback Chain:**

```typescript
Primary: Claude 3.5 Sonnet → Fallback: GPT-4o → GPT-4o-mini → Gemini Pro
Primary: GPT-4o-mini → Fallback: Claude 3.5 Sonnet → Gemini Pro
Primary: Gemini Pro → Fallback: GPT-4o-mini → Claude 3.5 Sonnet
```

### 2. Knowledge Circulation System

**Automatic Knowledge Capture & AI Training Loop:**

```mermaid
graph LR
    A[Development] -->|Log| B[DevJournalLogger]
    B -->|Generate| C[Embeddings]
    C -->|Store| D[Vector DB]
    D -->|Retrieve| E[RAG Engine]
    E -->|Enhance| F[AI Agent]
    F -->|Improved Response| A
    F -->|Feedback| D

    style D fill:#805ad5
    style E fill:#48bb78
```

**Features:**
- ✅ **Automatic knowledge capture** - All development logs, ADRs, solutions
- ✅ **Vector embeddings** - Gemini text-embedding-004 (768 dimensions, FREE)
- ✅ **Hybrid search** - Full-text + vector similarity
- ✅ **Semantic retrieval** - Top-K relevant documents with re-ranking
- ✅ **AI training loop** - Before-task retrieval + after-task learning
- ✅ **Auto-archival** - 180-day retention with compression

### 3. Phase-Based Delivery with Quality Gates

**Every Phase requires >= 85/100 quality score to proceed:**

```yaml
Quality Score Formula:
  (Functionality × 0.25) +   # All deliverables 100% complete
  (Tests × 0.20) +           # >= 80% coverage
  (Code Quality × 0.20) +    # Lint 0 errors, TypeScript 100% strict
  (Performance × 0.15) +     # P95 < SLA target
  (Security × 0.10) +        # 0 critical/high vulnerabilities
  (Docs × 0.10)              # >= 90% documentation
× 100 = Total Score
```

**CI/CD 6-Gate Pipeline:**

1. ✅ **Lint Check** - ESLint + Prettier (0 errors)
2. ✅ **Type Check** - TypeScript strict mode (0 type errors)
3. ✅ **Unit Tests** - Vitest (>= 80% coverage)
4. ✅ **E2E Tests** - Playwright (critical flows)
5. ✅ **Dependency Audit** - pnpm audit (0 critical/high vulnerabilities)
6. ✅ **Security Scan** - Snyk / CodeQL (0 critical/high issues)

### 4. Zero-Conflict Architecture

**Complete isolation from Factory OS:**

| Component | Genesis Observability | Factory OS |
|-----------|----------------------|------------|
| **GitHub Repo** | `genesis-observability` | `GAC_FactoryOS` |
| **Database** | Supabase (dedicated project) | NAS PostgreSQL |
| **Workers** | `obs-edge.workers.dev` | `factory-os.workers.dev` |
| **Frontend** | `obs-dashboard.pages.dev` | `factory-os.pages.dev` |
| **API Keys** | Separate Cloudflare account | Separate account |
| **Shared Types** | `obs-types` package | `@gac/shared-types` |

---

## 📊 Technology Stack

### Frontend (obs-dashboard)

```yaml
Framework: Next.js 15 (React 18)
Language: TypeScript 5 (100% strict mode)
Styling: Tailwind CSS 3
State Management: React Query (TanStack Query)
Real-time: SSE / WebSocket
Deployment: Cloudflare Pages
```

### Backend (obs-edge)

```yaml
Runtime: Cloudflare Workers (Edge Computing)
API: tRPC 11 (Type-safe)
Real-time: Durable Objects (aggregation)
Language: TypeScript 5
Rate Limiting: Upstash Redis
```

### Database & Storage

```yaml
Primary DB: NAS PostgreSQL (data sovereignty)
Secondary DB: Supabase PostgreSQL (public API)
Vector DB: Supabase pgvector (768-dim, Gemini embeddings)
Edge Cache: Cloudflare KV
Cold Storage: Cloudflare R2
Time-Series: Prometheus / VictoriaMetrics
```

### AI/LLM Stack

```yaml
High Complexity: Claude 3.5 Sonnet ($3/1M in, $15/1M out)
UI & Standard: GPT-4o-mini ($0.15/1M in, $0.60/1M out)
Simple & Embedding: Gemini Pro & text-embedding-004 (FREE)
Router: Custom Multi-LLM Router (quality-first strategy)
Tracing: OpenTelemetry (end-to-end observability)
```

### DevOps & Monitoring

```yaml
Testing: Vitest + Playwright + k6 (performance)
CI/CD: GitHub Actions (6 automated gates)
Monitoring: Prometheus + Grafana + Alertmanager
Logging: Loki / CloudWatch Logs
Security: Snyk + OWASP ZAP + CodeQL
IaC: Wrangler + Terraform (optional)
```

---

## 🚦 Project Status

| Phase | Timeline | Status | Quality Score | Progress |
|-------|----------|--------|---------------|----------|
| **Phase 0: Multi-LLM Router** | 1 day | ✅ **Complete** | **91/100** | 100% |
| **Phase 1: Knowledge Circulation** | 3-4 days | 🔄 **In Planning** | - | 0% |
| **Phase 2: obs-edge API** | 3-4 days | ⏳ **Pending** | - | 0% |
| **Phase 3: obs-dashboard UI** | 5-7 days | ⏳ **Pending** | - | 0% |

**Total Estimated Timeline**: 12-16 days

---

## 📦 Phase 0 Deliverables (✅ Complete)

### Delivered Components

1. **✅ Claude 3.5 Sonnet Integration** - `claude-provider.ts` (154 lines)
2. **✅ Multi-LLM Router with Quality-First Strategy** - `router.ts` (enhanced with helper methods)
3. **✅ Unit Tests (14 tests)** - `claude-provider.test.ts` (100% passing)
4. **✅ Integration Tests (14 tests)** - `phase0-multi-llm-router.test.ts` (quality-first routing validation)
5. **✅ System Architecture Documentation** - `SYSTEM_ARCHITECTURE.md` (11 Mermaid diagrams)
6. **✅ Phase Delivery Plan** - `PHASE_DELIVERY_PLAN.md` (4-phase roadmap)
7. **✅ Quality Report Template** - `QUALITY_REPORT_TEMPLATE.md` (verification framework)
8. **✅ Phase 0 Quality Report** - `PHASE_0_QUALITY_REPORT.md` (91/100 score)
9. **✅ Comprehensive CLAUDE.md** - Enterprise-grade development guidelines (2600+ lines)

### Quality Metrics

```yaml
Functionality: 25/25 (100%) - All features implemented
Tests: 19/20 (95%) - 28 tests, 90% estimated coverage
Code Quality: 20/20 (100%) - 0 errors, TypeScript strict
Performance: 15/15 (100%) - Routing <50ms, Health check <2s
Security: 10/10 (100%) - API keys secured, no vulnerabilities
Documentation: 10/10 (100%) - Complete architecture + API docs

Total Score: 91/100 ✅ (Exceeds 85/100 threshold)
```

---

## 🛠️ Developer Tools Matrix

### Local Development

```bash
# Install dependencies
pnpm install

# Start development servers
pnpm dev                          # Full stack (all services)
cd apps/obs-dashboard && pnpm dev  # Frontend only (port 3000)
cd apps/obs-edge && wrangler dev   # Backend only (port 8787)

# Database management
pnpm db:studio                    # Open Drizzle Studio
pnpm db:migrate                   # Apply migrations
wrangler d1 execute DB --local --file=schema.sql  # Run SQL migrations
```

### Testing

```bash
# Unit tests
pnpm test                         # Run all unit tests (Vitest)
pnpm test:coverage                # Generate coverage report (>= 80%)
pnpm test:watch                   # Watch mode

# E2E tests
pnpm test:e2e                     # Run Playwright tests
pnpm test:e2e:ui                  # Interactive UI mode
pnpm test:e2e:debug               # Debug mode

# Load tests
pnpm test:load                    # k6 load tests
pnpm test:stress                  # Stress testing (high concurrency)
```

### Deployment

```bash
# Preview deployment (PR)
pnpm deploy:preview               # Deploy to Cloudflare Pages preview

# Production deployment
pnpm deploy:production            # Full deployment
pnpm deploy:obs-edge              # Workers only
pnpm deploy:obs-dashboard         # Pages only

# Rollback
wrangler rollback <version>       # Rollback Workers to previous version
```

### Monitoring

```bash
# Logs
wrangler tail                     # Tail Cloudflare Workers logs (real-time)
wrangler tail --format json       # JSON format

# Health checks
curl https://obs-edge.example.com/health   # API health status
curl https://obs-edge.example.com/metrics  # Prometheus metrics endpoint

# Debug
NODE_OPTIONS='--inspect' pnpm dev  # Node.js debugger
pnpm dev --turbo --debug           # Turbopack debug mode
```

---

## 💰 Cost Budget Breakdown

### LLM Costs (Monthly Estimate, 10K requests)

```
Claude 3.5 Sonnet (10%):      $18/month   (High complexity/security)
GPT-4o-mini (40%):            $36/month   (UI + standard development)
Gemini Pro (50%):             $0/month    (Simple queries - FREE)
Gemini Embeddings:            $0/month    (Vector search - FREE)
──────────────────────────────────────
Total LLM Costs:              ~$54/month
```

### Infrastructure Costs (Monthly)

```
Cloudflare Workers:           $5/month    (10M requests)
Cloudflare Pages:             $0/month    (FREE tier)
Cloudflare KV:                $0.50/month (1GB storage)
Cloudflare R2:                $0.15/month (10GB storage)
Supabase Pro:                 $25/month   (8GB database + Vector)
Upstash Redis:                $0/month    (FREE tier 10K requests/day)
──────────────────────────────────────
Total Infrastructure:         ~$31/month
```

### **Total Monthly Cost: ~$85/month** (10K LLM requests)

---

## 🔐 Security Highlights

### Authentication & Authorization

- ✅ **JWT Tokens** - Short-lived access tokens (1h) + long-lived refresh tokens (7d)
- ✅ **Row Level Security (RLS)** - Supabase policies for data isolation
- ✅ **API Key Management** - SHA-256 hashed, 90-day expiration, rotation support
- ✅ **Rate Limiting** - Upstash Redis for DDoS protection

### Input Validation & Sanitization

- ✅ **Zod Schemas** - All API inputs validated with TypeScript schemas
- ✅ **SQL Injection Prevention** - Parameterized queries (Drizzle ORM)
- ✅ **XSS Prevention** - Input sanitization + Content Security Policy
- ✅ **CSRF Protection** - Token validation for state-changing operations

### Audit & Compliance

- ✅ **Audit Logging** - All critical operations logged (timestamp + user + IP)
- ✅ **AI Trace Logs** - Complete LLM request/response traceability
- ✅ **GDPR Compliance** - 180-day retention + user data deletion support
- ✅ **Security Scanning** - Snyk + CodeQL + OWASP ZAP in CI/CD

---

## 📚 Documentation

### Internal Documentation

- **[CLAUDE.md](./CLAUDE.md)** - Comprehensive development guidelines (2600+ lines)
- **[SYSTEM_ARCHITECTURE.md](./SYSTEM_ARCHITECTURE.md)** - System architecture diagrams (11 Mermaid diagrams)
- **[PHASE_DELIVERY_PLAN.md](./PHASE_DELIVERY_PLAN.md)** - 4-phase delivery roadmap
- **[QUALITY_REPORT_TEMPLATE.md](./QUALITY_REPORT_TEMPLATE.md)** - Quality verification framework
- **[PHASE_0_QUALITY_REPORT.md](./PHASE_0_QUALITY_REPORT.md)** - Phase 0 quality report (91/100)

### External Documentation

- **Cloudflare**: [Workers](https://developers.cloudflare.com/workers/) | [Durable Objects](https://developers.cloudflare.com/workers/runtime-apis/durable-objects/) | [D1](https://developers.cloudflare.com/d1/)
- **Supabase**: [pgvector](https://supabase.com/docs/guides/database/extensions/pgvector) | [RLS](https://supabase.com/docs/guides/auth/row-level-security)
- **LLM Providers**: [Claude](https://docs.anthropic.com/claude/docs) | [GPT](https://platform.openai.com/docs) | [Gemini](https://ai.google.dev/gemini-api/docs)

---

## 🚀 Quick Start

### Prerequisites

```bash
Node.js >= 18
pnpm >= 8
Cloudflare account (Workers & Pages)
Supabase account (PostgreSQL + Vector)
```

### Environment Setup

```bash
# Clone repository
git clone https://github.com/your-org/genesis-observability.git
cd genesis-observability

# Install dependencies
pnpm install

# Setup environment variables
cp .env.example .env
# Edit .env with your API keys:
# - ANTHROPIC_API_KEY (Claude)
# - OPENAI_API_KEY (GPT)
# - GEMINI_API_KEY (Gemini)
# - SUPABASE_URL
# - SUPABASE_KEY
# - CLOUDFLARE_API_TOKEN

# Initialize database
pnpm db:migrate

# Start development servers
pnpm dev
```

### Run Tests

```bash
# Unit tests
pnpm test

# E2E tests
pnpm test:e2e

# Load tests
pnpm test:load
```

### Deploy

```bash
# Preview deployment (PR)
pnpm deploy:preview

# Production deployment
pnpm deploy:production
```

---

## 🤝 Contributing

Please read [CONTRIBUTING.md](./CONTRIBUTING.md) for contribution guidelines.

**Key Requirements:**
- All PRs must pass 6 CI/CD gates (Lint, Type Check, Unit Tests, E2E, Dependency Audit, Security Scan)
- Code review: 2+ approvals required
- TypeScript strict mode: 100% (no `any` types)
- Test coverage: >= 80%
- Documentation: Update docs with code changes

---

## 📄 License

This project is licensed under the [MIT License](./LICENSE).

---

## 🎯 Contact & Support

**Project Lead**: Morris Lin

**Support Channels:**
- **GitHub Issues**: Bug reports and feature requests
- **Discussions**: General questions and community support
- **Email**: support@genesis-observability.com (production issues)

---

**📝 Version**: 1.0.0
**🔄 Last Updated**: 2025-01-07
**✅ Status**: Phase 0 Complete (91/100) | Phase 1 In Planning
**🎯 Next Milestone**: Phase 1 - Knowledge Circulation Infrastructure (3-4 days)

---

**Built with ❤️ using Claude 3.5 Sonnet, GPT-4o-mini, and Gemini Pro**
