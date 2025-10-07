# Genesis Observability - 整合指南

完整的 LLM 應用整合指南，支援所有主流語言和框架。

---

## 📋 目錄

1. [快速開始](#快速開始)
2. [Node.js/TypeScript](#nodejstypescript)
3. [Python](#python)
4. [Go](#go)
5. [其他語言](#其他語言)
6. [Framework 整合](#framework-整合)
7. [進階功能](#進階功能)
8. [故障排除](#故障排除)

---

## 快速開始

### API 端點

```
POST https://obs-edge.flymorris1230.workers.dev/ingest
```

### 認證

```bash
Authorization: Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e
```

### 請求格式

```json
{
  "project_id": "your-project-name",
  "model": "gpt-4",
  "provider": "openai",
  "input_tokens": 1000,
  "output_tokens": 500,
  "latency_ms": 1200,
  "metadata": {}
}
```

---

## Node.js/TypeScript

### 安裝依賴

```bash
npm install node-fetch
# 或
npm install axios
```

### 基本整合

```typescript
import fetch from 'node-fetch';

interface ObservabilityData {
  project_id: string;
  model: string;
  provider: string;
  input_tokens: number;
  output_tokens: number;
  latency_ms?: number;
  metadata?: Record<string, any>;
}

async function sendToObservability(data: ObservabilityData) {
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

### OpenAI 整合

```typescript
import OpenAI from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

async function callOpenAI(prompt: string) {
  const startTime = performance.now();

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [{ role: 'user', content: prompt }]
  });

  const endTime = performance.now();
  const latency = Math.round(endTime - startTime);

  // Send to observability
  await sendToObservability({
    project_id: 'my-chatbot',
    model: response.model,
    provider: 'openai',
    input_tokens: response.usage!.prompt_tokens,
    output_tokens: response.usage!.completion_tokens,
    latency_ms: latency,
    metadata: {
      user_id: 'user-123',
      conversation_id: 'conv-456'
    }
  });

  return response.choices[0].message.content;
}
```

### Anthropic Claude 整合

```typescript
import Anthropic from '@anthropic-ai/sdk';

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

async function callClaude(prompt: string) {
  const startTime = performance.now();

  const response = await anthropic.messages.create({
    model: 'claude-3-sonnet-20240229',
    max_tokens: 1024,
    messages: [{ role: 'user', content: prompt }]
  });

  const endTime = performance.now();

  await sendToObservability({
    project_id: 'my-app',
    model: 'claude-3-sonnet',
    provider: 'anthropic',
    input_tokens: response.usage.input_tokens,
    output_tokens: response.usage.output_tokens,
    latency_ms: Math.round(endTime - startTime)
  });

  return response.content[0].text;
}
```

### Google Gemini 整合

```typescript
import { GoogleGenerativeAI } from '@google/generative-ai';

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY!);

async function callGemini(prompt: string) {
  const startTime = performance.now();

  const model = genAI.getGenerativeModel({ model: 'gemini-pro' });
  const result = await model.generateContent(prompt);
  const response = await result.response;

  const endTime = performance.now();

  // Gemini doesn't provide exact token counts in free tier
  // Estimate based on text length
  const inputTokens = Math.ceil(prompt.length / 4);
  const outputTokens = Math.ceil(response.text().length / 4);

  await sendToObservability({
    project_id: 'my-app',
    model: 'gemini-pro',
    provider: 'google',
    input_tokens: inputTokens,
    output_tokens: outputTokens,
    latency_ms: Math.round(endTime - startTime)
  });

  return response.text();
}
```

---

## Python

### 安裝依賴

```bash
pip install requests openai anthropic google-generativeai
```

### 基本整合

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

### OpenAI 整合

```python
import openai
import os

openai.api_key = os.getenv('OPENAI_API_KEY')

def call_openai(prompt: str) -> str:
    start_time = time.time()

    response = openai.ChatCompletion.create(
        model='gpt-4-turbo',
        messages=[{'role': 'user', 'content': prompt}]
    )

    end_time = time.time()
    latency = int((end_time - start_time) * 1000)

    # Send to observability
    send_to_observability(
        project_id='my-chatbot',
        model=response.model,
        provider='openai',
        input_tokens=response.usage.prompt_tokens,
        output_tokens=response.usage.completion_tokens,
        latency_ms=latency,
        metadata={
            'user_id': 'user-123',
            'conversation_id': 'conv-456'
        }
    )

    return response.choices[0].message.content
```

### Anthropic Claude 整合

```python
import anthropic

client = anthropic.Anthropic(api_key=os.getenv('ANTHROPIC_API_KEY'))

def call_claude(prompt: str) -> str:
    start_time = time.time()

    message = client.messages.create(
        model='claude-3-sonnet-20240229',
        max_tokens=1024,
        messages=[{'role': 'user', 'content': prompt}]
    )

    end_time = time.time()

    send_to_observability(
        project_id='my-app',
        model='claude-3-sonnet',
        provider='anthropic',
        input_tokens=message.usage.input_tokens,
        output_tokens=message.usage.output_tokens,
        latency_ms=int((end_time - start_time) * 1000)
    )

    return message.content[0].text
```

### LangChain 整合

```python
from langchain.callbacks.base import BaseCallbackHandler
from langchain.chat_models import ChatOpenAI
import time

class ObservabilityCallback(BaseCallbackHandler):
    def __init__(self, project_id: str):
        self.project_id = project_id
        self.start_time = None

    def on_llm_start(self, serialized, prompts, **kwargs):
        self.start_time = time.time()

    def on_llm_end(self, response, **kwargs):
        if self.start_time:
            latency = int((time.time() - self.start_time) * 1000)

            # Extract token usage from response
            usage = response.llm_output.get('token_usage', {})

            send_to_observability(
                project_id=self.project_id,
                model=response.llm_output.get('model_name', 'unknown'),
                provider='openai',
                input_tokens=usage.get('prompt_tokens', 0),
                output_tokens=usage.get('completion_tokens', 0),
                latency_ms=latency
            )

# Usage
llm = ChatOpenAI(temperature=0, callbacks=[ObservabilityCallback('my-langchain-app')])
result = llm.predict("Hello, how are you?")
```

---

## Go

### 基本整合

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
```

### OpenAI 整合 (Go)

```go
import (
    "context"
    openai "github.com/sashabaranov/go-openai"
)

func CallOpenAI(prompt string) (string, error) {
    start := time.Now()

    client := openai.NewClient(os.Getenv("OPENAI_API_KEY"))
    resp, err := client.CreateChatCompletion(
        context.Background(),
        openai.ChatCompletionRequest{
            Model: openai.GPT4Turbo,
            Messages: []openai.ChatCompletionMessage{
                {Role: openai.ChatMessageRoleUser, Content: prompt},
            },
        },
    )
    if err != nil {
        return "", err
    }

    latency := int(time.Since(start).Milliseconds())

    // Send to observability (non-blocking)
    go SendToObservability(ObservabilityData{
        ProjectID:    "my-go-app",
        Model:        resp.Model,
        Provider:     "openai",
        InputTokens:  resp.Usage.PromptTokens,
        OutputTokens: resp.Usage.CompletionTokens,
        LatencyMs:    latency,
    })

    return resp.Choices[0].Message.Content, nil
}
```

---

## 其他語言

### cURL (命令行)

```bash
curl -X POST https://obs-edge.flymorris1230.workers.dev/ingest \
  -H "Authorization: Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e" \
  -H "Content-Type: application/json" \
  -d '{
    "project_id": "my-cli-tool",
    "model": "gpt-4",
    "provider": "openai",
    "input_tokens": 1000,
    "output_tokens": 500,
    "latency_ms": 1200
  }'
```

### Ruby

```ruby
require 'net/http'
require 'json'

def send_to_observability(data)
  uri = URI('https://obs-edge.flymorris1230.workers.dev/ingest')

  request = Net::HTTP::Post.new(uri)
  request['Authorization'] = 'Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e'
  request['Content-Type'] = 'application/json'
  request.body = data.to_json

  Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) do |http|
    http.request(request)
  end
end

# Usage
send_to_observability({
  project_id: 'my-ruby-app',
  model: 'gpt-4',
  provider: 'openai',
  input_tokens: 1000,
  output_tokens: 500,
  latency_ms: 1200
})
```

### PHP

```php
<?php

function sendToObservability($data) {
    $ch = curl_init('https://obs-edge.flymorris1230.workers.dev/ingest');

    curl_setopt($ch, CURLOPT_POST, 1);
    curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($data));
    curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
    curl_setopt($ch, CURLOPT_HTTPHEADER, [
        'Authorization: Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e',
        'Content-Type: application/json'
    ]);

    $response = curl_exec($ch);
    curl_close($ch);

    return json_decode($response, true);
}

// Usage
sendToObservability([
    'project_id' => 'my-php-app',
    'model' => 'gpt-4',
    'provider' => 'openai',
    'input_tokens' => 1000,
    'output_tokens' => 500,
    'latency_ms' => 1200
]);
```

---

## Framework 整合

### Next.js API Route

```typescript
// app/api/chat/route.ts
import { NextRequest, NextResponse } from 'next/server';
import OpenAI from 'openai';

const openai = new OpenAI();

export async function POST(req: NextRequest) {
  const { message } = await req.json();

  const startTime = performance.now();

  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [{ role: 'user', content: message }]
  });

  const endTime = performance.now();

  // Send to observability (non-blocking)
  fetch('https://obs-edge.flymorris1230.workers.dev/ingest', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${process.env.OBS_API_KEY}`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      project_id: 'my-nextjs-app',
      model: response.model,
      provider: 'openai',
      input_tokens: response.usage!.prompt_tokens,
      output_tokens: response.usage!.completion_tokens,
      latency_ms: Math.round(endTime - startTime)
    })
  }).catch(err => console.error('Observability error:', err));

  return NextResponse.json({
    message: response.choices[0].message.content
  });
}
```

### Express.js Middleware

```typescript
import express from 'express';
import OpenAI from 'openai';

