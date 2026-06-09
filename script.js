/**
 * ShopIntelAgent - Interactive Simulation Engine
 */

document.addEventListener('DOMContentLoaded', () => {
    const form = document.getElementById('pricing-form');
    const startBtn = document.getElementById('start-btn');
    const consoleOutput = document.getElementById('console-output');
    const stepBadge = document.getElementById('step-badge');
    const reportResults = document.getElementById('report-results');

    // Sleep Helper
    const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

    // Print to Console Helper
    function printConsole(type, text) {
        // Remove placeholder if present
        const placeholder = consoleOutput.querySelector('.console-placeholder');
        if (placeholder) placeholder.remove();

        const line = document.createElement('div');
        line.className = `console-line line-${type}`;

        const prompt = document.createElement('span');
        prompt.className = 'console-prompt';
        
        switch(type) {
            case 'system':
                prompt.innerHTML = '<i class="fa-solid fa-gears"></i>';
                break;
            case 'thought':
                prompt.innerHTML = '<i class="fa-solid fa-lightbulb"></i>';
                break;
            case 'action':
                prompt.innerHTML = '<i class="fa-solid fa-square-terminal"></i>';
                break;
            case 'observation':
                prompt.innerHTML = '<i class="fa-solid fa-clipboard-list"></i>';
                break;
            case 'error':
                prompt.innerHTML = '<i class="fa-solid fa-circle-exclamation"></i>';
                break;
        }

        line.appendChild(prompt);
        
        const content = document.createElement('span');
        content.textContent = text;
        line.appendChild(content);

        consoleOutput.appendChild(line);
        consoleOutput.scrollTop = consoleOutput.scrollHeight;
    }

    // Main Simulation Handler
    form.addEventListener('submit', async (e) => {
        e.preventDefault();

        // 1. Read input parameters
        const productName = document.getElementById('product-name').value;
        const productCost = parseFloat(document.getElementById('product-cost').value);
        const minMarginPercent = parseFloat(document.getElementById('min-margin').value);
        const searchKeyword = document.getElementById('search-keyword').value;
        const positioning = document.querySelector('input[name="positioning"]:checked').value;
        const simulateError = document.getElementById('simulate-error').checked;

        // Reset UI States
        consoleOutput.innerHTML = '';
        reportResults.style.display = 'none';
        stepBadge.textContent = 'RUNNING';
        stepBadge.className = 'badge running';
        startBtn.disabled = true;
        startBtn.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> 分析編排中...';

        try {
            // STEP 1: Initialization
            printConsole('system', `[SYSTEM] 啟動 ShopIntelAgent 控制器...`);
            await sleep(800);
            printConsole('system', `[SYSTEM] 載入商家商品: "${productName}" | 成本: $${productCost.toFixed(2)} | 最低利潤要求: ${minMarginPercent}%`);
            await sleep(600);
            printConsole('thought', `Thought: 使用者希望分析 "${productName}" 的定價。我需要先搜尋市場上在 Amazon 上的相關對標商品。`);
            await sleep(1000);

            // STEP 2: Search competitor
            printConsole('action', `Action: competitor_search(query="${searchKeyword}", platform="amazon", limit=2)`);
            await sleep(1200);
            const competitors = [
                { title: "Philips Smart LED Desk Lamp V2", url: "https://www.amazon.com/dp/B08X111" },
                { title: "Govee Wi-Fi Desk Lamp", url: "https://www.amazon.com/dp/B09Y222" }
            ];
            printConsole('observation', `Observation: 成功找到 2 個競品：\n1. ${competitors[0].title} (${competitors[0].url})\n2. ${competitors[1].title} (${competitors[1].url})`);
            await sleep(1000);

            // STEP 3: Scrape first competitor (Philips)
            printConsole('thought', `Thought: 已獲得對標商品連結。現在呼叫網頁解析工具，爬取 "${competitors[0].title}" 的詳細規格、定價與消費者評論。`);
            await sleep(800);

            if (simulateError) {
                // Simulate HTTP 503 error
                printConsole('action', `Action: extract_product_details(url="${competitors[0].url}")`);
                await sleep(1000);
                printConsole('error', `Error: HTTP 503 Service Unavailable (目標伺服器負載超限)`);
                await sleep(1200);
                printConsole('thought', `Thought: 網頁爬取失敗並返回 503 錯誤。根據「編排防護網決策表」規則，系統應針對該 URL 進行自動重試 1/1...`);
                await sleep(1000);
                printConsole('action', `Action: extract_product_details(url="${competitors[0].url}") [Retry 1/1]`);
                await sleep(1500);
            } else {
                printConsole('action', `Action: extract_product_details(url="${competitors[0].url}")`);
                await sleep(1500);
            }

            const philipsDetails = {
                title: "Philips Smart LED Desk Lamp V2",
                price: 45.99,
                specifications: { material: "Plastic & Metal", connectivity: "Wi-Fi, App Control", brightness: "800lm" },
                reviews: [
                    "I love the brightness, but the Wi-Fi connection setup is a nightmare, drops everyday.",
                    "Decent lamp, but the plastic joints feel very fragile."
                ]
            };
            printConsole('observation', `Observation: 成功爬取數據：\n- 價格: $${philipsDetails.price}\n- 規格: ${JSON.stringify(philipsDetails.specifications)}\n- 評論數: 2 筆樣本`);
            await sleep(1000);

            // STEP 4: Scrape second competitor (Govee)
            printConsole('thought', `Thought: Philips 價格為 $${philipsDetails.price}。現在我需要爬取第二個競品 "${competitors[1].title}" 的詳細資料進行比對。`);
            await sleep(800);
            printConsole('action', `Action: extract_product_details(url="${competitors[1].url}")`);
            await sleep(1200);
            const goveeDetails = {
                title: "Govee Wi-Fi Desk Lamp",
                price: 38.50,
                specifications: { material: "Hard Plastic", connectivity: "Wi-Fi Only", brightness: "700lm" },
                reviews: [
                    "Nice app integration, but the arm is too short.",
                    "Very lightweight, feels a bit cheap in hand."
                ]
            };
            printConsole('observation', `Observation: 成功爬取數據：\n- 價格: $${goveeDetails.price}\n- 規格: ${JSON.stringify(goveeDetails.specifications)}\n- 評論數: 2 筆樣本`);
            await sleep(1000);

            // STEP 5: Sentiment Analysis
            printConsole('thought', `Thought: 我已收集完競品定價。現在我需要將評論樣本進行情感與市場 Gap 分析，挖掘競品缺陷以支持我們商品的差異化溢價。`);
            await sleep(800);
            const allReviews = [...philipsDetails.reviews, ...goveeDetails.reviews];
            printConsole('action', `Action: analyze_reviews_sentiment(reviews=${JSON.stringify(allReviews)})`);
            await sleep(1500);
            const sentimentResult = {
                pros: ["智慧控制功能豐富", "亮度足夠"],
                cons: ["Wi-Fi 連線經常中斷", "塑料底座關節廉價脆弱"],
                market_gaps: ["消費者需要更穩定的連線模組", "外觀需要更有金屬質感與耐用性"]
            };
            printConsole('observation', `Observation: 情感分析結果：\n- 優勢: ${sentimentResult.pros.join(', ')}\n- 痛點: ${sentimentResult.cons.join(', ')}\n- 市場缺口: ${sentimentResult.market_gaps.join(', ')}`);
            await sleep(1200);

            // STEP 6: Pricing strategy calculation (REAL calculation logic)
            printConsole('thought', `Thought: 已獲得定性競爭優勢。現在，我必須將數值參數傳遞給確定的「定價策略計算器」工具，以避免計算幻覺，並確保毛利率合規。`);
            await sleep(800);
            
            const competitorPrices = [philipsDetails.price, goveeDetails.price];
            printConsole('action', `Action: pricing_strategy_calculator(cost=${productCost}, min_margin=${minMarginPercent/100}, competitor_prices=${JSON.stringify(competitorPrices)}, positioning="${positioning}")`);
            await sleep(1200);

            // Real Math in JS Tool emulation
            const minAllowedPrice = productCost * (1 + (minMarginPercent / 100));
            const compAvg = competitorPrices.reduce((a,b) => a+b, 0) / competitorPrices.length;
            const compMin = Math.min(...competitorPrices);
            const compMax = Math.max(...competitorPrices);

            let recommendedPrice = 0;
            let explanation = "";

            if (positioning === 'budget') {
                // Aim slightly lower than lowest competitor, but bound by minAllowed
                recommendedPrice = Math.max(minAllowedPrice, compMin - 2);
                explanation = `定位策略為「平價對標」。建議定價 $${recommendedPrice.toFixed(2)} 略低於最便宜競品 ($${compMin.toFixed(2)})，以迅速搶占市佔率。`;
            } else if (positioning === 'premium') {
                // Premium pricing, close to max competitor, justified by metal/Wi-Fi
                recommendedPrice = Math.max(minAllowedPrice, compMax - 1.5);
                explanation = `定位策略為「高質感溢價」。鑑於競品（Philips）具有塑料底座與斷線缺陷，我們產品的金屬關節與高穩定 Wi-Fi 支撐此溢價定價。`;
            } else {
                // Mid range: Average
                recommendedPrice = Math.max(minAllowedPrice, (compAvg + minAllowedPrice) / 2);
                // Round to nice .99 cents
                recommendedPrice = Math.round(recommendedPrice) - 0.01;
                if (recommendedPrice < minAllowedPrice) recommendedPrice = minAllowedPrice;
                explanation = `定位策略為「中值對標」。建議零售價 $${recommendedPrice.toFixed(2)} 落在競品均價 ($${compAvg.toFixed(2)}) 與毛利底線之間，性價比最佳。`;
            }

            // Guardrail Price protection check
            let guardrailTriggered = false;
            if (recommendedPrice < minAllowedPrice) {
                recommendedPrice = minAllowedPrice;
                guardrailTriggered = true;
                explanation = `⚠️ [安全護欄觸發] 原始策略計算之價格低於利潤底線，系統已強制上調定價至最低毛利保護線 $${minAllowedPrice.toFixed(2)}。`;
            }

            const expectedMargin = ((recommendedPrice - productCost) / recommendedPrice) * 100;

            const calcResult = {
                min_allowed_price: minAllowedPrice,
                competitor_metrics: { min: compMin, max: compMax, average: compAvg },
                suggested_price: recommendedPrice,
                margin_ratio: expectedMargin,
                guardrail_triggered: guardrailTriggered
            };

            printConsole('observation', `Observation: 計算器回傳結果：\n- 最低毛利允許價: $${calcResult.min_allowed_price.toFixed(2)}\n- 建議零售價: $${calcResult.suggested_price.toFixed(2)}\n- 預期毛利率: ${calcResult.margin_ratio.toFixed(1)}%\n- 安全護欄觸發: ${calcResult.guardrail_triggered}`);
            await sleep(1000);

            // STEP 7: Generate Report
            printConsole('thought', `Thought: 數據運算完成。現在將定性的 SWOT 與定量的 $${recommendedPrice.toFixed(2)} 定價數據結合，產出最終的市場調查與定價決策報告。`);
            await sleep(1000);
            printConsole('system', `[SYSTEM] 報告生成成功，ShopIntelAgent 任務圓滿結束。`);
            
            // Render UI Results
            document.getElementById('res-cost').textContent = `$${productCost.toFixed(2)}`;
            document.getElementById('res-price').textContent = `$${recommendedPrice.toFixed(2)}`;
            document.getElementById('res-margin').textContent = `${expectedMargin.toFixed(1)}%`;
            
            const explainTextEl = document.getElementById('pricing-explain-text');
            explainTextEl.textContent = explanation;
            if (guardrailTriggered) {
                explainTextEl.style.color = '#f59e0b';
                explainTextEl.style.fontWeight = '600';
            } else {
                explainTextEl.style.color = 'var(--text-muted)';
                explainTextEl.style.fontWeight = 'normal';
            }

            // Update SWOT lists dynamically based on parameters
            const swotS = document.getElementById('swot-s');
            swotS.innerHTML = `
                <li>全鋁合金金屬質感外殼（直接攻克 Philips 塑料感痛點）</li>
                <li>實體與雙頻 Wi-Fi 雙重控制模組（解決 Philips 常斷線缺陷）</li>
                ${productCost < 30 ? '<li>成本結構優良，具備寬裕的價格戰防守空間</li>' : ''}
            `;

            // Fade in the results panel
            reportResults.style.display = 'block';
            
            stepBadge.textContent = 'COMPLETED';
            stepBadge.className = 'badge success';

        } catch (error) {
            printConsole('error', `[CRITICAL ERROR] 系統異常崩潰: ${error.message}`);
            stepBadge.textContent = 'ERROR';
            stepBadge.className = 'badge error';
        } finally {
            startBtn.disabled = false;
            startBtn.innerHTML = '<i class="fa-solid fa-play"></i> 開始自主編排分析';
        }
    });
});
