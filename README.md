# Apex 轉盤小幫手 - OBS 實況主專用隨機英雄與槍械輪盤 🎯

一款專為 **OBS Studio** 實況主設計的高品質視覺化輪盤與英雄選單插件，適用於《Apex 英雄 (Apex Legends)》。提供流暢 60 FPS 橫向卡片滾動、槍械選單、Twitch 忠誠點數零設定連動、實況主排隊控場卡片、觀眾即時排隊名單、OBS 完全透明背景圖層模式與跨進程毫秒級同步。

---

## 🌟 核心特色 (Key Features)

- ⚡ **雙橫向動態選單 (Hero & Weapon Reel)**：英雄與槍械橫向卡片滾動，精準停留在中央紅/藍瞄準框。
- 🔮 **Twitch 忠誠點數零設定連動 (Zero-Setup)**：不需要申請任何 API 金鑰或 OAuth Token，觀眾兌換點數即自動觸發排隊抽籤。
- 🛡️ **防刷扣點驗證與排隊佇列 (Anti-Spam & Queue)**：嚴格阻擋聊天室免費打字洗屏，多位觀眾同時兌換時自動進隊列，實況主打完一局點擊按鈕接續下一位！
- 📡 **OBS 本地即時廣播伺服器 (Local Sync Server)**：OBS 控制面板 (Dock) 與直播畫面 (Overlay) 100% 毫秒級雙向同步。
- 🔊 **防止重音 (Anti-Echo Audio)**：控制面板預設自動靜音，僅由 OBS 直播圖層發出清脆音效。
- 🎨 **角落極簡 HUD 視角**：直播圖層自動顯示觀眾排隊名單 (#1, #2, #3, #4)，隱藏設定選單，不遮擋遊戲畫面。

---

## 🚀 1 秒啟動與安裝 (1-Click Start)

解壓縮 Zip 套件後，只要在資料夾中雙擊執行 **`install.bat`**：
1. 系統會自動在背景啟動即時同步伺服器 `server.py` (Port 8000)。
2. 自動在桌面建立 **[Apex OBS 輪盤控制台]** 捷徑並開啟瀏覽器。

---

## 🖥️ OBS Studio 整合指南

### 1. 設定為 OBS 直播畫面圖層 (Browser Overlay Source)
- 在 OBS「來源」點擊 `+` &rarr; 選擇 `瀏覽器`。
- 網址輸入：`http://localhost:8000/?mode=overlay`
- 解析度設定：`800` x `600`。

### 2. 設定為 OBS 實況主控制面板 (Custom Dock)
- 點擊 OBS 頂部選單 `停駐視窗 (D)` &rarr; `自訂瀏覽器停駐點...`
- 停駐點名稱：`Apex輪盤`
- URL 輸入：`http://localhost:8000/`

---

## 🌐 雲端零安裝免伺服器部署方案 (Cloud Deployment Options)

若您想直接分享連結給其他實況主朋友，完全免下載 Python：
1. 將本專案上傳至 GitHub，開啟 **GitHub Pages**。
2. 網址即為 `https://<your-username>.github.io/apexdraw/`。
3. 其他實況主只需在 OBS 填寫此網址，即可直接使用（內建 HTML5 `BroadcastChannel` 本地廣播機制）！
