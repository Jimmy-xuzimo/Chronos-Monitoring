@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package top.xuzimo.workbench

import android.content.Intent
import android.os.Bundle
import androidx.activity.ComponentActivity
import androidx.activity.compose.setContent
import androidx.activity.enableEdgeToEdge
import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.vector.ImageVector
import androidx.compose.ui.platform.LocalContext
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.PasswordVisualTransformation
import androidx.compose.ui.text.style.TextOverflow
import androidx.compose.ui.unit.*
import androidx.compose.ui.semantics.semantics
import androidx.compose.ui.semantics.contentDescription
import androidx.compose.ui.layout.onSizeChanged
import androidx.core.net.toUri
import androidx.lifecycle.Lifecycle
import androidx.lifecycle.compose.LocalLifecycleOwner
import androidx.lifecycle.repeatOnLifecycle
import androidx.lifecycle.viewmodel.compose.viewModel
import kotlinx.coroutines.delay
import org.json.JSONObject
import java.time.*
import java.time.format.DateTimeFormatter
import java.util.Locale

class MainActivity : ComponentActivity() {
    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState);enableEdgeToEdge()
        val root=android.widget.FrameLayout(this)
        val source=android.widget.FrameLayout(this)
        val atmosphere=AtmosphereView(this)
        source.addView(atmosphere,android.widget.FrameLayout.LayoutParams(-1,-1))
        root.addView(source,android.widget.FrameLayout.LayoutParams(-1,-1))
        val compose=androidx.compose.ui.platform.ComposeView(this).apply{setViewCompositionStrategy(androidx.compose.ui.platform.ViewCompositionStrategy.DisposeOnViewTreeLifecycleDestroyed);setContent{CompositionLocalProvider(LocalLiquidSource provides source,LocalAtmosphere provides atmosphere){val model:WorkspaceModel=viewModel();Workbench(model)}}}
        root.addView(compose,android.widget.FrameLayout.LayoutParams(-1,-1));setContentView(root)
    }
}

val Blue = Color(0xFF3974F6)
val Cyan = Color(0xFF2CC3EA)
val Green = Color(0xFF138C78)
val Orange = Color(0xFFE18B30)
val Ease = CubicBezierEasing(.22f, 1f, .36f, 1f)
val Rounded:RoundedCornerShape @Composable get()=RoundedCornerShape(if(LocalGlass.current.id=="industrial")4.dp else 24.dp)
@Composable fun workbenchShape(radius:Dp)=RoundedCornerShape(if(LocalGlass.current.id=="industrial")4.dp else radius)

@Composable fun Workbench(model: WorkspaceModel) {
    val reveal = remember { ThemeReveal() }
    val dark = when (model.theme) { "深色" -> true; "浅色" -> false; else -> isSystemInDarkTheme() }
    val visual=skin(model.style,dark)
    val appContext=LocalContext.current.applicationContext
    LaunchedEffect(model){model.attach(appContext)}
    val colors=glassColors(visual)
    val atmosphere=LocalAtmosphere.current
    SideEffect{atmosphere?.palette(visual)}
    CompositionLocalProvider(LocalThemeReveal provides reveal,LocalGlass provides visual) { MaterialTheme(colorScheme = colors, typography = Typography(), shapes = if(visual.id=="industrial")Shapes(androidx.compose.foundation.shape.RoundedCornerShape(2.dp),androidx.compose.foundation.shape.RoundedCornerShape(3.dp),androidx.compose.foundation.shape.RoundedCornerShape(4.dp),androidx.compose.foundation.shape.RoundedCornerShape(4.dp),androidx.compose.foundation.shape.RoundedCornerShape(6.dp))else Shapes(medium = RoundedCornerShape(18.dp), large = Rounded)) {
        val activity = androidx.activity.compose.LocalActivity.current
        SideEffect { activity?.window?.let { window -> androidx.core.view.WindowCompat.getInsetsController(window, window.decorView).apply { isAppearanceLightStatusBars = !dark; isAppearanceLightNavigationBars = !dark } } }
        Surface(Modifier.fillMaxSize(), color = Color.Transparent,contentColor=visual.ink) {
            val owner = LocalLifecycleOwner.current
            LaunchedEffect(model.signedIn, owner) { if (model.signedIn) owner.lifecycle.repeatOnLifecycle(Lifecycle.State.STARTED) { model.poll() } }
            val snack = remember { SnackbarHostState() }
            LaunchedEffect(model.message) { if (model.message.isNotBlank()) { snack.showSnackbar(model.message); model.message = "" } }
            Box(Modifier.fillMaxSize()) {
                AnimatedContent(if(model.signedIn)"workspace"else if(model.booting)"restore"else"login", transitionSpec = { fadeIn(tween(400, easing = Ease)) togetherWith fadeOut(tween(250)) }, label = "session") { if(it=="workspace")WorkspaceShell(model)else if(it=="restore")Column(Modifier.fillMaxSize().safeDrawingPadding(),verticalArrangement=Arrangement.Center,horizontalAlignment=Alignment.CenterHorizontally){Logo(56.dp);Spacer(Modifier.height(22.dp));CircularProgressIndicator(Modifier.size(24.dp));Caption("正在自动登录…",Modifier.padding(top=16.dp))}else Login(model) }
                SnackbarHost(snack, Modifier.align(Alignment.BottomCenter).navigationBarsPadding().padding(bottom = 84.dp))
                ThemeRevealOverlay(reveal)
            }
        }
    } }
}

