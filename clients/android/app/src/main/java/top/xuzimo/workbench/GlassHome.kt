@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package top.xuzimo.workbench

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.*
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.*
import kotlinx.coroutines.delay
import org.json.JSONObject
import java.time.*
import java.time.format.DateTimeFormatter
import java.util.Locale

@Composable fun GlassHome(model:WorkspaceModel,navigate:(String)->Unit,more:(String)->Unit) {
    var now by remember { mutableStateOf(ZonedDateTime.now(China)) }
    LaunchedEffect(Unit){while(true){now=ZonedDateTime.now(China);delay(1000-System.currentTimeMillis()%1000)}}
    BoxWithConstraints(Modifier.fillMaxSize()) {
        val compact=maxHeight<700.dp
        val wide=maxWidth>=680.dp
        val shortWide=wide&&maxHeight<440.dp
        LazyColumn(Modifier.fillMaxSize().testTag("home-list"),contentPadding=PaddingValues(start=20.dp,end=20.dp,top=4.dp,bottom=16.dp),verticalArrangement=Arrangement.spacedBy(if(compact)6.dp else 10.dp)) {
            if(shortWide){
                item{Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(10.dp),verticalAlignment=Alignment.Top){Column(Modifier.weight(1f)){WeatherClock(model.overview.obj("weather"),now,false){more("天气设置")}};Column(Modifier.weight(1f)){TodayGlass(model,now,navigate,compact)}}}
                item{HealthGlass(model,navigate,compact)}
                item{Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(10.dp),verticalAlignment=Alignment.Top){Column(Modifier.weight(1f)){CertificatesGlass(model,navigate)};Column(Modifier.weight(1f)){ProjectGlass(model,navigate)}}}
            }else if(wide) {
                item { WeatherClock(model.overview.obj("weather"),now,true){more("天气设置")} }
                item { Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(10.dp),verticalAlignment=Alignment.Top) { Column(Modifier.weight(1f)){TodayGlass(model,now,navigate,compact)};Column(Modifier.weight(1f)){HealthGlass(model,navigate,compact)} } }
                item { Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.spacedBy(10.dp),verticalAlignment=Alignment.Top) { Column(Modifier.weight(1f)){CertificatesGlass(model,navigate)};Column(Modifier.weight(1f)){ProjectGlass(model,navigate)} } }
            } else {
                item { WeatherClock(model.overview.obj("weather"),now,false){more("天气设置")} }
                item { TodayGlass(model,now,navigate,compact) };item { HealthGlass(model,navigate,compact) };item { CertificatesGlass(model,navigate) };item { ProjectGlass(model,navigate) }
            }
            item { NewsGlass(model,more) }
            item { Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween) { Caption(model.config.obj("weather_location").s("name","南京")+" · 中国标准时间");Caption("服务器同步 "+friendlyTime(model.overview.optDouble("server_time",0.0)).substringAfter(' ')) } }
        }
    }
}

