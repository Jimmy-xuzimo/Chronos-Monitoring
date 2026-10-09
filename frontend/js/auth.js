/* ============================================================
   CHRONOS — auth.js
   统一的接口封装（CHRONOS_API）+ 会话鉴权（CHRONOS_AUTH）+ 登录页逻辑
   ============================================================ */

(function () {
  "use strict";

  var CFG = window.CHRONOS_CONFIG || {};
  var BASE = CFG.API_BASE || "/api";

  function request(path, options) {
    options = options || {};
    return fetch(BASE + path, {
      method: options.method || "GET",
      credentials: "same-origin",
      cache: "no-store",
      headers: options.body ? { "Content-Type": "application/json" } : {},
      body: options.body ? JSON.stringify(options.body) : undefined
    }).then(function (res) {
      return res
        .json()
        .catch(function () {
          return {};
        })
        .then(function (data) {
          return { ok: res.ok, status: res.status, data: data || {} };
        });
    });
  }

  window.CHRONOS_API = {
    base: BASE,
    request: request,
    session: function () {
      return request("/session");
    },
    login: function (username, password) {
      return request("/login", { method: "POST", body: { username: username, password: password } });
    },
    logout: function () {
      return request("/logout", { method: "POST" });
    },
    stats: function () {
      return request("/stats");
    },
    credentials: function (payload) {
      return request("/credentials", { method: "POST", body: payload });
    }
  };

  window.CHRONOS_AUTH = {
    /** 校验会话；未登录则跳转登录页，返回是否已登录 */
    requireSession: function () {
      return window.CHRONOS_API.session().then(function (r) {
        if (!r.data || !r.data.authenticated) {
          location.replace(CFG.LOGIN_URL || "login.html");
          return false;
        }
        return true;
      }).catch(function () {
        location.replace(CFG.LOGIN_URL || "login.html");
        return false;
      });
    },
    logout: function () {
      window.CHRONOS_API.logout().catch(function () {}).then(function () {
        location.replace(CFG.LOGIN_URL || "login.html");
      });
    }
  };

  /* ---------------- 登录页 ---------------- */
  function initLoginPage() {
    var form = document.getElementById("login-form");
    if (!form) return;

    var I18N = window.CHRONOS_I18N;
    var PREFS = window.CHRONOS_PREFS;
    function t(key) {
      return I18N ? I18N.t(key) : key;
    }

    var userInput = document.getElementById("username");
    var passInput = document.getElementById("password");
    var submitBtn = document.getElementById("login-submit");
    var hint = document.getElementById("login-hint");
    var toggle = document.getElementById("pass-toggle");
    var panel = document.getElementById("login-panel");

    function setHint(text, type) {
      if (!hint) return;
      hint.textContent = text || "";
      hint.className = "hint" + (type ? " " + type : "");
    }

    // 顶部快捷按钮：主题 / 语言
    var themeBtn = document.getElementById("login-theme");
    var langBtn = document.getElementById("login-lang");
    function syncTools() {
      if (!PREFS) return;
      var p = PREFS.get();
      if (themeBtn) themeBtn.textContent = p.theme === "dark" ? "☀" : "☾";
      if (langBtn) langBtn.textContent = p.language === "en" ? "中" : "EN";
      var badge = document.getElementById("device-badge");
      if (badge && window.CHRONOS_DEVICE) {
        badge.textContent = t("device.prefix") + ": " + window.CHRONOS_DEVICE.device.toUpperCase() +
          " / " + window.CHRONOS_DEVICE.orient.toUpperCase();
      }
      if (toggle && passInput && passInput.type === "password") toggle.textContent = t("login.show");
      if (toggle && passInput && passInput.type === "text") toggle.textContent = t("login.hide");
      if (submitBtn && !submitBtn.disabled) submitBtn.textContent = t("login.submit");
    }

    if (themeBtn && PREFS) {
      themeBtn.addEventListener("click", function () {
        PREFS.save({ theme: PREFS.get().theme === "dark" ? "light" : "dark" });
        syncTools();
      });
    }
    if (langBtn && PREFS) {
      langBtn.addEventListener("click", function () {
        PREFS.save({ language: PREFS.get().language === "en" ? "zh" : "en" });
        syncTools();
      });
    }
    document.addEventListener("chronos:prefs", syncTools);
    document.addEventListener("chronos:device", syncTools);

    I18N && I18N.apply();
    syncTools();

    // 已登录直接进入面板
    window.CHRONOS_API.session().then(function (r) {
      if (r.data && r.data.authenticated) {
        location.replace(CFG.HOME_URL || "index.html");
      }
    });

    if (toggle) {
      toggle.addEventListener("click", function () {
        var isPass = passInput.type === "password";
        passInput.type = isPass ? "text" : "password";
        toggle.textContent = isPass ? t("login.hide") : t("login.show");
      });
    }

    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var username = (userInput.value || "").trim();
      var password = passInput.value || "";

      if (!username || !password) {
        setHint(t("login.needInput"), "err");
        shake();
        return;
      }

      submitBtn.disabled = true;
      submitBtn.textContent = t("login.authenticating");
      setHint("");

      window.CHRONOS_API.login(username, password).then(function (r) {
        if (r.ok && r.data.ok) {
          setHint(t("login.granted"), "ok");
          location.replace(CFG.HOME_URL || "index.html");
          return;
        }
        submitBtn.disabled = false;
        submitBtn.textContent = t("login.submit");
        setHint(r.data.message || t("login.failed"), "err");
        shake();
      }).catch(function () {
        submitBtn.disabled = false;
        submitBtn.textContent = t("login.submit");
        setHint(t("login.netErr"), "err");
        shake();
      });
    });

    function shake() {
      if (!panel) return;
      panel.classList.remove("shake");
      // 强制重排以重启动画
      void panel.offsetWidth;
      panel.classList.add("shake");
    }
  }

  document.addEventListener("DOMContentLoaded", function () {
    if (document.body && document.body.getAttribute("data-page") === "login") {
      initLoginPage();
    }
  });
})();