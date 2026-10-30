@file:OptIn(androidx.compose.material3.ExperimentalMaterial3Api::class)
package top.xuzimo.workbench

import androidx.compose.animation.*
import androidx.compose.animation.core.*
import androidx.compose.foundation.*
import androidx.compose.foundation.gestures.detectDragGestures
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.lazy.LazyColumn
import androidx.compose.foundation.selection.selectable
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.runtime.saveable.rememberSaveable
import androidx.compose.ui.*
import androidx.compose.ui.graphics.Color
import androidx.compose.ui.input.pointer.pointerInput
import androidx.compose.ui.layout.onSizeChanged
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.semantics.Role
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.*

private val navigationItems=listOf("总览" to Icons.Outlined.GridView,"课表" to Icons.Outlined.CalendarMonth,"设备" to Icons.Outlined.Dns,"项目" to Icons.Outlined.AccountTree,"更多" to Icons.Outlined.Widgets)

@Composable fun WorkspaceShell(model:WorkspaceModel){
    var page by rememberSaveable{mutableStateOf("总览")};var more by rememberSaveable{mutableStateOf("更多")}
    var alerts by remember{mutableStateOf(false)};var styles by remember{mutableStateOf(false)}
    var deviceTab by rememberSaveable{mutableStateOf("资源")};var settingsSection by rememberSaveable{mutableStateOf("外观")}
    val select:(String)->Unit={if(page!=it)page=it;if(it=="更多")more="更多"}
    androidx.activity.compose.BackHandler(page!="总览"){if(page=="更多"&&more!="更多")more="更多"else page="总览"}
    BoxWithConstraints(Modifier.fillMaxSize().safeDrawingPadding()){
        val rail=maxWidth>=600.dp||maxHeight<460.dp
        Row(Modifier.fillMaxSize()){
            if(rail)Box(Modifier.width(76.dp).fillMaxHeight(),contentAlignment=Alignment.Center){NavigationDock(page,select,true)}
            Column(Modifier.weight(1f).fillMaxHeight()){
                AnimatedVisibility(model.error.isNotBlank(),enter=expandVertically(spring(stiffness=450f)),exit=shrinkVertically(tween(200,easing=Ease))){Notice(model.error,true)}
                if(page=="更多"&&more!="更多")Row(Modifier.fillMaxWidth().padding(horizontal=16.dp,vertical=4.dp),verticalAlignment=Alignment.CenterVertically){TextButton({more="更多"}){Icon(Icons.Outlined.ChevronLeft,null,Modifier.size(18.dp));Text("更多")};Text(more,fontWeight=FontWeight.Bold,fontSize=18.sp)}
                AnimatedContent(if(page=="更多")more else page,Modifier.weight(1f),transitionSpec={(fadeIn(tween(230,easing=Ease))+slideInHorizontally(spring(dampingRatio=.92f,stiffness=430f)){it/35}) togetherWith fadeOut(tween(150,easing=Ease))},label="native-page"){destination->
                    when(destination){
                        "总览"->GlassHome(model,{if(it=="网站"){deviceTab="网站";page="设备"}else{if(it=="设备")deviceTab="资源";page=it}},{if(it=="天气设置"){settingsSection="天气";more="设置";model.reloadConfig()}else more=it;page="更多"})
                        "课表"->CalendarPage(model)
                        "设备"->DevicesPage(model,deviceTab)
                        "项目"->ProjectsPage(model)
                        "入口"->EntriesPage(model)
                        "AI 资讯"->NewsPage(model)
                        "设置"->SettingsPage(model,settingsSection)
                        else->MorePage(model,{styles=true},{settingsSection="外观";more="设置";model.reloadConfig()},{alerts=true},{more=it})
                    }
                }
                if(!rail)Box(Modifier.fillMaxWidth().padding(horizontal=20.dp,vertical=8.dp),contentAlignment=Alignment.Center){NavigationDock(page,select,false)}
            }
        }
    }
    if(styles)Sheet("外观",{styles=false}){GlassStylePicker(model)}
    if(alerts)Sheet("提醒中心",{alerts=false}){TextButton({model.seen()},enabled=!model.busy){Text("全部标为已读")};val rows=model.overview.rows("alerts");if(rows.isEmpty())Empty("暂无提醒");rows.forEach{row->Panel{Text(row.s("title"),fontWeight=FontWeight.Bold);Text(row.s("detail"),fontSize=13.sp);Caption(friendlyTime(row.optDouble("created",0.0))+if(row.isNull("resolved"))" · 处理中"else" · 已恢复")}}}
}

