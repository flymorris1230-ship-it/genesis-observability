# 🚀 Genesis Observability - 使用指南

**完整的使用教學，讓您立即開始追蹤 LLM 使用量與成本**

---

## 📊 系統資訊

您的 Genesis Observability 系統已完全部署並可使用：

| 組件 | URL |
|------|-----|
| **Worker API** | https://obs-edge.flymorris1230.workers.dev |
| **Dashboard** | https://genesis-observability-obs-dashboard.vercel.app |
| **API KEY** | `a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e` |

---

## 🎯 3 步驟開始使用

### 步驟 1: 整合到您的 LLM 應用

在每次調用 LLM 後，發送使用數據到 observability 系統。

### 步驟 2: 查看 Dashboard

前往 Dashboard 查看即時數據視覺化、成本分析、趨勢圖表。

### 步驟 3: 使用 API 查詢

使用 API 程式化查詢 metrics 和 costs 數據。

---

## 💻 整合範例

### Node.js / TypeScript

#### 基本整合

```typescript
import fetch from 'node-fetch';

async function sendToObservability(data: {
  project_id: string;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  latency_ms?: number;
  metadata?: Record<string, any>;
}) {
  const response = await fetch('https://obs-edge.flymorris1230.workers.dev/ingest', {
    method: 'POST',
    headers: {
      'Authorization': 'Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e',
      'Content-Type': 'application/json'
    },
    body: JSON.stringify(data)
  });

  if (!response.ok) {
    console.error('Failed to send observability data:', await response.text());
  }

  return response.json();
}
```

#### OpenAI 整合

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function chat(prompt: string) {
  const startTime = performance.now();

  // 調用 OpenAI
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [{ role: 'user', content: prompt }]
  });

  // 發送到 observability（非阻塞）
  sendToObservability({
    project_id: 'my-app',  // 改成您的專案名稱
    model: response.model,
    provider: 'openai',
    input_tokens: response.usage!.prompt_tokens,
    output_tokens: response.usage!.completion_tokens,
    latency_ms: Math.round(performance.now() - startTime),
    metadata: {
      feature: 'chat',
      user_id: 'user-123'
    }
  }).catch(console.error);

  return response.choices[0].message.content;
}

// 使用範例
chat('Hello, how are you?').then(console.log);
```

#### Claude 整合

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function chat(prompt: string) {
  const startTime = performance.now();

  const response = await anthropic.messages.create({
    model: 'claude-3-sonnet-20240229',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }]
  });

  // 發送到 observability
  sendToObservability({
    project_id: 'my-app',
    model: 'claude-3-sonnet',
    provider: 'anthropic',
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
    latency_ms: Math.round(performance.now() - startTime)
  }).catch(console.error);

  return response.content[0].text;
}
```

#### Google Gemini 整合

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function chat(prompt: string) {
  const startTime = performance.now();

  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  const result = await model.generateContent(prompt);
  const response = await result.response;

  // Gemini 免費版不提供確切 token 數，需要估算
  const inputTokens = Math.ceil(prompt.length / 4);
  const outputTokens = Math.ceil(response.text().length / 4);

  sendToObservability({
    project_id: 'my-app',
    model: 'gemini-pro',
    provider: 'google',
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    latency_ms: Math.round(performance.now() - startTime)
  }).catch(console.error);

  return response.text();
}
```

---

### Python

#### 基本整合

```python
import requests
import time
from typing import Dict, Any, Optional

def send_to_observability(
    project_id: str,
    model: str,
    provider: str,
    input_tokens: int,
    output_tokens: int,
    latency_ms: Optional[int] = None,
    metadata: Optional[Dict[str, Any]] = None
):
    response = requests.post(
        'https://obs-edge.flymorris1230.workers.dev/ingest',
        headers={
            'Authorization': 'Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e',
            'Content-Type': 'application/json'
        },
        json={
            'project_id': project_id,
            'model': model,
            'provider': provider,
            'input_tokens': input_tokens,
            'output_tokens': output_tokens,
            'latency_ms': latency_ms,
            'metadata': metadata or {}
        }
    )

    if not response.ok:
        print(f'Failed to send observability data: {response.text}')

    return response.json()
