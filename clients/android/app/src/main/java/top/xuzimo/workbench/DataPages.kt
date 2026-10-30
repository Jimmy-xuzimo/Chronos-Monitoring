@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package top.xuzimo.workbench

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.lazy.items
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.*
import org.json.JSONObject
import java.time.*
import java.time.format.DateTimeFormatter

@Composable fun CourseRow(course: JSONObject, today: Boolean, compact: Boolean = false) {
    var detail by remember { mutableStateOf(false) }
    Row(Modifier.fillMaxWidth().clickable { detail = true }.padding(vertical = if (compact) 4.dp else 9.dp), verticalAlignment = Alignment.Top) {
        Column(Modifier.width(58.dp)) { Text(if (course.optBoolean("untimed")) "待定" else if (course.optBoolean("all_day")) "全天" else clockTime(course, "start"), color = MaterialTheme.colorScheme.primary, fontWeight = FontWeight.Bold, fontSize = 14.sp); if (!course.optBoolean("untimed") && !course.optBoolean("all_day")) Caption(clockTime(course, "end")) }
        Box(Modifier.width(3.dp).height(38.dp).background(MaterialTheme.colorScheme.primary, Rounded))
        Column(Modifier.weight(1f).padding(start = 12.dp)) { Text(course.s("title"), fontWeight = FontWeight.SemiBold, fontSize = 15.sp); Caption(course.s("location").ifBlank { "地点待定" } + if (course.s("teacher").isNotBlank()) " · " + course.s("teacher") else ""); if (!today) Caption(course.s("date")); if (course.s("warning").isNotBlank()) Text(course.s("warning"), color = MaterialTheme.colorScheme.error, fontSize = 11.sp) }
        Icon(Icons.Outlined.ChevronRight, "课程详情", Modifier.size(16.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant)
    }
    if (detail) Sheet(course.s("title"), { detail = false }) {
        Text(course.s("date") + " · " + if (course.optBoolean("untimed")) "时间未定" else if (course.optBoolean("all_day")) "全天" else clockTime(course, "start") + "—" + clockTime(course, "end"), color = MaterialTheme.colorScheme.primary)
        Detail("教室", course.s("location", "待定")); Detail("教师", course.s("teacher", "未提供")); Detail("节次", course.s("periods", "未提供")); Detail("教学周", if (course.isNull("week")) "未提供" else "第 ${course.optInt("week")} 周"); Detail("订阅", course.s("calendar")); if (course.s("warning").isNotBlank()) Text(course.s("warning"), color = MaterialTheme.colorScheme.error); Text(course.s("description").ifBlank { "没有额外备注" }, fontSize = 14.sp)
    }
}

@Composable fun CalendarPage(model: WorkspaceModel) {
    var mode by remember { mutableStateOf("今日") }; var day by remember { mutableStateOf(LocalDate.now(China)) }
    val calendar = model.overview.obj("calendar"); val events = calendar.rows("events"); val rows = events.filter { courseDay(it) == day }
    LazyColumn(Modifier.fillMaxSize().testTag("calendar-list"), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { Chips(listOf("今日", "周课表", "月历"), mode, { mode = it; if (it == "今日") day = LocalDate.now(China) }) }
        item { Row(Modifier.fillMaxWidth(), verticalAlignment = Alignment.CenterVertically) { IconButton({ day = if (mode == "月历") day.minusMonths(1) else if (mode == "周课表") day.minusWeeks(1) else day.minusDays(1) }) { Icon(Icons.Outlined.ChevronLeft, "上一期") }; Text(day.format(DateTimeFormatter.ofPattern(if (mode == "月历") "yyyy 年 M 月" else "yyyy 年 M 月 d 日")), Modifier.weight(1f), fontWeight = FontWeight.Bold, fontSize = 20.sp); IconButton({ day = if (mode == "月历") day.plusMonths(1) else if (mode == "周课表") day.plusWeeks(1) else day.plusDays(1) }) { Icon(Icons.Outlined.ChevronRight, "下一期") } } }
        item { calendar.rows("sources").forEach { SourceNote(it) }; val start = runCatching { LocalDate.parse(calendar.s("semester_start")) }.getOrNull(); if (start != null) { val week = java.time.temporal.ChronoUnit.DAYS.between(start, day) / 7 + 1; Caption(if (day.isBefore(start)) "新学期尚未开始" else if (week > calendar.optInt("semester_weeks", 20)) "学期已结束，请更新订阅或学期日期" else "第 $week 教学周 · 中国标准时间") } }
        if (mode == "周课表") item {
            val monday = day.minusDays((day.dayOfWeek.value - 1).toLong())
            Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) { (0..6).forEach { offset -> val date = monday.plusDays(offset.toLong()); val count = events.count { courseDay(it) == date }; Surface(onClick = { day = date }, color = if (day == date) MaterialTheme.colorScheme.primary else MaterialTheme.colorScheme.surface, shape = workbenchShape(18.dp)) { Column(Modifier.width(56.dp).padding(vertical = 12.dp), horizontalAlignment = Alignment.CenterHorizontally) { Text(listOf("一", "二", "三", "四", "五", "六", "日")[offset], fontSize = 11.sp); Text(date.dayOfMonth.toString(), fontSize = 19.sp, fontWeight = FontWeight.Bold); Text("${count}课", fontSize = 10.sp) } } } }
        }
        if (mode == "月历") item { Panel {
            Row { listOf("一", "二", "三", "四", "五", "六", "日").forEach { Text(it, Modifier.weight(1f), textAlign = androidx.compose.ui.text.style.TextAlign.Center, fontSize = 11.sp) } }
            val first = day.withDayOfMonth(1); val offset = first.dayOfWeek.value - 1; val total = ((offset + day.lengthOfMonth() + 6) / 7) * 7
            (0 until total step 7).forEach { base -> Row { (0..6).forEach { col -> val number = base + col - offset + 1; Box(Modifier.weight(1f).height(49.dp), contentAlignment = Alignment.Center) { if (number in 1..day.lengthOfMonth()) { val date = first.withDayOfMonth(number); val count = events.count { courseDay(it) == date }; Surface(onClick = { day = date }, shape = workbenchShape(12.dp), color = if (date == day) MaterialTheme.colorScheme.primary else Color.Transparent) { Column(Modifier.width(40.dp).padding(vertical = 5.dp), horizontalAlignment = Alignment.CenterHorizontally) { Text("$number", fontSize = 13.sp); Box(Modifier.size(4.dp).background(if (count > 0) if (date == day) Color.White else MaterialTheme.colorScheme.primary else Color.Transparent, Rounded)) } } } } } } }
        } }
        item { Text("${day.monthValue} 月 ${day.dayOfMonth} 日 · ${rows.size} 门课", fontWeight = FontWeight.SemiBold) }
        items(rows, key = { it.s("id") + it.s("start") }) { course -> Panel { CourseRow(course, true) } }
        if (rows.isEmpty()) item { Panel { Empty("这一天没有课程") } }
    }
}

