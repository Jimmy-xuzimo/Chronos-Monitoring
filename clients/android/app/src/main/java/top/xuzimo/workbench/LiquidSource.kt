package top.xuzimo.workbench

import android.content.Context
import android.graphics.*
import android.view.View
import android.view.ViewGroup
import androidx.compose.runtime.staticCompositionLocalOf

val LocalLiquidSource=staticCompositionLocalOf<ViewGroup?>{null}
val LocalAtmosphere=staticCompositionLocalOf<AtmosphereView?>{null}

/** A real sibling View below Compose, sampled by QmDeve without recursive captures. */
class AtmosphereView(context:Context):View(context) {
    private var palette=skin("ocean",false)
    private val brush=Paint(Paint.ANTI_ALIAS_FLAG)
    fun palette(value:GlassSkin){if(palette!=value){palette=value;invalidate()}}
    override fun onDraw(canvas:Canvas){
        super.onDraw(canvas)
        val s=palette;val w=width.toFloat();val h=height.toFloat();val radius=maxOf(w,h*.65f)
        canvas.drawColor(s.base.toArgbNative())
        fun glow(x:Float,y:Float,r:Float,color:androidx.compose.ui.graphics.Color,alpha:Float){brush.shader=RadialGradient(x,y,r,intArrayOf(color.copy(alpha=alpha).toArgbNative(),color.copy(alpha=0f).toArgbNative()),null,Shader.TileMode.CLAMP);canvas.drawCircle(x,y,r,brush)}
        if(s.id!="industrial"){glow(w*.98f,h*.05f,radius*.9f,s.glow,if(s.dark).24f else .55f)
        glow(-w*.1f,h*.5f,radius*.8f,s.bloom,if(s.dark).24f else .45f)
        glow(w*.85f,h*.96f,radius*.6f,s.glow,if(s.dark).13f else .32f)
        brush.shader=null;brush.style=Paint.Style.STROKE;brush.strokeWidth=radius*.025f;brush.color=s.glow.copy(alpha=if(s.dark).12f else .2f).toArgbNative()
        canvas.drawOval(w*.35f,-h*.15f,w*1.65f,h*.5f,brush)
        }
        if(s.id=="industrial"){
            brush.style=Paint.Style.STROKE;brush.strokeWidth=1f;brush.color=s.ink.copy(alpha=.045f).toArgbNative()
            val step=32f*resources.displayMetrics.density
            var x=0f;while(x<w){canvas.drawLine(x,0f,x,h,brush);x+=step}
            var y=0f;while(y<h){canvas.drawLine(0f,y,w,y,brush);y+=step}
            brush.style=Paint.Style.FILL;brush.color=s.accent.copy(alpha=.13f).toArgbNative()
            canvas.save();canvas.rotate(-25f,w*.8f,h*.18f);repeat(4){i->canvas.drawRect(w*.7f+i*26f,h*.05f,w*.7f+i*26f+8f,h*.28f,brush)};canvas.restore()
        }
        brush.style=Paint.Style.FILL
    }
}
private fun androidx.compose.ui.graphics.Color.toArgbNative():Int=android.graphics.Color.argb((alpha*255).toInt(),(red*255).toInt(),(green*255).toInt(),(blue*255).toInt())