const app = express();
const openai = new OpenAI();

// Observability middleware
function observabilityMiddleware(projectId: string) {
  return async (req: any, res: any, next: any) => {
    const startTime = performance.now();

    // Store original send
    const originalSend = res.send;

    res.send = function(data: any) {
      const endTime = performance.now();

      // Extract usage data if available
      if (req.llmUsage) {
        fetch('https://obs-edge.flymorris1230.workers.dev/ingest', {
          method: 'POST',
          headers: {
            'Authorization': 'Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e',
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            ...req.llmUsage,
            project_id: projectId,
            latency_ms: Math.round(endTime - startTime)
          })
        }).catch(console.error);
      }

      originalSend.call(this, data);
    };

    next();
  };
}

app.use(observabilityMiddleware('my-express-app'));

app.post('/chat', async (req, res) => {
  const response = await openai.chat.completions.create({
    model: 'gpt-4-turbo',
    messages: [{ role: 'user', content: req.body.message }]
  });

  // Store usage for middleware
  req.llmUsage = {
    model: response.model,
    provider: 'openai',
    input_tokens: response.usage!.prompt_tokens,
    output_tokens: response.usage!.completion_tokens
  };

  res.json({ message: response.choices[0].message.content });
});
```

---

## 進階功能

### 批量發送

```typescript
class ObservabilityBatcher {
  private batch: ObservabilityData[] = [];
  private batchSize = 10;
  private flushInterval = 5000; // 5 seconds

