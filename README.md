# ShopIntelAgent — 自主電商市場情報與競品定價分析助理

> **課程作業：Homework 4 — AI Harness Systems Design and Analysis (Syllabus Version)**  
> 本專案展示了一個現代 AI Harness (AI 系統編排) 架構，聚焦於 LLM 作為系統控制器的決策引導、多步驟 Agent 工作流編排、Function Calling 容錯設計，以及確定性數值計算工具的整合。

---

## 📌 專案簡介 (Overview)

在激烈的電子商務市場中，**ShopIntelAgent** 幫助電商賣家自動化繁瑣的市場調查與競品定價流程。使用者只需輸入**自家商品名稱、進貨成本、最低利潤率要求與市場定位**，系統即可自主執行多步驟工作流：
1. **市場搜尋**：自動尋找多個平台（如 Amazon, Shopify）上的前幾名競爭對手商品。
2. **規格爬取**：爬取競品詳細網頁，解析定價、運費、關鍵規格。
3. **消費者痛點挖掘**：抓取商品評論，進行 fine-grained 情感分析，抽取出競品被抱怨的核心缺陷。
4. **精準定價計算**：將定性市場分析與定量財務約束（毛利要求）傳入確定性的計算工具中，得出最佳定價區間。
5. **策略報告生成**：輸出包含 SWOT 分析、產品差異化定位（USP）以及定價推薦的綜合分析報告。

---

## 📂 繳交項目與目錄結構 (Deliverables)

本倉庫包含了作業要求的所有必交項目：

* 📄 **[report.md (書面報告)](report.md)**：A4 規格詳細設計報告。涵蓋問題定義、系統架構設計、4 個工具的 JSON Schema 定義、基於狀態圖（State-Graph）的編排決策機制（包含錯誤 Retry 與終止條件）、Evaluation 評量指標（30 筆測試案例集設計）。
* 🖼️ **[infographic.png (資訊圖表)](infographic.png)**：明亮、乾淨且精緻的系統架構與資料流向圖。展示了 LLM Controller、Memory 與工具層（Tools）的關係。
* 📝 **[log.md (開發日誌)](log.md)**：詳細紀錄與 AI 的互動歷程、兩輪架構迭代決策（鏈式 $\rightarrow$ ReAct $\rightarrow$ 狀態圖 + 數值計算器分離）、Prompt 提示詞微調過程、測試 Trace 日誌與缺陷修正紀錄。

---

## ⚙️ 系統架構與資料流 (System Architecture & Data Flow)

本系統將職責清晰劃分為三個核心層次，以確保 LLM 的隨機性受到商業邏輯的嚴密約束：

```
[使用者輸入: 商品名, 成本, 利潤率]
       │
       ▼
┌─────────────────────────────────────────────────────────────┐
│ 1. LLM System Controller (決策大腦)                          │
│    ├── 意圖解析 (Intent Parsing)                             │
│    ├── 決策與工具路由 (ReAct Planning Engine)                │
│    └── 安全護欄 (Safety Guardrails)                          │
└──────────────┬──────────────────────────────▲───────────────┘
               │ 寫入/讀取                     │ 傳回 Observation
               ▼                              │
┌──────────────────────────────┐   ┌──────────┴────────────────┐
│ 2. Memory System (記憶體)    │   │ 3. Core Toolsets (工具箱)  │
│    ├── 短期: 對話歷史 & 狀態  │   │    ├── competitor_search  │
│    └── 長期: 產品庫 Vector DB │   │    ├── extract_details    │
└──────────────────────────────┘   │    ├── analyze_sentiment  │
                                   │    └── pricing_calculator │
                                   └───────────────────────────┘
```

### 核心工具定義 (Tool APIs)
1. **`competitor_search`**：搜尋競品 URL 列表。
2. **`extract_product_details`**：網頁爬蟲與規格結構化 JSON 解析。
3. **`analyze_reviews_sentiment`**：分析消費者評價並挖掘市場 Gap。
4. **`pricing_strategy_calculator`**：**確定性 Python 數值計算工具**，用於防範 LLM 的計算幻覺，確保定價決策 100% 滿足最低毛利線。

---

## 🛠️ 編排控制與容錯機制 (Orchestration & Guardrails)

ShopIntelAgent 設計了嚴密的狀態轉移與防護規則，詳見以下決策矩陣：

| 當前狀態 | 觸發條件 | 系統編排層策略與下一步 |
| :--- | :--- | :--- |
| **搜尋結果不足** | 競品網頁數量 $< 3$ 個 | 擴大搜尋 Query，自動剝離特定規格修飾詞 |
| **商品頁爬取失敗** | 爬蟲返回 HTTP 403 / 503 或超時 | 自動執行 Retry 一次。再次失敗則標記為失效並跳過 |
| **評論數據不足** | 單一商品的有效評論數 $< 5$ 筆 | 跳過情感分析，僅依賴規格與價格進行定量對標 |
| **價格低於最低毛利** | 建議售價 $<$ 成本 $\times (1 +$ 最低毛利率) | 觸發價格保護機制，強制上調至毛利底線並加入警告標籤 |
| **工具迭代超限** | 工具呼叫總次數 $\ge 10$ 次 | 觸發強制終止條件，整合現有不完整數據輸出最安全定價 |

---

## 📈 Evaluation 測試與衡量方法

專案設計了包含 **30 筆測試案例的基準測試集 (Benchmark Dataset)**，用於檢驗系統的穩定性與準確度：
- **資訊缺失案例**：缺少成本輸入時，測試系統是否能主動追問（Tool Path 應不調用工具）。
- **標準案例**：完整輸入時，驗證是否嚴格遵循 `Search` $\rightarrow$ `Extract` $\rightarrow$ `Analyze` $\rightarrow$ `Calculate` 的工具鏈順序。
- **異常防禦案例**：模擬爬蟲失敗時，驗證決策表的 Retry 與跳過邏輯是否確實觸發。

---

## ⚖️ 合規與安全限制 (Compliance & Ethics)

1. **禮貌爬取**：在網頁抓取之間加入隨機延遲（1-3 秒），限制抓取頻率，避免對電商平台伺服器造成負載壓力（符合 Robots.txt 規範）。
2. **隱私去識別化**：在評論文字傳遞給 LLM 進行分析前，自動過濾所有個人識別資訊 (PII)，如用戶姓名、帳號與頭像。