@Composable fun DevicesPage(model: WorkspaceModel,initialTab:String="资源") {
    var nodeId by remember { mutableStateOf("server") }; var tab by remember(initialTab) { mutableStateOf(initialTab) }; var corePage by remember { mutableIntStateOf(0) }
    val nodes = model.overview.rows("nodes"); val ids = nodes.map { it.s("id") }
    LaunchedEffect(ids) { if (nodeId !in ids && ids.isNotEmpty()) nodeId = ids.first(); corePage = 0 }
    val source = model.stats[nodeId] ?: JSONObject(); val data = source.obj("data"); val history = model.histories[nodeId] ?: JSONObject(); val points = history.rows("points")
    LazyColumn(Modifier.fillMaxSize().testTag("device-list"), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(14.dp)) {
        item { Row(Modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) { nodes.forEach { node -> FilterChip(node.s("id") == nodeId, { nodeId = node.s("id"); corePage = 0 }, label = { Text(node.s("name")) }, leadingIcon = { Icon(if (node.s("kind") == "windows") Icons.Outlined.Laptop else Icons.Outlined.Dns, null, Modifier.size(17.dp)) }) } }; Chips(listOf("资源", "网站", "存储", "网卡", "进程"), tab, { tab = it }); SourceNote(source) }
        if (tab == "网站") {
            item { Caption("服务器探测 · 每 600 秒 · 证书每日检查") }
            val services = model.overview.obj("services").rows("items")
            items(services, key = { it.s("id") }) { service -> ServiceCard(model, service) }
            if (services.isEmpty()) item { Empty("暂无监测网站，可在设置中添加") }
        } else if (data.length() == 0) item { Empty("设备暂无采样，等待连接服务器") }
        else when (tab) {
            "资源" -> {
                item { Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) { Metric("CPU", percent(data.obj("cpu"), "total"), "${data.obj("system").optInt("cpu_cores")} 核心", Icons.Outlined.Memory, Modifier.weight(1f)); Metric("内存", percent(data.obj("mem"), "percent"), bytes(data.obj("mem").optDouble("used")) + " / " + bytes(data.obj("mem").optDouble("total")), Icons.Outlined.Storage, Modifier.weight(1f)) } }
                item { Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) { val disk = data.rows("disks").maxByOrNull { it.optDouble("percent", 0.0) }; Metric("磁盘", disk?.let { percent(it, "percent") } ?: "—", "${data.rows("disks").size} 个挂载点", Icons.Outlined.Album, Modifier.weight(1f)); Metric("网络下载", bytes(data.obj("net").optDouble("rx", 0.0)) + "/s", "↑ " + bytes(data.obj("net").optDouble("tx", 0.0)) + "/s", Icons.Outlined.Speed, Modifier.weight(1f)) } }
                item { Chips(listOf("1h", "24h", "7d", "30d"), model.range, model::changeRange) }
                item { Panel { Text("CPU / 内存", fontWeight = FontWeight.Bold); Row { Legend("CPU", Blue); Spacer(Modifier.width(18.dp)); Legend("内存", Cyan); Spacer(Modifier.weight(1f)); Caption("0—100%") }; Box(Modifier.height(145.dp)) { Trend(points, "cpu", Blue, Modifier.fillMaxSize(), true); Trend(points, "mem", Cyan, Modifier.fillMaxSize(), true) }; ChartTimes(points) } }
                item { Row(horizontalArrangement = Arrangement.spacedBy(10.dp)) { Panel(Modifier.weight(1f)) { Caption("网络下载"); Trend(points, "rx", Blue, Modifier.height(90.dp).fillMaxWidth()); Caption("峰值 " + bytes(points.maxOfOrNull { it.optDouble("rx", 0.0) } ?: 0.0) + "/s") }; Panel(Modifier.weight(1f)) { Caption("磁盘写入"); Trend(points, "write", Cyan, Modifier.height(90.dp).fillMaxWidth()); Caption("峰值 " + bytes(points.maxOfOrNull { it.optDouble("write", 0.0) } ?: 0.0) + "/s") } } }
                item { Panel {
                    val system = data.obj("system")
                    Detail("操作系统", system.s("os")); Detail("CPU", system.s("cpu_model")); Detail("运行时间", "${system.optLong("uptime") / 86400} 天 ${system.optLong("uptime") / 3600 % 24} 小时"); Detail("负载", system.optJSONArray("load")?.toString() ?: "—"); Detail("Swap", percent(data.obj("swap"), "percent") + " · " + bytes(data.obj("swap").optDouble("used", 0.0))); Detail("连接", "已建立 ${data.obj("net").obj("conns").s("est", "—")} · 监听 ${data.obj("net").obj("conns").s("lsn", "—")}"); Caption("采样 " + friendlyTime(source.optDouble("updated", 0.0)))
                } }
                item { Panel {
                    val cores = data.obj("cpu").optJSONArray("percpu"); val count = cores?.length() ?: 0; val pages = ((count + 11) / 12).coerceAtLeast(1); val shown = corePage.coerceAtMost(pages - 1)
                    Row(verticalAlignment = Alignment.CenterVertically) { Text("每核负载", Modifier.weight(1f), fontWeight = FontWeight.Bold); TextButton({ corePage = (shown - 1).coerceAtLeast(0) }, enabled = shown > 0) { Text("‹") }; Caption("${shown + 1}/$pages"); TextButton({ corePage = (shown + 1).coerceAtMost(pages - 1) }, enabled = shown < pages - 1) { Text("›") } }
                    (shown * 12 until minOf(count, (shown + 1) * 12)).toList().chunked(3).forEach { row -> Row(horizontalArrangement = Arrangement.spacedBy(8.dp)) { row.forEach { i -> Surface(Modifier.weight(1f), shape = workbenchShape(10.dp), color = MaterialTheme.colorScheme.surfaceVariant) { Column(Modifier.padding(10.dp)) { Caption("C${i + 1}"); Text("%.1f%%".format(cores!!.optDouble(i)), fontSize = 13.sp, fontWeight = FontWeight.SemiBold) } } }; repeat(3 - row.size) { Spacer(Modifier.weight(1f)) } } }
                } }
            }
            "存储" -> items(data.rows("disks")) { disk -> Panel { Text(disk.s("mount"), fontWeight = FontWeight.Bold); Caption(disk.s("device")); Text(percent(disk, "percent"), fontSize = 26.sp, color = MaterialTheme.colorScheme.primary); LinearProgressIndicator(progress = { (disk.optDouble("percent", 0.0) / 100).toFloat().coerceIn(0f, 1f) }, modifier = Modifier.fillMaxWidth()); Detail("空间", bytes(disk.optDouble("used")) + " / " + bytes(disk.optDouble("total"))); Detail("读 / 写", bytes(disk.obj("io").optDouble("r", 0.0)) + "/s / " + bytes(disk.obj("io").optDouble("w", 0.0)) + "/s") } }
            "网卡" -> items(data.obj("net").rows("ifaces")) { net -> Panel { Text(net.s("name"), fontWeight = FontWeight.Bold); Caption(net.strings("addresses").joinToString(" · ")); Detail("下载 / 上传", bytes(net.optDouble("rx")) + "/s / " + bytes(net.optDouble("tx")) + "/s"); Detail("累计接收 / 发送", bytes(net.optDouble("total_rx")) + " / " + bytes(net.optDouble("total_tx"))) } }
            "进程" -> items(data.rows("processes")) { process -> Panel { Text(process.s("name"), fontWeight = FontWeight.Bold); Caption("PID ${process.optInt("pid")}"); Detail("CPU", percent(process, "cpu")); Detail("内存", bytes(process.optDouble("memory", 0.0))) } }
        }
    }
}

