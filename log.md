# AI 輔助設計與開發過程日誌 (log.md)

本文件詳細紀錄了 **ShopIntelAgent** 系統在設計與迭代過程中的 AI 輔助互動、架構演進決策、Prompt 設計以及問題分析與修正歷程。

---

## 1. 與 AI 的互動起點與需求分析

### 1.1 原始需求輸入
AI 接收到了課程作業《Homework 4 — AI Harness Systems Design and Analysis》的要求，核心在於設計一個具備 LLM Controller、多步驟工作流（Workflow Orchestration）、Function Calling（至少 3 個工具）以及 Evaluation 機制的 AI Harness 系統。

### 1.2 場景篩選與決策
在初步討論中，AI 評估了數個候選應用場景：
1. **學術會議商旅規劃助理**（Travel Agent）：偏向常規 API 串接，對於評論分析與語意理解的挑戰性較低。
2. **醫療文獻摘要與引用圖譜建構助理**（MedPaper Agent）：領域過於生硬，評估工具與測試難度較高。
3. **自主電商市場情報與競品定價分析助理**（ShopIntelAgent）：符合典型「資訊搜尋 $\rightarrow$ 結構化數據爬取 $\rightarrow$ 情感/文本分析 $\rightarrow$ 數值優化決策 $\rightarrow$ 報告生成」的多步驟複雜任務，具有極高的商業實用價值，且工具間的資料流依賴性強（Search 的結果是 Extract 的輸入，Extract 的結果是 Sentiment 的輸入），非常適合展現 AI Harness 的編排能力。

因此，決策選擇 **ShopIntelAgent** 作為 Homework 4 的主體。

---

## 2. 第一階段系統架構迭代與決策過程

在系統設計的第一階段，經歷了三次主要的架構調整：

### 2.1 迭代一：單純的鏈式工作流（Sequential Chain）
- **初始設計**：依序執行 `Search` $\rightarrow$ `Extract` $\rightarrow$ `Analyze`。
- **遭遇問題**：在真實電商環境中，搜尋結果可能包含無效連結、被反爬蟲阻擋的頁面或不相關的商品。如果使用硬編碼的鏈式流程，一旦某個網址抓取失敗，整個流程就會崩潰。
- **調整決策**：棄用純鏈式，改用 **ReAct (Reasoning and Action)** 循環。讓 LLM 控制器根據 `extract_product_details` 返回的錯誤訊息（例如 `503 Service Unavailable` 或 `404 Not Found`），自主決定是否呼叫下一個 URL，或者更換關鍵字重新搜尋。

### 2.2 迭代二：狀態圖限制器（State-Graph Constraint）
- **引入 ReAct 後的問題**：LLM 在遇到持續爬取失敗或找不到合適商品時，容易陷入「重新搜尋 $\rightarrow$ 爬取失敗 $\rightarrow$ 再搜尋」的無限循環（Infinite Loop），導致 Token 消耗激增。
- **調整決策**：在 AI Harness 編排層加入一個**外部狀態管理器**。限制搜尋次數最大值為 2 次，單次任務提取競品上限為 3 個。當狀態計數器達到上限時，強制引導 LLM 進入「定價決策與報告生成」狀態，即使當前數據不完整也必須進行估算。這結合了 Graph-based 的路徑控制與 ReAct 的動態推理。

### 2.3 迭代三：記憶體層級劃分
- **初始設計**：所有上下文都塞在單一 Chat History 中。
- **遭遇問題**：爬取的網頁源文本或商品規格資料量龐大，容易導致 context window 溢出且增加成本。
- **調整決策**：
  - 將爬取的原始 HTML 由 `extract_product_details` 本地工具過濾並轉換為乾淨的 JSON 後再傳給 LLM。
  - 將商家歷史定價與商品規格放入長期記憶（Vector DB），只有當 User query 觸發相關語意檢索時，才將少量 Few-shot 與相關背景載入 Context。

---

## 3. Prompt Engineering 迭代歷程

為使 LLM Controller 能精準輸出符合 Schema 的 Function Call，並在 Reason 階段展現嚴密的商業邏輯，我們對 System Prompt 進行了多次調優。

### 3.1 初始 Prompt 測試
* **Prompt 內容**：你是一個電商定價助理。請幫忙搜尋競品並給出定價建議。你可以使用搜尋和爬蟲工具。
* **測試結果**：LLM 經常直接胡亂猜測競品價格，而不主動呼叫 `extract_product_details`；或者在呼叫 `competitor_search` 後，直接把搜尋結果中的簡短 Title 當作規格，跳過了詳細頁面爬取。

