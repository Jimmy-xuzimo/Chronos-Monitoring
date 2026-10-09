/* ============================================================
   CHRONOS — prefs.js
   用户偏好：主题 / 语言 / 轮询间隔 / 扫描线
   持久化于 localStorage，并在最早时机应用主题，避免闪烁。
   ============================================================ */

(function () {
  "use strict";

  var KEY = "chronos_panel_prefs";

  var DEFAULTS = {
    theme: "light", // light | dark
    language: "zh", // zh | en
    pollInterval: 5000, // 毫秒
    scanlines: true
  };

  function read() {
    try {
      var raw = localStorage.getItem(KEY);
      if (!raw) return Object.assign({}, DEFAULTS);
      var obj = JSON.parse(raw) || {};
      return Object.assign({}, DEFAULTS, obj);
    } catch (e) {
      return Object.assign({}, DEFAULTS);
    }
  }

  var prefs = read();

  function persist() {
    try {
      localStorage.setItem(KEY, JSON.stringify(prefs));
    } catch (e) {
      /* 隐私模式等场景下忽略写入失败 */
    }
  }

  function normalizeTheme(t) {
    return t === "dark" ? "dark" : "light";
  }

  function applyAppearance() {
    var html = document.documentElement;
    var theme = normalizeTheme(prefs.theme);
    html.setAttribute("data-theme", theme);
    html.setAttribute("data-scanlines", prefs.scanlines ? "on" : "off");
    html.setAttribute("lang", prefs.language === "en" ? "en" : "zh-CN");

    var meta = document.querySelector('meta[name="theme-color"]');
    if (meta) meta.setAttribute("content", theme === "dark" ? "#14171a" : "#e0e5ec");
  }

  function notify() {
    document.dispatchEvent(
      new CustomEvent("chronos:prefs", { detail: Object.assign({}, prefs) })
    );
  }

  /** 合并保存，写入后立即应用外观并广播变更 */
  function save(patch) {
    prefs = Object.assign({}, prefs, patch || {});
    persist();
    applyAppearance();
    notify();
    return Object.assign({}, prefs);
  }

  /** 恢复默认 */
  function reset() {
    prefs = Object.assign({}, DEFAULTS);
    persist();
    applyAppearance();
    notify();
    return Object.assign({}, prefs);
  }

  // 尽早应用（prefs.js 在 <head> 中同步加载）
  applyAppearance();

  window.CHRONOS_PREFS = {
    get: function () {
      return Object.assign({}, prefs);
    },
    save: save,
    reset: reset,
    defaults: Object.assign({}, DEFAULTS)
  };
})();