```

#### OpenAI 整合

```python
import openai
import os

openai.api_key = os.getenv('OPENAI_API_KEY')

def chat(prompt: str) -> str:
    start_time = time.time()

    response = openai.ChatCompletion.create(
        model='gpt-4-turbo',
        messages=[{'role': 'user', 'content': prompt}]
    )

    latency = int((time.time() - start_time) * 1000)

    # 發送到 observability
    send_to_observability(
        project_id='my-app',
        model=response.model,
        provider='openai',
        input_tokens=response.usage.prompt_tokens,
        output_tokens=response.usage.completion_tokens,
        latency_ms=latency,
        metadata={
            'feature': 'chat',
            'user_id': 'user-123'
        }
    )

    return response.choices[0].message.content

# 使用範例
result = chat('Hello, how are you?')
print(result)
```

#### Claude 整合

```python
import anthropic

client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))

def chat(prompt: str) -> str:
    start_time = time.time()

    message = client.messages.create(
        model='claude-3-sonnet-20240229',
        max_tokens=1024,
        messages=[{'role': 'user', 'content': prompt}]
    )

    send_to_observability(
        project_id='my-app',
        model='claude-3-sonnet',
        provider='anthropic',
        input_tokens=message.usage.input_tokens,
        output_tokens=message.usage.output_tokens,
        latency_ms=int((time.time() - start_time) * 1000)
    )

    return message.content[0].text
```

---

### Go

```go
package main

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "time"
)

type ObservabilityData struct {
    ProjectID    string                 `json:"project_id"`
    Model        string                 `json:"model"`
    Provider     string                 `json:"provider"`
    InputTokens  int                    `json:"input_tokens"`
    OutputTokens int                    `json:"output_tokens"`
    LatencyMs    int                    `json:"latency_ms,omitempty"`
    Metadata     map[string]interface{} `json:"metadata,omitempty"`
}

func SendToObservability(data ObservabilityData) error {
    jsonData, err := json.Marshal(data)
    if err != nil {
        return err
    }

    req, err := http.NewRequest("POST",
        "https://obs-edge.flymorris1230.workers.dev/ingest",
        bytes.NewBuffer(jsonData))
    if err != nil {
        return err
    }

    req.Header.Set("Authorization", "Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e")
    req.Header.Set("Content-Type", "application/json")

    client := &http.Client{Timeout: 10 * time.Second}
    resp, err := client.Do(req)
    if err != nil {
        return err
    }
    defer resp.Body.Close()

    if resp.StatusCode >= 400 {
        return fmt.Errorf("observability API error: %d", resp.StatusCode)
    }

    return nil
}

// 使用範例
func main() {
    err := SendToObservability(ObservabilityData{
        ProjectID:    "my-app",
        Model:        "gpt-4",
        Provider:     "openai",
        InputTokens:  1000,
        OutputTokens: 500,
        LatencyMs:    1200,
    })

    if err != nil {
        fmt.Println("Error:", err)
    }
}
```

---

## 📊 查看數據

### 方法 1: Dashboard（推薦）

前往：https://genesis-observability-obs-dashboard.vercel.app

功能：
- 📈 **即時圖表** - Tokens 使用量、延遲趨勢
- 💰 **成本分析** - 按 model、provider 分組
- 🔍 **篩選器** - 按 project、時間範圍
- 📊 **彙總數據** - 總請求數、總成本、平均延遲

### 方法 2: API 查詢

#### 查詢 Metrics

```bash
curl "https://obs-edge.flymorris1230.workers.dev/metrics?project_id=my-app&start_date=2025-01-01&end_date=2025-12-31" \
  -H "Authorization: Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e"
```

**回應範例**：
```json
{
  "project_id": "my-app",
  "metrics": {
    "totalRequests": 150,
    "totalTokens": 225000,
    "totalCost": 6.75,
    "avgLatency": 1150,
    "modelBreakdown": {
      "gpt-4-turbo": {
        "count": 100,
        "tokens": 150000,
        "cost": 4.5
      },
      "claude-3-sonnet": {
        "count": 50,
        "tokens": 75000,
        "cost": 2.25
      }
    }
  }
}
```

#### 查詢 Costs

```bash
curl "https://obs-edge.flymorris1230.workers.dev/costs?project_id=my-app&start_date=2025-01-01&end_date=2025-12-31" \
  -H "Authorization: Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e"