### 3.2 改良版 Prompt（最終採用之結構）
我們將提示詞結構化，並引入強制的思考模型（Thought-Action-Observation）：

```markdown
# Role
You are ShopIntelAgent, the executive controller of an autonomous e-commerce pricing system.

# Operational Rules
1. ALWAYS research before recommending. You must never invent pricing data.
2. For any candidate competitor, you must first call `extract_product_details` to verify specifications.
3. Your pricing recommendation MUST satisfy the merchant's margin formula:
   Suggested Price >= Cost * (1 + Min Margin)
4. Actively identify customer pain points from review summaries to justify premium pricing.

# Reasoning Format
For every step, output in this exact structure:
Thought: [Reasoning about current state and what to do next]
Action: [Tool Name]
Action Input: [JSON arguments]
Observation: [Tool output will be injected here]
```

* **成效**：此 Prompt 強制 LLM 在採取任何行動前寫下 `Thought`，顯著提升了其工具路由的精準度，並能嚴格遵守毛利公式。

---

## 4. 第二階段：評審/諮商師反饋與架構深度優化 (第二輪迭代)

在完成第一版設計後，我們引入了「外部專家審查機制」，獲得了極具價值的反饋，並據此進行了深度的第二輪系統優化：

### 4.1 反饋焦點 1：LLM 的數學運算幻覺問題
* **審查意見**：LLM 本質上是文字預測模型，其在進行精密的數學計算（如平均價、毛利扣除、定價公式計算）時容易出錯。將定價計算寫在 LLM 的推理中是不穩健的。
* **優化決策**：新增第四個核心工具 **`pricing_strategy_calculator`**。當 LLM 收集完競品資訊後，必須將所有數值參數傳遞給此確定性工具，由 Python 程式碼進行數學計算並回傳定價區間。LLM 僅負責規劃呼叫與解釋最終策略。

### 4.2 反饋焦點 2：Harness 系統控制的具體性不足 (「企劃書感」偏重)
* **審查意見**：報告中對「如何控制 LLM 決策、容錯與停止條件」的描述較為籠統。作業需要展現出學生真正懂「AI Harness 系統編排（Orchestration）」的控制手段。
* **優化決策**：
  1. 增補 **Orchestration Decision Table (編排決策與狀態轉移表)**：具體定義了「搜尋結果不足」、「爬網頁失敗 (403/503)」、「評論數不足」、「定價低於利潤底線」等 5 種極端邊界狀況的自動Fallback與防護機制。
  2. 明確設定 **Termination Conditions (強制終止條件)**：例如當工具呼叫總次數達到 10 次時，無論資料是否收集齊全，編排層均會攔截並強制 LLM 產出報告，防止系統死循環。

### 4.3 反饋焦點 3：系統延遲描述的不合理性
* **審查意見**：第一版寫道「縮短至十秒內完成」，這對於包含搜尋、網頁解析、情感分析等多個 API 與 LLM 調用的複合系統來說不符合真實工程常理，容易被評為不合理。
* **優化決策**：將總體時耗修正為「1 到 3 分鐘內」，這在真實的電商大數據抓取與分析中是極具說服力且合理的時效。

### 4.4 反饋焦點 4：Evaluation 評量方案流於抽象
* **審查意見**：指標只給了目標值（如 95%），但沒寫怎麼測、怎麼建立測試數據集。
* **優化決策**：新增 **30 筆測試案例的基準測試集 (Benchmark Dataset)** 設計，具體細分為「資訊缺失案例（測試 LLM 能否主動追問）」、「標準分析案例（驗證完整工具呼叫鏈）」與「異常爬取案例（驗證 Retry 與 Fallback 邏輯）」三類，大幅提升了 Evaluation 的可執行性。

---

## 5. 優化後系統模擬執行 Trace (含第四工具 & 決策表觸發)

以下展示第二輪優化後，系統的真實執行軌跡（包含錯誤 Retry 與計算工具呼叫）：

