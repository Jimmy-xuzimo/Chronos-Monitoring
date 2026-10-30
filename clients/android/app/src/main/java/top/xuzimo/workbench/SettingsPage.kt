@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package top.xuzimo.workbench

import androidx.compose.foundation.*
import androidx.compose.foundation.gestures.detectDragGesturesAfterLongPress
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.foundation.text.selection.SelectionContainer
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.unit.*
import org.json.JSONArray
import org.json.JSONObject
import java.time.LocalDate
import java.util.UUID
import kotlin.math.roundToInt

@Composable fun EntriesPage(model: WorkspaceModel) {
    var query by remember { mutableStateOf("") }; var group by remember { mutableStateOf("收藏") }; var edit by remember { mutableStateOf<JSONObject?>(null) }; var remove by remember { mutableStateOf<JSONObject?>(null) }
    val all = model.overview.rows("entries"); val groups = listOf("收藏", "全部") + all.map { it.s("group") }.filter { it.isNotBlank() }.distinct(); val context = LocalContext.current
    val rows = all.filter { (group == "全部" || group == "收藏" && it.optBoolean("pinned") || it.s("group") == group) && (it.s("name") + it.s("url")).contains(query, true) }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(10.dp)) {
        item { Section("常用入口", "添加") { edit = JSONObject() }; Chips(groups, group, { group = it }); Field("搜索入口", query, { query = it }); Caption("长按右侧手柄拖动排序，修改后直接保存到服务器") }
        items(rows, key = { it.s("id") }) { entry ->
            var drag by remember { mutableFloatStateOf(0f) }; var height by remember { mutableIntStateOf(100) }
            Panel(Modifier.onSizeChanged { height = it.height }) {
                Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Outlined.Language, null, tint = MaterialTheme.colorScheme.primary); TextButton({ openUrl(context, entry.s("url")) }, Modifier.weight(1f)) { Text(entry.s("name"), Modifier.fillMaxWidth(), fontWeight = FontWeight.Bold) }; IconButton({ model.editList("entries") { list -> list.map { if (it.s("id") == entry.s("id")) JSONObject(it.toString()).put("pinned", !it.optBoolean("pinned")) else it } } }, enabled = !model.busy) { Icon(if (entry.optBoolean("pinned")) Icons.Outlined.Star else Icons.Outlined.StarOutline, "收藏入口") }; Icon(Icons.Outlined.DragHandle, "长按拖动排序", Modifier.size(40.dp).offset(y = (drag / 3).dp).pointerInput(entry.s("id"), rows.map { it.s("id") }, model.busy) { if (!model.busy) detectDragGesturesAfterLongPress(onDrag = { change, amount -> change.consume(); drag += amount.y }, onDragCancel = { drag = 0f }, onDragEnd = { val delta = (drag / height.coerceAtLeast(1)).roundToInt(); drag = 0f; val index = rows.indexOfFirst { it.s("id") == entry.s("id") }; val target = rows[(index + delta).coerceIn(0, rows.lastIndex)]; if (target.s("id") != entry.s("id")) model.editList("entries") { list -> val copy = list.toMutableList(); val from = copy.indexOfFirst { it.s("id") == entry.s("id") }; val to = copy.indexOfFirst { it.s("id") == target.s("id") }; if (from >= 0 && to >= 0) copy.add(to, copy.removeAt(from)); copy } }) }) }
                Caption(entry.s("group") + " · " + entry.s("url"))
                Row { TextButton({ edit = entry }) { Text("编辑") }; TextButton({ remove = entry }) { Text("删除", color = MaterialTheme.colorScheme.error) } }
            }
        }
        if (rows.isEmpty()) item { Empty(if (group == "收藏") "还没有收藏，去全部入口点亮星标" else "没有匹配入口") }
    }
    edit?.let { old -> EditRecord("入口", old, model, { edit = null }) }
    remove?.let { old -> ConfirmDelete(old.s("name"), { remove = null }) { model.editList("entries") { it.filter { row -> row.s("id") != old.s("id") } }; remove = null } }
}