@Composable fun NodeCard(node: JSONObject, source: JSONObject?, history: JSONObject?, modifier: Modifier = Modifier,compact:Boolean=false) {
    val live = node.s("status") == "online"; val metrics = source?.obj("data") ?: JSONObject()
    val cpu = metrics.obj("cpu"); val memory = metrics.obj("mem")
    GlassCard(modifier,inset=if(compact)9.dp else 12.dp,spacing=if(compact)2.dp else 6.dp) {
        Row(verticalAlignment = Alignment.CenterVertically) { Icon(if (node.s("kind") == "windows") Icons.Outlined.Laptop else Icons.Outlined.Dns, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(20.dp)); Spacer(Modifier.width(6.dp)); Text(if (node.s("kind") == "windows") "本地电脑" else "云服务器", fontSize = 13.sp,lineHeight=16.sp, fontWeight = FontWeight.Bold); Spacer(Modifier.weight(1f)); Box(Modifier.size(6.dp).background(if (live) Green else Orange, Rounded)) }
        BoxWithConstraints(Modifier.fillMaxWidth().padding(top=8.dp)) { val stacked=maxWidth<150.dp || androidx.compose.ui.platform.LocalDensity.current.fontScale>1.2f
            if(stacked) Column { Row(verticalAlignment=Alignment.CenterVertically){Caption("CPU",Modifier.weight(1f));Text(percent(cpu,"total"),fontSize=18.sp,lineHeight=21.sp,fontWeight=FontWeight.Bold)};Row(verticalAlignment=Alignment.CenterVertically){Caption("内存",Modifier.weight(1f));Text(percent(memory,"percent"),fontSize=18.sp,lineHeight=21.sp,fontWeight=FontWeight.Bold)} }
            else Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween){Column{Caption("CPU");Text(percent(cpu,"total"),fontSize=21.sp,fontWeight=FontWeight.Bold)};Column{Caption("内存");Text(percent(memory,"percent"),fontSize=21.sp,fontWeight=FontWeight.Bold)}}
        }
        Box(Modifier.fillMaxWidth().height(if(compact)24.dp else 36.dp).padding(top = 2.dp)) { Trend(history?.rows("points") ?: emptyList(), "cpu", Blue, Modifier.fillMaxSize(), fixed = true); Trend(history?.rows("points") ?: emptyList(), "mem", Cyan, Modifier.fillMaxSize(), fixed = true) }
        if(!compact)Caption(if (live) "${node.optInt("cores")} 核 · ${bytes(node.optDouble("memory", 0.0))}" else "设备离线 · 保留最后读数")
        Text("磁盘 ${percent(node,"disk")} · ↓${bytes(metrics.obj("net").optDouble("rx",0.0))}/s",fontSize=9.sp,lineHeight=12.sp,maxLines=1,color=LocalGlass.current.muted)
    }
}

