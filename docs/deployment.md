# 部署、维护与 Windows 节点

以下路径均为通用示例。个人域名、证书和密码需要自行准备；不要复制任何第三方线上配置。原仓库 v1/v2 使用者应先部署到独立目录预览，再切换反向代理。

## Linux 生产环境

以 Ubuntu / Debian、Python 3.12、Node.js 22.12+、pnpm 11 为例。先安装这些运行时及 Nginx，域名应解析到服务器，并准备有效 TLS 证书。前端可以在开发机或 CI 构建后上传，服务器不必常驻 Node.js。

### 1. 源码与专用用户

```bash
sudo useradd --system --home /var/lib/chronos --shell /usr/sbin/nologin chronos
sudo git clone https://github.com/Jimmy-xuzimo/Chronos-Monitoring.git /opt/chronos
sudo python3.12 -m venv /opt/chronos/.venv
sudo /opt/chronos/.venv/bin/python -m pip install -r /opt/chronos/backend/requirements.lock
sudo install -d -m 700 -o chronos -g chronos /var/lib/chronos
```

如果用户或目录已存在，先检查用途，不要覆盖其他应用。源码目录保持专用用户可读，运行目录只允许服务用户和管理员访问。

### 2. 前端构建

在开发机的同一份源码执行：

```bash
pnpm --dir frontend install --frozen-lockfile
pnpm --dir frontend build
```

将 `frontend/dist/` **整个目录**上传为 `/opt/chronos/frontend/dist/`。不要只复制 HTML，否则哈希资源会缺失。确认 Nginx 用户可读取静态目录。

### 3. 初始化账号

下面命令在终端隐式输入密码，避免把密码写进服务文件或 shell 历史：

```bash
cd /opt/chronos/backend
sudo -u chronos env PANEL_DATA=/var/lib/chronos /opt/chronos/.venv/bin/python -c "import os; from getpass import getpass; os.environ['PANEL_INITIAL_PASSWORD']=getpass('Initial password: '); from settings import load; load()"
```

账号为 `admin`。初始化只在配置不存在时发生；后续重启沿用配置，不需要长期保留初始密码环境变量。

### 4. 两个后台服务

```bash
sudo cp /opt/chronos/config/chronos-api.service /etc/systemd/system/
sudo cp /opt/chronos/config/chronos-collector.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now chronos-api chronos-collector
sudo systemctl status chronos-api chronos-collector
```

API 使用 Gunicorn，监听 `127.0.0.1:5002`。采集器用操作系统文件锁避免重复运行。两个服务都使用 `PANEL_DATA=/var/lib/chronos`，不要改成不同目录。

示例的 `User=chronos` 为专用低权限用户。系统连接数、进程或设备信息可能因权限而缺失，这是正常限制；不要因此关闭整机安全组件或把 Web 服务默认改为 root。

### 5. Nginx 与 HTTPS

参考 [config/nginx.conf](../config/nginx.conf)，替换以下项目：

- `panel.example.com`：你自己的域名。
- `ssl_certificate` / `ssl_certificate_key`：已签发证书路径。
- `root`：`/opt/chronos/frontend/dist`。
- `/api/`：代理到 `http://127.0.0.1:5002`，不要去掉 `/api/` 路径。

在已有 Nginx / 宝塔站点中合并配置，避免创建重复 `server_name`。证书尚未准备时不要直接加载引用不存在证书的 HTTPS 配置。

```bash
sudo nginx -t
sudo systemctl reload nginx
```

生产必须保留 `PANEL_COOKIE_SECURE=1`，仅公开 Nginx 的 80 / 443。API 端口只监听回环；不要在防火墙额外开放 5002。

`ProxyFix` 信任一层代理，因此应由可信 Nginx 覆盖转发头。面板不是为绕过 Nginx 直接暴露 Gunicorn 设计的。

## 环境变量

| 变量 | 默认 / 用途 |
| --- | --- |
| `PANEL_DATA` | 默认 `backend/data/`；生产建议 `/var/lib/chronos` |
| `PANEL_INITIAL_PASSWORD` | 只用于首次初始化；无默认密码 |
| `PANEL_COOKIE_SECURE` | 默认 `1`；本机 HTTP 调试才设 `0` |
| `PANEL_DIST` | 默认 `frontend/dist/`，可设置静态构建目录 |
| `PORT` | Flask 开发入口端口，默认 5000；不影响 systemd 的 Gunicorn 配置 |

配置、SQLite、锁文件属于运行时数据，应持久化，不上传到网站根目录。