@Composable fun SettingsPage(model: WorkspaceModel,initialSection:String="外观") {
    val reveal = LocalThemeReveal.current; val activity = androidx.activity.compose.LocalActivity.current
    var section by remember(initialSection) { mutableStateOf(initialSection) }; var edit by remember { mutableStateOf<JSONObject?>(null) }; var remove by remember { mutableStateOf<JSONObject?>(null) }
    var agentDialog by remember { mutableStateOf(false) }; var agentName by remember { mutableStateOf("") }; var token by remember { mutableStateOf<JSONObject?>(null) }; var removeAgent by remember { mutableStateOf<JSONObject?>(null) }; var logout by remember { mutableStateOf(false) }
    val config = model.config; val key = if (section == "课表") "calendars" else "services"
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { Text("设置", fontSize = 27.sp, fontWeight = FontWeight.Bold); Caption("业务配置统一保存在服务器，多端共用"); Chips(listOf("外观", "天气", "课表", "网站", "数据源", "清理", "采集节点", "安全"), section, { section = it }) }
        when (section) {
            "外观" -> {
                item { GlassStylePicker(model) }
                item { Panel { Detail("服务器", model.api?.origin.orEmpty()); Detail("客户端", "我的工作台 "+BuildConfig.VERSION_NAME); Detail("数据存储", "服务器 SQLite / 配置文件"); Caption("登录凭据加密保存在本机；课表、监控历史和配置继续保存在服务器。退出登录会清除已保存的账号。") } }
            }
            "课表", "网站" -> {
                item { Section(if (section == "课表") "ICS 日历订阅" else "监测网站", "添加") { edit = JSONObject() }; if (section == "课表") Caption("时区固定为 Asia/Shanghai，课程配色随蓝色主题自动适配。已有订阅地址不会回传，编辑时留空即保留。") else Caption("服务器每 10 分钟探测；支持配置预期 HTTP 状态码。") }
                items(config.rows(key), key = { it.s("id") }) { record -> Panel { Text(record.s("name"), fontWeight = FontWeight.Bold); Caption(if (section == "课表") record.s("host") + " · " + if (record.optBoolean("configured")) "已配置" else "未配置" else record.s("url")); if (section == "网站") Caption("预期状态码 " + record.optJSONArray("expected")); Row { TextButton({ edit = record }) { Text("编辑") }; TextButton({ remove = record }) { Text("删除", color = MaterialTheme.colorScheme.error) } } } }
                if (section == "课表") item { SemesterForm(model) }
                if (config.rows(key).isEmpty()) item { Empty("暂无配置，可点击添加") }
            }
            "数据源" -> item { SourcesForm(model) }
            "天气" -> item { WeatherLocationForm(model) }
            "清理" -> item { RetentionForm(model) }
            "采集节点" -> {
                item { Section("Windows 采集节点", "添加") { agentDialog = true }; Caption("这里管理已有 Windows 采集器的接入凭证；云服务器由后台进程直接采集。删除节点会立即吊销其 Token。") }
                items(config.rows("agents"), key = { it.s("id") }) { agent -> Panel { Text(agent.s("name"), fontWeight = FontWeight.Bold); Caption(agent.s("id")); TextButton({ removeAgent = agent }) { Text("吊销并移除", color = MaterialTheme.colorScheme.error) } } }
            }
            "安全" -> {
                item { CredentialsForm(model) }
                item { OutlinedButton({ logout = true }, Modifier.fillMaxWidth(), enabled = !model.busy) { Text("退出当前会话") } }
            }
        }
    }
    edit?.let { EditRecord(section, it, model) { edit = null } }
    remove?.let { old -> ConfirmDelete(old.s("name"), { remove = null }) { model.editList(key) { it.filter { row -> row.s("id") != old.s("id") } }; remove = null } }
    removeAgent?.let { old -> ConfirmDelete("采集节点：" + old.s("name"), { removeAgent = null }) { model.removeAgent(old.s("id")); removeAgent = null } }
    if (logout) AlertDialog(onDismissRequest = { logout = false }, title = { Text("退出登录？") }, text = { Text("将清除已保存的登录凭据与当前会话。服务器继续采集。") }, confirmButton = { TextButton({ logout = false; model.logout() }) { Text("退出") } }, dismissButton = { TextButton({ logout = false }) { Text("取消") } })
    if (agentDialog) Sheet("添加采集节点", { if (!model.busy) agentDialog = false }) { Field("设备名称", agentName, { agentName = it }); Button({ model.registerAgent(agentName.trim()) { token = it; agentDialog = false; agentName = "" } }, enabled = agentName.isNotBlank() && !model.busy) { Text("在服务器创建") } }
    token?.let { issued -> Sheet("采集凭证 · 仅显示一次", { token = null }) { Text("请将以下配置填入 Windows 采集器的 config.json。关闭后无法重新读取 Token；遗失时请移除节点并重新添加。", fontSize = 13.sp); SelectionContainer { Text(JSONObject().put("server", model.api?.origin ?: "").put("node_id", issued.s("id")).put("token", issued.s("token")).toString(2), fontSize = 12.sp) }; Caption("不要把此凭证上传到公开仓库。采集器不会在安卓手机上运行。") } }
}

