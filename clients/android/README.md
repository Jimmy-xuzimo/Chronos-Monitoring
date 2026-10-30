# 我的工作台 · Android

连接现有 Flask 工作台的 Kotlin / Jetpack Compose 原生客户端。账号、课表、历史数据、监测对象、收藏、资讯、保留期限和安卓外观配置均由服务器维护。首页按照「南京天气与时间 → 今日或下一节课 → 双设备性能 → 网站证书 → GitHub → 资讯」排列，空间不足时自然滚动。

## 使用

1. 安装签名的 `我的工作台.apk`，打开后填写现有面板的登录账号与密码。
2. 默认服务器为 `https://panel.example.com`；登录页可更换为部署了相同 API 的 HTTPS 站点。不需要 SSH 密码或服务器管理权限。
3. 在「更多 → 外观」切换月白、苔庭、暮樱、石墨、工业废土五套风格与深浅模式。弹层和当前页面保持打开，选择通过 `/api/config` 保存到服务器，其他设备重新读取配置后可继承。
4. 「更多 → 设置」维护 ICS 订阅、学期、网站、GitHub、资讯源、保留期限、Windows 节点与账号；入口页可收藏、编辑和长按手柄排序。

首次未配置模式时读取设备深浅设置，界面不提供持续跟随开关。原有 Windows 采集器继续运行，不需要在安卓上安装另一个采集进程。点击外部网站会交给系统浏览器，内网入口要求手机已连接对应局域网或 VPN。

## 界面与适配

