/* ============================================================
   CHRONOS — panel.js
   主面板：设备徽章 / 时钟 / 监控轮询渲染 / 图表 / 复制 / 会话
   偏好（主题 / 语言 / 轮询）由 prefs.js 提供。
   ============================================================ */

(function () {
  "use strict";

  var CFG = window.CHRONOS_CONFIG || {};
  var API = window.CHRONOS_API;
  var PREFS = window.CHRONOS_PREFS;
  var I18N = window.CHRONOS_I18N;

  var pollTimer = null;
  var running = false;
  var failStreak = 0;

  var cpuChart = null;
  var netChart = null;

  function t(key) {
    return I18N ? I18N.t(key) : key;
  }
  function currentPoll() {
    var p = PREFS ? PREFS.get().pollInterval : CFG.POLL_INTERVAL;
    return p || CFG.POLL_INTERVAL || 5000;
  }

  /* ---------------- 工具函数 ---------------- */
  function $(id) {
    return document.getElementById(id);
  }
  /* 脏检查：值未变化时不触碰 DOM，避免无意义重排/重绘 */
  function setText(id, text) {
    var el = $(id);
    if (el && el.textContent !== text) el.textContent = text;
  }
  function setWidth(id, percent) {
    var el = $(id);
    if (!el) return;
    var w = Math.max(0, Math.min(100, percent)) + "%";
    if (el.style.width !== w) el.style.width = w;
  }
  function fmtBytes(b) {
    if (!b || b < 0) b = 0;
    var units = ["B", "KB", "MB", "GB", "TB"];
    var i = Math.floor(Math.log(b || 1) / Math.log(1024));
    if (i < 0) i = 0;
    if (i > units.length - 1) i = units.length - 1;
    return (b / Math.pow(1024, i)).toFixed(1) + " " + units[i];
  }
  function pad2(n) {
    return String(n).padStart(2, "0");
  }
  function escapeHtml(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }

  /* ---------------- 设备徽章 ---------------- */
  function renderDeviceBadge(info) {
    var badge = $("device-badge");
    if (badge && info) {
      badge.textContent =
        t("device.prefix") + ": " + info.device.toUpperCase() + " / " + info.orient.toUpperCase();
    }
  }
  document.addEventListener("chronos:device", function (e) {
    renderDeviceBadge(e.detail);
  });

  /* ---------------- 连接状态 ---------------- */
  function setConn(ok) {
    var chip = $("conn-status");
    if (!chip) return;
    chip.className = "chip " + (ok ? "ok" : "bad");
    chip.innerHTML =
      '<span class="dot' + (ok ? " ok pulse" : " bad pulse") + '"></span>' +
      escapeHtml(ok ? t("conn.ok") : t("conn.lost"));
  }

  /* ---------------- 时钟 ---------------- */
  var WEEK = ["SUN", "MON", "TUE", "WED", "THU", "FRI", "SAT"];
  function tickClock() {
    var n = new Date();
    setText(
      "clock-time",
      pad2(n.getHours()) + ":" + pad2(n.getMinutes()) + ":" + pad2(n.getSeconds())
    );
    setText(
      "clock-date",
      n.getFullYear() + "." + pad2(n.getMonth() + 1) + "." + pad2(n.getDate()) + " " + WEEK[n.getDay()]
    );
    setText("chip-clock", pad2(n.getHours()) + ":" + pad2(n.getMinutes()));

    var off = -n.getTimezoneOffset();
    var sign = off >= 0 ? "+" : "-";
    var a = Math.abs(off);
    setText("clock-meta", "UTC" + sign + pad2(Math.floor(a / 60)) + ":" + pad2(a % 60) + " · CN");
  }

  /* 时钟自适应（双向）：宽度或高度任一方向放不下时按比例缩小字号，
     确保"任何情况"下日期 + 时间 + 时区 + hex 全部完整显示 */
  var fitTimer = null;
  function fitClock() {
    var el = $("clock-time");
    var wrap = el && el.parentElement;
    if (!el || !wrap) return;
    el.style.fontSize = ""; // 先还原为 CSS 基准值
    // 最多迭代 3 次（字号缩小后重测，逐步收敛）
    for (var i = 0; i < 3; i++) {
      var fs = parseFloat(getComputedStyle(el).fontSize) || 40;
      var scale = 1;
      // 横向：时间文本宽度不得超过容器
      if (wrap.clientWidth > 0 && el.scrollWidth > wrap.clientWidth) {
        scale = Math.min(scale, (wrap.clientWidth / el.scrollWidth) * 0.98);
      }
      // 纵向：整列内容高度不得超过容器
      if (wrap.clientHeight > 0 && wrap.scrollHeight > wrap.clientHeight) {
        scale = Math.min(scale, (wrap.clientHeight / wrap.scrollHeight) * 0.98);
      }
      if (scale >= 1) break;
      el.style.fontSize = Math.max(10, Math.floor(fs * scale)) + "px";
    }
  }
  function queueFitClock() {
    clearTimeout(fitTimer);
    fitTimer = setTimeout(fitClock, 60);
  }

  /* 时钟 hex 装饰行：每 2 秒刷新一串"内存 dump"字节，极客氛围（纯本地随机） */
  function tickHex() {
    var el = $("clock-hex");
    if (!el) return;
    var bytes = [];
    for (var i = 0; i < 8; i++) {
      bytes.push((Math.random() * 256 | 0).toString(16).toUpperCase().padStart(2, "0"));
    }
    el.textContent = bytes.join(" ");
  }

  /* ---------------- 图表（chart-lite.js 本地轻量库） ---------------- */
  function isDark() {
    return document.documentElement.getAttribute("data-theme") === "dark";
  }

  function applyChartTheme() {
    var dark = isDark();
    var theme = {
      grid: dark ? "rgba(223,228,232,0.09)" : "rgba(43,58,66,0.06)",
      text: dark ? "rgba(223,228,232,0.55)" : "rgba(43,58,66,0.55)"
    };
    [cpuChart, netChart].forEach(function (c) {
      if (c && c.setTheme) c.setTheme(theme);
    });
  }

  function initCharts() {
    var lib = window.CHRONOS_CHART;
    if (!lib) {
      ["cpu", "net"].forEach(function (k) {
        var fb = $("chart-fallback-" + k);
        if (fb) fb.style.display = "flex";
      });
      return;
    }
    if (cpuChart || netChart) return;

    var cpuCanvas = $("cpu-chart");
    if (cpuCanvas) {
      cpuChart = lib.create(cpuCanvas, {
        datasets: [{ color: "#ff4500", fill: true }],
        yMin: 0,
        yMax: 100
      });
    }

    var netCanvas = $("net-chart");
    if (netCanvas) {
      netChart = lib.create(netCanvas, {
        datasets: [
          { color: "#16a34a", fill: false },
          { color: "#2563eb", fill: false }
        ],
        yMin: 0
      });
    }
  }

  function pushSeries(chart, values) {
    if (chart && chart.push) chart.push(values);
  }

  /* ---------------- 渲染监控数据 ---------------- */
  var lastStats = null;

  function fmtUptime(s) {
    s = Math.max(0, s | 0);
    var d = Math.floor(s / 86400);
    var h = Math.floor((s % 86400) / 3600);
    var m = Math.floor((s % 3600) / 60);
    return (d > 0 ? d + "d " : "") + h + "h " + m + "m";
  }

  function renderStats(d) {
    lastStats = d;
    var sys = d.system || {};
    setText("sys-hostname", sys.hostname || "--");
    setText("sys-os", sys.os || "--");
    setText("sys-kernel", sys.kernel || "--");
    setText("sys-uptime", sys.uptime != null ? fmtUptime(sys.uptime) : "--");
    setText("sys-procs", sys.procs != null ? sys.procs : "--");
    setText("sys-load", (sys.load || []).map(function (x) { return Number(x).toFixed(2); }).join(" / "));
    setText("sys-cores", sys.cpu_cores ? sys.cpu_cores + "C" : "--");
    setText("sys-cpumodel", sys.cpu_model || "--");
    var ipEl = $("sys-ip");
    if (ipEl) {
      ipEl.textContent = sys.public_ip || "N/A";
      ipEl.title = sys.public_ip || "";
    }

    // CPU
    var cpu = (d.cpu && d.cpu.total) || 0;
    setText("cpu-val", cpu + "%");
    pushSeries(cpuChart, [cpu]);

    // 网络
    var net = d.net || {};
    setText("net-up", fmtBytes(net.tx) + "/s");
    setText("net-down", fmtBytes(net.rx) + "/s");
    setText("net-total-up", fmtBytes(net.total_tx));
    setText("net-total-down", fmtBytes(net.total_rx));
    pushSeries(netChart, [net.tx || 0, net.rx || 0]);

    // 内存
    var mem = d.mem || {};
    setText("mem-used", (mem.used / 1e9).toFixed(1) + " GB");
    setText("mem-total", (mem.total / 1e9).toFixed(1) + " GB");
    setText("mem-percent", mem.percent + "% " + t("mem.used"));
    setText("mem-avail", mem.available != null ? (mem.available / 1e9).toFixed(1) + " GB" : "--");
    setWidth("mem-bar", mem.percent);

    // 磁盘
    renderDisks(d.disks || []);

    // 弹窗打开时同步刷新详情
    updateModalLive();
  }

  /* 磁盘列表 diff 渲染：数据未变化时跳过 innerHTML 重建 */
  var lastDisksHash = "";
  function renderDisks(disks) {
    var box = $("disk-list");
    if (!box) return;
    setText("disk-count", disks.length + " MOUNT" + (disks.length === 1 ? "" : "S"));
    if (!disks.length) {
      if (lastDisksHash !== "empty") {
        lastDisksHash = "empty";
        box.innerHTML = '<div class="hint">' + escapeHtml(t("storage.empty")) + "</div>";
      }
      return;
    }
    var currentHash = JSON.stringify(disks);
    if (currentHash === lastDisksHash) return;
    lastDisksHash = currentHash;
    box.innerHTML = disks
      .map(function (k) {
        var io = k.io || { r: 0, w: 0 };
        var percent = Math.min(k.percent || 0, 100);
        return (
          '<div class="disk-item">' +
          '<div class="row-between">' +
          '<span class="disk-mount truncate" title="' + escapeHtml(k.mount) + '">' + escapeHtml(k.mount) + "</span>" +
          '<span class="disk-io"><span class="io-r">R:' + fmtBytes(io.r) + "/s</span> " +
          '<span class="io-w">W:' + fmtBytes(io.w) + "/s</span></span>" +
          "</div>" +
          '<div class="bar mt8"><span style="width:' + percent + '%"></span></div>' +
          '<div class="row-between disk-usage"><span>' + percent + "% USED</span><span>" +
          fmtBytes(k.used) + " / " + fmtBytes(k.total) + "</span></div>" +
          "</div>"
        );
      })
      .join("");
  }

  /* ---------------- 轮询 ---------------- */
  function tick() {
    API.stats()
      .then(function (r) {
        if (r.status === 401) {
          location.replace(CFG.LOGIN_URL || "login.html");
          return;
        }
        if (!r.ok) throw new Error("bad status " + r.status);
        renderStats(r.data);
        failStreak = 0;
        setConn(true);
      })
      .catch(function () {
        failStreak++;
        setConn(false);
      });
  }

  function startPolling() {
    if (running) return;
    running = true;
    tick();
    pollTimer = setInterval(tick, currentPoll());
  }

  function stopPolling() {
    running = false;
    if (pollTimer) {
      clearInterval(pollTimer);
      pollTimer = null;
    }
  }

  function restartPolling() {
    if (!running) return;
    stopPolling();
    startPolling();
  }

  /* ---------------- 核心入口导航 ---------------- */
  function renderEntries() {
    var box = $("nav-grid");
    if (!box) return;
    var zh = (PREFS ? PREFS.get().language : "zh") !== "en";
    box.innerHTML = (CFG.ENTRIES || [])
      .map(function (item) {
        var sub = zh ? item.cn : item.en || "";
        return (
          '<a class="nav-card" href="' + escapeHtml(item.href) + '" target="_blank" rel="noopener noreferrer">' +
          '<div class="nav-top"><span>' + escapeHtml(item.id) + "</span><span class=\"nav-arrow\">↗</span></div>" +
          '<div class="nav-title">' + escapeHtml(item.title) + "</div>" +
          (sub ? '<div class="nav-cn">' + escapeHtml(sub) + "</div>" : "") +
          '<div class="nav-host">' + escapeHtml(item.host || "") + "</div>" +
          "</a>"
        );
      })
      .join("");
  }

  /* ---------------- 联系方式 ---------------- */
  function copyText(text) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      return navigator.clipboard.writeText(text);
    }
    return new Promise(function (resolve, reject) {
      try {
        var ta = document.createElement("textarea");
        ta.value = text;
        ta.style.position = "fixed";
        ta.style.opacity = "0";
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        document.body.removeChild(ta);
        resolve();
      } catch (e) {
        reject(e);
      }
    });
  }

  function renderContacts() {
    var box = $("contact-list");
    if (!box) return;
    var html = (CFG.CONTACTS || [])
      .map(function (c, idx) {
        var label = c.short || c.name;
        // icon 为本地配置中的内联 SVG（受信内容），直接输出
        var inner =
          '<span class="contact-ico">' + (c.icon || "") + "</span>" +
          '<span class="contact-name">' + escapeHtml(label) + "</span>";

        if (c.type === "copy") {
          return (
            '<button class="contact-tile" type="button" data-copy="' + escapeHtml(c.value) +
            '" data-label="' + escapeHtml(label) + '" data-idx="' + idx + '" title="' +
            escapeHtml(c.name + ": " + c.value) + '">' + inner + "</button>"
          );
        }
        return (
          '<a class="contact-tile" href="' + escapeHtml(c.href) + '" target="_blank" rel="noopener noreferrer"' +
          ' title="' + escapeHtml(c.name + ": " + c.value) + '">' + inner + "</a>"
        );
      })
      .join("");
    box.innerHTML = html;

    box.querySelectorAll("[data-copy]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var text = btn.getAttribute("data-copy");
        var origLabel = btn.getAttribute("data-label") || "COPY";
        copyText(text)
          .then(function () {
            btn.classList.add("is-copied");
            var name = btn.querySelector(".contact-name");
            if (name) name.textContent = "COPIED";
            setTimeout(function () {
              btn.classList.remove("is-copied");
              if (name) name.textContent = origLabel;
            }, 1600);
          })
          .catch(function () {
            /* 复制失败时保持原样，用户可手动复制 */
          });
      });
    });
  }

  /* ============================================================
     面板点击放大：详情弹窗（数据来自最近一轮 lastStats，实时刷新）
     ============================================================ */
  var modalType = null;

  function kv(label, value, wide) {
    return (
      '<div class="' + (wide ? "wide" : "") + '">' +
      '<div class="label">' + escapeHtml(label) + "</div>" +
      '<div class="value">' + value + "</div>" +
      "</div>"
    );
  }

  function buildModalBody(type) {
    var d = lastStats || {};
    var sys = d.system || {};
    var mem = d.mem || {};
    var net = d.net || {};
    var cpu = d.cpu || {};
    var n = new Date();

    if (type === "time") {
      var dayPct = ((n.getHours() * 3600 + n.getMinutes() * 60 + n.getSeconds()) / 864).toFixed(1);
      var weekPct = (((n.getDay() === 0 ? 6 : n.getDay() - 1) * 86400 + n.getHours() * 3600 + n.getMinutes() * 60) / 604.8).toFixed(1);
      return (
        '<div class="modal-date" id="m-date">' + escapeHtml($("clock-date").textContent) + "</div>" +
        '<div class="modal-time" id="m-time">' + escapeHtml($("clock-time").textContent) + "</div>" +
        '<div class="kv-grid" style="margin-top:18px">' +
        kv(t("modal.iso"), n.toISOString().replace("T", " ").slice(0, 19) + " UTC") +
        kv(t("modal.epoch"), Math.floor(n.getTime() / 1000)) +
        kv(t("modal.dayprogress"), dayPct + "%", true) +
        '<div class="wide"><div class="bar big"><span style="width:' + dayPct + '%"></span></div></div>' +
        kv(t("modal.weekprogress"), weekPct + "%", true) +
        '<div class="wide"><div class="bar big"><span class="gray" style="width:' + weekPct + '%"></span></div></div>' +
        "</div>"
      );
    }

    if (type === "system") {
      return (
        '<div class="kv-grid">' +
        kv(t("sys.hostname"), escapeHtml(sys.hostname || "--")) +
        kv(t("sys.os"), escapeHtml(sys.os || "--")) +
        kv(t("sys.kernel"), escapeHtml(sys.kernel || "--")) +
        kv(t("sys.uptime"), fmtUptime(sys.uptime || 0)) +
        kv(t("sys.boot"), escapeHtml(sys.boot_time || "--")) +
        kv(t("sys.procs"), sys.procs != null ? sys.procs : "--") +
        kv(t("sys.load"), (sys.load || []).map(function (x) { return Number(x).toFixed(2); }).join(" / ")) +
        kv(t("sys.cores"), sys.cpu_cores || "--") +
        kv(t("sys.ip"), '<span class="ip-value">' + escapeHtml(sys.public_ip || "N/A") + "</span>") +
        kv(t("sys.cpumodel"), escapeHtml(sys.cpu_model || "--"), true) +
        "</div>"
      );
    }

    if (type === "nav") {
      var zh = (PREFS ? PREFS.get().language : "zh") !== "en";
      return (CFG.ENTRIES || [])
        .map(function (item) {
          var sub = zh ? item.cn : item.en || "";
          return (
            '<a class="nav-row-card" href="' + escapeHtml(item.href) + '" target="_blank" rel="noopener noreferrer">' +
            '<div style="flex:1;min-width:0">' +
            '<div class="nav-top"><span>' + escapeHtml(item.id) + "</span><span class=\"nav-arrow\">↗</span></div>" +
            '<div class="nav-title">' + escapeHtml(item.title) + "</div>" +
            (sub ? '<div class="nav-cn">' + escapeHtml(sub) + "</div>" : "") +
            '<div class="nav-host">' + escapeHtml(item.href) + "</div>" +
            "</div></a>"
          );
        })
        .join("");
    }

    if (type === "cpu") {
      var percpu = cpu.percpu || [];
      var coresHtml = percpu.length
        ? '<div class="core-grid" style="margin-top:16px">' + percpu.map(function (v, i) {
            return (
              '<div class="core-item">' +
              '<div class="row-between"><span class="label">CPU' + i + "</span><span class=\"value\">" + v + "%</span></div>" +
              '<div class="bar"><span style="width:' + Math.min(v, 100) + '%"></span></div>' +
              "</div>"
            );
          }).join("") + "</div>"
        : "";
      return (
        '<div class="kv-grid">' +
        kv(t("modal.cpu_now"), (cpu.total || 0) + "%") +
        kv(t("sys.load"), (sys.load || []).map(function (x) { return Number(x).toFixed(2); }).join(" / ")) +
        kv(t("sys.cores"), sys.cpu_cores || "--") +
        kv(t("sys.procs"), sys.procs != null ? sys.procs : "--") +
        kv(t("sys.cpumodel"), escapeHtml(sys.cpu_model || "--"), true) +
        "</div>" +
        '<div class="label" style="margin:16px 0 4px">' + escapeHtml(t("modal.percpu")) + "</div>" +
        coresHtml
      );
    }

    if (type === "net") {
      var conns = net.conns || {};
      var ifacesHtml = (net.ifaces || [])
        .map(function (f) {
          return (
            '<div class="row-between" style="padding:6px 0;border-bottom:1px dashed var(--border)">' +
            '<span class="value">' + escapeHtml(f.name) + "</span>" +
            '<span class="muted">' + escapeHtml(f.ipv4) + "</span></div>"
          );
        })
        .join("");
      return (
        '<div class="kv-grid">' +
        kv(t("net.up"), '<span class="io-r">' + fmtBytes(net.tx) + "/s</span>") +
        kv(t("net.down"), '<span class="io-w">' + fmtBytes(net.rx) + "/s</span>") +
        kv(t("net.total.up"), fmtBytes(net.total_tx)) +
        kv(t("net.total.down"), fmtBytes(net.total_rx)) +
        kv(t("modal.est"), conns.est != null ? conns.est : "--") +
        kv(t("modal.lsn"), conns.lsn != null ? conns.lsn : "--") +
        "</div>" +
        '<div class="label" style="margin:16px 0 4px">' + escapeHtml(t("modal.ifaces")) + "</div>" +
        (ifacesHtml || '<div class="hint">--</div>')
      );
    }

    if (type === "mem") {
      return (
        '<div class="row-between" style="margin-bottom:8px">' +
        '<span class="value" style="font-size:15px">RAM</span>' +
        '<span class="value orange" style="font-size:26px;font-weight:800">' + (mem.percent || 0) + "%</span>" +
        "</div>" +
        '<div class="bar big"><span style="width:' + (mem.percent || 0) + '%"></span></div>' +
        '<div class="kv-grid" style="margin-top:16px">' +
        kv(t("modal.mem_used"), (mem.used / 1e9).toFixed(2) + " GB") +
        kv(t("mem.avail"), (mem.available / 1e9 || 0).toFixed(2) + " GB") +
        kv(t("mem.total"), (mem.total / 1e9).toFixed(2) + " GB") +
        "</div>"
      );
    }

    if (type === "storage") {
      return (d.disks || [])
        .map(function (k) {
          var io = k.io || { r: 0, w: 0 };
          var percent = Math.min(k.percent || 0, 100);
          return (
            '<div style="padding:10px 0;border-bottom:1px dashed var(--border)">' +
            '<div class="row-between">' +
            '<span class="value">' + escapeHtml(k.mount) + ' <span class="muted">' + escapeHtml(k.device) + "</span></span>" +
            '<span class="muted">' + percent + "% · " + fmtBytes(k.used) + " / " + fmtBytes(k.total) + "</span>" +
            "</div>" +
            '<div class="bar big mt8"><span style="width:' + percent + '%"></span></div>' +
            '<div class="row-between mt8" style="font-size:10px">' +
            '<span class="io-r">R:' + fmtBytes(io.r) + "/s</span>" +
            '<span class="io-w">W:' + fmtBytes(io.w) + "/s</span>" +
            "</div></div>"
          );
        })
        .join("") || '<div class="hint">' + escapeHtml(t("storage.empty")) + "</div>";
    }

    if (type === "contact") {
      return (CFG.CONTACTS || [])
        .map(function (c) {
          return (
            '<div class="contact-row">' +
            '<span class="contact-ico">' + (c.icon || "") + "</span>" +
            '<div class="contact-row-info">' +
            '<div class="contact-row-name">' + escapeHtml(c.name) + "</div>" +
            '<div class="contact-row-val">' + escapeHtml(c.value) + "</div>" +
            "</div>" +
            (c.type === "copy"
              ? '<button class="btn ghost" type="button" data-copy="' + escapeHtml(c.value) + '">' + escapeHtml(t("modal.copy")) + "</button>"
              : '<a class="btn ghost" href="' + escapeHtml(c.href) + '" target="_blank" rel="noopener noreferrer">' + escapeHtml(t("modal.open")) + " ↗</a>") +
            "</div>"
          );
        })
        .join("");
    }

    return "";
  }

  function openModal(type) {
    var mask = $("modal-mask");
    var body = $("modal-body");
    var title = $("modal-title");
    if (!mask || !body) return;
    modalType = type;
    title.textContent = t("panel." + type);
    body.innerHTML = buildModalBody(type);
    mask.hidden = false;
    bindModalActions(body);
  }

  function closeModal() {
    var mask = $("modal-mask");
    if (mask) mask.hidden = true;
    modalType = null;
  }

  /* 弹窗内动态按钮（复制等） */
  function bindModalActions(body) {
    body.querySelectorAll("[data-copy]").forEach(function (btn) {
      btn.addEventListener("click", function () {
        copyText(btn.getAttribute("data-copy"))
          .then(function () {
            var orig = btn.textContent;
            btn.textContent = t("modal.copied");
            setTimeout(function () {
              btn.textContent = orig;
            }, 1500);
          })
          .catch(function () {});
      });
    });
  }

  /* 弹窗打开期间，监控数据与时间实时刷新 */
  function updateModalLive() {
    if (!modalType) return;
    if (modalType === "time") {
      var mt = $("m-time");
      var md = $("m-date");
      if (mt) mt.textContent = $("clock-time").textContent;
      if (md) md.textContent = $("clock-date").textContent;
      return; // 时间类只刷新时间，避免重建 DOM
    }
    // 其余面板重建太重，仅在关键数值变化时刷新 CPU / 内存头部
    var body = $("modal-body");
    if (!body) return;
    if (modalType === "cpu") {
      var el = body.querySelector(".value"); // 首个 kv 为当前 CPU
      if (el && lastStats && lastStats.cpu) el.textContent = (lastStats.cpu.total || 0) + "%";
    }
  }

  function initZoom() {
    // 每个可放大面板注入 ⤢ 按钮
    document.querySelectorAll(".dash > .panel[data-zoom]").forEach(function (panel) {
      var head = panel.querySelector(".panel-head .head-right");
      if (head && !panel.querySelector(".zoom-btn")) {
        var btn = document.createElement("button");
        btn.className = "zoom-btn";
        btn.type = "button";
        btn.setAttribute("aria-label", "zoom");
        btn.textContent = "⤢";
        head.appendChild(btn);
      }

      panel.addEventListener("click", function (e) {
        // 内部链接 / 按钮交互不触发弹窗
        if (e.target.closest("a, button, .contact-tile, .nav-card")) return;
        openModal(panel.getAttribute("data-zoom"));
      });
    });

    var mask = $("modal-mask");
    if (mask) {
      mask.addEventListener("click", function (e) {
        if (e.target === mask) closeModal();
      });
    }
    var close = $("modal-close");
    if (close) close.addEventListener("click", closeModal);
    document.addEventListener("keydown", function (e) {
      if (e.key === "Escape") closeModal();
    });
  }

  /* ---------------- 会话 ---------------- */
  function initSession() {
    var logoutBtn = $("logout-btn");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", function () {
        window.CHRONOS_AUTH.logout();
      });
    }
  }

  /* ---------------- 启动 ---------------- */
  document.addEventListener("DOMContentLoaded", function () {
    if (!document.body || document.body.getAttribute("data-page") !== "panel") return;

    I18N.apply();
    renderDeviceBadge(window.CHRONOS_DEVICE || { device: "desktop", orient: "landscape" });

    window.CHRONOS_AUTH.requireSession().then(function (ok) {
      if (!ok) return;

      renderEntries();
      renderContacts();
      initSession();

      tickClock();
      setInterval(tickClock, 1000);
      fitClock();
      window.addEventListener("resize", queueFitClock);
      if (document.fonts && document.fonts.ready) {
        document.fonts.ready.then(fitClock).catch(function () {});
      }

      // hex 字节流装饰：立即刷新一次 + 每 2 秒轮换
      tickHex();
      setInterval(tickHex, 2000);

      // 面板点击放大（详情弹窗）
      initZoom();

      initCharts();
      applyChartTheme();
      setConn(true);
      startPolling();

      // 偏好变更：主题 / 语言 / 轮询实时联动
      document.addEventListener("chronos:prefs", function () {
        applyChartTheme();
        renderEntries();
        renderContacts();
        setConn(true);
        restartPolling();
      });

      document.addEventListener("visibilitychange", function () {
        if (document.hidden) {
          stopPolling();
        } else {
          startPolling();
        }
      });
    });
  });
})();