# exam_question_storage (monorepo)

這個 repo 已拆分為 monorepo，目標是同時維護 Web 與 Mobile 版本。

## 目錄結構

- `web/`: Next.js 網頁版（原本專案已搬移到這裡）
- `mobile/`: React Native App（後續新增，用於產出 APK）

## Web 開發

```bash
npm run dev:web
```

或進入 `web/` 後執行：

```bash
npm install
npm run dev
```

## 下一步（Mobile）

在 repo 根目錄建立 React Native 專案到 `mobile/`：

```bash
npx react-native init ExamQuestionStorageMobile --directory mobile
```

之後可在 `mobile/android` 打包 APK：

```bash
./gradlew assembleDebug
```