  constructor() {
    setInterval(() => this.flush(), this.flushInterval);
  }

  add(data: ObservabilityData) {
    this.batch.push(data);
    if (this.batch.length >= this.batchSize) {
      this.flush();
    }
  }

  async flush() {
    if (this.batch.length === 0) return;

    const toSend = [...this.batch];
    this.batch = [];

    // Send all in parallel
    await Promise.all(
      toSend.map(data => sendToObservability(data).catch(console.error))
    );
  }
}

const batcher = new ObservabilityBatcher();

// Usage
batcher.add({
  project_id: 'my-app',
  model: 'gpt-4',
  // ...
});
```

### 錯誤處理與重試

```typescript
async function sendWithRetry(
  data: ObservabilityData,
  maxRetries = 3,
  delay = 1000
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      await sendToObservability(data);
      return;
    } catch (error) {
      if (i === maxRetries - 1) throw error;
      await new Promise(resolve => setTimeout(resolve, delay * Math.pow(2, i)));
    }
  }
}
```

### Metadata 最佳實踐

```typescript
await sendToObservability({
  project_id: 'my-app',
  model: 'gpt-4',
  provider: 'openai',
  input_tokens: 1000,
  output_tokens: 500,
  latency_ms: 1200,
  metadata: {
    // User context
    user_id: 'user-123',
    user_tier: 'premium',

    // Session context
    session_id: 'session-456',
    conversation_id: 'conv-789',

    // Request context
    feature: 'chat',
    endpoint: '/api/chat',

    // Environment
    environment: process.env.NODE_ENV,
    version: '1.0.0',

    // Custom tags
    tags: ['production', 'premium-user'],

    // Performance
    cache_hit: false,
    streaming: true
  }
});
```

---

## 故障排除

### 問題 1: 401 Unauthorized

**原因**: API KEY 不正確

**解決方案**:
```typescript
// 確保使用正確的 API KEY
const API_KEY = 'a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e';

