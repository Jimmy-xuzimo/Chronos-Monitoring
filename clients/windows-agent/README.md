# Windows 电脑采集器 1.0.0

原生 C# / Windows Forms 软件。使用 Windows 的 .NET Framework 4.8，不需要 Python 或 Electron。发布安装器约 97 KB，运行内存随采样和系统变化，不能用文件体积推断运行占用。

## 安装与接入

从仓库 Releases 下载安装器，双击确认安装；当前用户安装，无需管理员权限。首次安装可迁移本机旧 ZimoPanelAgent 的配置，安装包本身没有账号、Token 或设备数据。

1. 在已部署面板的「设置 → 采集节点」新增节点，保存仅显示一次的 Token。
2. 从开始菜单打开「我的工作台采集器」。将默认的 `https://panel.example.com` 改为自己的 HTTPS 根地址，填写节点 ID 和 Token。
3. 点击「保存并应用」，等待上传成功。ID 是本地标注，服务器实际按 Token 识别节点；修改本地 ID 不会创建或重命名服务器节点。
4. 替换旧脚本时，确认新程序成功上报后，停用旧计划任务、启动快捷方式和旧进程，避免重复上传。安装器不会擅自删除旧脚本或任务。

默认每 10 秒上传，可设置为 10—120 秒；还可保存暂停上传、自启动开关。登录自启动指当前用户进入 Windows 后启动，不是登录前系统服务。关闭窗口继续托盘运行；双击托盘重新打开，托盘菜单可彻底退出。

安装位置：`%USERPROFILE%\Applications\ZimoWorkbenchAgent`。数据位置：`%USERPROFILE%\.zimo-workbench-agent`。凭据由 Windows DPAPI 当前用户加密。不要提交运行目录、采样文件或旧配置。Windows 的已安装应用和开始菜单均提供卸载入口；卸载不删除服务器历史。

## 构建

在 Windows PowerShell 中执行：

```powershell
cd clients/windows-agent
.\build.ps1
```

生成 `WorkbenchAgent.exe` 与包含它的 `WorkbenchAgentSetup.exe`。分发后者即可；构建不读取个人配置，也不自动安装或运行采集器。安装器未使用商业代码签名，源码可自行审阅和构建。

## 数据与验证

CPU／每核、内存、分页文件、磁盘容量与读写、网卡流量、TCP 连接、前列进程和运行时间通过 HTTPS 主动上报 `/api/agent/report`。不开放监听端口，不提供远程控制，不绕过证书验证，不跟随上传重定向。凭据无效、网络中断时显示错误并按采集周期重试。

原实现已在一台 Windows 电脑上验证真实采样、服务器字段校验、连续上传、配置读写、单实例唤起与界面布局。自启动注册项已检查，未重启电脑测试登录；没有其他 Windows 版本或实体硬件的覆盖保证。公开版本替换了默认域名，构建结果与本机私人版本分开。
