# Claude Code Token 使用追蹤指南

## 問題

如何追蹤 Claude Code 本身使用的 token 量？是否需要用 API 串接才能獲取真正的使用量？

---

## 解決方案

### 🎯 推薦方案：Anthropic API 追蹤（最準確）

**答案：是的**，要獲取**真實且準確**的 token 使用量，必須通過 **Anthropic API** 進行串接。

#### 為什麼需要 API？
1. **Claude Code 不直接暴露 token 統計**
   - Claude Code 是 CLI 工具，主要關注開發體驗
   - 沒有內建的 token 計數器或使用統計

2. **Token 計算由 Anthropic 後端處理**
   - 實際的 token 計數在 Anthropic 的服務端
   - 只有通過 API 才能獲取準確數據

3. **估算不夠準確**
   - 前端估算（tiktoken）與實際計費可能有差異
   - Anthropic 使用自己的 tokenizer

---

## 🔧 實現方式

### 方案 1: Anthropic API Usage Tracking（推薦）

Anthropic 提供 API 可以查詢使用量統計。

#### Step 1: 獲取 API Key
從 Anthropic Console 獲取 API key:
https://console.anthropic.com/settings/keys

#### Step 2: 使用 Anthropic API 查詢使用量

**API Endpoint**:
```
GET https://api.anthropic.com/v1/usage
```

**範例代碼**:
```typescript
// apps/ai-agent-team/src/utils/claude-code-tracker.ts
import fetch from 'node-fetch';

interface AnthropicUsage {
  organization_id: string;
  billing_period: {
    start: string;
    end: string;
  };
  usage: {
    input_tokens: number;
    output_tokens: number;
    total_tokens: number;
    cost_usd: number;
  };
  models: Record<string, {
    input_tokens: number;
    output_tokens: number;
    requests: number;
  }>;
}

export async function getClaudeCodeUsage(
  apiKey: string,
  startDate?: string,
  endDate?: string
): Promise<AnthropicUsage> {
  const params = new URLSearchParams({
    ...(startDate && { start_date: startDate }),
    ...(endDate && { end_date: endDate }),
  });

  const response = await fetch(
    `https://api.anthropic.com/v1/usage?${params}`,
    {
      headers: {
        'x-api-key': apiKey,
        'anthropic-version': '2023-06-01',
      },
    }
  );

  if (!response.ok) {
    throw new Error(`Failed to fetch usage: ${response.statusText}`);
  }

  return response.json();
}

// 上報到 Genesis Observability
export async function trackClaudeCodeUsage() {
  const usage = await getClaudeCodeUsage(
    process.env.ANTHROPIC_API_KEY!,
    new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(), // Last 24h
    new Date().toISOString()
  );

  await fetch(`${process.env.OBSERVABILITY_API_URL}/ingest`, {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OBSERVABILITY_API_KEY}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      project_id: 'GAC_FactoryOS_ClaudeCode',
      model: 'claude-sonnet-4-5', // Claude Code 使用的模型
      provider: 'anthropic',
      input_tokens: usage.usage.input_tokens,
      output_tokens: usage.usage.output_tokens,
      cost_usd: usage.usage.cost_usd,
      metadata: {
        source: 'claude_code',
        organization: usage.organization_id,
        billing_period: usage.billing_period,
      },
    }),
  });
}
```

#### Step 3: 定期執行追蹤

**Cron Job 方式**:
```bash
# 每天凌晨 2 點執行
0 2 * * * cd /path/to/GAC_FactroyOS && npx tsx scripts/track-claude-code-usage.ts
```

**或使用 Cloudflare Workers Cron**:
```toml
# wrangler.toml
[[triggers.crons]]
name = "claude-code-usage-tracker"
cron = "0 2 * * *"
```

---

### 方案 2: 從 Claude Code 輸出解析（估算）

如果無法直接訪問 Anthropic API，可以嘗試從 Claude Code 的輸出解析 token 使用。

**限制**:
- ❌ 不一定準確（估算值）
- ❌ Claude Code 可能不輸出詳細 token 統計
- ❌ 需要手動解析日誌

**實現**:
```typescript
// 假設 Claude Code 在輸出中包含 token 統計（實際可能沒有）
function parseClaudeCodeOutput(output: string): { input: number; output: number } | null {
  // 嘗試匹配 token 統計
  const match = output.match(/Token usage: (\d+) input, (\d+) output/);
  if (match) {
    return {
      input: parseInt(match[1]),
      output: parseInt(match[2]),
    };
  }
  return null;
}
```

---

### 方案 3: 使用 tiktoken 估算（不推薦）

使用 OpenAI 的 tiktoken 庫估算 token 數量。

**限制**:
- ❌ **不準確**：Anthropic 使用自己的 tokenizer，與 OpenAI 不同
- ❌ 僅適合粗略估算，不適合計費

**實現**:
```typescript
import { encoding_for_model } from 'tiktoken';

function estimateTokens(text: string, model: string = 'gpt-4'): number {
  const enc = encoding_for_model(model);
  const tokens = enc.encode(text);
  enc.free();
  return tokens.length;
}

// 估算對話 token 使用
const userMessage = "你的提示詞";
const assistantResponse = "Claude 的回應";

const inputTokens = estimateTokens(userMessage);
const outputTokens = estimateTokens(assistantResponse);

