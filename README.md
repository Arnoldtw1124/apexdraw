# Apex 轉盤小幫手 - OBS 實況主專用隨機英雄與槍械輪盤

專為 OBS Studio 實況主打造的視覺化轉盤與觀眾連動外掛，適用於《Apex 英雄 (Apex Legends)》。提供流暢卡片滾動輪盤、槍枝與英雄自訂篩選、Twitch 忠誠點數免設定連動、觀眾排隊名單管理與 OBS 完全透明圖層模式。

---

## 主要特色

- **雙動態橫向轉盤**：英雄與槍枝卡片滾動，精準停在中央指針。
- **Twitch 忠誠點數免設定連動**：不需要申請金鑰或搞懂 complicated 的 API 設定，輸入 Twitch 頻道名稱就能自動抓到觀眾兌換。
- **觀眾排隊名單與控場面板**：觀眾用點數兌換後自動排隊，提供實況主一鍵抽下一位與完成挑戰管理。
- **高可讀性垂直圖層**：針對 OBS 角落縮放優化，大字體與高對比視覺設計，放在直播角落超清楚。
- **防止音效重疊**：控場面板自動靜音，只有直播圖層會發出音效。

---

## 快速使用指南 (GitHub Pages)

本外掛已網頁化，不需要下載或安裝任何 Python 環境，直接開啟 OBS 貼上網址就能用。

專案網址：
`https://arnoldtw1124.github.io/apexdraw/`

### 1. 新增 OBS 直播畫面圖層 (Browser Overlay Source)
在 OBS「來源」點選 `+` -> 選擇 `瀏覽器`：
- **網址 (URL)**：`https://arnoldtw1124.github.io/apexdraw/?channel=你的TWITCH頻道帳號`
- **寬度 (Width)**：`320`
- **高度 (Height)**：`580`

### 2. 新增 OBS 控場面板 (Custom Dock)
點選 OBS 頂部選單 `停駐視窗 (D)` -> `自訂瀏覽器停駐點...`：
- **停駐點名稱**：`Apex 輪盤控場`
- **網址 (URL)**：`https://arnoldtw1124.github.io/apexdraw/?mode=dock&channel=你的TWITCH頻道帳號`

> 備註：請將 `你的TWITCH頻道帳號` 換成你的 Twitch 帳號（例如 `arnoldtw1124`）。

---

## 網址參數設定說明

在網址後面可以加上這些參數來調整功能：

| 參數 | 範例 | 說明 |
| --- | --- | --- |
| `channel` / `twitch` | `?channel=your_username` | 指定要抓取的 Twitch 頻道名稱 |
| `reward` | `?reward=抽隨機英雄和槍枝` | 指定觸發排隊的忠誠點數獎勵名稱 |
| `mode` | `?mode=dock` | 開啟實況主控場面板模式 |

---

## 本地端離線開發 (進階/選填)

如果你想在自己電腦本機跑，或是想自己改程式碼：

1. 電腦先安裝好 Python 3.x。
2. 執行 `python server.py` 啟動本機伺服器 (Port 8000)。
3. 在 OBS 裡面的網址改成 `http://localhost:8000/` 或 `http://localhost:8000/?mode=dock`。