@Composable fun Logo(size: Dp) { val p=LocalGlass.current;Canvas(Modifier.size(size).semantics{contentDescription="我的工作台标志"}){val u=this.size.minDimension;val r=u*(if(p.id=="industrial").07f else .23f);drawRoundRect(Brush.linearGradient(listOf(p.accent,lerp(p.accent,p.base,.35f))),cornerRadius=androidx.compose.ui.geometry.CornerRadius(r));val screen=androidx.compose.ui.geometry.Offset(u*.19f,u*.22f);val dims=androidx.compose.ui.geometry.Size(u*.62f,u*.44f);drawRoundRect(Color.White.copy(alpha=.85f),screen,dims,androidx.compose.ui.geometry.CornerRadius(u*.055f));drawRoundRect(p.base,screen+androidx.compose.ui.geometry.Offset(u*.05f,u*.05f),androidx.compose.ui.geometry.Size(dims.width-u*.1f,dims.height-u*.13f),androidx.compose.ui.geometry.CornerRadius(u*.025f));drawLine(p.accent,androidx.compose.ui.geometry.Offset(u*.31f,u*.38f),androidx.compose.ui.geometry.Offset(u*.4f,u*.43f),u*.035f,StrokeCap.Round);drawLine(p.accent,androidx.compose.ui.geometry.Offset(u*.4f,u*.43f),androidx.compose.ui.geometry.Offset(u*.31f,u*.48f),u*.035f,StrokeCap.Round);drawLine(p.accent,androidx.compose.ui.geometry.Offset(u*.47f,u*.48f),androidx.compose.ui.geometry.Offset(u*.63f,u*.48f),u*.035f,StrokeCap.Round);drawLine(Color.White,androidx.compose.ui.geometry.Offset(u*.5f,u*.68f),androidx.compose.ui.geometry.Offset(u*.5f,u*.77f),u*.06f);drawLine(Color.White,androidx.compose.ui.geometry.Offset(u*.35f,u*.78f),androidx.compose.ui.geometry.Offset(u*.65f,u*.78f),u*.04f,StrokeCap.Round)} }
@Composable fun Panel(modifier: Modifier = Modifier, inset: Dp = 16.dp, content: @Composable ColumnScope.() -> Unit) { GlassCard(modifier.animateContentSize(tween(400,easing=Ease)),inset=inset,content=content) }
@Composable fun HomeHeading(title: String, action: String, onClick: () -> Unit) { Row(Modifier.fillMaxWidth().padding(bottom = 8.dp).clickable(onClick = onClick), verticalAlignment = Alignment.CenterVertically) { Text(title, Modifier.weight(1f), fontSize = 17.sp, fontWeight = FontWeight.Bold); Text(action, fontSize = 11.sp, color = MaterialTheme.colorScheme.primary); Icon(Icons.Outlined.ChevronRight, null, Modifier.size(16.dp), tint = MaterialTheme.colorScheme.primary) } }
@Composable fun Caption(text: String, modifier: Modifier = Modifier) { Text(text, modifier, color = MaterialTheme.colorScheme.onSurfaceVariant, fontSize = 11.sp, lineHeight = 16.sp) }
@Composable fun Section(title: String, action: String = "", onClick: () -> Unit = {}) { Row(Modifier.fillMaxWidth().padding(bottom = 10.dp), verticalAlignment = Alignment.CenterVertically) { Text(title, fontSize = 18.sp, fontWeight = FontWeight.Bold, modifier = Modifier.weight(1f)); if (action.isNotBlank()) TextButton(onClick, contentPadding = PaddingValues(0.dp)) { Text(action, fontSize = 12.sp); Icon(Icons.Outlined.ChevronRight, null, Modifier.size(16.dp)) } } }
@Composable fun Field(label: String, value: String, change: (String) -> Unit, enabled: Boolean = true, lines: Int = 1) { OutlinedTextField(value, change, label = { Text(label) }, modifier = Modifier.fillMaxWidth(), shape = workbenchShape(16.dp), singleLine = lines == 1, minLines = lines, enabled = enabled) }
@Composable fun Chips(options: List<String>, selected: String, onSelect: (String) -> Unit, modifier: Modifier = Modifier) { Row(modifier.fillMaxWidth().horizontalScroll(rememberScrollState()), horizontalArrangement = Arrangement.spacedBy(8.dp)) { options.forEach { label -> FilterChip(selected == label, { onSelect(label) }, label = { Text(label, fontSize = 12.sp) }, shape = workbenchShape(14.dp)) } } }
@Composable fun Empty(text: String) { Column(Modifier.fillMaxWidth().padding(vertical = 28.dp), horizontalAlignment = Alignment.CenterHorizontally) { Icon(Icons.Outlined.Inbox, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(30.dp)); Caption(text, Modifier.padding(top = 10.dp)) } }
@Composable fun Notice(text: String, error: Boolean = false) { Surface(color = if (error) MaterialTheme.colorScheme.errorContainer else MaterialTheme.colorScheme.secondaryContainer, shape = workbenchShape(14.dp), modifier = Modifier.fillMaxWidth().padding(horizontal = 20.dp, vertical = 5.dp)) { Text(text, modifier = Modifier.padding(12.dp), fontSize = 12.sp, color = if (error) MaterialTheme.colorScheme.onErrorContainer else MaterialTheme.colorScheme.onSecondaryContainer) } }
@Composable fun SourceNote(source: JSONObject?) { if (source != null && source.length() > 0 && source.s("status") !in listOf("ok", "online")) Caption("${if (source.s("status") == "pending") "等待同步" else "同步异常，显示上次结果"} · ${source.s("error")} · ${friendlyTime(source.optDouble("updated", 0.0))}", Modifier.padding(bottom = 8.dp)) }
@Composable fun Sheet(title: String, close: () -> Unit, content: @Composable ColumnScope.() -> Unit) { ModalBottomSheet(onDismissRequest = close,containerColor=MaterialTheme.colorScheme.surface,contentColor=LocalGlass.current.ink,shape=workbenchShape(24.dp)) { Column(Modifier.fillMaxWidth().imePadding().verticalScroll(rememberScrollState()).padding(start = 22.dp, end = 22.dp, bottom = 32.dp), verticalArrangement = Arrangement.spacedBy(12.dp)) { Text(title, fontSize = 24.sp, fontWeight = FontWeight.Bold); content() } } }
@Composable fun LinkRow(title: String, subtitle: String, url: String, icon: ImageVector = Icons.Outlined.OpenInNew) { val context = LocalContext.current; Row(Modifier.fillMaxWidth().clip(RoundedCornerShape(12.dp)).clickable(enabled = url.isNotBlank()) { openUrl(context, url) }.padding(vertical = 10.dp), verticalAlignment = Alignment.CenterVertically) { Icon(icon, null, tint = MaterialTheme.colorScheme.primary, modifier = Modifier.size(22.dp)); Spacer(Modifier.width(12.dp)); Column(Modifier.weight(1f)) { Text(title, fontWeight = FontWeight.Medium, fontSize = 14.sp, maxLines = 2, overflow = TextOverflow.Ellipsis); if (subtitle.isNotBlank()) Caption(subtitle) }; Icon(Icons.Outlined.NorthEast, "打开", Modifier.size(15.dp), tint = MaterialTheme.colorScheme.onSurfaceVariant) } }
fun openUrl(context: android.content.Context, url: String) { try { val uri = url.toUri(); if (uri.scheme in listOf("https", "http") && uri.host != null && uri.userInfo == null) context.startActivity(Intent(Intent.ACTION_VIEW, uri)) } catch (_: Exception) { android.widget.Toast.makeText(context, "没有可打开此链接的应用", android.widget.Toast.LENGTH_SHORT).show() } }
fun stateName(value: String) = when (value) { "merged" -> "已合并"; "open" -> "进行中"; "closed" -> "已关闭"; "success", "up" -> "正常"; "failure", "down" -> "异常"; "pending", "checking" -> "待确认"; "approved" -> "已批准"; "changes_requested" -> "需修改"; "none" -> "无检查"; "unavailable" -> "不可读取"; else -> "未知" }