```
[SYSTEM] User Input Received:
{
  "product_name": "Smart LED Desk Lamp Pro",
  "cost": 25.0,
  "min_margin": 0.20,
  "query_keyword": "Smart LED Desk Lamp",
  "positioning": "mid_range"
}

--------------------------------------------------------------------------------
[STEP 1] LLM Controller Reasoning:
Thought: 我需要先搜尋 Amazon 上的競爭對手商品網址。
Action: competitor_search
Action Input: { "query": "Smart LED Desk Lamp", "platform": "amazon", "limit": 2 }

[SYSTEM] Executing competitor_search...
Observation: [
  {"title": "Philips Smart LED Desk Lamp V2", "url": "https://www.amazon.com/dp/B08X111"},
  {"title": "Govee Wi-Fi Desk Lamp", "url": "https://www.amazon.com/dp/B09Y222"}
]

--------------------------------------------------------------------------------
[STEP 2] LLM Controller Reasoning:
Thought: 我獲得了兩個競品連結。接下來我需要依次爬取詳細價格與規格。先從 Philips 開始。
Action: extract_product_details
Action Input: { "url": "https://www.amazon.com/dp/B08X111" }

[SYSTEM] Executing extract_product_details...
Observation: { "status": "Error 503 Service Unavailable" }

--------------------------------------------------------------------------------
[STEP 3] LLM Controller Reasoning:
Thought: 爬取 Philips 商品頁時遭遇 503 錯誤。根據編排決策表，我應該針對該網址執行自動重試（Retry）一次。
Action: extract_product_details
Action Input: { "url": "https://www.amazon.com/dp/B08X111" }

[SYSTEM] Executing extract_product_details (Retry 1/1)...
Observation: {
  "title": "Philips Smart LED Desk Lamp V2",
  "price": 45.99,
  "currency": "USD",
  "specifications": { "connectivity": "Wi-Fi, Bluetooth", "brightness": "800lm" },
  "reviews_sample": [
    "Great brightness, but Wi-Fi drops daily.",
    "Decent, but base is very cheap plastic."
  ]
}

--------------------------------------------------------------------------------
[STEP 4] LLM Controller Reasoning:
Thought: 重試成功，獲得 Philips 價格 $45.99 及規格。現在我需要抓取第二個競品 Govee 的資料。
Action: extract_product_details
Action Input: { "url": "https://www.amazon.com/dp/B09Y222" }

[SYSTEM] Executing extract_product_details...
Observation: {
  "title": "Govee Wi-Fi Desk Lamp",
  "price": 38.50,
  "currency": "USD",
  "specifications": { "connectivity": "Wi-Fi", "brightness": "700lm" },
  "reviews_sample": [
    "App works great, but lamp arm is too short.",
    "Affordable smart lamp, base feels light."
  ]
}

--------------------------------------------------------------------------------
[STEP 5] LLM Controller Reasoning:
Thought: 我已經收集到兩組競品價格：$45.99 與 $38.50。
在進行策略制定前，我必須將這些價格數據傳遞給 `pricing_strategy_calculator` 工具，計算精確的毛利區間。
我的定位是中價位對標（mid_range）。
Action: pricing_strategy_calculator
Action Input: {
  "cost": 25.0,
  "min_margin": 0.20,
  "competitor_prices": [45.99, 38.50],
  "positioning": "mid_range"
}

[SYSTEM] Executing pricing_strategy_calculator...
Observation: {
  "min_allowed_price": 30.00,
  "competitor_metrics": { "min": 38.50, "max": 45.99, "average": 42.25, "median": 42.25 },
  "suggested_price_range": { "low": 38.50, "recommended": 41.99, "high": 43.50 },
  "expected_margin_at_recommended": 0.6796
}

--------------------------------------------------------------------------------
[STEP 6] LLM Controller Reasoning:
Thought: 計算器返回的建議定價為 $41.99，符合且優於我們最低毛利要求的 $30.00。
結合評論分析，競品痛點在於「Wi-Fi 經常斷線」和「塑料感重」，而自家的 Lamp Pro 採用全鋁合金底座和高階雙頻 Wi-Fi 晶片。
我將以此生成 final report。

Action: None (Generate Final Report)
...
```

---

## 6. 設計決策精進總結

透過這次反饋與迭代，我們在 `log.md` 與 `report.md` 中做出的改動，確實解決了 AI Agent 系統設計中最核心的**可控性 (Controllability)**、**確定性 (Determinism)** 以及**工程合理性 (Engineering Feasibility)** 問題。這使得整個專案不再僅僅是一個「使用 LLM 的包裝」，而是一個將 LLM 當作動態協調元件、輔以確定性工具和硬性格網（Guardrails）的**現代 AI Harness 系統**。
