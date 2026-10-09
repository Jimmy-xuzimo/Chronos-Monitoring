# CHRONOS · PANEL

> 一个轻量的个人服务器监控面板 —— 灰橙色工业废土风 · 服务器监控 + 核心入口导航 + 联系方式
>
> 全设备自适应（手机 / 平板 / 电脑，横屏 / 竖屏），通过浏览器标识（User-Agent）与屏幕朝向自动切换布局。
>
> 面向 **2 核 2G 轻量服务器** 设计，零第三方前端依赖、零 CDN。

---

## ✨ 功能

- **服务器监控（低资源占用）**：CPU 使用率与历史曲线、内存、网络上下行速率与曲线、磁盘用量与读写速率、系统负载、进程数、内核版本、公网 IP。
- **低频轮询 + 后台暂停**：默认 5 秒一次；页面切到后台自动暂停，回到前台立即刷新一次，最大程度降低服务器开销。
- **核心入口导航**：可自由配置的入口卡片，直达你的站点 / 服务 / 管理后台。
- **联系方式**：B 站、邮箱、WhatsApp、微信（点击复制）、GitHub、500px 等图标瓦片（可增删改）。
- **登录鉴权**：独立登录页；默认账号 `admin` / 密码 `admin123`，可在「设置」页修改，凭证持久化于后端 `config.json`。
- **独立设置页**：外观（浅色 / 深色模式、扫描线质感）、中英文切换、轮询间隔、安全设置（修改账号密码）、会话与数据管理，集中在一页。
- **主题与语言**：设置保存在浏览器本地（localStorage），全站（登录页 / 面板 / 设置页）即时生效并记忆。

### ⚡ v2 性能优化（面向 2 核 2G 轻量服务器）

- **零第三方依赖 / 零 CDN**：Chart.js 已移除，改用自绘轻量图表 `chart-lite.js`（Canvas 直绘、无运行时开销）；正文使用系统无衬线字体（零下载、高可读），时钟像素字体（VT323）本地化于 `frontend/fonts/`。
- **桌面一屏布局**：≥1024px 且视口高度 ≥700px 时锁定 100dvh 四行网格（时间+概览 → 核心入口 → CPU+网络+内存 → 存储+联系），普通桌面显示器一页完整排下零滚动；较矮视口自动回退为整页滚动。
- **渲染性能**：监控数值采用 DOM 脏检查（值不变不触碰 DOM）、磁盘列表 diff 渲染（结构不变不重建），轮询刷新的重排/重绘开销降到最低。
- **传输优化**：Nginx 开启 gzip（level 5，平衡 2 核 CPU 与压缩率）、字体 30 天强缓存、HTML 免缓存，静态资源总大小 < 150KB。

## 📂 目录结构

```text
chronos-monitoring/
├── backend/
│   ├── app.py                 # Flask：监控采集 + 登录鉴权 + 凭证管理
│   ├── requirements.txt
│   └── config.json            # 首次启动自动生成（密钥 + 账号 + 密码哈希，勿提交）
├── frontend/
│   ├── index.html             # 主面板（需登录）
│   ├── login.html             # 登录页
│   ├── settings.html          # 设置页（需登录）
│   ├── css/
│   │   ├── base.css           # 主题变量（浅色/深色）/ 基础组件（工业废土风）
│   │   ├── panel.css          # 主面板布局 / 设备×朝向 响应式 / 桌面一屏
│   │   ├── settings.css       # 设置页布局
│   │   └── login.css
│   ├── fonts/
│   │   ├── ShareTechMono-Regular.woff2   # 本地字体（界面等宽）
│   │   └── VT323-Regular.woff2            # 本地字体（时钟像素数字）
│   └── js/
│       ├── config.js          # 配置区（接口 / 轮询 / 入口 / 联系方式）
│       ├── prefs.js           # 偏好设置（主题 / 语言 / 轮询 / 扫描线，localStorage）
│       ├── i18n.js            # 中英文文案字典 + DOM 应用器
│       ├── device.js          # 浏览器标识 + 朝向识别
│       ├── chart-lite.js      # 自绘轻量图表（替代 Chart.js，零依赖）
│       ├── auth.js            # 接口封装 + 会话鉴权 + 登录页逻辑
│       ├── panel.js           # 主面板逻辑（脏检查 + diff 渲染）
│       └── settings.js        # 设置页逻辑
├── config/
│   ├── nginx.conf             # Nginx 站点 + /api 反代示例
│   └── chronos-monitoring.service   # Systemd 开机自启
└── README.md
```

---

## 🚀 部署（Ubuntu / Debian 服务器）

