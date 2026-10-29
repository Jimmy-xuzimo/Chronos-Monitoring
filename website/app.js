/* All interface content below is illustrative and stays in this static page. */
const root = document.documentElement;
try {
  root.dataset.theme =
    localStorage.getItem("chronos-site-theme") ||
    (matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light");
  root.dataset.palette = localStorage.getItem("chronos-site-palette") || "iris";
} catch {}
const mode = document.getElementById("mode");
function reflect() {
  mode.setAttribute(
    "aria-label",
    root.dataset.theme === "dark" ? "切换浅色模式" : "切换深色模式",
  );
  document
    .querySelectorAll(".palette-tools button")
    .forEach((b) =>
      b.setAttribute(
        "aria-pressed",
        String(b.dataset.palette === root.dataset.palette),
      ),
    );
}
mode.addEventListener("click", () => {
  root.dataset.theme = root.dataset.theme === "dark" ? "light" : "dark";
  try {
    localStorage.setItem("chronos-site-theme", root.dataset.theme);
  } catch {}
  reflect();
});
document.querySelectorAll(".palette-tools button").forEach((button) =>
  button.addEventListener("click", () => {
    root.dataset.palette = button.dataset.palette;
    try {
      localStorage.setItem("chronos-site-palette", root.dataset.palette);
    } catch {}
    reflect();
  }),
);
reflect();
const spark = (offset = 0) =>
  `<svg class="demo-spark" viewBox="0 0 250 40" preserveAspectRatio="none" aria-hidden="true"><path d="${Array.from({ length: 36 }, (_, i) => `${i ? "L" : "M"}${(i / 35) * 250},${(26 + Math.sin(i * 0.6 + offset) * 5 + Math.cos(i * 0.27) * 4).toFixed(1)}`).join(" ")}"/></svg>`;
const course = (name, time, room) =>
  `<div class="course-sample"><small>${time}</small><strong>${name}</strong><p>${room}</p></div>`;
const device = (name, cpu, mem, phase) =>
  `<div class="demo-device"><span>${name}<i class="pill">演示在线</i></span><div class="demo-metrics"><span>CPU<b>${cpu}%</b></span><span>内存<b>${mem}%</b></span><span>磁盘<b>36%</b></span></div>${spark(phase)}</div>`;
const project = (name, repo, state) =>
  `<div class="project-line"><span>${name}<small>${repo}</small></span><i class="pill">${state}</i></div>`;
const rows = (headers, data) =>
  `<table class="demo-table"><thead><tr>${headers.map((h) => `<th>${h}</th>`).join("")}</tr></thead><tbody>${data.map((row) => `<tr>${row.map((cell) => `<td>${cell}</td>`).join("")}</tr>`).join("")}</tbody></table>`;
const descriptions = {
  overview: [
    "01 / 05",
    "把高频信息，放在最容易看到的地方。",
    "今日课程、下一门课的地点、双设备状态与项目动态。手机保留三个重点区域，入口和资讯单独分页。",
  ],
  calendar: [
    "02 / 05",
    "订阅自己的安排，保留来源的细节。",
    "日、周、月课表与详情弹窗。遵循订阅中的实际日期，不擅自推断节假日调课；同步失败保留最近成功结果。",
  ],
  services: [
    "03 / 05",
    "实时读数与历史趋势，一起看。",
    "每核 CPU、内存与 Swap、磁盘和网络读写、连接与进程。网站监测支持预期状态码，探测来自部署服务器。",
  ],
  github: [
    "04 / 05",
    "公开项目动态，和自己的节奏对齐。",
    "查看仓库、参与的 PR、版本发布以及可读取的 CI 与审阅。限流和未读取状态明确区分，不把未知显示成成功。",
  ],
  news: [
    "05 / 05",
    "每天的资讯，有分类，也有归档。",
    "对接自己的 JSON 资讯站，按日期与分类阅读。每天 07:30 同步，失败保留上一期；不连接作者的私人数据源。",
  ],
};
const views = {
  overview: () =>
    `<div class="demo-dashboard"><article class="demo-card"><h4>今日课表<small>2 项</small></h4>${course("交互设计基础", "10:00–11:30", "示例教学楼 201")}${course("创意编程", "14:00–15:30", "示例实验室 302")}</article><article class="demo-card"><h4>设备脉搏<small>最近 24 小时</small></h4>${device("云服务器", 12, 42, 0)}${device("Windows PC", 8, 36, 2)}</article><article class="demo-card"><h4>项目动态<small>虚构项目</small></h4>${project("优化课程展示", "sample/workspace #12", "已合并")}${project("完善设备历史", "sample/metrics #8", "进行中")}${project("更新部署文档", "sample/docs #3", "已合并")}</article></div>`,
  calendar: () =>
    `<div class="demo-source-note">示例周课表 · Asia/Shanghai · 仅示意，不是实际课程</div><div class="demo-week">${["一", "二", "三", "四", "五"].map((day, i) => `<div><header>周${day}</header>${i % 2 === 0 ? course("交互设计基础", "10:00", "示例楼 201") : course("创意编程", "14:00", "实验室 302")}${i === 2 ? course("项目实践", "15:30", "工作室 103") : ""}</div>`).join("")}</div>`,
  services: () =>
    `<div><div class="demo-source-note">虚构 Windows 节点 · 仅展示排版 · 不连接设备</div><div class="demo-resource">${[
      ["CPU", "12%"],
      ["内存", "42%"],
      ["磁盘", "36%"],
      ["下载", "18 KB/s"],
    ]
      .map(
        ([name, value]) =>
          `<div class="demo-card"><span>${name}</span><strong>${value}</strong></div>`,
      )
      .join("")}</div>${spark(1)}${rows(
      ["网站", "HTTP", "响应", "状态"],
      [
        [
          "示例应用 <small>app.example.com</small>",
          "200",
          "128 ms",
          '<i class="pill">正常</i>',
        ],
        [
          "示例登录页 <small>login.example.com</small>",
          "302",
          "96 ms",
          '<i class="pill">预期跳转</i>',
        ],
        [
          "示例知识库 <small>docs.example.com</small>",
          "200",
          "152 ms",
          '<i class="pill">正常</i>',
        ],
      ],
    )}</div>`,
  github: () =>
    `<div><div class="demo-source-note">sample/workspace · 演示仓库与 PR，不是真实贡献记录</div>${rows(
      ["Pull Request", "状态", "CI", "审阅"],
      [
        [
          "优化课程展示 <small>sample/workspace #12</small>",
          "已合并",
          "通过",
          "已批准",
        ],
        [
          "完善设备历史 <small>sample/metrics #8</small>",
          "进行中",
          "通过",
          "待审阅",
        ],
        [
          "改进节点列表 <small>sample/workspace #9</small>",
          "进行中",
          "未读取",
          "未读取",
        ],
        [
          "更新部署文档 <small>sample/docs #3</small>",
          "已合并",
          "通过",
          "已批准",
        ],
      ],
    )}</div>`,
  news: () =>
    `<div><div class="demo-source-note">2026-10-28 · 虚构演示期次 · 全部分类</div>${rows(
      ["标题", "分类", "来源"],
      [
        ["示例：轻量工作台的新版本发布", "开源项目", "示例周刊"],
        ["示例：如何整理自己的学习计划", "学习方法", "示例编辑部"],
        ["示例：设备趋势图的设计笔记", "设计与开发", "示例工作室"],
        ["示例：让个人数据回到自己的服务器", "自托管", "示例周刊"],
        ["示例：本周值得记录的工具变化", "工具动态", "示例编辑部"],
      ],
    )}</div>`,
};
const tabs = [...document.querySelectorAll(".demo-tabs button")];
function show(view) {
  document.getElementById("demo-content").innerHTML = views[view]();
  const [index, title, description] = descriptions[view];
  document.getElementById("demo-index").textContent = index;
  document.getElementById("demo-title").textContent = title;
  document.getElementById("demo-description").textContent = description;
  tabs.forEach((b) => {
    const active = b.dataset.view === view;
    b.setAttribute("aria-selected", String(active));
    b.tabIndex = active ? 0 : -1;
  });
  document
    .getElementById("demo-content")
    .setAttribute(
      "aria-label",
      tabs.find((b) => b.dataset.view === view).textContent + "演示",
    );
}
tabs.forEach((button, i) => {
  button.addEventListener("click", () => show(button.dataset.view));
  button.addEventListener("keydown", (e) => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(e.key)) return;
    e.preventDefault();
    const next =
      e.key === "Home"
        ? 0
        : e.key === "End"
          ? tabs.length - 1
          : (i + (e.key === "ArrowRight" ? 1 : -1) + tabs.length) % tabs.length;
    tabs[next].focus();
    show(tabs[next].dataset.view);
  });
});
show("overview");
document.getElementById("copy").addEventListener("click", async (e) => {
  const button = e.currentTarget;
  try {
    await navigator.clipboard.writeText(
      "git clone https://github.com/Jimmy-xuzimo/Chronos-Monitoring.git\ncd Chronos-Monitoring",
    );
    button.textContent = "已复制";
  } catch {
    button.textContent = "请手动复制下方命令";
  }
});
