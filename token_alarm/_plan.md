# 刀剣乱舞 Chrome拡張 実装プラン

## Context
刀剣乱舞（ https://play.games.dmm.com/game/tohken ）向けのChrome拡張を新規作成する。
ゲームが呼び出す API `https://w006.touken-ranbu.jp/home/index` のレスポンスを傍受し、
各部隊・内番の完了10秒前にデスクトップ通知を出す。

---

## 作成ファイル構成

```
{project_folder}
├── manifest.json         # Manifest V3 設定
├── injected.js           # MAIN世界で動作。fetch をフック
├── content_script.js     # ISOLATED世界。injected.js ↔ background を橋渡し
├── background.js         # Service Worker。アラーム管理・通知発火
└── icon.png              # 通知用アイコン（16×16 プレースホルダ PNG）
```

---

## 各ファイルの役割と設計

### manifest.json
- Manifest V3
- `permissions`: `notifications`, `alarms`
- `host_permissions`: `https://play.games.dmm.com/*`, `https://w006.touken-ranbu.jp/*`
- content_scripts を2本定義:
  1. `injected.js` — `world: "MAIN"`, `run_at: "document_start"`
  2. `content_script.js` — `world: "ISOLATED"` (デフォルト), `run_at: "document_start"`
- background: `{ service_worker: "background.js" }`

### injected.js（MAIN世界）
- `window.fetch` をラップし、URLが `/home/index` にマッチしたら
  レスポンスを `.clone().json()` で取得
- `window.postMessage({ type: "TOUKEN_HOME_INDEX", data: <JSON> }, "*")` で送出

### content_script.js（ISOLATED世界）
- `window.addEventListener("message")` で `type === "TOUKEN_HOME_INDEX"` を受信
- `chrome.runtime.sendMessage({ type: "TOUKEN_HOME_INDEX", data })` でbackgroundへ転送

### background.js（Service Worker）
受信後の処理:
1. 既存アラームを全クリア (`chrome.alarms.clearAll`)
2. `party[1～5].finished_at` をループ
   - 空文字なら skip
   - JST文字列（"2026-05-21 16:16:47"）を `Date.parse(str + "+09:00")` でms変換
   - `alarmTime = parsedMs - 10_000`（10秒前）
   - `chrome.alarms.create("party_N", { when: alarmTime })`
3. `situation.duty.finished_at` も同様
   - `chrome.alarms.create("duty", { when: alarmTime })`
4. `chrome.alarms.onAlarm.addListener` で発火時:
   - アラーム名が `party_` で始まる → タイトル `"部隊完了"`, メッセージ `"party.N finished"`
   - アラーム名が `duty` → タイトル `"内番完了"`, メッセージ `"uchiban finished"`
   - `chrome.notifications.create(alarmName, { type:"basic", iconUrl:"icon.png", title, message })`

---

## アラームの制限について
- Chrome は通常、アラームを最短1分に制限するが、**未パッケージ（Load unpacked）の開発用拡張は制限なし**
- 本拡張はローカルで「パッケージなし読み込み」で使用するため、10秒前アラームは正常に動作する

---

## 通知フォーマット
| 通知 | タイトル | メッセージ |
|------|--------|----------|
| 部隊 | `部隊完了` | `party.1 finished`〜`party.5 finished` |
| 内番 | `内番完了` | `uchiban finished` |

---

## 検証手順
1. Chrome で `chrome://extensions/` を開き「デベロッパーモード」ON
2. 「パッケージなし拡張機能を読み込む」→ プロジェクトフォルダを選択
3. `https://play.games.dmm.com/game/tohken` を開き、ゲームをプレイ
4. ホーム画面読み込み時に `home/index` APIが呼ばれ、アラームが設定される
5. `finished_at` の10秒前にデスクトップ通知が表示されることを確認
6. DevTools → Extensions のService Worker コンソールでログ確認