@Composable private fun NavigationDock(page:String,onSelect:(String)->Unit,vertical:Boolean){
    val palette=LocalGlass.current;val select by rememberUpdatedState(onSelect)
    var length by remember{mutableIntStateOf(1)};var finger by remember{mutableStateOf<Float?>(null)}
    val cell=length/5f;val index=navigationItems.indexOfFirst{it.first==page}.coerceAtLeast(0)
    val position by animateFloatAsState((finger?.minus(cell/2)?:index*cell).coerceIn(0f,(length-cell).coerceAtLeast(0f)),spring(dampingRatio=.85f,stiffness=550f),label="dock-position")
    val shape=workbenchShape(18.dp)
    GlassCard(if(vertical)Modifier.padding(horizontal=8.dp).width(60.dp)else Modifier.widthIn(max=430.dp),inset=5.dp,radius=28.dp){
        Box((if(vertical)Modifier.height(290.dp).fillMaxWidth()else Modifier.height(50.dp).fillMaxWidth()).testTag("navigation-dock").onSizeChanged{length=if(vertical)it.height else it.width}.pointerInput(vertical,length){
            fun move(value:Float){finger=value.coerceIn(0f,length.toFloat());val item=(value/(length/5f)).toInt().coerceIn(0,4);select(navigationItems[item].first)}
            detectDragGestures(onDragStart={move(if(vertical)it.y else it.x)},onDragEnd={finger=null},onDragCancel={finger=null},onDrag={change,_->change.consume();move(if(vertical)change.position.y else change.position.x)})
        }){
            Box((if(vertical)Modifier.offset{IntOffset(0,position.toInt())}.fillMaxWidth().height(with(androidx.compose.ui.platform.LocalDensity.current){cell.toDp()})else Modifier.offset{IntOffset(position.toInt(),0)}.fillMaxHeight().width(with(androidx.compose.ui.platform.LocalDensity.current){cell.toDp()})).background(palette.accent.copy(alpha=if(palette.dark).21f else .13f),shape))
            if(vertical)Column(Modifier.fillMaxSize()){navigationItems.forEach{(name,icon)->Column(Modifier.weight(1f).fillMaxWidth().selectable(page==name,role=Role.Tab,onClick={select(name)}),horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.Center){Icon(icon,name,Modifier.size(21.dp),tint=if(page==name)palette.accent else palette.muted);if(page==name)Text(name,fontSize=9.sp,color=palette.accent)}}}
            else Row(Modifier.fillMaxSize()){navigationItems.forEach{(name,icon)->Column(Modifier.weight(1f).fillMaxHeight().selectable(page==name,role=Role.Tab,onClick={select(name)}),horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.Center){val scale by animateFloatAsState(if(page==name)1.08f else 1f,spring(stiffness=500f),label="tab-icon");Icon(icon,name,Modifier.size(21.dp*scale),tint=if(page==name)palette.accent else palette.muted);AnimatedVisibility(page==name,enter=expandVertically(spring(stiffness=500f))+fadeIn(),exit=shrinkVertically(tween(160))+fadeOut()){Text(name,fontSize=9.sp,color=palette.accent,fontWeight=FontWeight.Bold)}}}}
        }
    }
}

@Composable private fun MorePage(model:WorkspaceModel,appearance:()->Unit,settings:()->Unit,alerts:()->Unit,navigate:(String)->Unit){
    LazyColumn(Modifier.fillMaxSize(),contentPadding=PaddingValues(20.dp),verticalArrangement=Arrangement.spacedBy(16.dp)){
        item{Row(Modifier.fillMaxWidth().padding(vertical=10.dp),verticalAlignment=Alignment.CenterVertically){Logo(44.dp);Column(Modifier.weight(1f).padding(start=14.dp)){Text("我的工作台",fontSize=24.sp,fontWeight=FontWeight.Bold);Caption("账号 · "+model.loginUser)}}}
        item{Row(horizontalArrangement=Arrangement.spacedBy(12.dp)){MoreAction("外观",Icons.Outlined.Palette,Modifier.weight(1f),appearance);MoreAction("设置",Icons.Outlined.Settings,Modifier.weight(1f),settings)}}
        item{Row(horizontalArrangement=Arrangement.spacedBy(12.dp)){MoreAction("入口",Icons.Outlined.Bookmarks,Modifier.weight(1f)){navigate("入口")};MoreAction("AI 资讯",Icons.Outlined.AutoAwesome,Modifier.weight(1f)){navigate("AI 资讯")}}}
        item{MoreAction("提醒中心",Icons.Outlined.NotificationsNone,Modifier,alerts)}
        item{MoreAction("刷新数据",Icons.Outlined.Refresh,Modifier){model.refreshNow()}}
        item{Caption("v${BuildConfig.VERSION_NAME} · 登录已加密保存")}
    }
}
@Composable private fun MoreAction(title:String,icon:androidx.compose.ui.graphics.vector.ImageVector,modifier:Modifier,onClick:()->Unit){GlassCard(modifier.clickable(onClick=onClick),inset=18.dp){Row(verticalAlignment=Alignment.CenterVertically){Icon(icon,null,Modifier.size(22.dp),tint=LocalGlass.current.accent);Text(title,Modifier.weight(1f).padding(start=12.dp),fontWeight=FontWeight.Medium,fontSize=14.sp);Icon(Icons.Outlined.ChevronRight,null,Modifier.size(16.dp))}}}
