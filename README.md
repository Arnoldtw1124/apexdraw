# OBS Visual Roulette Plugin - Apex Legends 隨機英雄與槍械組合輪盤 🎯

一款專為 **OBS Studio** 實況主設計的高品質視覺化輪盤與英雄橫向選單插件，適用於《Apex 英雄 (Apex Legends)》。提供流暢 60 FPS 橫向卡片滾動、槍械輪盤動畫、齒輪轉動擬真音效、獲勝彩帶紙屑特效、自訂英雄與槍械庫，以及 OBS 圖層透明背景模式。

---

## 🌟 核心特色 (Key Features)

- ⚡ **橫向動態英雄選單 (Hero Reel)**：英雄以角色選單樣式自左向右滾動，最終精準停留在中央瞄準框。
- 🖼️ **支援全格式圖片 (AVIF / WEBP / PNG / JPG)**：您可以直接在 `images/` 資料夾放入 `.avif`、`.webp`、`.png` 或 `.jpg` 英雄圖片（例如 `wraith.avif` 或 `wraith.png`），系統會自動偵測並呈現！
- ⚔️ **槍械輪盤 (Weapon Roulette)**：同時連動抽籤，自動生成隨機挑戰組合 (例：`惡靈 + R-99 衝鋒槍`)。
- 🎨 **自訂英雄與槍械庫**：實況主可在右側選單隨時勾選或取消特定英雄/槍械，儲存狀態將自動保留於瀏覽器。
- 🔊 **Web Audio API 擬真音效**：無需載入外部 MP3 檔案，內建機械齒輪轉動音效與獲勝音效。
- 🖼️ **OBS 完全透明背景支援**：帶有 `?mode=overlay` 參數時自動轉為透明畫質，完美疊加於遊戲畫面之上。
- ⌨️ **快捷鍵支援**：按下鍵盤 `空白鍵 (Space)` 或 `S` 鍵即可直接發動輪盤旋轉！

---

## 🚀 OBS Studio 整合指南 (OBS Integration Setup)

### 模式 1：新增為實況圖層 (Browser Source Overlay)

1. 開啟 OBS Studio，在 **「來源 (Sources)」** 視窗中點擊 `+` 按鈕。
2. 選擇 **「瀏覽器 (Browser)」**，名稱可輸入 `Apex輪盤圖層`。
3. 在設定視窗中：
   - 勾選 **「本機檔案 (Local file)」**，並點擊瀏覽選擇本專案的 `index.html`。
   - 在 URL 設定尾端加上 `?mode=overlay`（例如 `file:///D:/OBS插件/index.html?mode=overlay`）。
   - 寬度 (Width) 設定為 `1280`，高度 (Height) 設定為 `720`。
4. 點擊 **確定** 即可在實況畫面上顯示透明背景的動態卡片選單與輪盤！

### 模式 2：設定為 OBS 實況主控制面板 (Custom Browser Dock)

1. 開啟 OBS Studio 上方選單：`檢視 (View)` &rarr; `動態分頁 (Docks)` &rarr; `自訂瀏覽器 Dock... (Custom Browser Docks...)`。
2. 在 **Dock 名稱** 輸入 `Apex輪盤控制台`。
3. 在 **URL** 填入 `index.html` 的絕對路徑（例：`file:///D:/OBS插件/index.html`）。
4. 點擊 **套用 (Apply)** 即可！