@Composable private fun WeatherClock(source:JSONObject,now:ZonedDateTime,wide:Boolean,changeLocation:()->Unit) {
    val data=source.obj("data");val p=LocalGlass.current;var detail by remember{mutableStateOf(false)}
    val city=data.s("city",source.obj("location").s("name","南京"));val scale=androidx.compose.ui.platform.LocalDensity.current.fontScale
    fun temp(key:String)=if(data.isNull(key)||!data.has(key))"—"else "${data.optDouble(key).toInt()}°"
    Column(Modifier.fillMaxWidth().padding(horizontal=2.dp,vertical=6.dp),verticalArrangement=Arrangement.spacedBy(4.dp)){
        Row(Modifier.fillMaxWidth(),horizontalArrangement=Arrangement.SpaceBetween,verticalAlignment=Alignment.CenterVertically){Caption("${greeting(now.hour)}");Row(Modifier.clickable{detail=true},verticalAlignment=Alignment.CenterVertically){Icon(Icons.Outlined.LocationOn,null,Modifier.size(12.dp),tint=p.accent);Text(city,fontSize=12.sp,maxLines=1);Icon(Icons.Outlined.ChevronRight,"天气详情",Modifier.size(14.dp))}}
        Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically){
            BoxWithConstraints(Modifier.weight(1f)){val font=((maxWidth.value-24)/(2.9f*scale)).coerceIn(24f,42f).sp;Row(verticalAlignment=Alignment.Bottom){Text(now.format(DateTimeFormatter.ofPattern("HH:mm")),fontSize=font,lineHeight=font*1.08f,fontWeight=FontWeight.Light,maxLines=1,softWrap=false,fontFamily=if(p.id=="industrial")androidx.compose.ui.text.font.FontFamily.Monospace else androidx.compose.ui.text.font.FontFamily.Default);Text(now.format(DateTimeFormatter.ofPattern(":ss")),fontSize=(14/scale).sp,color=p.accent,modifier=Modifier.padding(bottom=4.dp))}}
            Row(Modifier.clickable{detail=true},verticalAlignment=Alignment.CenterVertically){WeatherArt(data.optInt("condition_code",1),Modifier.size(34.dp));Column(horizontalAlignment=Alignment.End){Text(temp("temperature"),fontSize=(32/scale).sp,lineHeight=(36/scale).sp,fontWeight=FontWeight.Light);Caption(data.s("condition").ifBlank{"同步中"})}}
        }
        Row(Modifier.fillMaxWidth(),verticalAlignment=Alignment.CenterVertically,horizontalArrangement=Arrangement.SpaceBetween){Text(now.format(DateTimeFormatter.ofPattern("yyyy年M月d日 EEE",Locale.CHINA)),Modifier.weight(1f),fontSize=(11/scale.coerceAtMost(1.15f)).sp,lineHeight=14.sp,maxLines=1);Caption("${temp("low")} / ${temp("high")}")}
        if(source.s("status") in listOf("stale","error"))Text("天气更新异常，保留上次观测",color=MaterialTheme.colorScheme.error,fontSize=10.sp)
    }
    if(detail)Sheet(city+"天气",{detail=false}){Text(temp("temperature")+"C",fontSize=44.sp);Text(data.s("condition_period")+"预报 · "+data.s("condition"));Detail("湿度",data.s("humidity")+"%");Detail("风",data.s("wind_direction")+" "+data.s("wind_speed")+"m/s");Detail("实况时间",data.s("observed_at"));TextButton({detail=false;changeLocation()}){Text("更改天气地点")};data.rows("forecast").forEach{day->Detail(day.s("date"),day.s("day")+" / "+day.s("night")+" · ${day.s("low")}°—${day.s("high")}°")};LinkRow("中国气象局原始预报","",data.s("source_url","https://weather.cma.cn/web/weather/58238.html"))}
}

@Composable private fun MiniWeather(icon:androidx.compose.ui.graphics.vector.ImageVector,text:String){Row(verticalAlignment=Alignment.CenterVertically){Icon(icon,null,Modifier.size(11.dp),tint=LocalGlass.current.accent);Spacer(Modifier.width(4.dp));Caption(text)}}

@Composable private fun WeatherArt(code:Int,modifier:Modifier) {
    val palette=LocalGlass.current
    Canvas(modifier) {
        val u=size.minDimension
        val sun=Offset(u*.65f,u*.31f)
        drawCircle(Brush.radialGradient(listOf(palette.glow.copy(alpha=.65f),palette.glow.copy(alpha=0f)),sun,u*.42f),u*.42f,sun)
        drawCircle(Brush.linearGradient(listOf(Color.White,lerp(palette.glow,Color.White,.4f))),u*.19f,sun)
        if(code!=0){val path=Path().apply {moveTo(u*.19f,u*.7f);cubicTo(u*.02f,u*.69f,u*.08f,u*.41f,u*.29f,u*.46f);cubicTo(u*.31f,u*.18f,u*.68f,u*.25f,u*.68f,u*.45f);cubicTo(u*.95f,u*.36f,u*.97f,u*.74f,u*.76f,u*.74f);close()};drawPath(path,Brush.linearGradient(listOf(Color.White.copy(alpha=.96f),palette.glow.copy(alpha=.8f),palette.accent.copy(alpha=.35f))));drawPath(path,Color.White.copy(alpha=.7f),style=androidx.compose.ui.graphics.drawscope.Stroke(u*.013f));if(code in 3..12||code in 19..25)(0..2).forEach{val x=u*(.3f+it*.19f);drawLine(palette.accent.copy(alpha=.7f),Offset(x,u*.8f),Offset(x-u*.04f,u*.9f),u*.025f,StrokeCap.Round)}}
    }
}

