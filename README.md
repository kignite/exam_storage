# exam_storage

一個以 Next.js 製作的題庫系統，支援背誦模式與考試模式，資料來源為 PDF 轉出的 JSON 題庫。

## 功能簡介

- 背誦模式
  - 依科目與分類瀏覽題目
  - 每頁可顯示多題（可選每頁題數）
  - 直接顯示正確答案，方便快速複習

- 考試模式
  - 依科目與分類出題
  - 題數可選 `25 / 50 / 80 / 自訂(1~100)`
  - 測驗計時
  - 交卷後顯示：總題數、答對/答錯、正確率、分數、總用時
  - 錯誤回顧含完整選項，並標示錯誤/正確選項

## 專案結構

- `app/`：Next.js App Router 頁面與 API
- `output/`：題庫 JSON（由 PDF 轉出）
- `scripts/pdf_to_question_json.py`：PDF 轉 JSON 工具

## 安裝與啟動

```bash
npm install
npm run dev
```

啟動後打開：`http://localhost:3000`

正式建置：

```bash
npm run build
npm run start
```

## 題庫資料格式

題目資料放在：

- `output/questions_美容丙級.json`
- `output/questions_共同科目.json`

每題包含主要欄位：

- `subject`：科目
- `category`：分類（例如：皮膚認識、工作倫理與職業道德）
- `question`：題目
- `options`：選項（A/B/C/D）
- `answer`：正確答案

## PDF 轉檔流程

如果有新的 PDF，可用下列指令重新產生題庫：

```bash
python3 scripts/pdf_to_question_json.py \
  '/path/to/美容丙級.pdf' \
  '/path/to/共同科目.pdf'
```

輸出會寫到 `output/` 目錄。

## 開發備註

- API：`GET /api/questions`
- 前端目前使用本地 JSON，不需額外資料庫
- 若更新題庫內容，重新啟動 dev server 可確保讀到最新資料
