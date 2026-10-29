# CHRONOS 项目介绍页

纯静态 HTML / CSS / JavaScript，无构建依赖，不连接监控 API。所有课程、设备读数、网站、仓库和新闻均为虚构演示。

- `index.html`：介绍、交互演示、架构与部署入口。
- `style.css`：深浅模式、四种演示配色、响应式与减少动态效果。
- `app.js`：静态演示模块、主题、键盘标签切换和命令复制。
- `assets/`：本项目绘制的 SVG 标识及 README 横幅。

本地预览：`python -m http.server 5081 --bind 127.0.0.1 --directory website`。

推送 `main` 后，`.github/workflows/pages.yml` 将这个目录发布到现有 GitHub Pages：
https://jimmy-xuzimo.github.io/Chronos-Monitoring/

这不是登录面板的部署目录，不能通过本页查看任何真实服务器。运行实际工作台请遵循仓库根目录 README。
