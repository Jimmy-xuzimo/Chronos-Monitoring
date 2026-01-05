Chronos 服务器监控面板

**Chronos** 是一款专为 Linux 系统打造的超现代、工业科幻风格服务器监控仪表盘。

它不仅仅是一个数据展示工具，更是一种视觉体验。设计灵感源自硬核科幻与赛博朋克美学，采用工程灰与警示橙的高对比度配色，配合像素风格的数字时钟与平滑的数据曲线，让您的服务器监控界面像飞船控制台一样精密且美观。

在技术架构上，它追求极致的轻量化与响应速度。后端采用 Python 标准库与轻量级框架，资源占用极低；前端采用响应式布局，在桌面端锁定全屏无滚动条，在移动端自动适配为竖向流式布局，确保在任何设备上都能完美呈现。

![Uploading image.png…]()

## ✨ 核心功能

*   **实时核心监控**：毫秒级刷新 CPU 使用率、内存占用、交换空间（Swap）及系统负载。
*   **网络流量分析**：实时显示上传/下载速度，绘制平滑的贝塞尔曲线历史趋势图。
*   **存储系统监测**：自动识别所有挂载的物理硬盘，实时监控每个分区的读写速度（I/O）及容量使用率。
*   **硬件温度感知**：自动发现并监控 CPU、NVMe 固态硬盘及无线网卡等硬件温度。
*   **智能网络识别**：自动检测服务器的公网 IP 地址（完美支持 IPv4/IPv6 双栈），鼠标悬停即可查看完整 IP。
*   **精准系统信息**：显示主机名、内核版本、精确的系统启动时间及活跃进程数。
*   **自适应布局**：桌面端采用 CSS 容器查询技术实现完美网格对齐，移动端自动切换为易于触摸滑动的布局。

## 📂 建议文件结构

在部署前，建议按照以下结构整理您的文件：

```text
/opt/chronos/
├── backend/
│   ├── monitor.py          # Python 后端核心程序
│   └── requirements.txt    # 依赖库列表
├── frontend/
│   └── index.html          # 前端界面文件
└── config/
    ├── nginx.conf          # Nginx 反代配置参考
    └── chronos.service     # 开机自启服务文件
```

---

## 🛠️ 部署指南

请按照以下步骤在您的 Debian/Ubuntu/CentOS 服务器上部署。

### 第一步：环境准备与后端部署

确保您的服务器已安装 Python 3。

1. 更新系统并安装 Python 包管理工具：

```bash
sudo apt update
sudo apt install python3-pip -y
```

2. 安装后端所需的 Python 依赖库：

```bash
pip3 install flask flask-cors psutil requests --break-system-packages
```

3. 创建目录并上传后端代码（假设您已将 `monitor.py` 上传至该目录）：

```bash
mkdir -p /opt/chronos/backend
# 请在此处将 monitor.py 放入 /opt/chronos/backend/
```

4. 测试运行后端（确保没有报错）：

```bash
python3 /opt/chronos/backend/monitor.py
# 正常情况下应输出：Running on http://127.0.0.1:5000
# 按 Ctrl+C 停止测试
```

### 第二步：配置开机自启 (Systemd)

为了让监控服务在后台稳定运行并随系统启动，我们需要创建一个服务文件。

1. 创建服务配置文件：

```bash
sudo nano /etc/systemd/system/chronos.service
```

2. 将以下内容粘贴进去（请确认路径与您实际存放路径一致）：

```ini
[Unit]
Description=Chronos Dashboard Backend
After=network.target

[Service]
# 后台运行模式
Type=simple
# 运行用户（建议使用 root 以获取完整的硬件信息）
User=root

# 工作目录
WorkingDirectory=/opt/chronos/backend

# 启动命令
ExecStart=/usr/bin/python3 /opt/chronos/backend/monitor.py

# 崩溃自动重启机制
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

3. 启用并启动服务：

```bash
sudo systemctl daemon-reload
sudo systemctl enable chronos.service
sudo systemctl start chronos.service
```

### 第三步：前端部署与 Nginx 反向代理

出于安全考虑，后端默认只监听本地 `127.0.0.1`。我们需要使用 Nginx（或雷池 WAF）来发布网页并转发数据请求。

1. 准备前端文件目录：

```bash
sudo mkdir -p /var/www/chronos
# 请将 index.html 上传至 /var/www/chronos/index.html
```

2. 创建 Nginx 配置文件：

```bash
sudo nano /etc/nginx/conf.d/chronos.conf
```

3. 粘贴以下配置（请修改 `server_name` 为您的域名或 IP）：

```nginx
server {
    listen 80;
    # 请修改为您实际的域名或IP
    server_name panel.yourdomain.com;

    # 1. 前端页面托管
    location / {
        root /var/www/chronos;
        index index.html;
        try_files $uri $uri/ =404;
    }

    # 2. 后端 API 反向代理
    # 前端请求 /api/stats 时，Nginx 会自动转发给本地的 Python 后端
    location /api/ {
        proxy_pass http://127.0.0.1:5000/api/;
        
        # 传递真实 IP 头信息
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    }
}
```

4. 检查配置并重启 Nginx：

```bash
sudo nginx -t
sudo systemctl restart nginx
```

---

## ⚙️ 个性化配置

如果您按照上述 Nginx 反向代理方式部署，**通常不需要修改任何代码**。

如果您是本地直接测试（不使用 Nginx），或者使用了特殊的端口配置，可以打开 `frontend/index.html`，找到底部的 JavaScript 配置区域进行修改：

```javascript
// ================= 配置区域 =================

// 场景 1：生产环境（推荐）
// 使用 Nginx 反代时，使用相对路径，自动适配域名
const API_URL = '/api/stats';

// 场景 2：本地开发测试
// 如果直接双击打开 HTML，需要填入服务器的完整地址
// const API_URL = 'http://192.168.1.100:5000/api/stats';

// ===========================================
```

## 🖥️ 兼容性说明

*   **操作系统**: 完美支持 Debian 11/12, Ubuntu 20.04+, CentOS 7+ 以及各类 NAS 系统（如飞牛 OS）。
*   **硬件架构**: 支持 x86_64 (Intel/AMD) 及 ARM64 (树莓派/Mac M系列)。
*   **浏览器**: 推荐使用 Chrome, Edge, Safari 或 Firefox 的最新版本以获得最佳动画体验。

## 📄 开源协议

本项目采用 MIT 协议开源。您可以自由地修改、分发或用于商业用途。

