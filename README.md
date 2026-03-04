# exam_question_storage

美容丙級 / 共同科目題庫系統（Web + Android App）。

## 線上網址

- Web（GitHub Pages）：[https://kignite.github.io/exam_storage/](https://kignite.github.io/exam_storage/)

## 專案功能

- 題庫來源：PDF 轉 JSON，並補齊分類欄位
- 科目切換：美容丙級、共同科目
- 分類篩選：可依科目下的分類出題
- 背誦模式：直接顯示正解，可設定每頁題數
- 出題模式：可選題數（25/50/80/自訂 1~100）、計時、最終結算
- 測驗結算：分數、正確率、錯題回顧、錯誤分類統計
- 圖片題支援：JSON 題目可綁定選項圖片

## Monorepo 結構

- `web/`：Next.js 前端（可部署 GitHub Pages）
- `mobile/`：React Native Android App
- `web/scripts/`：PDF 轉題庫 JSON / 清理與補題工具

## 快速開始

安裝依賴：

```bash
npm install
```

啟動 Web 開發：

```bash
npm run dev:web
```

啟動 React Native Metro：

```bash
npm run start:mobile
```

啟動 Android（需模擬器或實機）：

```bash
npm run android:mobile
```

## 打包 APK

Debug APK：

```bash
npm run build:apk:debug
```

Release APK：

```bash
cd mobile/android
./gradlew clean assembleRelease
```

輸出位置：

- Debug：`mobile/android/app/build/outputs/apk/debug/app-debug.apk`
- Release：`mobile/android/app/build/outputs/apk/release/app-release.apk`

## 題庫資料

- 主資料：`web/public/questions.json`
- 共通科目圖片：`web/public/question-images/common/`

## App 截圖

將截圖放到 `docs/screenshots/` 後會直接顯示：

![設定畫面](docs/screenshots/app-settings.jpg)
![出題畫面](docs/screenshots/app-quiz.jpg)

---

## English

Exam bank system for Beauty Technician (Level C) + Common Subjects (Web + Android App).

## Live URL

- Web (GitHub Pages): [https://kignite.github.io/exam_storage/](https://kignite.github.io/exam_storage/)

## Features

- Question bank generated from PDFs and normalized into JSON
- Subject switch: Beauty Technician Level C / Common Subjects
- Category-based filtering
- Study mode: show correct answers directly, supports multiple questions per page
- Quiz mode: selectable question count (25/50/80/custom 1~100), timer, final summary
- Quiz summary: score, accuracy, wrong-question review, wrong-category statistics
- Image-question support via JSON option image mapping

## Monorepo Structure

- `web/`: Next.js frontend (deployable to GitHub Pages)
- `mobile/`: React Native Android app
- `web/scripts/`: PDF-to-JSON parsing and data-fixing scripts

## Quick Start

Install dependencies:

```bash
npm install
```

Run web in development:

```bash
npm run dev:web
```

Run React Native Metro:

```bash
npm run start:mobile
```

Run Android (emulator/device required):

```bash
npm run android:mobile
```

## Build APK

Debug APK:

```bash
npm run build:apk:debug
```

Release APK:

```bash
cd mobile/android
./gradlew clean assembleRelease
```

Outputs:

- Debug: `mobile/android/app/build/outputs/apk/debug/app-debug.apk`
- Release: `mobile/android/app/build/outputs/apk/release/app-release.apk`

## Question Data

- Main dataset: `web/public/questions.json`
- Common-subject image assets: `web/public/question-images/common/`

## App Screenshots

Put screenshots under `docs/screenshots/` and they will render here:

![Settings Screen](docs/screenshots/app-settings.jpg)
![Quiz Screen](docs/screenshots/app-quiz.jpg)