@Composable private fun TodayGlass(model:WorkspaceModel,now:ZonedDateTime,navigate:(String)->Unit,compact:Boolean) {
    val calendar=model.overview.obj("calendar");val events=calendar.rows("events");val today=events.filter{courseDay(it)==now.toLocalDate()}
    val current=today.firstOrNull{!it.optBoolean("untimed")&&!it.optBoolean("all_day")&&courseTime(it,"start")?.isAfter(now)==false&&courseTime(it,"end")?.isAfter(now)==true}
    val next=events.filter{!it.optBoolean("untimed")&&!it.optBoolean("all_day")&&courseTime(it,"start")?.isAfter(now)==true}.minByOrNull{courseTime(it,"start")!!.toInstant()}
    val previewCount=if(compact)2 else 3
    HomeHeading(if(today.isEmpty())"下一节课"else"今日课程",if(today.size>previewCount)"查看全部 ${today.size} 门"else if(current!=null)"正在上课"else"查看课表"){navigate("课表")}
    GlassCard(inset=if(compact)10.dp else 14.dp){
        calendar.rows("sources").firstOrNull{it.s("status")!="ok"}?.let{SourceNote(it)}
        if(current!=null)Caption("正在上课 · "+current.s("title"))
        else if(next!=null){val minutes=Duration.between(now,courseTime(next,"start")).toMinutes();Caption(if(minutes<60)"距下一节 ${minutes.coerceAtLeast(0)} 分钟"else if(minutes<1440)"距下一节 ${minutes/60} 小时 ${minutes%60} 分钟"else"下一节 · ${next.s("date")} · ${next.s("location")}")}
        if(today.isEmpty()){if(next!=null){HomeCourse(next,true)}else{Text("今日无课",fontSize=18.sp,fontWeight=FontWeight.SemiBold);Caption("订阅内暂无下一门课程，请留意同步状态")}}
        else{today.take(previewCount).forEach{HomeCourse(it,false)}}
    }
}

@Composable private fun HealthGlass(model:WorkspaceModel,navigate:(String)->Unit,compact:Boolean) {
    HomeHeading("性能监控","24h · 详细"){navigate("设备")}
    val nodes=model.overview.rows("nodes")
    if(nodes.isEmpty())GlassCard{Empty("正在连接设备")}
    Column(Modifier.testTag("home-performance")){nodes.chunked(2).forEach{row->Row(horizontalArrangement=Arrangement.spacedBy(10.dp)){row.forEach{node->NodeCard(node,model.stats[node.s("id")],model.homeHistories[node.s("id")],Modifier.weight(1f),compact)};if(row.size==1)Spacer(Modifier.weight(1f))}}
    }
}