## Windows 采集节点

Agent 适用于 Windows，要求 Python 3.12 与 `psutil`，使用 `msvcrt` 锁避免重复进程。它主动向面板 HTTPS 上报，不在电脑上开放监听端口。

### 1. 准备文件

从仓库复制 `backend/agent.py`、`backend/metrics.py`、`backend/store.py` 到同一个本地目录。为 Agent 创建独立虚拟环境：

```powershell
py -3.12 -m venv .agent-venv
.agent-venv\Scripts\python.exe -m pip install psutil==7.2.2
```

### 2. 注册

仓库提供 [scripts/register_agent.py](../scripts/register_agent.py)。在 Windows 终端执行，它会询问 HTTPS 面板地址、管理员账号、密码和设备名称：

```powershell
.agent-venv\Scripts\python.exe scripts\register_agent.py --output "$env:LOCALAPPDATA\ChronosAgent\agent-config.json"
```

辅助工具创建私有目录、限制 Windows ACL，使用当前管理员会话注册节点，将一次性 Token 直接写入文件，不打印 Token。**不要使用 `--output` 指向仓库内的示例文件或共享目录。** 输出文件已存在时工具拒绝覆盖。

配置结构仅供说明，不要提交真实值：

```json
{"server":"https://panel.example.com","node_id":"注册返回的ID","token":"注册返回的一次性凭证"}
```

### 3. 启动与自动运行

```powershell
.agent-venv\Scripts\pythonw.exe -X utf8 agent.py --config "$env:LOCALAPPDATA\ChronosAgent\agent-config.json"
```

需要开机后持续上报时，在 Windows 任务计划程序中创建“当前用户登录时”任务，程序使用 `pythonw.exe` 的绝对路径，参数为上述脚本与配置的绝对路径，并设置脚本所在目录为“起始于”。这是手动维护步骤，仓库不会自动修改系统任务。

Agent 日志为同目录的 `agent.log`，会轮转；`status.json` 可判断最近一次成功或重试。关机、休眠、断网时服务器会标记离线；唤醒后自动重试。

撤销节点使用已登录会话调用 `DELETE /api/agents/<id>` 并提供 CSRF 头；撤销后旧 Token 不能再上报。没有提供节点管理 UI，注册与撤销目前使用辅助工具 / API。Token 无法读取账号、课表或其他节点数据。

## 备份、升级与回退

完整备份包括运行目录、源码 / 构建版本、Nginx 配置和 systemd 文件。配置与数据库包含私人数据，备份文件应存放在网站根目录之外，并限制权限。

SQLite 使用 WAL，不能在运行中只复制 `panel.sqlite3` 而忽略 WAL。最简单的短暂停机备份：

```bash
sudo systemctl stop chronos-api chronos-collector
sudo tar -czf /var/backups/chronos-data-backup.tar.gz -C /var/lib chronos
sudo chmod 600 /var/backups/chronos-data-backup.tar.gz
sudo systemctl start chronos-api chronos-collector
```

文件名应自行加入日期，防止覆盖上次备份。升级前先在独立目录构建并测试，再停止服务、备份数据、替换版本并启动；如果数据结构改变，回退必须同时恢复相匹配的数据备份。不要把不同版本同时指向同一个运行目录。

旧版 `backend/config.json` 仅在新配置不存在时作为账号迁移来源；不会自动导入旧版入口配置、全部历史或旧前端偏好。先备份再迁移，保留旧站点与服务定义以便回退。

## 恢复账号

保留原配置与数据库，不要靠删除文件重置。

1. 停止 API 和采集器，完整备份运行目录。
2. 在服务器终端执行以下命令，输入新密码；密码不会输出到终端：

```bash
cd /opt/chronos/backend
sudo -u chronos env PANEL_DATA=/var/lib/chronos /opt/chronos/.venv/bin/python -c "from getpass import getpass; from settings import load,save,hash_password; c=load(); c['password']=hash_password(getpass('New password: ')); c['auth_version']=c.get('auth_version',0)+1; save(c)"
```

3. 重启两个服务并使用新密码登录。递增 `auth_version` 会使之前的会话失效。

## 故障检查

```bash
sudo journalctl -u chronos-api -u chronos-collector -n 100 --no-pager
sudo systemctl status chronos-api chronos-collector
curl -I https://panel.example.com/
```

日志发给别人前应删除主机名、域名、私有地址、订阅路径、Cookie、Token 和课程信息。API 的来源错误与采集更新时间有助于判断是来源失败还是采集器未运行。