- 五套风格分别调整背景光晕、玻璃参数与圆角；每套均有深浅配色。工业废土使用炭灰、亮白与锈橙。App 内 Logo 随所选风格更新。桌面图标入口保持稳定，避免系统重载应用。
- 玻璃渲染使用用户指定的 [AndroidLiquidGlassView](https://liquidglass.qmdeve.com/zh/) 1.1.0，真实采样独立的原生背景 View。Android 13+ 使用库内的 AGSL 折射、色散和模糊，文字与图表保持清晰；较旧系统使用可读的半透明降级背板。旧版手绘玻璃实现已删除。
- 使用原生可滚动列表、非线性页面过渡和底部弹层；模式切换交替扩散、收回，均为 900ms。过渡帧通过 PixelCopy 保存在内存，不写图片文件。
- 手机竖屏使用浮动底部导航；平板和手机横屏使用左侧导航。宽内容区采用双列，不通过锁定高度或禁止滚动压缩信息。
- 默认设备曲线为 24h，可切换 1h、7d、30d；首页始终使用独立的 24h 数据。

## 可配置地点的天气

默认南京站 58238，可在「设置 → 天气」检索中国城市／区县并保存地点，也可从首页天气详情进入。地点保存在服务器，采集进程检测变化后重新拉取。客户端只访问自己的 `/api/weather` 或总览接口，不使用 GPS、IP 定位或手机端天气密钥。

温度、体感、湿度、风与实况时间来自站点观测；「今日 / 今晚」天气描述明确属于预报。超过两小时的观测拒绝覆盖缓存，同步失败保留旧数据并标注状态。数据源域名固定，站点编号只允许 5 位数字；限制 256KiB、8 秒连接／读取超时并拒绝跳转。不同城市使用不同缓存键，切换城市不会借用旧地点的天气。此网站数据端点的可用性和结构可能变化，维护入口是服务器的 `backend/weather.py`，无需重新打包 App。

来源：[中国气象局南京天气](https://weather.cma.cn/web/weather/58238.html)。未嵌入第三方天气密钥。

## 数据与权限

- 仅使用互联网访问权限；AndroidX 另外生成应用专属的签名级广播权限。无通讯录、定位、文件读取或通知权限。
- 无 Room/SQLite、业务文件缓存或离线数据库。仅登录凭据与会话使用 Android Keystore 的 AES-256-GCM 加密存放在 noBackupFilesDir，不保存明文密码。
- 登录成功后保存加密凭据和会话；下次启动先恢复会话，失效时使用已保存凭据重新登录。退出登录删除本机保存的凭据。HTTP 禁用磁盘缓存，课程和监控数据只驻留内存或服务器。
- 服务器使用现有会话、CSRF、HTTPS 与凭证脱敏机制。App 不携带面板账号、SSH 凭证、GitHub Token 或个人 ICS 地址。
- 不绕过 TLS 证书错误，不跟随 API 重定向。发布版仅接受 HTTPS 根地址；局域网 HTTP 网站可交给外部浏览器打开。
- 系统可能维护临时网络信息或用户主动生成的截图，这不属于 App 的业务数据存储。

## 构建

需要 JDK 21+（本次使用 Android Studio 的 JBR）、Android SDK Platform 37.0（sdkmanager 包名 `platforms;android-37.0`）、Build Tools 36.0.0。目标版本 Android 16 / API 36，最低 Android 8 / API 26。Gradle 9.6.0、AGP 9.4.0、Compose BOM 2026.09.00 已固定。

```powershell
$env:JAVA_HOME = 'C:\Program Files\Android\Android Studio\jbr'
$env:ANDROID_HOME = "$env:LOCALAPPDATA\Android\Sdk"
.\gradlew.bat :app:assembleDebug :app:lintDebug
```

生产签名使用环境变量，私钥不在源码包中：

```powershell
$env:WORKBENCH_KEYSTORE = 'D:\private\workbench-release.jks'
$env:WORKBENCH_KEY_PASSWORD = '<你自己的签名密码>'
# 密钥别名必须为 workbench；请使用密码管理器或 CI Secret 注入实际密码。
.\gradlew.bat :app:assembleRelease :app:lintRelease
```

未提供签名环境变量时只生成 unsigned release。后续升级要保留相同 applicationId 与签名密钥，并递增 versionCode；不要将签名密码写入脚本或上传仓库。

## 接口与服务端扩展

复用 `/api/session`、`/api/login`、`/api/overview`、`/api/calendar`、`/api/stats`、`/api/history`、`/api/services`、`/api/github`、`/api/news`、`/api/config`、`/api/alerts`、`/api/agents` 与 `/api/credentials`。

新增服务端接口 `/api/weather`、`/api/weather/locations?q=城市名`，以及配置项：

```json
{"android_appearance":{"style":"ocean","theme":"light"},"weather_location":{"station_id":"58238","name":"南京"}}
```

style 允许 `ocean / ice / aurora / graphite / industrial`（依次为月白、苔庭、暮樱、石墨、工业废土），theme 允许 `device / light / dark`。新增字段会由服务端验证，未登录不能读取天气。配套服务端文件在仓库根目录的 `backend/` 中；部署前备份原后端、运行配置与 SQLite，更新四个文件后重启 API 和采集服务。现有网页兼容额外响应字段。

App 不发起服务器控制命令，也不负责服务端的定时任务。资源采样、新闻 07:30 同步、网站十分钟探测和每周清理继续由独立采集进程执行。

## 验证

`app/src/androidTest` 包含原生导航、配置写回、五套深浅风格、天气地点更改、归档资讯、会话过期与适配检查。测试只使用独立的虚构服务器：

```powershell
python tools/fixture_server.py --backend ../../backend --data ../../.android-fixture-data
.\gradlew.bat :app:connectedDebugAndroidTest
```

测试默认通过模拟器 `10.0.2.2:5093` 访问宿主；仅 debug 包为此回环地址开放 HTTP，发布包没有这条例外。天气与课程演示内容不代表用户真实数据。具体通过的分辨率、Android 版本和限制见交付的验收说明，不将模拟器测试等同于真机测试。

## 第三方代码与修补

`liquidglass/` 来自 Maven Central 的 `com.qmdeve.liquidglass:core:1.1.0` 官方 sources.jar 与 AAR 资源，原始下载 SHA-256 记录于 `liquidglass/upstream.json`。为修复快速切页／旋转时复现的空指针，只增加两项保护：延迟参数回调检查当前实例与附着状态；视图分离后不再创建玻璃实例。AGSL 和折射渲染算法保持上游内容。MIT 许可保存在模块及 APK 资源中。

不在应用内切换主题时调用 PackageManager 更改 Launcher 组件，以避免系统桌面刷新或 Activity 重载；保留旧版别名用于平滑升级。应用内 Logo 和所有配色实时切换，业务外观偏好仍来自服务器。

## 1.0.1

- 去掉通用顶栏，外观、设置、提醒和刷新移入更多。
- 首页时间、日期、天气直接显示在背景上，不设方框或玻璃背板；课程列表压缩高度，优先完整呈现两台设备的性能监控。小屏及大字体会自动使用更紧凑的卡片。
- 底部与侧边导航支持连续拖动选页、弹簧指示器和非线性页面过渡。
- 风格选择改为无交叠的五行列表，仅保留名称、色样和模式。工业废土使用近方形控件、对齐网格与角标，深浅模式均有独立表现。
- 登录加密保存，恢复会话或自动重新登录；退出时清除。首次从 1.0.0 升级仍需登录一次，因为旧版从未保存密码。
