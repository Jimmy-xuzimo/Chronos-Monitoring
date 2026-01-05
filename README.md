\# Chronos Monitoring Dashboard



An ultra-modern, industrial sci-fi style server monitoring dashboard.

Features a responsive design that locks to the viewport on desktops and scrolls on mobile, with real-time data visualization via a lightweight Python backend.



\*\*\[中文说明请向下滚动 (Scroll down for Chinese)]\*\*



!\[Preview](https://via.placeholder.com/1200x600.png?text=Preview+Image+Here)



\## 🎨 Design Philosophy



\*   \*\*Visual Style\*\*: "Chronos" Industrial / Hard Sci-Fi / Cyberpunk.

\*   \*\*Color Palette\*\*: Engineering Grey (`#e0e5ec`) + Alert Orange (`#ff4500`) + Deep Slate (`#2b3a42`).

\*   \*\*Typography\*\*: `Share Tech Mono` for data and `VT323` for the digital clock.

\*   \*\*Layout\*\*: 

&nbsp;   \*   \*\*Desktop\*\*: Locked 100vh viewport (no external scrollbars), grid layout using CSS Container Queries.

&nbsp;   \*   \*\*Mobile\*\*: Responsive vertical scrolling layout.



\## ✨ Features



\*   \*\*Real-time Monitoring\*\*: CPU, Memory, Swap, Network I/O, Disk I/O \& Usage.

\*   \*\*System Info\*\*: Kernel version, Uptime, Load Average, Process count.

\*   \*\*Network\*\*: Auto-detects Public IP (IPv4/IPv6 compatible) with hover-to-reveal.

\*   \*\*Visuals\*\*: Smooth Bezier curve charts (Chart.js), animated progress bars.

\*   \*\*Hardware Sensors\*\*: Monitors CPU, NVMe, and WiFi temperatures (auto-discovery).



\## 🛠️ Installation



\### 1. Backend Setup (Python)



Ensure you have Python 3 installed on your server (Debian/Ubuntu/CentOS).



```bash

\# 1. Install system dependencies

sudo apt update

sudo apt install python3-pip



\# 2. Clone the repo

git clone https://github.com/your-username/chronos-monitor.git

cd chronos-monitor/backend



\# 3. Install Python requirements

pip3 install -r requirements.txt --break-system-packages



\# 4. Test run

python3 monitor.py

\# Output should say: Running on http://127.0.0.1:5000

```



\### 2. Auto-start Service (Systemd)



Use the provided template to create a system service.



```bash

\# 1. Copy service file

sudo cp ../config/chronos.service /etc/systemd/system/



\# 2. Edit paths in the file

sudo nano /etc/systemd/system/chronos.service

\# (Make sure WorkingDirectory and ExecStart point to your actual location)



\# 3. Enable and start

sudo systemctl daemon-reload

sudo systemctl enable chronos.service

sudo systemctl start chronos.service

```



\### 3. Frontend \& Nginx Proxy (Recommended)



Since the backend listens on `127.0.0.1:5000` for security, you should use Nginx (or a WAF) to serve the frontend and reverse proxy the API.



\*\*Step 1: Deploy Frontend\*\*

Copy the `frontend` folder to your web directory (e.g., `/var/www/chronos`).



\*\*Step 2: Configure Nginx\*\*

Copy the content of `config/nginx.conf` to your Nginx configuration (e.g., `/etc/nginx/sites-available/chronos`).



\*\*Step 3: Restart Nginx\*\*

```bash

sudo ln -s /etc/nginx/sites-available/chronos /etc/nginx/sites-enabled/

sudo nginx -t

sudo systemctl restart nginx

```



\### 4. Access

Open your browser and visit your domain (e.g., `http://your-domain.com`). The dashboard should load immediately.



---



\# Chronos 服务器监控面板 (中文说明)



一个超现代的、科幻工业风格的服务器监控面板。

专为 Linux 系统设计，桌面端采用无滚动条的全屏网格布局，移动端自动适配竖向滚动，配合轻量级 Python 后端实现实时数据可视化。



\## 🎨 设计理念



\*   \*\*视觉风格\*\*: "Chronos" 工业风 / 硬核科幻 / 赛博朋克。

\*   \*\*配色方案\*\*: 工程灰 (`#e0e5ec`) + 警示橙 (`#ff4500`) + 深岩灰 (`#2b3a42`).

\*   \*\*字体\*\*: 数据使用 `Share Tech Mono`，数字时钟使用 `VT323` 像素字体。

\*   \*\*布局\*\*: 

&nbsp;   \*   \*\*桌面端\*\*: 锁定 100vh 视口高度（无外部滚动条），使用 CSS 容器查询实现自适应网格。

&nbsp;   \*   \*\*移动端\*\*: 响应式竖向流式布局。



\## ✨ 功能特性



\*   \*\*实时监控\*\*: CPU、内存、Swap、网络 I/O、磁盘 I/O 及使用率。

\*   \*\*系统信息\*\*: 内核版本、启动时间、系统负载 (Load Average)、进程数。

\*   \*\*网络信息\*\*: 自动检测公网 IP (支持 IPv4/IPv6)，支持鼠标悬停显示完整 IP。

\*   \*\*视觉特效\*\*: 平滑的贝塞尔曲线图表 (Chart.js)，带动画的进度条。

\*   \*\*硬件传感器\*\*: 自动识别 CPU、NVMe 固态硬盘及无线网卡温度。



\## 🛠️ 安装指南



\### 1. 后端设置 (Python)



请确保服务器已安装 Python 3 (Debian/Ubuntu/CentOS)。



```bash

\# 1. 安装系统依赖

sudo apt update

sudo apt install python3-pip



\# 2. 克隆仓库

git clone https://github.com/your-username/chronos-monitor.git

cd chronos-monitor/backend



\# 3. 安装 Python 依赖库

pip3 install -r requirements.txt --break-system-packages



\# 4. 测试运行

python3 monitor.py

\# 输出应显示: Running on http://127.0.0.1:5000

```



\### 2. 设置开机自启 (Systemd)



使用提供的模板创建系统服务，让后台程序开机自动运行。



```bash

\# 1. 复制服务文件

sudo cp ../config/chronos.service /etc/systemd/system/



\# 2. 修改文件中的路径

sudo nano /etc/systemd/system/chronos.service

\# (请务必修改 WorkingDirectory 和 ExecStart 为你实际存放代码的路径)



\# 3. 启用并启动服务

sudo systemctl daemon-reload

sudo systemctl enable chronos.service

sudo systemctl start chronos.service

```



\### 3. 前端部署与 Nginx 反代 (推荐)



出于安全考虑，后端默认只监听 `127.0.0.1:5000`。你需要使用 Nginx（或雷池 WAF 等）来托管前端页面并反向代理 API。



\*\*步骤 1: 放置前端文件\*\*

将 `frontend` 文件夹中的 `index.html` 复制到你的网站目录 (例如 `/var/www/chronos`)。



\*\*步骤 2: 配置 Nginx\*\*

参考 `config/nginx.conf` 的内容，在你的 Nginx 配置中添加规则。关键配置如下：



```nginx

\# 静态页面

location / {

&nbsp;   root /var/www/chronos; # 你的前端目录

&nbsp;   index index.html;

}



\# API 反向代理

location /api/ {

&nbsp;   proxy\_pass http://127.0.0.1:5000/api/;

&nbsp;   proxy\_set\_header Host $host;

}

```



\*\*步骤 3: 重启 Nginx\*\*

```bash

sudo nginx -t

sudo systemctl restart nginx

```



\### 4. 访问与配置



直接在浏览器访问你的域名（例如 `http://your-domain.com`）。



\*   \*\*默认配置\*\*: 前端 `index.html` 默认通过相对路径 `/api/stats` 获取数据，如果您按照上述 Nginx 方式部署，\*\*无需修改任何代码\*\*。

\*   \*\*本地测试\*\*: 如果不使用反代，想直接打开 HTML 测试，请修改 `index.html` 底部的 `API\_URL` 为 `http://服务器IP:5000/api/stats`，并确保后端监听 `0.0.0.0`。



\## 🖥️ 兼容性



\*   \*\*操作系统\*\*: Linux (在 Debian 12, Ubuntu 22.04 上测试通过)

\*   \*\*架构\*\*: x86\_64, ARM64 (完美支持树莓派、飞牛 NAS 等)

\*   \*\*浏览器\*\*: Chrome, Firefox, Safari, Edge (现代浏览器)



\## 📄 License



MIT License.

