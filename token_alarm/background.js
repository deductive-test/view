// Service Worker として動作し、アラームの登録と通知の発火を管理する。

/**
 * JST日時文字列（"2026-05-21 16:16:47"）をミリ秒（UTC基準）に変換する。
 * @param {string} jstStr
 * @returns {number} Unix時刻（ms）
 */
function parseJstToMs(jstStr) {
  // "2026-05-21 16:16:47" → "2026-05-21T16:16:47+09:00" として解析
  return Date.parse(jstStr.replace(" ", "T") + "+09:00");
}

/**
 * 完了時刻の60秒前にアラームを登録する。
 * @param {string} name     アラーム識別名（例: "party_1", "duty"）
 * @param {string} finishedAt  JST日時文字列
 */
function scheduleAlarm(name, finishedAt) {
  if (!finishedAt) return;

  const finishedMs = parseJstToMs(finishedAt);
  if (isNaN(finishedMs)) return;

  const alarmTime = finishedMs - 60_000; // 60秒前

  // すでに過去の時刻なら登録しない
  if (alarmTime <= Date.now()) {
    console.log(`[刀剣乱舞通知] スキップ（過去の時刻）: ${name} → ${finishedAt}`);
    return;
  }

  chrome.alarms.create(name, { when: alarmTime });
  console.log(
    `[刀剣乱舞通知] アラーム登録: ${name} → ${new Date(alarmTime).toLocaleString("ja-JP")}`
  );
}

// ────────────────────────────────────────────────
// home/index レスポンスを受信してアラームを再設定する
// ────────────────────────────────────────────────
chrome.runtime.onMessage.addListener((message) => {
  if (message.type !== "TOUKEN_HOME_INDEX") return;

  const data = message.data;
  if (!data) return;

  console.log("[刀剣乱舞通知] home/index 受信 → アラームを再設定");

  // 既存のアラームをすべてクリアしてから新たに登録
  chrome.alarms.clearAll(() => {
    // 通知1: 遠征中の部隊完了通知
    // party[N].finished_at は前回遠征の完了時刻が残り続けるため使用しない。
    // situation.conquest[N].finished_at が現在進行中の遠征の正しい完了時刻。
    const conquests = data.situation?.conquest ?? {};
    for (const key of Object.keys(conquests)) {
      const conquest = conquests[key];
      if (conquest.finished_at) {
        scheduleAlarm(`party_${key}`, conquest.finished_at);
      }
    }

    // 通知2: 内番（duty）の完了通知
    const dutyFinishedAt = data.situation?.duty?.finished_at;
    if (dutyFinishedAt) {
      scheduleAlarm("duty", dutyFinishedAt);
    }
  });
});

// ────────────────────────────────────────────────
// アラーム発火時にデスクトップ通知を表示する
// ────────────────────────────────────────────────
chrome.alarms.onAlarm.addListener((alarm) => {
  let title = "";
  let message = "";

  if (alarm.name.startsWith("party_")) {
    // "party_1" → "party.1 finished"
    const partyNo = alarm.name.replace("party_", "");
    title = "部隊完了";
    message = `party.${partyNo} finished`;
  } else if (alarm.name === "duty") {
    title = "内番完了";
    message = "uchiban finished";
  } else {
    // 想定外のアラーム名は無視
    return;
  }

  chrome.notifications.create(alarm.name, {
    type: "basic",
    iconUrl: "icon.png",
    title,
    message,
  });

  console.log(`[刀剣乱舞通知] 通知発火: ${message}`);
});