```

**回應範例**：
```json
{
  "project_id": "my-app",
  "summary": {
    "totalCost": 6.75,
    "dailyCosts": [
      {"date": "2025-10-07", "cost": 0.45},
      {"date": "2025-10-06", "cost": 0.38}
    ],
    "providerCosts": [
      {"provider": "openai", "cost": 4.5},
      {"provider": "anthropic", "cost": 2.25}
    ]
  }
}
```

---

## 🧪 測試

### 快速測試

```bash
# 發送測試數據
curl -X POST https://obs-edge.flymorris1230.workers.dev/ingest \
  -H "Authorization: Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "test",
    "model": "gpt-4",
    "provider": "openai",
    "input_tokens": 1000,
    "output_tokens": 500,
    "latency_ms": 1200
  }'

# 查詢數據
curl "https://obs-edge.flymorris1230.workers.dev/metrics?project_id=test" \
  -H "Authorization: Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e"
```

### 運行完整測試

```bash
cd /path/to/genesis-observability
./scripts/test-e2e.sh
```

---

## 💡 最佳實踐

### 1. 使用有意義的 project_id

```typescript
// ❌ 不好
project_id: 'app'

// ✅ 好
project_id: 'my-chatbot-prod'
project_id: 'customer-support-staging'
```

### 2. 添加有用的 metadata

```typescript
metadata: {
  user_id: 'user-123',
  user_tier: 'premium',
  feature: 'chat',
  conversation_id: 'conv-456',
  environment: 'production',
  version: '1.2.0'
}
```

### 3. 非阻塞調用

```typescript
// ✅ 使用 .catch() 避免影響主流程
sendToObservability(data).catch(console.error);

// ✅ 或使用 Promise.race 加上 timeout
Promise.race([
  sendToObservability(data),
  new Promise((_, reject) => setTimeout(() => reject(new Error('Timeout')), 5000))
]).catch(err => console.error('Observability error:', err));
```

### 4. 區分環境

```typescript
const project_id = process.env.NODE_ENV === 'production'
  ? 'my-app-prod'
  : 'my-app-dev';
```

---

## 📚 相關文檔

- **INTEGRATION_GUIDE.md** - 詳細整合指南（所有語言與框架）
- **DEPLOYMENT_SUCCESS.md** - 部署資訊與系統狀態
- **QUICK_START.md** - 快速開始指南
- **README.md** - 專案總覽

---

## 🆘 常見問題

### Q: 如何追蹤多個專案？

A: 使用不同的 `project_id`：

```typescript
sendToObservability({ project_id: 'chatbot', ... });
sendToObservability({ project_id: 'support', ... });
sendToObservability({ project_id: 'analytics', ... });
```

### Q: 如何查看特定時間範圍的數據？

A: 使用 `start_date` 和 `end_date` 參數：

```bash
curl "https://obs-edge.flymorris1230.workers.dev/metrics?project_id=my-app&start_date=2025-10-01&end_date=2025-10-07" \
  -H "Authorization: Bearer API_KEY"
```

### Q: 成本是如何計算的？

A: 系統根據 model 和 tokens 自動計算成本。您也可以手動指定 `cost_usd`：

```typescript
sendToObservability({
  // ...
  cost_usd: 0.045  // 手動指定成本
});
```

### Q: 如何確保數據隱私？

A:
- API KEY 僅在伺服器端使用
- 不要在 `metadata` 中包含敏感資訊
- 使用環境變數儲存 API KEY

---

## 🎉 開始追蹤！

現在您已經了解如何使用 Genesis Observability！

**下一步**：
1. 整合到您的 LLM 應用
2. 前往 Dashboard 查看數據
3. 開始優化成本與性能

**Dashboard**: https://genesis-observability-obs-dashboard.vercel.app

祝您使用愉快！🚀