@Composable private fun CertificatesGlass(model:WorkspaceModel,navigate:(String)->Unit) {
    val services=model.overview.obj("services").rows("items");val up=services.count{it.obj("data").s("status")=="up"}
    HomeHeading("网站与证书","$up / ${services.size} 正常"){navigate("网站")}
    GlassCard(inset=16.dp){
        services.sortedBy{it.obj("data").optDouble("cert_expires",Double.MAX_VALUE)}.take(4).forEach{service->val data=service.obj("data");val expires=data.optDouble("cert_expires",0.0);val days=if(expires>0)kotlin.math.floor((expires-System.currentTimeMillis()/1000)/86400).toInt()else null
            Row(Modifier.fillMaxWidth().clickable{navigate("网站")}.padding(vertical=6.dp),verticalAlignment=Alignment.CenterVertically){Box(Modifier.size(7.dp).background(if(data.s("status")=="up")Green else Orange,Rounded));Column(Modifier.weight(1f).padding(start=10.dp)){Text(service.s("name"),fontSize=13.sp,fontWeight=FontWeight.SemiBold);Caption("HTTP ${data.s("code","—")} · ${data.s("ms","—")} ms")};Column(horizontalAlignment=Alignment.End){Text(days?.let{if(it<0)"已过期"else"${it} 天"}?:"待检查",fontSize=16.sp,color=if(days!=null&&days<=30)Orange else LocalGlass.current.accent,fontWeight=FontWeight.SemiBold);Caption("证书剩余")}}
        }
        if(services.isEmpty())Empty("尚未配置监测网站")
        Caption("服务器探测 · 每 10 分钟 · 证书每日检查")
    }
}

@Composable private fun ProjectGlass(model:WorkspaceModel,navigate:(String)->Unit) {
    val source=model.overview.obj("github");val data=source.obj("data");val prs=data.rows("prs")
    HomeHeading("GitHub","查看项目"){navigate("项目")}
    GlassCard(inset=16.dp){Row(horizontalArrangement=Arrangement.spacedBy(22.dp)){MiniStat("仓库",data.rows("repos").size.toString());MiniStat("进行中",prs.count{it.s("state")=="open"}.toString());MiniStat("已合并",prs.count{it.s("state")=="merged"}.toString())};SourceNote(source);prs.take(2).forEach{LinkRow(it.s("title"),it.s("repo")+" · "+stateName(it.s("state")),it.s("url"),Icons.Outlined.AccountTree)};if(prs.isEmpty())Caption("暂无可显示的项目动态")}
}
@Composable private fun MiniStat(label:String,value:String){Column{Text(value,fontSize=25.sp,fontWeight=FontWeight.Light,color=LocalGlass.current.accent);Caption(label)}}
@Composable private fun NewsGlass(model:WorkspaceModel,more:(String)->Unit){val source=model.overview.obj("news");val data=source.obj("data");HomeHeading("AI 资讯",data.s("date","按日查看")){more("AI 资讯")};GlassCard(inset=16.dp){SourceNote(source);data.rows("items").take(3).forEach{LinkRow(it.s("title"),it.s("category")+" · "+it.s("source"),it.s("url"),Icons.Outlined.AutoAwesome)};if(data.rows("items").isEmpty())Empty("等待服务器同步资讯")}}

@Composable private fun HomeCourse(course:JSONObject,showDate:Boolean){
    var open by remember{mutableStateOf(false)}
    Row(Modifier.fillMaxWidth().clickable{open=true}.padding(vertical=4.dp),verticalAlignment=Alignment.CenterVertically){Text(if(course.optBoolean("untimed"))"待定"else clockTime(course,"start"),Modifier.width(47.dp),fontSize=12.sp,fontWeight=FontWeight.Bold,color=LocalGlass.current.accent);Column(Modifier.weight(1f)){Text(course.s("title"),fontSize=13.sp,lineHeight=16.sp,fontWeight=FontWeight.SemiBold,maxLines=1,overflow=androidx.compose.ui.text.style.TextOverflow.Ellipsis);if(showDate)Caption(course.s("date"))};Text(course.s("location").ifBlank{"待定"},Modifier.widthIn(max=110.dp).padding(start=6.dp),fontSize=10.sp,lineHeight=14.sp,maxLines=1,overflow=androidx.compose.ui.text.style.TextOverflow.Ellipsis)}
    if(open)Sheet(course.s("title"),{open=false}){CourseRow(course,false);Detail("教师",course.s("teacher"));Detail("节次",course.s("periods"));Text(course.s("description"),fontSize=13.sp)}
}
