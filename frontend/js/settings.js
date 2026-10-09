/* ============================================================
   CHRONOS — settings.js
   设置页：外观（主题/扫描线）/ 语言 / 轮询 / 安全设置 / 会话 / 数据
   ============================================================ */

(function () {
  "use strict";

  var API = window.CHRONOS_API;
  var PREFS = window.CHRONOS_PREFS;
  var I18N = window.CHRONOS_I18N;

  function $(id) {
    return document.getElementById(id);
  }

  function t(key) {
    return I18N ? I18N.t(key) : key;
  }

  /* ---------------- 控件同步 ---------------- */
  function syncControls() {
    var p = PREFS.get();

    document.querySelectorAll("#theme-seg .seg-btn").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-value") === p.theme);
    });
    document.querySelectorAll("#lang-seg .seg-btn").forEach(function (btn) {
      btn.classList.toggle("is-active", btn.getAttribute("data-value") === p.language);
    });

    var sw = $("scanlines-switch");
    if (sw) {
      sw.classList.toggle("is-on", !!p.scanlines);
      sw.setAttribute("aria-checked", p.scanlines ? "true" : "false");
    }

    var sel = $("poll-select");
    if (sel) sel.value = String(p.pollInterval);
  }

  /* ---------------- 外观 ---------------- */
  function initAppearance() {
    document.querySelectorAll("#theme-seg .seg-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        PREFS.save({ theme: btn.getAttribute("data-value") });
        syncControls();
      });
    });

    var sw = $("scanlines-switch");
    if (sw) {
      sw.addEventListener("click", function () {
        PREFS.save({ scanlines: !PREFS.get().scanlines });
        syncControls();
      });
    }
  }

  /* ---------------- 语言 ---------------- */
  function initLanguage() {
    document.querySelectorAll("#lang-seg .seg-btn").forEach(function (btn) {
      btn.addEventListener("click", function () {
        PREFS.save({ language: btn.getAttribute("data-value") });
        syncControls();
      });
    });
  }

  /* ---------------- 监控 ---------------- */
  function initMonitoring() {
    var sel = $("poll-select");
    if (!sel) return;
    sel.addEventListener("change", function () {
      var v = parseInt(sel.value, 10) || 5000;
      PREFS.save({ pollInterval: v });
    });
  }

  /* ---------------- 数据 ---------------- */
  function initData() {
    var btn = $("reset-btn");
    var hint = $("data-hint");
    if (!btn) return;
    btn.addEventListener("click", function () {
      PREFS.reset();
      syncControls();
      if (hint) {
        hint.textContent = t("settings.reset.done");
        hint.className = "hint mt8 ok";
        clearTimeout(hint._timer);
        hint._timer = setTimeout(function () {
          hint.textContent = "";
          hint.className = "hint mt8";
        }, 2200);
      }
    });
  }

  /* ---------------- 会话 ---------------- */
  function initSession() {
    ["logout-btn", "logout-btn-2"].forEach(function (id) {
      var btn = $(id);
      if (btn) {
        btn.addEventListener("click", function () {
          window.CHRONOS_AUTH.logout();
        });
      }
    });
  }

  /* ---------------- 安全设置 ---------------- */
  function initSecurity() {
    var form = $("sec-form");
    if (!form) return;
    var hint = $("sec-hint");
    var btn = $("sec-btn");

    function setHint(text, type) {
      if (!hint) return;
      hint.textContent = text || "";
      hint.className = "hint" + (type ? " " + type : "");
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var cur = ($("sec-current") || {}).value || "";
      var nu = ($("sec-new-user") || {}).value || "";
      var np = ($("sec-new-pass") || {}).value || "";

      if (!cur) {
        setHint(t("settings.sec.needCurrent"), "err");
        return;
      }
      if (!nu && !np) {
        setHint(t("settings.sec.needNew"), "err");
        return;
      }
      if (np && np.length < 6) {
        setHint(t("settings.sec.short"), "err");
        return;
      }

      btn.disabled = true;
      btn.textContent = t("common.saving");
      setHint("");

      API.credentials({ current_password: cur, new_username: nu, new_password: np })
        .then(function (r) {
          btn.disabled = false;
          btn.textContent = t("common.save");
          if (r.ok && r.data.ok) {
            setHint(t("settings.sec.saved"), "ok");
            form.reset();
          } else if (r.status === 401) {
            setHint(r.data.message || t("settings.sec.wrongPass"), "err");
          } else {
            setHint(r.data.message || t("settings.sec.fail"), "err");
          }
        })
        .catch(function () {
          btn.disabled = false;
          btn.textContent = t("common.save");
          setHint(t("settings.sec.netErr"), "err");
        });
    });
  }

  /* ---------------- 设备徽章 ---------------- */
  function renderDeviceBadge() {
    var badge = $("device-badge");
    var info = window.CHRONOS_DEVICE;
    if (badge && info) {
      badge.textContent = t("device.prefix") + ": " + info.device.toUpperCase() + " / " + info.orient.toUpperCase();
    }
  }

  /* ---------------- 启动 ---------------- */
  document.addEventListener("DOMContentLoaded", function () {
    if (!document.body || document.body.getAttribute("data-page") !== "settings") return;

    I18N.apply();
    syncControls();
    renderDeviceBadge();

    // 语言/外观变化后刷新依赖文案的控件
    document.addEventListener("chronos:prefs", function () {
      syncControls();
      renderDeviceBadge();
    });
    document.addEventListener("chronos:device", renderDeviceBadge);

    window.CHRONOS_AUTH.requireSession().then(function (ok) {
      if (!ok) return;
      initAppearance();
      initLanguage();
      initMonitoring();
      initData();
      initSession();
      initSecurity();
    });
  });
})();