@Composable fun Trend(points: List<JSONObject>, key: String, color: Color, modifier: Modifier, fixed: Boolean = false) {
    val tone=if(color==Blue)LocalGlass.current.accent else if(color==Cyan)LocalGlass.current.glow else color
    val gridColor = MaterialTheme.colorScheme.outline.copy(alpha = .15f)
    val values = remember(points, key) { points.mapNotNull { if (it.isNull(key) || !it.has(key)) null else it.optDouble(key).takeIf { n -> n.isFinite() && n >= 0 } } }
    val progress by animateFloatAsState(if (values.isEmpty()) 0f else 1f, tween(650, easing = Ease), label = "chart")
    Box(modifier) {
        Canvas(Modifier.fillMaxSize()) {
            if (size.width <= 0 || size.height <= 0) return@Canvas
            (1..3).forEach { drawLine(gridColor, androidx.compose.ui.geometry.Offset(0f, size.height * it / 4), androidx.compose.ui.geometry.Offset(size.width, size.height * it / 4), 1.dp.toPx()) }
            if (values.size < 2) return@Canvas
            val ceiling = if (fixed) 100.0 else (values.maxOrNull() ?: 1.0).coerceAtLeast(1.0) * 1.1
            val path = Path(); val area = Path()
            values.forEachIndexed { index, value -> val x = size.width * index / (values.size - 1); val y = (size.height * (1 - (value / ceiling).coerceIn(0.0, 1.0)) * .9 + size.height * .05).toFloat(); if (index == 0) { path.moveTo(x, y); area.moveTo(0f, size.height); area.lineTo(x, y) } else { path.lineTo(x, y); area.lineTo(x, y) } }
            area.lineTo(size.width, size.height); area.close()
            drawPath(area, Brush.verticalGradient(listOf(tone.copy(alpha = .2f * progress), tone.copy(alpha = .01f))))
            drawPath(path, tone.copy(alpha = progress), style = androidx.compose.ui.graphics.drawscope.Stroke(2.dp.toPx(), cap = StrokeCap.Round, join = StrokeJoin.Round))
        }
        if (values.size < 2) Caption("历史采集中", Modifier.align(Alignment.Center))
    }
}