@Composable fun ServiceCard(model: WorkspaceModel, service: JSONObject) {
    var open by remember { mutableStateOf(false) }; val data = service.obj("data")
    Panel { Row(verticalAlignment = Alignment.CenterVertically) { Box(Modifier.size(9.dp).background(if (data.s("status") == "up") Green else Orange, Rounded)); Text(" " + service.s("name"), fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f)); Text(stateName(data.s("status")), color = if (data.s("status") == "up") Green else Orange, fontSize = 12.sp) }; LinkRow(service.s("url"), "HTTP ${data.s("code", "—")} · ${data.s("ms", "—")} ms", service.s("url")); Caption("证书到期 " + friendlyTime(data.optDouble("cert_expires", 0.0))); SourceNote(service); if (data.s("error").isNotBlank()) Caption(data.s("error")); TextButton({ model.loadServiceHistory(service.s("id")); open = true }) { Text("查看故障历史") } }
    if (open) Sheet(service.s("name") + " · 24h", { open = false }) { val history = if (model.serviceHistoryId == service.s("id")) model.serviceHistory else JSONObject(); Text("可用率 " + if (history.isNull("availability")) "—" else "${history.optDouble("availability")} %", fontSize = 22.sp, color = MaterialTheme.colorScheme.primary); val checks = history.rows("checks"); Caption("最近 ${checks.size} 次探测 · 仅本服务器视角"); checks.take(150).forEach { Detail(friendlyTime(it.optDouble("ts")), "${stateName(it.s("status"))} · HTTP ${it.s("code", "—")} · ${it.s("ms")}ms") }; if (checks.isEmpty()) Empty("暂无历史") }
}
@Composable fun Metric(title: String, value: String, subtitle: String, icon: androidx.compose.ui.graphics.vector.ImageVector, modifier: Modifier) { Panel(modifier) { Row { Caption(title, Modifier.weight(1f)); Icon(icon, null, Modifier.size(18.dp), tint = MaterialTheme.colorScheme.primary) }; Text(value, fontSize = 29.sp, fontWeight = FontWeight.Bold); Caption(subtitle) } }
@Composable fun Detail(label: String, value: String) { Row(Modifier.fillMaxWidth().padding(vertical = 4.dp)) { Caption(label, Modifier.width(86.dp)); Text(value.ifBlank { "—" }, Modifier.weight(1f), fontSize = 13.sp) } }
@Composable fun Legend(title: String, color: Color) { val tone=if(color==Blue)LocalGlass.current.accent else if(color==Cyan)LocalGlass.current.glow else color;Row(verticalAlignment = Alignment.CenterVertically) { Box(Modifier.size(6.dp).background(tone, Rounded)); Caption(" $title") } }
@Composable fun ChartTimes(points: List<JSONObject>) { Row(Modifier.fillMaxWidth(), horizontalArrangement = Arrangement.SpaceBetween) { Caption(points.firstOrNull()?.let { friendlyTime(it.optDouble("ts")) } ?: "等待历史"); Caption(points.lastOrNull()?.let { friendlyTime(it.optDouble("ts")) } ?: "") } }

