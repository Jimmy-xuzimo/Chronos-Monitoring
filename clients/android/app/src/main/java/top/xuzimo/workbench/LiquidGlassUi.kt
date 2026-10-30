package top.xuzimo.workbench

import android.os.Build
import android.view.View
import android.view.ViewGroup
import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.shape.RoundedCornerShape
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.draw.clip
import androidx.compose.ui.graphics.*
import androidx.compose.ui.platform.LocalDensity
import androidx.compose.ui.unit.*
import androidx.compose.ui.viewinterop.AndroidView
import com.qmdeve.liquidglass.widget.LiquidGlassView

data class GlassSkin(val id:String,val title:String,val subtitle:String,val accent:Color,val glow:Color,val bloom:Color,val base:Color,val ink:Color,val muted:Color,val dark:Boolean)
fun skin(id:String,dark:Boolean):GlassSkin {
    val c=when(id){
        "ice"->listOf(Color(0xFF218274),Color(0xFF9CDCC1),Color(0xFFB3CFC4),Color(0xFFEEF4EE),Color(0xFF12231F))
        "aurora"->listOf(Color(0xFFAF5573),Color(0xFFF1C4B0),Color(0xFFD4BED9),Color(0xFFF7EFED),Color(0xFF2B1B28))
        "graphite"->listOf(Color(0xFF62696A),Color(0xFFB9C3C5),Color(0xFFCBC4B8),Color(0xFFECECE8),Color(0xFF181C1D))
        "industrial"->listOf(Color(0xFFB64E22),Color(0xFFAD7953),Color(0xFF8B8E87),Color(0xFFE9E5D8),Color(0xFF17191B))
        else->listOf(Color(0xFF7A6B55),Color(0xFFDDD4BD),Color(0xFFBFCBD6),Color(0xFFF6F4EE),Color(0xFF1C2026))
    }
    val names=when(id){"ice"->"苔庭" to "鼠尾草 · 薄荷 · 森林";"aurora"->"暮樱" to "烟粉 · 奶杏 · 玫瑰";"graphite"->"石墨" to "银灰 · 墨黑 · 金属";"industrial"->"工业废土" to "锈橙 · 橄榄 · 混凝土";else->"月白" to "暖白 · 香槟 · 银雾"}
    val accent=if(dark&&id=="industrial")Color(0xFFF2A574)else if(dark)lerp(c[0],Color.White,.55f)else c[0]
    return GlassSkin(id,names.first,names.second,accent,c[1],c[2],if(dark)c[4]else c[3],if(dark)Color(0xFFF3F4F5)else Color(0xFF242B2D),if(dark)Color(0xFFB8C0C9)else Color(0xFF626A67),dark)
}
val LocalGlass=staticCompositionLocalOf{skin("ocean",false)}
fun glassColors(s:GlassSkin):ColorScheme=if(s.dark)darkColorScheme(primary=s.accent,onPrimary=s.base,primaryContainer=lerp(s.base,s.accent,.16f),onPrimaryContainer=s.ink,secondary=s.accent,secondaryContainer=lerp(s.base,s.glow,.12f),onSecondaryContainer=s.ink,background=s.base,surface=lerp(s.base,s.ink,.055f),surfaceVariant=lerp(s.base,s.ink,.12f),onSurface=s.ink,onSurfaceVariant=s.muted,outline=s.muted.copy(alpha=.5f))else lightColorScheme(primary=s.accent,primaryContainer=lerp(s.base,s.accent,.12f),onPrimaryContainer=s.ink,secondary=s.accent,secondaryContainer=lerp(s.base,s.glow,.18f),onSecondaryContainer=s.ink,background=s.base,surface=lerp(s.base,Color.White,.65f),surfaceVariant=lerp(s.base,s.accent,.08f),onSurface=s.ink,onSurfaceVariant=s.muted,outline=s.muted.copy(alpha=.5f))

