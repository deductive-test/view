// ISOLATED世界で動作し、injected.js（MAIN世界）からの postMessage を受信して
// background.js（Service Worker）へ chrome.runtime.sendMessage で転送する。

window.addEventListener("message", (event) => {
  // 同一ウィンドウからのメッセージのみ処理（セキュリティ対策）
  if (event.source !== window) return;
  if (!event.data || event.data.type !== "TOUKEN_HOME_INDEX") return;

  chrome.runtime.sendMessage({
    type: "TOUKEN_HOME_INDEX",
    data: event.data.data,
  });
});
