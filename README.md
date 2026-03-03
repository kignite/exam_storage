# exam_question_storage (monorepo)

這個 repo 採 monorepo，分開維護 Web 與 Mobile。

## 目錄結構

- `web/`: Next.js 網頁版（GitHub Pages）
- `mobile/`: React Native Android/iOS App

## Web（Next.js）

```bash
npm run dev:web
npm run build:web
```

## Mobile（React Native）

啟動 Metro：

```bash
npm run start:mobile
```

啟動 Android（需模擬器或實機）：

```bash
npm run android:mobile
```

打包 Debug APK：

```bash
npm run build:apk:debug
```

輸出位置：

- `mobile/android/app/build/outputs/apk/debug/app-debug.apk`