headers: {
  'Authorization': `Bearer ${API_KEY}` // 注意 'Bearer ' 前綴
}
```

### 問題 2: 429 Too Many Requests

**原因**: 超過 rate limit (100 requests/min)

**解決方案**:
```typescript
// 使用批量發送減少請求數
// 或添加 exponential backoff
async function sendWithBackoff(data: ObservabilityData) {
  let delay = 1000;
  while (true) {
    try {
      await sendToObservability(data);
      return;
    } catch (error: any) {
      if (error.status === 429) {
        await new Promise(r => setTimeout(r, delay));
        delay *= 2;
      } else {
        throw error;
      }
    }
  }
}
```

### 問題 3: CORS 錯誤

**原因**: 從瀏覽器直接調用 API

**解決方案**:
```typescript
// ❌ 不要在瀏覽器中暴露 API KEY
// 改為通過後端 API Route 調用

// app/api/observability/route.ts
export async function POST(req: NextRequest) {
  const data = await req.json();

  // 在伺服器端調用
  await sendToObservability({
    ...data,
    // API KEY 安全儲存在環境變數
  });

  return NextResponse.json({ success: true });
}
```

### 問題 4: 請求超時

**解決方案**:
```typescript
// 增加timeout並使用非阻塞調用
Promise.race([
  sendToObservability(data),
  new Promise((_, reject) =>
    setTimeout(() => reject(new Error('Timeout')), 5000)
  )
]).catch(err => {
  console.error('Observability timeout:', err);
  // 不影響主要業務邏輯
});
```

---

## 📊 查看數據

### Dashboard
前往: https://genesis-observability-obs-dashboard.vercel.app

### API 查詢

**查詢 Metrics**:
```bash
curl "https://obs-edge.flymorris1230.workers.dev/metrics?project_id=my-app&start_date=2025-01-01&end_date=2025-12-31" \
  -H "Authorization: Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e"
```

**查詢 Costs**:
```bash
curl "https://obs-edge.flymorris1230.workers.dev/costs?project_id=my-app&start_date=2025-01-01&end_date=2025-12-31" \
  -H "Authorization: Bearer a590aec22adeab9bb9fcf8ff81ccf790a588a298edeffce3216b317c18f87f9e"
```

---

## 🎯 最佳實踐

1. **非阻塞調用**: 使用 `Promise.catch()` 或 `try-catch`，不要讓 observability 失敗影響主要業務邏輯

2. **批量發送**: 對於高流量應用，使用批量發送減少請求數

3. **Metadata**: 添加有用的 metadata 幫助後續分析

4. **錯誤處理**: 優雅處理錯誤，記錄但不拋出

5. **環境區分**: 使用 `project_id` 區分不同環境（dev, staging, production）

---

**開始整合並追蹤您的 LLM 使用量！** 🚀
