"use strict";
const content = {
  zh: {
    skip: "跳转到内容",
    navigation: "主导航",
    mobileNavigation: "移动导航",
    openMenu: "打开导航",
    closeMenu: "关闭导航",
    navFeatures: "功能",
    navPreview: "面板预览",
    navStart: "快速开始",
    heroTag: "为个人服务器而生",
    heroLine1: "你的服务器，",
    heroLine2: "一目了然。",
    heroDesc:
      "从系统状态到服务入口，把日常需要的关键信息，收进一个轻量、清晰、属于你的面板。",
    getStarted: "开始部署",
    viewSource: "查看源代码",
    heroNote: "自托管 · 前端零 CDN · 中英双语",
    sample: "示意数据",
    processor: "处理器",
    artLabel: "监控面板示意，非实时数据",
    specPolling: "默认轮询间隔",
    specCdn: "前端 CDN 依赖",
    specLanguages: "中文 / English",
    specControl: "自托管，自主掌控",
    featuresTitle: "少一点负担，多一份掌控。",
    featuresDesc: "把注意力留给真正重要的事。\n日常运维需要的，刚好都在这里。",
    monitorTitle: "状态，不止一个数字。",
    monitorDesc:
      "CPU 历史曲线、内存占用、网络上下行、磁盘用量与读写速率。让系统的每一次变化，都有迹可循。",
    connectTitle: "所有入口，各就其位。",
    connectDesc:
      "将常用站点、服务后台与联系方式集中管理。从观察状态到打开服务，少一次寻找。",
    lightTitle: "轻装上阵，持续关注。",
    lightDesc:
      "默认每 5 秒轮询，切到后台自动暂停。Canvas 轻量图表，无前端 CDN 依赖，让资源回归你的服务。",
    personalTitle: "你的设备，你的习惯。",
    personalDesc:
      "手机、平板、电脑，横屏或竖屏。深浅主题、中英切换与独立设置页，让面板融入你的工作方式。",
    previewTitle: "让复杂，变得清晰。",
    previewDesc:
      "切换指标，感受信息的秩序。\n以下为交互示意，并非实时服务器数据。",
    demoLabel: "交互示意 · 非实时数据",
    demoLocal: "本地示意，无需连接服务器",
    metrics: "监控指标",
    memory: "内存",
    network: "网络",
    storage: "存储",
    networkDown: "网络下行",
    history: "历史趋势 / 示意",
    exploreInterface: "查看实际面板源码",
    useTitle: "为你的那台服务器。",
    useIntro:
      "一个个人项目，一份清楚的日常概览。为个人服务器、日常自托管和轻量运维而设计。",
    readDocs: "阅读项目文档",
    use1Title: "个人 VPS",
    use1Desc: "查看资源趋势与磁盘占用，在日常访问中了解服务器状态。",
    use2Title: "自托管工作台",
    use2Desc: "把分散的站点和管理入口放在一起，建立自己的服务起点。",
    use3Title: "随手查看",
    use3Desc: "用手机或平板打开面板，浏览 CPU、内存、网络与存储概况。",
    startTitle: "从这里，开始掌控。",
    startDesc:
      "克隆仓库，按照文档配置后端与 Nginx。\n在自己的 Ubuntu / Debian 服务器上运行。",
    deployGuide: "完整部署指南",
    copy: "复制命令",
    copied: "已复制 ✓",
    copyFailed: "复制失败，请选中命令手动复制。",
    installNote:
      "这是后端启动步骤。完整面板还需按文档部署前端、配置 Nginx 反向代理与 systemd 服务；使用虚拟环境时同步调整服务的 Python 路径。",
    deployNote:
      "正式部署时，请修改默认账号密码并启用 HTTPS。GitHub Pages 承载的是此介绍网站；监控面板和 Python 后端需要部署到自己的服务器。",
    faqTitle: "你可能还想知道。",
    faq1q: "可以直接在 GitHub Pages 上运行监控吗？",
    faq1a:
      "GitHub Pages 仅托管静态介绍网站。实际监控需要在目标服务器上运行 Flask 后端，并通过 Nginx 提供前端页面和 API 反向代理。",
    faq2q: "适合什么规模的监控需求？",
    faq2a:
      "CHRONOS 面向个人服务器与轻量日常查看。当前项目不提供多节点集中管理、告警编排或企业级可观测平台的完整能力。",
    faq3q: "面板如何刷新？会一直占用资源吗？",
    faq3a:
      "默认每 5 秒请求一次监控数据，可在设置中调整。页面进入后台时暂停轮询，回到前台立即刷新。实际资源占用取决于服务器配置和使用情况。",
    faq4q: "可以修改外观和服务入口吗？",
    faq4a:
      "可以。面板设置页支持深浅主题、中英切换和轮询间隔。常用服务与联系方式可在 frontend/js/config.js 中配置。使用与修改说明请参阅仓库 README。",
    ctaTitle: "让你的服务器，有个自己的主页。",
    ctaDesc: "探索源码，部署使用，或参与下一次改进。",
    ctaGithub: "在 GitHub 上探索",
    feedback: "反馈与建议",
    footerCredit: "由 Zimo Xu 构建 · 为个人服务器而设计",
    usage: "使用与修改说明",
    themePrefix: "主题：",
    themeSystem: "跟随系统",
    themeDark: "深色",
    themeLight: "浅色",
    themeNext: "点击切换至",
    cpuMetric: "CPU 使用率",
    memoryMetric: "内存使用率",
    networkMetric: "网络下行速率",
    chartLabel: "示意曲线",
    title: "CHRONOS — 你的服务器，一目了然。",
    description:
      "CHRONOS 是为个人服务器打造的轻量监控面板。CPU、内存、网络与磁盘状态，服务入口导航，中英双语与深浅主题，自托管掌控。",
  },
  en: {
    skip: "Skip to content",
    navigation: "Main navigation",
    mobileNavigation: "Mobile navigation",
    openMenu: "Open navigation",
    closeMenu: "Close navigation",
    navFeatures: "Features",
    navPreview: "Preview",
    navStart: "Get started",
    heroTag: "FOR YOUR PERSONAL SERVER",
    heroLine1: "Your server.",
    heroLine2: "In perspective.",
    heroDesc:
      "System health and service shortcuts, brought together in one lightweight, thoughtful panel. Hosted by you. Made yours.",
    getStarted: "Get started",
    viewSource: "View source",
    heroNote: "Self-hosted · No frontend CDN · Bilingual",
    sample: "Sample data",
    processor: "Processor",
    artLabel: "Illustrative monitoring panel, not live data",
    specPolling: "Default polling",
    specCdn: "Frontend CDN dependencies",
    specLanguages: "中文 / English",
    specControl: "Self-hosted control",
    featuresTitle: "Less overhead. More clarity.",
    featuresDesc:
      "Keep your attention where it matters.\nYour everyday essentials, thoughtfully together.",
    monitorTitle: "More than a number.",
    monitorDesc:
      "CPU history, memory usage, network traffic, disk capacity and I/O rates. See the patterns behind your system’s activity.",
    connectTitle: "Every shortcut, in place.",
    connectDesc:
      "Keep your websites, service dashboards and contact links together. Go from checking a metric to opening a service.",
    lightTitle: "A lighter way to stay aware.",
    lightDesc:
      "Polls every 5 seconds by default and pauses in the background. Lightweight Canvas charts with no frontend CDN dependencies.",
    personalTitle: "Your screen. Your rhythm.",
    personalDesc:
      "Phone, tablet or desktop. Portrait or landscape. Light and dark themes, two languages and a dedicated settings page fit the way you work.",
    previewTitle: "A clear view of your system.",
    previewDesc:
      "Switch metrics to explore the layout.\nAn interactive illustration, not live server data.",
    demoLabel: "Illustration · Sample data",
    demoLocal: "Local preview. No server connection.",
    metrics: "Monitoring metrics",
    memory: "Memory",
    network: "Network",
    storage: "Storage",
    networkDown: "Download",
    history: "HISTORY / SAMPLE",
    exploreInterface: "Explore the actual panel source",
    useTitle: "For that server of yours.",
    useIntro:
      "A personal project for a clearer daily overview. Designed for personal servers, self-hosted services and lightweight check-ins.",
    readDocs: "Read the documentation",
    use1Title: "Personal VPS",
    use1Desc:
      "Check resource trends and disk usage as part of your daily server routine.",
    use2Title: "Self-hosted workspace",
    use2Desc:
      "Bring scattered websites and admin links together into your own starting point.",
    use3Title: "A glance, anywhere",
    use3Desc:
      "Open the panel on your phone or tablet for an overview of CPU, memory, network and storage.",
    startTitle: "Your server. Your next step.",
    startDesc:
      "Clone the repository and follow the backend and Nginx setup guide.\nRun it on your own Ubuntu / Debian server.",
    deployGuide: "Full deployment guide",
    copy: "Copy commands",
    copied: "Copied ✓",
    copyFailed: "Copy failed. Please select and copy the commands manually.",
    installNote:
      "These steps start the backend. Follow the full guide to deploy the frontend, configure the Nginx proxy and set up systemd. When using a virtual environment, update the service’s Python executable path.",
    deployNote:
      "For production, change the default credentials and enable HTTPS. GitHub Pages hosts this introduction website; the monitoring panel and Python backend run on your own server.",
    faqTitle: "A few things to know.",
    faq1q: "Can the monitor run directly on GitHub Pages?",
    faq1a:
      "GitHub Pages hosts only this static introduction website. Monitoring requires a Flask backend on the target server, with Nginx serving the frontend and proxying API requests.",
    faq2q: "What scale is it designed for?",
    faq2a:
      "CHRONOS is designed for personal servers and lightweight daily checks. The current project does not provide centralized multi-node management, alert orchestration or a full enterprise observability platform.",
    faq3q: "How does the panel refresh?",
    faq3a:
      "The panel polls every 5 seconds by default, adjustable in settings. Polling pauses when the page is in the background and refreshes immediately on return. Actual resource usage depends on your server and workload.",
    faq4q: "Can I customize the theme and shortcuts?",
    faq4a:
      "Yes. The settings page offers light and dark themes, Chinese and English, and polling preferences. Configure service shortcuts and contact links in frontend/js/config.js. Refer to the repository README for usage and modification guidance.",
    ctaTitle: "Give your server a home of its own.",
    ctaDesc:
      "Explore the source, make it yours, or help shape what comes next.",
    ctaGithub: "Explore on GitHub",
    feedback: "Feedback & ideas",
    footerCredit: "Built by Zimo Xu · For personal servers",
    usage: "Usage & modification",
    themePrefix: "Theme: ",
    themeSystem: "System",
    themeDark: "Dark",
    themeLight: "Light",
    themeNext: "Switch to",
    cpuMetric: "CPU usage",
    memoryMetric: "Memory usage",
    networkMetric: "Network download",
    chartLabel: "illustrative chart",
    title: "CHRONOS — Your server. In perspective.",
    description:
      "A lightweight, self-hosted monitoring panel for your personal server. CPU, memory, network, disk and service shortcuts. Chinese and English. Light and dark themes.",
  },
};
let language = document.documentElement.lang === "en" ? "en" : "zh";
let preference = document.documentElement.dataset.preference;
let currentMetric = "cpu";
const systemTheme = matchMedia("(prefers-color-scheme: dark)");
const themeOrder = ["system", "dark", "light"];
const themeKeys = {
  system: "themeSystem",
  dark: "themeDark",
  light: "themeLight",
};
const metricData = {
  cpu: {
    value: "24.8",
    unit: "%",
    key: "cpuMetric",
    points: [
      68, 64, 72, 45, 54, 30, 50, 47, 63, 58, 65, 42, 53, 28, 35, 14, 33, 26,
      45, 50, 39, 55, 28, 41, 20, 36, 15, 27, 19, 25,
    ],
  },
  memory: {
    value: "32.0",
    unit: "%",
    key: "memoryMetric",
    points: [
      72, 72, 71, 70, 70, 71, 69, 68, 68, 69, 69, 68, 67, 66, 66, 67, 66, 68,
      68, 67, 66, 65, 66, 66, 67, 68, 68, 67, 68, 68,
    ],
  },
  network: {
    value: "2.4",
    unit: "MB/s",
    key: "networkMetric",
    points: [
      84, 86, 78, 82, 58, 68, 73, 30, 65, 74, 70, 78, 50, 18, 35, 64, 72, 40,
      64, 79, 58, 32, 56, 66, 44, 70, 59, 35, 57, 52,
    ],
  },
};
function save(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    /* Non-persistent session. */
  }
}
function updateTheme() {
  const theme =
    preference === "system"
      ? systemTheme.matches
        ? "dark"
        : "light"
      : preference;
  document.documentElement.dataset.theme = theme;
  document.documentElement.dataset.preference = preference;
  document.querySelector('meta[name="theme-color"]').content =
    theme === "dark" ? "#111311" : "#f4f3ed";
  const t = content[language];
  const next = themeOrder[(themeOrder.indexOf(preference) + 1) % 3];
  const label = `${t.themePrefix}${t[themeKeys[preference]]}. ${t.themeNext} ${t[themeKeys[next]]}`;
  const button = document.getElementById("theme");
  button.setAttribute("aria-label", label);
  button.title = label;
}
function updateMetric() {
  const data = metricData[currentMetric],
    t = content[language];
  document.getElementById("metric-name").textContent = t[data.key];
  document.getElementById("metric-value").textContent = data.value;
  document.getElementById("metric-unit").textContent = data.unit;
  const path = data.points
    .map(
      (y, i) =>
        `${i ? "L" : "M"}${((i * 720) / (data.points.length - 1)).toFixed(1)} ${(y * 1.6).toFixed(1)}`,
    )
    .join(" ");
  document.getElementById("chart-line").setAttribute("d", path);
  document.getElementById("chart-area").setAttribute("d", `${path} V160 H0 Z`);
  document
    .getElementById("metric-chart")
    .setAttribute("aria-label", `${t[data.key]} — ${t.chartLabel}`);
  document
    .getElementById("metric-panel")
    .setAttribute("aria-labelledby", `tab-${currentMetric}`);
  document.querySelectorAll("[data-metric]").forEach((button) => {
    const selected = button.dataset.metric === currentMetric;
    button.setAttribute("aria-selected", String(selected));
    button.tabIndex = selected ? 0 : -1;
  });
}
function updateLanguage() {
  const t = content[language];
  document.documentElement.lang = language === "zh" ? "zh-CN" : "en";
  document.querySelectorAll("[data-i18n]").forEach((el) => {
    el.textContent = t[el.dataset.i18n];
    if (t[el.dataset.i18n].includes("\n")) el.style.whiteSpace = "pre-line";
  });
  document
    .querySelectorAll("[data-label]")
    .forEach((el) => el.setAttribute("aria-label", t[el.dataset.label]));
  document.getElementById("language").innerHTML =
    language === "zh"
      ? 'EN <span aria-hidden="true">↗</span>'
      : '中文 <span aria-hidden="true">↗</span>';
  document
    .getElementById("language")
    .setAttribute(
      "aria-label",
      language === "zh" ? "Switch to English" : "切换至中文",
    );
  document
    .getElementById("menu")
    .setAttribute(
      "aria-label",
      t[
        document.getElementById("menu").getAttribute("aria-expanded") === "true"
          ? "closeMenu"
          : "openMenu"
      ],
    );
  document.title = t.title;
  document.querySelector('meta[name="description"]').content = t.description;
  document.querySelector('meta[property="og:title"]').content = t.title;
  document.querySelector('meta[property="og:description"]').content =
    t.description;
  document.querySelector('meta[property="og:locale"]').content =
    language === "zh" ? "zh_CN" : "en_US";
  document.querySelector('meta[property="og:locale:alternate"]').content =
    language === "zh" ? "en_US" : "zh_CN";
  updateTheme();
  updateMetric();
}
document.getElementById("theme").addEventListener("click", () => {
  preference = themeOrder[(themeOrder.indexOf(preference) + 1) % 3];
  save("chronos-site-theme", preference);
  updateTheme();
});
systemTheme.addEventListener("change", () => {
  if (preference === "system") updateTheme();
});
document.getElementById("language").addEventListener("click", () => {
  language = language === "zh" ? "en" : "zh";
  save("chronos-site-language", language);
  updateLanguage();
});
document.querySelectorAll("[data-metric]").forEach((button) => {
  button.addEventListener("click", () => {
    currentMetric = button.dataset.metric;
    updateMetric();
  });
  button.addEventListener("keydown", (event) => {
    const keys = ["ArrowRight", "ArrowLeft", "Home", "End"];
    if (!keys.includes(event.key)) return;
    event.preventDefault();
    const buttons = [...document.querySelectorAll("[data-metric]")];
    let index = buttons.indexOf(button);
    index =
      event.key === "Home"
        ? 0
        : event.key === "End"
          ? buttons.length - 1
          : (index + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) %
            buttons.length;
    buttons[index].click();
    buttons[index].focus();
  });
});
const menu = document.getElementById("menu"),
  mobileNav = document.getElementById("mobile-nav");