### 第一步：上传项目

将本项目放到服务器，例如 `/opt/chronos-monitoring`：

```bash
sudo mkdir -p /opt/chronos-monitoring
# 用 scp / SFTP / git 把项目文件传入 /opt/chronos-monitoring
```

### 第二步：安装后端依赖

```bash
sudo apt update
sudo apt install python3-pip -y
pip3 install -r /opt/chronos-monitoring/backend/requirements.txt --break-system-packages
```

> 若服务器已启用虚拟环境（venv），请在虚拟环境中执行 `pip install -r requirements.txt`。

测试运行：

```bash
python3 /opt/chronos-monitoring/backend/app.py
# 正常输出：Running on http://127.0.0.1:5000
# 首次运行会在 backend/ 下生成 config.json
# 按 Ctrl+C 停止
```

### 第三步：配置开机自启

```bash
sudo cp /opt/chronos-monitoring/config/chronos-monitoring.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now chronos-monitoring
sudo systemctl status chronos-monitoring      # 查看状态
```

### 第四步：配置 Nginx

```bash
sudo apt install nginx -y
sudo mkdir -p /var/www/chronos-monitoring
sudo cp -r /opt/chronos-monitoring/frontend/* /var/www/chronos-monitoring/

sudo cp /opt/chronos-monitoring/config/nginx.conf /etc/nginx/conf.d/chronos-monitoring.conf
sudo nano /etc/nginx/conf.d/chronos-monitoring.conf   # 修改 server_name 为你的域名或公网 IP
sudo nginx -t                                          # 校验配置
sudo systemctl restart nginx
```

浏览器访问 `http://你的域名或IP/`，会跳转到登录页。

> 建议申请 HTTPS：`sudo certbot --nginx -d 你的域名`。启用 HTTPS 后，请把 `backend/app.py` 中的 `SESSION_COOKIE_SECURE` 改为 `True` 并重启服务。

### 第五步：登录并改密

- 默认账号：`admin`
- 默认密码：`admin123`

登录后点击面板顶栏「设置」进入设置页，在「SECURITY // 安全设置」中填入当前密码与新账号/新密码即可（**请务必改掉默认密码**）；同页还可切换深色模式、中英文与轮询间隔。

---

## ⚙️ 个性化配置

统一在 [frontend/js/config.js](frontend/js/config.js) 中修改：

| 配置项 | 说明 |
| --- | --- |
| `API_BASE` | 生产环境保持 `/api`；本地联调可改为 `http://127.0.0.1:5000/api` |
| `POLL_INTERVAL` | 监控轮询默认间隔（毫秒），默认 `5000`；用户可在设置页覆盖 |
| `DEVICE_OVERRIDE` | 调试用，强制指定设备类型：`null` / `"mobile"` / `"tablet"` / `"desktop"` |
| `ENTRIES` | 核心入口导航卡片（标题、中文名、跳转链接） |
| `CONTACTS` | 联系方式列表（`type: "link"` 外链跳转 / `type: "copy"` 点击复制） |

`ENTRIES` 与 `CONTACTS` 中均为演示占位数据（如 `example.com`、`yourname`），请替换为你自己的信息。

后端端口 / 监听地址在 [backend/app.py](backend/app.py) 末尾的 `app.run(...)` 处调整。

---

## 🧭 设备适配说明

`frontend/js/device.js` 通过以下信息判定设备与朝向，并写入 `<html>`：

- `navigator.userAgentData.mobile`（Chromium 优先）与 `navigator.userAgent` 正则（含 iPadOS 伪装成 Mac 的特殊处理）
- `navigator.maxTouchPoints` 触点数交叉校验
- `matchMedia("(orientation: portrait)")` 与 `screen.orientation` 判定横竖屏

结果落到 `html[data-device="mobile|tablet|desktop"]`、`html[data-orient="portrait|landscape"]`、`html[data-touch]`，由 `panel.css` 结合媒体查询渲染对应布局；即使识别异常，媒体查询也能保证布局正确降级。顶栏 `DEVICE` 徽章会实时显示当前判定结果。

---

## ❓ 常见问题

- **公网 IP 显示 `Checking...` 或 `N/A`**：后端会通过 `api64.ipify.org` 获取，若服务器出网受限则不可用；可自行替换 `app.py` 中的取 IP 逻辑。
- **忘记密码**：删除 `backend/config.json` 后重启服务，会以默认账号密码重新生成。

---

## 📄 许可

本项目为通用模板，可自由用于个人服务器部署与二次修改。请勿将默认账号密码直接暴露在公网，部署后请立即修改。
