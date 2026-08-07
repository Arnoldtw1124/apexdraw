# Apex 轉盤小幫手 - OBS 實況主專用隨機英雄與槍械輪盤

專為 OBS Studio 實況主設計的視覺化輪盤與觀眾連動圖層，適用於《Apex 英雄 (Apex Legends)》。提供流暢卡片滾動輪盤、槍械與英雄篩選、Twitch 忠練點數零設定連動、觀眾排隊隊列管理與 OBS 完全透明圖層模式。

---

## 主要特色

- **雙動態橫向輪盤**：英雄與槍械卡片滾動，精準停留在中央指針。
- **Twitch 忠誠點數零設定連動**：無需申請 API 金鑰或 OAuth 驗證，輸入 Twitch 頻道名稱即可自動監聽觀眾兌換。
- **排隊隊列與控場面板**：支援觀眾兌換自動排隊，提供實況主一鍵抽下一位與完成挑戰管理。
- **高可讀性垂直圖層**：針對 OBS 角落縮放優化，大字級與高對比視覺設計，適合直播角落疊加。
- **防止音效重疊**：控場面板自動靜音，僅由直播圖層播放音效。

---

## 快速使用指南 (GitHub Pages)

本套件已部署於 GitHub Pages，無需下載或安裝任何 Python 環境，開啟 OBS 即可直接使用。

專案網址：
`https://arnoldtw1124.github.io/apexdraw/`

### 1. 新增 OBS 直播畫面圖層 (Browser Overlay Source)
在 OBS「來源」點擊 `+` -> 選擇 `瀏覽器`：
- **網址 (URL)**：`https://arnoldtw1124.github.io/apexdraw/?channel=你的TWITCH頻道帳號`
- **寬度 (Width)**：`320`
- **高度 (Height)**：`580`

### 2. 新增 OBS 控場面板 (Custom Dock)
點擊 OBS 頂部選單 `停駐視窗 (D)` -> `自訂瀏覽器停駐點...`：
- **停駐點名稱**：`Apex 輪盤控場`
- **網址 (URL)**：`https://arnoldtw1124.github.io/apexdraw/?mode=dock&channel=你的TWITCH頻道帳號`

> 備註：請將 `你的TWITCH頻道帳號` 替換為您的 Twitch 帳號名稱（例如 `arnoldtw1124`）。

---

## 參數設定說明

在網址後方可加上以下參數自訂功能：

| 參數 | 範例 | 說明 |
| --- | --- | --- |
| `channel` / `twitch` | `?channel=your_username` | 指定要監聽的 Twitch 頻道 |
| `reward` | `?reward=抽隨機英雄和槍枝` | 指定觸發排隊的忠誠點數獎勵名稱 |
| `mode` | `?mode=dock` | 開啟實況主控場面板模式 |

---

## 本地開發與運行 (進階/選填)

若需要於本地端進行離線開發或自訂擴充：

1. 確保電腦已安裝 Python 3.x。
2. 執行 `python server.py` 啟動本地同步伺服器 (Port 8000)。
3. 在 OBS 中將網址指定為 `http://localhost:8000/` 或 `http://localhost:8000/?mode=dock`。
