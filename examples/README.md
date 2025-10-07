# Genesis Observability - 整合範例

這個目錄包含各種語言和框架的整合範例。

---

## 📁 檔案說明

### Node.js / TypeScript
- **`nodejs-openai.ts`** - OpenAI 整合範例
  - 展示如何整合 OpenAI API
  - 追蹤 tokens、成本、延遲
  - 包含 metadata 使用範例

### Python
- **`python-claude.py`** - Claude (Anthropic) 整合範例
  - 展示如何整合 Claude API
  - 追蹤使用量和性能
  - Python 最佳實踐

### 測試腳本
- **`test-tracking.sh`** - 快速測試腳本
  - 發送測試數據
  - 查詢 metrics 和 costs
  - 驗證系統運作

---

## 🚀 使用方式

### Node.js 範例

```bash
# 安裝依賴
npm install openai node-fetch

# 設置環境變數
export OPENAI_API_KEY="your-api-key"

# 執行範例
npx tsx examples/nodejs-openai.ts
```

### Python 範例

```bash
# 安裝依賴
pip install anthropic requests

# 設置環境變數
export ANTHROPIC_API_KEY="your-api-key"

# 執行範例
python examples/python-claude.py
```

### 測試腳本

```bash
# 直接執行
./examples/test-tracking.sh
```

---

## 📚 更多資源

- **../HOW_TO_USE.md** - 完整使用指南
- **../INTEGRATION_GUIDE.md** - 詳細整合指南（所有語言）
- **../QUICK_START.md** - 快速開始

---

## 💡 提示

1. **修改 project_id**：在範例中將 `'my-app'` 改成您的專案名稱
2. **添加 metadata**：在 `metadata` 欄位添加有用的追蹤資訊
3. **非阻塞調用**：所有範例都使用非阻塞方式發送數據
4. **錯誤處理**：包含適當的錯誤處理邏輯

---

## 🎯 下一步

1. 選擇適合您的範例
2. 修改 `project_id` 和配置
3. 整合到您的應用
4. 前往 Dashboard 查看數據：https://genesis-observability-obs-dashboard.vercel.app

祝您使用愉快！🚀