console.log(`估算使用：${inputTokens} 輸入 tokens, ${outputTokens} 輸出 tokens`);
```

---

## 📊 整合到 Genesis Observability

### 創建專用 Project ID

為 Claude Code 使用創建獨立的追蹤項目：

```typescript
// 追蹤 Claude Code 使用
project_id: "GAC_FactoryOS_ClaudeCode"

// 或者作為 metadata 區分
project_id: "GAC_FactoryOS"
metadata: {
  source: "claude_code"  // vs "llm_router" for agent calls
}
```

### Dashboard 顯示

在 Dashboard 中添加 Claude Code 使用統計：

```
┌─────────────────────────────────────────────────────┐
│  LLM 使用總覽                                        │
├─────────────────────┬───────────────────────────────┤
│  AI Agents          │  Claude Code (開發工具)        │
│  Token: 50,000      │  Token: 150,000               │
│  成本: $5.00        │  成本: $15.00                 │
│  請求: 100          │  對話: 20                     │
└─────────────────────┴───────────────────────────────┘
```

---

## 🎯 推薦實施步驟

### Step 1: 設置 Anthropic API 追蹤
1. 獲取 Anthropic API Key
2. 實現 `claude-code-tracker.ts` 工具
3. 測試 API 連接與數據獲取

### Step 2: 創建定期追蹤任務
1. 每天自動調用 Anthropic API
2. 上報數據到 Genesis Observability
3. 驗證數據正確性

### Step 3: Dashboard 整合
1. 在 Dashboard 添加 "Claude Code Usage" 區域
2. 顯示開發工具 vs AI Agents 的對比
3. 分析成本趨勢

### Step 4: 告警與預算控制
1. 設置每日/每月使用限額
2. 超過閾值時發送告警
3. 提供成本優化建議

---

## 💡 成本控制建議

### 1. 分離追蹤
- **AI Agents**: 生產環境使用，關鍵指標
- **Claude Code**: 開發工具使用，可選追蹤

### 2. 優化使用
- 減少不必要的長對話
- 使用較小模型處理簡單任務
- 設置 context 長度限制

### 3. 預算分配
```
總預算: $100/月
- AI Agents (生產): $70/月 (70%)
- Claude Code (開發): $30/月 (30%)
```

---

## 📋 完整範例

### 自動追蹤腳本

```typescript
// scripts/track-claude-code-usage.ts
import { getClaudeCodeUsage } from '../src/utils/claude-code-tracker';
import { obsEdgeClient } from '@gac/genesis-observability';

async function main() {
  console.log('📊 正在獲取 Claude Code 使用量...');

  try {
    // 1. 從 Anthropic API 獲取使用量
    const usage = await getClaudeCodeUsage(
      process.env.ANTHROPIC_API_KEY!,
      new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString(),
      new Date().toISOString()
    );

    console.log(`✅ Token 使用: ${usage.usage.total_tokens.toLocaleString()}`);
    console.log(`💰 成本: $${usage.usage.cost_usd.toFixed(4)}`);

    // 2. 上報到 Genesis Observability
    await obsEdgeClient.ingestUsage({
      project_id: 'GAC_FactoryOS_ClaudeCode',
      model: 'claude-sonnet-4-5',
      provider: 'anthropic',
      input_tokens: usage.usage.input_tokens,
      output_tokens: usage.usage.output_tokens,
      cost_usd: usage.usage.cost_usd,
      metadata: {
        source: 'claude_code',
        date: new Date().toISOString(),
      },
    });

    console.log('✅ 數據已上報到 Genesis Observability');
  } catch (error) {
    console.error('❌ 追蹤失敗:', error);
    process.exit(1);
  }
}

main();
```

### 執行追蹤

```bash
# 手動執行
npx tsx scripts/track-claude-code-usage.ts

# 或添加到 package.json
npm run track:claude-code
```

---

## 🔍 常見問題

### Q1: Anthropic API 是否免費？
A: Anthropic API 本身不收費，但查詢使用量統計是免費的。只有實際調用 Claude 模型才計費。

### Q2: 多久查詢一次使用量？
A: 建議每天查詢一次（如凌晨 2 點），避免過於頻繁請求。

### Q3: 如何區分 Claude Code vs AI Agents？
A: 通過不同的 `project_id` 或 `metadata.source` 區分：
- `GAC_FactoryOS`: AI Agents 使用
- `GAC_FactoryOS_ClaudeCode`: Claude Code 使用

### Q4: 如果沒有 Anthropic API key 怎麼辦？
A: 可以使用估算方式（方案 2、3），但精確度較低，不適合精準計費。

---

## 📚 相關資源

- **Anthropic API 文檔**: https://docs.anthropic.com/claude/reference/
- **Anthropic Console**: https://console.anthropic.com/
- **tiktoken 庫**: https://github.com/openai/tiktoken
- **Genesis Observability**: 本專案

---

**結論**: 要準確追蹤 Claude Code 的 token 使用，**必須通過 Anthropic API** 串接。這是唯一獲取真實計費數據的方式。

**實施優先級**:
1. ✅ 高優先級：AI Agents token 追蹤（已完成）
2. 🔄 中優先級：Claude Code token 追蹤（本文檔）
3. ⏳ 低優先級：其他工具（VSCode extensions, etc.）

---

**作者**: Claude Code
**日期**: 2025-10-07
**版本**: 1.0