function closeMenu() {
  mobileNav.hidden = true;
  menu.setAttribute("aria-expanded", "false");
  menu.setAttribute("aria-label", content[language].openMenu);
}
menu.addEventListener("click", () => {
  const expanded = menu.getAttribute("aria-expanded") === "true";
  mobileNav.hidden = expanded;
  menu.setAttribute("aria-expanded", String(!expanded));
  menu.setAttribute(
    "aria-label",
    content[language][expanded ? "openMenu" : "closeMenu"],
  );
});
mobileNav.addEventListener("click", (event) => {
  if (event.target.closest("a")) {
    closeMenu();
    const href = event.target.closest("a").getAttribute("href");
    if (href.startsWith("#")) {
      const section = document.querySelector(href);
      section.tabIndex = -1;
      section.focus({ preventScroll: true });
    }
  }
});
document.addEventListener("keydown", (event) => {
  if (event.key === "Escape" && !mobileNav.hidden) {
    closeMenu();
    menu.focus();
  }
});
document.addEventListener("click", (event) => {
  if (!event.target.closest(".site-header")) closeMenu();
});
matchMedia("(min-width: 801px)").addEventListener("change", (event) => {
  if (event.matches) {
    const restoreFocus = mobileNav.contains(document.activeElement);
    closeMenu();
    if (restoreFocus) document.querySelector(".desktop-nav a").focus();
  }
});
let copyTimer;
document.getElementById("copy").addEventListener("click", async () => {
  const button = document.getElementById("copy"),
    announcement = document.getElementById("announcement");
  try {
    await navigator.clipboard.writeText(
      document.getElementById("install-command").textContent,
    );
    button.textContent = content[language].copied;
    announcement.textContent = content[language].copied;
    clearTimeout(copyTimer);
    copyTimer = setTimeout(() => {
      button.textContent = content[language].copy;
    }, 2200);
  } catch {
    announcement.textContent = content[language].copyFailed;
    button.textContent = content[language].copyFailed;
  }
});
updateLanguage();
