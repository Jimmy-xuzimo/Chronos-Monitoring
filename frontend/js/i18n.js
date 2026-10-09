/* ============================================================
   CHRONOS — i18n.js
   中英文文案字典 + DOM 应用器
   元素通过 data-i18n / data-i18n-placeholder / data-i18n-title 标注。
   ============================================================ */

(function () {
  "use strict";

  var DICT = {
    zh: {
      /* 页面标题 */
      "title.panel": "CHRONOS // 个人控制台",
      "title.login": "CHRONOS // 访问",
      "title.settings": "CHRONOS // 设置",

      /* 通用 */
      "brand.sub": "PERSONAL PANEL // 个人控制台",
      "common.settings": "设置",
      "common.logout": "退出登录",
      "common.back": "返回面板",
      "common.save": "保存",
      "common.saving": "保存中...",
      "common.reset": "恢复默认",
      "common.on": "开启",
      "common.off": "关闭",

      /* 顶栏 / 状态 */
      "conn.ok": "链路正常",
      "conn.lost": "链路中断",
      "device.prefix": "设备",

      /* 面板标题 */
      "panel.time": "TIME // 时间",
      "panel.system": "SYSTEM OVERVIEW // 系统概览",
      "panel.nav": "QUICK ACCESS // 核心入口",
      "panel.cpu": "CPU LOAD HISTORY // 负载历史",
      "panel.net": "NETWORK I/O // 网络",
      "panel.mem": "MEMORY // 内存",
      "panel.storage": "STORAGE // 存储",
      "panel.contact": "CONTACT // 联系方式",

      /* 系统概览字段 */
      "sys.hostname": "HOSTNAME 主机名",
      "sys.os": "OS 操作系统",
      "sys.kernel": "KERNEL 内核",
      "sys.uptime": "UPTIME 运行时长",
      "sys.boot": "BOOT TIME 启动时间",
      "sys.procs": "PROCESSES 进程",
      "sys.load": "LOAD AVG 负载",
      "sys.cores": "CORES 核心",
      "sys.cpumodel": "CPU MODEL 处理器",
      "sys.ip": "PUBLIC IP 公网地址",
      "sys.server": "服务器",

      /* 内存 / 存储 */
      "mem.used": "已用",
      "mem.total": "总量",
      "mem.avail": "可用",
      "net.up": "上行",
      "net.down": "下行",
      "net.total.up": "累计上行",
      "net.total.down": "累计下行",
      "storage.empty": "未检测到可统计的挂载分区",
      "storage.loading": "读取中...",

      /* 弹窗详情 */
      "modal.iso": "UTC 时间",
      "modal.epoch": "EPOCH 秒",
      "modal.dayprogress": "今日进度",
      "modal.weekprogress": "本周进度",
      "modal.cpu_now": "当前负载",
      "modal.percpu": "PER-CPU 每核负载",
      "modal.est": "ESTABLISHED 连接",
      "modal.lsn": "LISTEN 监听",
      "modal.ifaces": "INTERFACES 网卡",
      "modal.mem_used": "已用内存",
      "modal.copy": "复制",
      "modal.copied": "已复制",
      "modal.open": "打开",

      /* 登录页 */
      "login.title": "身份验证",
      "login.user": "USER 账号",
      "login.pass": "PASS 密码",
      "login.submit": "登录",
      "login.authenticating": "验证中...",
      "login.show": "显示",
      "login.hide": "隐藏",
      "login.needInput": "请输入账号与密码",
      "login.granted": "验证通过，正在进入...",
      "login.failed": "账号或密码错误",
      "login.netErr": "无法连接服务器后端",
      "login.security": "安全连接",

      /* 设置页 */
      "settings.title": "SETTINGS // 系统设置",
      "settings.appearance": "外观模式",
      "settings.theme": "主题",
      "settings.theme.desc": "切换浅色 / 深色模式",
      "settings.theme.light": "浅色",
      "settings.theme.dark": "深色",
      "settings.scanlines": "扫描线质感",
      "settings.scanlines.desc": "关闭可提升低性能设备流畅度",
      "settings.head.language": "LANGUAGE // 语言",
      "settings.language": "语言",
      "settings.language.desc": "界面显示语言",
      "settings.monitoring": "MONITORING // 监控",
      "settings.poll": "轮询间隔",
      "settings.poll.desc": "间隔越大，服务器开销越低",
      "settings.poll.3": "3 秒",
      "settings.poll.5": "5 秒（推荐）",
      "settings.poll.10": "10 秒",
      "settings.poll.30": "30 秒",
      "settings.poll.60": "60 秒",
      "settings.security": "SECURITY // 安全设置",
      "settings.sec.desc": "修改登录账号与密码，至少保留一项",
      "settings.sec.current": "当前密码 CURRENT",
      "settings.sec.newUser": "新账号 NEW USER（可留空）",
      "settings.sec.newPass": "新密码 NEW PASS（可留空）",
      "settings.sec.saved": "已更新，下次登录请使用新账号密码",
      "settings.sec.wrongPass": "当前密码不正确",
      "settings.sec.fail": "更新失败",
      "settings.sec.needCurrent": "请输入当前密码",
      "settings.sec.needNew": "请至少填写新账号或新密码",
      "settings.sec.short": "新密码至少 6 位",
      "settings.sec.netErr": "无法连接服务器后端",
      "settings.session": "SESSION // 会话",
      "settings.session.desc": "退出后需要重新登录鉴权",
      "settings.data": "DATA // 数据",
      "settings.data.desc": "偏好设置保存在本机浏览器，不上传服务器",
      "settings.reset.done": "已恢复默认设置",
      "settings.saved": "已保存",

      /* 登录方式徽章 */
      "settings.badge.auth": "鉴权",
      "settings.badge.local": "本地",
      "settings.badge.sync": "同步"
    },
    en: {
      "title.panel": "CHRONOS // CONSOLE",
      "title.login": "CHRONOS // ACCESS",
      "title.settings": "CHRONOS // SETTINGS",

      "brand.sub": "PERSONAL PANEL // CONSOLE",
      "common.settings": "SETTINGS",
      "common.logout": "LOGOUT",
      "common.back": "BACK TO PANEL",
      "common.save": "SAVE",
      "common.saving": "SAVING...",
      "common.reset": "RESET DEFAULTS",
      "common.on": "ON",
      "common.off": "OFF",

      "conn.ok": "LINK OK",
      "conn.lost": "LINK LOST",
      "device.prefix": "DEVICE",

      "panel.time": "TIME",
      "panel.system": "SYSTEM OVERVIEW",
      "panel.nav": "QUICK ACCESS",
      "panel.cpu": "CPU LOAD HISTORY",
      "panel.net": "NETWORK I/O",
      "panel.mem": "MEMORY",
      "panel.storage": "STORAGE",
      "panel.contact": "CONTACT",

      "sys.hostname": "HOSTNAME",
      "sys.os": "OS",
      "sys.kernel": "KERNEL",
      "sys.uptime": "UPTIME",
      "sys.boot": "BOOT TIME",
      "sys.procs": "PROCESSES",
      "sys.load": "LOAD AVG",
      "sys.cores": "CORES",
      "sys.cpumodel": "CPU MODEL",
      "sys.ip": "PUBLIC IP",
      "sys.server": "SERVER",

      "mem.used": "USED",
      "mem.total": "TOTAL",
      "mem.avail": "AVAILABLE",
      "net.up": "UPLOAD",
      "net.down": "DOWNLOAD",
      "net.total.up": "TOTAL UP",
      "net.total.down": "TOTAL DOWN",
      "storage.empty": "No countable mount points detected",
      "storage.loading": "Loading...",

      "modal.iso": "UTC TIME",
      "modal.epoch": "EPOCH",
      "modal.dayprogress": "DAY PROGRESS",
      "modal.weekprogress": "WEEK PROGRESS",
      "modal.cpu_now": "CURRENT LOAD",
      "modal.percpu": "PER-CPU LOAD",
      "modal.est": "ESTABLISHED",
      "modal.lsn": "LISTEN",
      "modal.ifaces": "INTERFACES",
      "modal.mem_used": "USED MEMORY",
      "modal.copy": "COPY",
      "modal.copied": "COPIED",
      "modal.open": "OPEN",

      "login.title": "ACCESS CONTROL",
      "login.user": "USER",
      "login.pass": "PASS",
      "login.submit": "SIGN IN",
      "login.authenticating": "AUTHENTICATING...",
      "login.show": "SHOW",
      "login.hide": "HIDE",
      "login.needInput": "Please enter username and password",
      "login.granted": "ACCESS GRANTED",
      "login.failed": "Incorrect username or password",
      "login.netErr": "Cannot reach backend server",
      "login.security": "SECURE",

      "settings.title": "SETTINGS // CONFIGURATION",
      "settings.appearance": "APPEARANCE",
      "settings.theme": "Theme",
      "settings.theme.desc": "Switch between light and dark mode",
      "settings.theme.light": "Light",
      "settings.theme.dark": "Dark",
      "settings.scanlines": "Scanline texture",
      "settings.scanlines.desc": "Turn off for smoother rendering on low-end devices",
      "settings.head.language": "LANGUAGE",
      "settings.language": "Language",
      "settings.language.desc": "Interface display language",
      "settings.monitoring": "MONITORING",
      "settings.poll": "Poll interval",
      "settings.poll.desc": "Longer interval means less server overhead",
      "settings.poll.3": "3 s",
      "settings.poll.5": "5 s (recommended)",
      "settings.poll.10": "10 s",
      "settings.poll.30": "30 s",
      "settings.poll.60": "60 s",
      "settings.security": "SECURITY",
      "settings.sec.desc": "Change login username / password, at least one field",
      "settings.sec.current": "CURRENT PASSWORD",
      "settings.sec.newUser": "NEW USERNAME (optional)",
      "settings.sec.newPass": "NEW PASSWORD (optional)",
      "settings.sec.saved": "Updated. Use the new credentials next time.",
      "settings.sec.wrongPass": "Current password is incorrect",
      "settings.sec.fail": "Update failed",
      "settings.sec.needCurrent": "Please enter your current password",
      "settings.sec.needNew": "Fill in a new username or password",
      "settings.sec.short": "New password needs at least 6 characters",
      "settings.sec.netErr": "Cannot reach backend server",
      "settings.session": "SESSION",
      "settings.session.desc": "You will need to sign in again after logout",
      "settings.data": "DATA",
      "settings.data.desc": "Preferences are stored in this browser only",
      "settings.reset.done": "Defaults restored",
      "settings.saved": "Saved",

      "settings.badge.auth": "AUTH",
      "settings.badge.local": "LOCAL",
      "settings.badge.sync": "SYNC"
    }
  };

  function lang() {
    if (window.CHRONOS_PREFS) return window.CHRONOS_PREFS.get().language === "en" ? "en" : "zh";
    return "zh";
  }

  function t(key) {
    var table = DICT[lang()] || DICT.zh;
    if (table[key] != null) return table[key];
    if (DICT.zh[key] != null) return DICT.zh[key];
    return key;
  }

  function apply(root) {
    root = root || document;
    root.querySelectorAll("[data-i18n]").forEach(function (el) {
      el.textContent = t(el.getAttribute("data-i18n"));
    });
    root.querySelectorAll("[data-i18n-placeholder]").forEach(function (el) {
      el.setAttribute("placeholder", t(el.getAttribute("data-i18n-placeholder")));
    });
    root.querySelectorAll("[data-i18n-title]").forEach(function (el) {
      el.setAttribute("title", t(el.getAttribute("data-i18n-title")));
    });
    document.documentElement.setAttribute("lang", lang() === "en" ? "en" : "zh-CN");

    // 按页面同步浏览器标签标题
    var page = document.body ? document.body.getAttribute("data-page") : "";
    if (page) {
      var titleKey = "title." + page;
      var title = t(titleKey);
      if (title && title !== titleKey) document.title = title;
    }
  }

  window.CHRONOS_I18N = { t: t, apply: apply, lang: lang, dict: DICT };

  // 语言切换后自动重刷
  document.addEventListener("chronos:prefs", function () {
    apply();
  });
})();