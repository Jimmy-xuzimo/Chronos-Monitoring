/* ============================================================
   CHRONOS — config.js
   全站配置区：接口地址 / 轮询间隔 / 设备覆盖 / 入口导航 / 联系方式
   ============================================================ */

/* 联系方式平台图标（内联 SVG：描边风格 + currentColor 随主题着色，零外部请求） */
var CHRONOS_ICONS = {
  bilibili:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M7.2 2.8 9 5.2M16.8 2.8 15 5.2"/>' +
    '<rect x="2.8" y="5.4" width="18.4" height="12.2" rx="3.2"/>' +
    '<path d="M9 9.4v1.6M15 9.4v1.6"/>' +
    '<path d="M9.6 13.6h4.8"/>' +
    '<path d="M8.4 21.2 12 17.6l3.6 3.6"/>' +
    "</svg>",
  mail:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<rect x="2.8" y="5" width="18.4" height="14" rx="2.2"/>' +
    '<path d="m3.4 7.2 8.6 6.2 8.6-6.2"/>' +
    "</svg>",
  whatsapp:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M21 11.5a8.4 8.4 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.4 8.4 0 0 1-3.8-.9L3 21l1.9-5.7a8.4 8.4 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.4 8.4 0 0 1 3.8-.9h.5a8.5 8.5 0 0 1 8 8v.5z"/>' +
    '<path d="M9.2 8.6c-.5 2.9 3 6.6 6.2 7.2l1.3-1.6-2.2-1.1-1 .9c-1-.5-2.3-1.8-2.7-2.8l.9-.9-1.1-2.2-1.4.5z" fill="currentColor" stroke="none"/>' +
    "</svg>",
  wechat:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<path d="M10.4 4C6.4 4 3.2 6.7 3.2 10.1c0 1.9 1 3.6 2.6 4.7l-.7 2.5 2.6-1.3c.5.1.9.2 1.4.2h.4a5 5 0 0 1-.2-1.4c0-3 2.8-5.4 6.3-5.4h.3C15.4 6.2 13.2 4 10.4 4z"/>' +
    '<path d="M16 10.2c-3 0-5.4 2-5.4 4.4S13 19 16 19c.6 0 1.1-.1 1.6-.2l2.4 1.2-.6-2.2c1.2-.9 2-2.1 2-3.2 0-2.4-2.4-4.4-5.4-4.4z"/>' +
    '<circle cx="7.9" cy="9" r="0.55" fill="currentColor" stroke="none"/>' +
    '<circle cx="13" cy="9" r="0.55" fill="currentColor" stroke="none"/>' +
    '<circle cx="14.2" cy="14.6" r="0.5" fill="currentColor" stroke="none"/>' +
    '<circle cx="17.8" cy="14.6" r="0.5" fill="currentColor" stroke="none"/>' +
    "</svg>",
  github:
    '<svg viewBox="0 0 16 16" aria-hidden="true"><path fill="currentColor" d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38 0-.19-.01-.82-.01-1.49-2.01.37-2.53-.49-2.69-.94-.09-.23-.48-.94-.82-1.13-.28-.15-.68-.52-.01-.53.63-.01 1.08.58 1.23.82.72 1.21 1.87.87 2.33.66.07-.52.28-.87.51-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82.64-.18 1.32-.27 2-.27s1.36.09 2 .27c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48 0 1.07-.01 1.93-.01 2.2 0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8z"/></svg>',
  px500:
    '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">' +
    '<circle cx="12" cy="12" r="9.2"/>' +
    '<path d="M14.2 8h5.9M9.6 8h2.6M7.3 12.1 12.1 3.4M9.6 16h-6M14.2 16l-2.4 4.8M16.6 12l4.1 5.6"/>' +
    "</svg>"
};

window.CHRONOS_CONFIG = {
  /* ---------- 接口 ---------- */
  // 生产环境（Nginx 反向代理）：使用相对路径
  API_BASE: "/api",
  // 本地联调（直接双击 HTML 或 passthrough 静态服务）可改为：
  // API_BASE: "http://127.0.0.1:5000/api",

  /* ---------- 轮询 ---------- */
  // 低频轮询，降低服务器开销；页面切到后台时自动暂停
  POLL_INTERVAL: 5000,

  /* ---------- 设备识别 ---------- */
  // 强制指定设备类型用于调试：null | "mobile" | "tablet" | "desktop"
  DEVICE_OVERRIDE: null,

  /* ---------- 路由 ---------- */
  LOGIN_URL: "login.html",
  HOME_URL: "index.html",

  /* ---------- 核心入口导航 ---------- */
  ENTRIES: [
    {
      id: "MOD.01",
      title: "PROFILE",
      cn: "个人介绍主页",
      en: "Personal profile homepage",
      href: "https://www.example.com/",
      host: "www.example.com"
    },
    {
      id: "MOD.02",
      title: "AI DAILY",
      cn: "每日 AI 新闻",
      en: "Daily AI news digest",
      href: "https://news.example.com/",
      host: "news.example.com"
    },
    {
      id: "MOD.03",
      title: "STATUS",
      cn: "服务状态页",
      en: "Service status page",
      href: "https://status.example.com/",
      host: "status.example.com"
    }
  ],

  /* ---------- 联系方式 ---------- */
  // 演示用占位数据，请替换为你自己的信息
  // type: "link" 外链跳转 | "copy" 点击复制；short 为图标瓦片下的短标签
  // icon 取自上方 CHRONOS_ICONS（内联 SVG，随主题着色，零外部请求）
  CONTACTS: [
    {
      name: "BILIBILI",
      short: "BILI",
      icon: CHRONOS_ICONS.bilibili,
      value: "space.bilibili.com/000000000",
      type: "link",
      href: "https://space.bilibili.com/000000000"
    },
    {
      name: "EMAIL",
      short: "MAIL",
      icon: CHRONOS_ICONS.mail,
      value: "you@example.com",
      type: "link",
      href: "mailto:you@example.com"
    },
    {
      name: "WHATSAPP",
      short: "WA",
      icon: CHRONOS_ICONS.whatsapp,
      value: "+1 000 000 0000",
      type: "link",
      href: "https://wa.me/10000000000"
    },
    {
      name: "WECHAT",
      short: "WECHAT",
      icon: CHRONOS_ICONS.wechat,
      value: "your-wechat-id",
      type: "copy"
    },
    {
      name: "GITHUB",
      short: "GITHUB",
      icon: CHRONOS_ICONS.github,
      value: "github.com/yourname",
      type: "link",
      href: "https://github.com/yourname"
    },
    {
      name: "500PX",
      short: "500PX",
      icon: CHRONOS_ICONS.px500,
      value: "500px.com.cn/yourname",
      type: "link",
      href: "https://500px.com.cn/yourname"
    }
  ]
};