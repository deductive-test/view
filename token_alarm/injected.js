// ページのMAIN世界で動作し、fetch と XHR の両方をフックして
// home/index API のレスポンスを傍受する。
// chrome.* API は使用不可のため window.postMessage で content_script.js へ送出する。
(function () {

  // home/index にマッチしたら postMessage で通知する
  function notifyHomeIndex(data) {
    window.postMessage({ type: "TOUKEN_HOME_INDEX", data }, "*");
    console.log("[token-alarm] home/index 検知 →", data?.now);
  }

  // ── fetch フック ───────────────────────────────────────────────────
  const originalFetch = window.fetch;
  window.fetch = async function (...args) {
    const response = await originalFetch.apply(this, args);

    try {
      const url =
        typeof args[0] === "string"
          ? args[0]
          : args[0]?.url ?? "";

      if (url.includes("/home/index")) {
        // レスポンスボディはゲーム側でも使うためクローンして読む
        response.clone().json().then(notifyHomeIndex);
      }
    } catch (_e) {
      // フック処理のエラーはゲームの動作に影響させない
    }

    return response;
  };

  // ── XMLHttpRequest フック ─────────────────────────────────────────
  // fetch ではなく XHR を使うゲームに対応する
  const OriginalOpen = XMLHttpRequest.prototype.open;
  const OriginalSend = XMLHttpRequest.prototype.send;

  XMLHttpRequest.prototype.open = function (method, url, ...rest) {
    // リクエスト URL を後で参照できるようインスタンスに保持する
    this._interceptUrl = typeof url === "string" ? url : "";
    return OriginalOpen.apply(this, [method, url, ...rest]);
  };

  XMLHttpRequest.prototype.send = function (...args) {
    if (this._interceptUrl && this._interceptUrl.includes("/home/index")) {
      this.addEventListener("load", function () {
        try {
          const data = JSON.parse(this.responseText);
          notifyHomeIndex(data);
        } catch (_e) {
          // JSON パースに失敗しても無視
        }
      });
    }
    return OriginalSend.apply(this, args);
  };

  console.log("[token-alarm] injected.js 読み込み完了 →", location.href);
})();