@Composable fun EditRecord(kind: String, old: JSONObject, model: WorkspaceModel, close: () -> Unit) {
    val existing = old.s("id").isNotBlank(); val key = when (kind) { "入口" -> "entries"; "课表" -> "calendars"; else -> "services" }
    var name by remember { mutableStateOf(old.s("name")) }; var url by remember { mutableStateOf(old.s("url")) }; var group by remember { mutableStateOf(old.s("group", "自托管服务")) }; var expected by remember { mutableStateOf(old.optJSONArray("expected")?.let { a -> (0 until a.length()).joinToString(",") { a.optInt(it).toString() } } ?: "200") }; var pinned by remember { mutableStateOf(old.optBoolean("pinned")) }; var service by remember { mutableStateOf(old.s("service")) }; var error by remember { mutableStateOf("") }
    Sheet((if (existing) "编辑" else "添加") + kind, { if (!model.busy) close() }) {
        Field("名称", name, { name = it }); Field(if (kind == "课表" && existing) "订阅链接（留空保留）" else "地址", url, { url = it })
        if (kind == "入口") { Field("分组", group, { group = it }); Row(verticalAlignment = Alignment.CenterVertically) { Text("加入收藏", Modifier.weight(1f)); Switch(pinned, { pinned = it }) }; var menu by remember { mutableStateOf(false) }; Box { OutlinedButton({ menu = true }) { Text("关联状态：" + (model.config.rows("services").firstOrNull { it.s("id") == service }?.s("name") ?: "无")) }; DropdownMenu(menu, { menu = false }) { DropdownMenuItem({ Text("无关联") }, { service = ""; menu = false }); model.config.rows("services").forEach { row -> DropdownMenuItem({ Text(row.s("name")) }, { service = row.s("id"); menu = false }) } } } }
        if (kind == "网站") Field("预期 HTTP 状态码（英文逗号分隔）", expected, { expected = it })
        if (error.isNotBlank()) Text(error, color = MaterialTheme.colorScheme.error, fontSize = 12.sp)
        Button({
            try {
                require(name.isNotBlank()) { "请填写名称" }
                if (url.isNotBlank()) { val parsed = java.net.URI(url.trim()); require(parsed.scheme in listOf("http", "https") && !parsed.host.isNullOrBlank() && parsed.userInfo == null) { "请输入有效的 HTTP(S) 地址" } } else require(kind == "课表" && existing) { "请填写地址" }
                val record = JSONObject(old.toString()).put("id", old.s("id").ifBlank { UUID.randomUUID().toString().take(8) }).put("name", name.trim())
                if (url.isNotBlank()) record.put("url", url.trim()) else record.remove("url")
                when (kind) { "入口" -> { record.put("group", group.trim()).put("pinned", pinned).put("service", service) }; "网站" -> { val codes = expected.split(',').map { it.trim().toInt() }; require(codes.isNotEmpty() && codes.all { it in 100..599 }) { "状态码须在 100—599 之间" }; record.put("expected", JSONArray(codes)) }; else -> if (!record.has("color")) record.put("color", "#3974f6") }
                model.editList(key, done = close) { rows -> if (existing) rows.map { if (it.s("id") == old.s("id")) record else it } else rows + record }
            } catch (e: Exception) { error = e.message ?: "请检查填写内容" }
        }, enabled = !model.busy, modifier = Modifier.fillMaxWidth()) { Text("保存到服务器") }
    }
}