@Composable fun ProjectsPage(model: WorkspaceModel) {
    var tab by remember { mutableStateOf("仓库") }; var query by remember { mutableStateOf("") }; var attention by remember { mutableStateOf(false) }
    val source = model.overview.obj("github"); val data = source.obj("data"); val context = LocalContext.current
    val pins = model.config.strings("pinned_repos")
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Text("项目，在这里汇合。", fontSize = 24.sp, fontWeight = FontWeight.Bold); Caption("@${data.s("user", "未配置")} · 服务器每 15 分钟同步"); SourceNote(source); Chips(listOf("仓库", "Pull Request", "版本"), tab, { tab = it }); Field("搜索项目", query, { query = it }); if (tab == "Pull Request") FilterChip(attention, { attention = !attention }, label = { Text("仅待关注") }) }
        when (tab) {
            "仓库" -> { val repos = data.rows("repos").filter { (it.s("name") + it.s("description")).contains(query, true) }.sortedBy { it.s("full_name") !in pins }; items(repos, key = { it.s("full_name") }) { repo -> Panel { Row(verticalAlignment = Alignment.CenterVertically) { Icon(Icons.Outlined.FolderOpen, null, tint = MaterialTheme.colorScheme.primary); TextButton({ openUrl(context, repo.s("html_url")) }, Modifier.weight(1f)) { Text(repo.s("name"), Modifier.fillMaxWidth(), fontWeight = FontWeight.Bold) }; IconButton({ model.pinRepo(repo.s("full_name")) }, enabled = !model.busy) { Icon(if (repo.s("full_name") in pins) Icons.Outlined.Star else Icons.Outlined.StarOutline, "收藏仓库", tint = MaterialTheme.colorScheme.primary) } }; Text(repo.s("description").ifBlank { "暂无描述" }, fontSize = 13.sp); Caption("${repo.s("language", "—")} · ★ ${repo.optInt("stargazers_count")} · Issue ${repo.optInt("open_issues_count")} · ${repo.s("pushed_at").take(10)}") } }; if (repos.isEmpty()) item { Empty("暂无匹配仓库") } }
            "Pull Request" -> { val prs = data.rows("prs").filter { (it.s("title") + it.s("repo")).contains(query, true) && (!attention || it.s("state") == "open" && (it.s("ci") == "failure" || it.s("review") == "changes_requested" || it.s("review") == "requested")) }; items(prs, key = { it.s("id") }) { pr -> Panel { LinkRow(pr.s("title"), pr.s("repo") + " #" + pr.optInt("number"), pr.s("url"), Icons.Outlined.AccountTree); Text(stateName(pr.s("state")), color = MaterialTheme.colorScheme.primary, fontSize = 12.sp); Caption("CI ${stateName(pr.s("ci"))} · 审阅 ${stateName(pr.s("review"))}"); if (pr.s("detail_error").isNotBlank()) Caption(pr.s("detail_error")) } }; if (prs.isEmpty()) item { Empty("没有匹配的 PR") } }
            else -> { val releases = data.obj("releases"); val names = releases.keys().asSequence().filter { !releases.isNull(it) && it.contains(query, true) }.toList(); items(names) { name -> val release = releases.obj(name); Panel { LinkRow(name, release.s("tag_name") + " · " + release.s("published_at").take(10), release.s("html_url"), Icons.Outlined.NewReleases) } }; if (names.isEmpty()) item { Empty("暂无可读取的版本") } }
        }
    }
}