/** QmDeve LiquidGlassView is the sole glass renderer; Compose supplies crisp content. */
@Composable fun GlassCard(modifier:Modifier=Modifier,inset:Dp=16.dp,radius:Dp=26.dp,spacing:Dp=6.dp,content:@Composable ColumnScope.()->Unit){
    val s=LocalGlass.current;val source=LocalLiquidSource.current;val density=LocalDensity.current
    val corner=when(s.id){"industrial"->4.dp;"graphite"->18.dp;else->radius}
    val tint=if(s.dark)s.base else Color.White
    val key=listOf(s.id,s.dark,corner.value,density.density)
    Box(modifier.fillMaxWidth().clip(RoundedCornerShape(corner)).border(if(s.id=="industrial")1.dp else .7.dp,s.ink.copy(alpha=if(s.dark).15f else .09f),RoundedCornerShape(corner))){
        AndroidView(modifier=Modifier.matchParentSize(),factory={context->object:LiquidGlassView(context){override fun onSizeChanged(w:Int,h:Int,oldw:Int,oldh:Int){super.onSizeChanged(w,h,oldw,oldh);clipBounds=android.graphics.Rect(0,0,w,h)}}.apply{
            layoutParams=ViewGroup.LayoutParams(ViewGroup.LayoutParams.MATCH_PARENT,ViewGroup.LayoutParams.MATCH_PARENT)
            importantForAccessibility=View.IMPORTANT_FOR_ACCESSIBILITY_NO
            isFocusable=false
            clipChildren=true;clipToPadding=true
            if(source!=null)bind(source)
        }},update={glass->if(glass.tag!=key){glass.tag=key
            glass.setCornerRadius(with(density){corner.toPx()})
            glass.setRefractionHeight(with(density){16.dp.toPx()})
            glass.setRefractionOffset(with(density){42.dp.toPx()})
            glass.setDispersion(if(s.id=="industrial").1f else .22f)
            glass.setBlurRadius(with(density){(if(s.id=="industrial")5.dp else 8.dp).toPx()})
            glass.setTintColorRed(tint.red);glass.setTintColorGreen(tint.green);glass.setTintColorBlue(tint.blue)
            glass.setTintAlpha(if(s.dark).19f else .14f)
            glass.setDraggableEnabled(false);glass.setElasticEnabled(false);glass.setTouchEffectEnabled(false)
        }})
        if(Build.VERSION.SDK_INT<33)Box(Modifier.matchParentSize().background(tint.copy(alpha=if(s.dark).48f else .56f)))
        if(s.id=="industrial") androidx.compose.foundation.Canvas(Modifier.matchParentSize()){val stroke=1.dp.toPx();val l=8.dp.toPx();val d=6.dp.toPx();for(x in listOf(d,size.width-d))for(y in listOf(d,size.height-d)){val dx=if(x==d)l else -l;val dy=if(y==d)l else -l;drawLine(s.accent.copy(alpha=.5f),androidx.compose.ui.geometry.Offset(x,y),androidx.compose.ui.geometry.Offset(x+dx,y),stroke);drawLine(s.accent.copy(alpha=.5f),androidx.compose.ui.geometry.Offset(x,y),androidx.compose.ui.geometry.Offset(x,y+dy),stroke)}}
        Column(Modifier.padding(inset),verticalArrangement=Arrangement.spacedBy(spacing),content=content)
    }
}

@Composable fun GlassStylePicker(model:WorkspaceModel){
    val reveal=LocalThemeReveal.current;val activity=androidx.activity.compose.LocalActivity.current
    val dark=when(model.theme){"深色"->true;"浅色"->false;else->isSystemInDarkTheme()}
    Column(Modifier.fillMaxWidth(),verticalArrangement=Arrangement.spacedBy(8.dp)){
        Text("光影与风格",style=MaterialTheme.typography.titleMedium)
        listOf("ocean","ice","aurora","graphite","industrial").forEach{id->
            val preview=skin(id,dark);val selected=model.style==id;val shape=workbenchShape(14.dp)
            Row(Modifier.fillMaxWidth().heightIn(min=51.dp).clip(shape).background(if(selected)LocalGlass.current.accent.copy(alpha=.12f)else LocalGlass.current.ink.copy(alpha=.035f)).border(if(selected)1.5.dp else .6.dp,LocalGlass.current.accent.copy(alpha=if(selected).65f else .16f),shape).clickable(enabled=!model.busy){if(reveal.bitmap==null&&model.style!=id)reveal.capture(activity){model.updateAppearance(id,model.theme)}}.padding(horizontal=14.dp,vertical=12.dp),verticalAlignment=Alignment.CenterVertically){
                Text(preview.title,Modifier.weight(1f),fontSize=14.sp,fontWeight=androidx.compose.ui.text.font.FontWeight.Medium)
                listOf(preview.base,preview.glow,preview.accent).forEach{color->Box(Modifier.padding(end=6.dp).size(17.dp).background(color,workbenchShape(5.dp)).border(.5.dp,LocalGlass.current.ink.copy(alpha=.15f),workbenchShape(5.dp)))}
                Text(if(selected)"✓"else"",Modifier.width(22.dp),color=LocalGlass.current.accent)
            }
        }
        Chips(listOf("浅色","深色"),if(dark)"深色"else"浅色",{if(reveal.bitmap==null&&!model.busy)reveal.capture(activity){model.updateAppearance(model.style,it)}})
    }
}