@Composable fun SemesterForm(model: WorkspaceModel) {
    var start by remember(model.config.s("semester_start")) { mutableStateOf(model.config.s("semester_start")) }; var weeks by remember(model.config.optInt("semester_weeks")) { mutableStateOf(model.config.optInt("semester_weeks").toString()) }; var error by remember { mutableStateOf("") }
    Panel { Text("学期设置", fontWeight = FontWeight.Bold); Field("第 1 周开始日期（YYYY-MM-DD）", start, { start = it }); Field("教学周数", weeks, { weeks = it }); if (error.isNotBlank()) Text(error, color = MaterialTheme.colorScheme.error); Button({ try { LocalDate.parse(start); val n = weeks.toInt(); require(n in 1..52); model.save(JSONObject().put("semester_start", start).put("semester_weeks", n)); error = "" } catch (_: Exception) { error = "请填写有效日期和 1—52 周" } }, enabled = !model.busy) { Text("保存学期") } }
}
@Composable fun SourcesForm(model: WorkspaceModel) {
    var github by remember(model.config.s("github_user")) { mutableStateOf(model.config.s("github_user")) }; var news by remember(model.config.s("news_url")) { mutableStateOf(model.config.s("news_url")) }; var token by remember { mutableStateOf("") }
    Panel { Text("GitHub 与资讯", fontWeight = FontWeight.Bold); Field("GitHub 用户名", github, { github = it }); OutlinedTextField(token, { token = it }, modifier = Modifier.fillMaxWidth(), label = { Text("GitHub Token（留空保留）") }, visualTransformation = PasswordVisualTransformation(), singleLine = true, shape = workbenchShape(16.dp)); Caption(if (model.config.optBoolean("github_token_set")) "服务器已配置 Token，凭证不会回传" else "服务器尚未配置 Token"); Field("资讯网站地址", news, { news = it }); Caption("使用现有资讯站 /data/index.json 与按日 JSON；采集频率由服务器统一控制。"); Button({ val patch = JSONObject().put("github_user", github.trim()).put("news_url", news.trim()); if (token.isNotBlank()) patch.put("github_token", token.trim()); model.save(patch) { token = "" } }, enabled = !model.busy) { Text("保存数据源") }; TextButton({ model.syncNews() }, enabled = !model.busy) { Text("请求立即同步资讯") } }
}
@Composable fun RetentionForm(model: WorkspaceModel) {
    val names = listOf("raw_days" to "原始资源数据（1—30 天）", "history_days" to "汇总历史（7—365 天）", "event_days" to "故障与提醒（7—365 天）", "news_days" to "资讯存档（7—365 天）")
    val values = remember(model.config.obj("retention").toString()) { mutableStateMapOf<String, String>().apply { names.forEach { (key, _) -> put(key, model.config.obj("retention").optInt(key).toString()) } } }; var error by remember { mutableStateOf("") }
    Panel { Text("数据保留期限", fontWeight = FontWeight.Bold); Caption("每周一 04:00，由服务器统一清理过期数据；关闭 App 仍会执行。"); names.forEach { (key, label) -> Field(label, values[key].orEmpty(), { values[key] = it }) }; if (error.isNotBlank()) Text(error, color = MaterialTheme.colorScheme.error); Button({ try { val retention = JSONObject(); names.forEach { (key, _) -> val n = values[key]!!.toInt(); require(if (key == "raw_days") n in 1..30 else n in 7..365); retention.put(key, n) }; model.save(JSONObject().put("retention", retention)); error = "" } catch (_: Exception) { error = "请按标注范围填写整数" } }, enabled = !model.busy) { Text("保存清理规则") } }
}
@Composable fun CredentialsForm(model: WorkspaceModel) {
    var current by remember { mutableStateOf("") }; var username by remember { mutableStateOf("") }; var password by remember { mutableStateOf("") }
    Panel { Text("账号安全", fontWeight = FontWeight.Bold); OutlinedTextField(current, { current = it }, Modifier.fillMaxWidth(), label = { Text("当前密码") }, visualTransformation = PasswordVisualTransformation(), singleLine = true); Field("新账号（留空保留）", username, { username = it }); OutlinedTextField(password, { password = it }, Modifier.fillMaxWidth(), label = { Text("新密码（留空保留，至少 10 位）") }, visualTransformation = PasswordVisualTransformation(), singleLine = true); Caption("修改后，服务器会使其他已登录会话失效。"); Button({ model.credentials(JSONObject().put("current_password", current).put("new_username", username.trim()).put("new_password", password)) { current = ""; password = ""; username = "" } }, enabled = !model.busy && current.isNotBlank() && (password.isEmpty() || password.length >= 10)) { Text("更新服务器账号") } }
}
@Composable fun ConfirmDelete(name: String, close: () -> Unit, confirm: () -> Unit) { AlertDialog(onDismissRequest = close, title = { Text("确认删除？") }, text = { Text("将从服务器移除「$name」，所有客户端都会同步此更改。") }, confirmButton = { TextButton(confirm) { Text("删除", color = MaterialTheme.colorScheme.error) } }, dismissButton = { TextButton(close) { Text("取消") } }) }