@Composable fun NewsPage(model: WorkspaceModel) {
    var category by remember { mutableStateOf("全部") }; var query by remember { mutableStateOf("") }; var datesOpen by remember { mutableStateOf(false) }
    val source = model.news; val data = source.obj("data"); val categories = listOf("全部") + data.rows("items").map { it.s("category", "其他") }.distinct()
    val rows = data.rows("items").filter { (category == "全部" || it.s("category") == category) && (it.s("title") + it.s("source")).contains(query, true) }
    LaunchedEffect(data.s("date")) { category = "全部" }
    LazyColumn(Modifier.fillMaxSize(), contentPadding = PaddingValues(20.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) {
        item { Row(verticalAlignment = Alignment.CenterVertically) { Column(Modifier.weight(1f)) { Text("AI 资讯", fontSize = 26.sp, fontWeight = FontWeight.Bold); Caption("每天 07:30，由服务器读取资讯站后台") }; Box { OutlinedButton({ datesOpen = true }) { Text(data.s("date", "选择日期")); Icon(Icons.Outlined.ExpandMore, null) }; DropdownMenu(datesOpen, { datesOpen = false }) { DropdownMenuItem({ Text("最新一期") }, { model.loadNews(""); datesOpen = false }); data.strings("dates").forEach { date -> DropdownMenuItem({ Text(date) }, { model.loadNews(date); datesOpen = false }) } } } }; SourceNote(source); if (model.newsBusy) LinearProgressIndicator(Modifier.fillMaxWidth()); Chips(categories, category, { category = it }); Field("搜索资讯", query, { query = it }); Caption("${rows.size} 条 · ${friendlyTime(source.optDouble("updated", 0.0))}") }
        items(rows) { row -> Panel { Caption(row.s("category")); LinkRow(row.s("title"), row.s("source") + " · " + row.s("published", data.s("date")), row.s("url"), Icons.Outlined.Article) } }
        if (rows.isEmpty()) item { Empty(if (model.newsBusy) "正在读取这一期…" else "暂无匹配资讯，请留意同步状态") }
    }
}
