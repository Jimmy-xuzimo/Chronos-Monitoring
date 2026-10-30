package top.xuzimo.workbench

import android.app.Activity
import android.graphics.Bitmap
import androidx.compose.animation.core.Animatable
import androidx.compose.animation.core.tween
import androidx.compose.foundation.Canvas
import androidx.compose.foundation.layout.fillMaxSize
import androidx.compose.runtime.*
import androidx.compose.ui.Modifier
import androidx.compose.ui.geometry.Offset
import androidx.compose.ui.graphics.*
import androidx.compose.ui.graphics.drawscope.clipPath
import androidx.compose.ui.unit.IntSize
import kotlin.math.hypot

/** An in-memory old frame above the new theme. Both reveal directions take 900 ms. */
class ThemeReveal {
    var bitmap by mutableStateOf<Bitmap?>(null); private set
    var expanding by mutableStateOf(true); private set
    private var nextExpands = true
    private var capturing=false
    fun capture(activity: Activity?, change:()->Unit = {}) {
        if (bitmap != null || capturing) return
        if(activity==null){change();return}
        val view = activity.window.decorView
        if (view.width <= 0 || view.height <= 0) { change();return }
        val snapshot = Bitmap.createBitmap(view.width, view.height, Bitmap.Config.ARGB_8888)
        capturing=true
        try {
            android.view.PixelCopy.request(activity.window,snapshot,{ result ->
                capturing=false
                if(result==android.view.PixelCopy.SUCCESS){expanding=nextExpands;nextExpands=!nextExpands;bitmap=snapshot}else snapshot.recycle()
                change()
            },android.os.Handler(android.os.Looper.getMainLooper()))
        }catch(_:RuntimeException){capturing=false;snapshot.recycle();change()}
    }
    fun finish(image: Bitmap) { if (bitmap === image) bitmap = null /* RenderThread may still reference the last frame; allow GC to release it. */ }
}
val LocalThemeReveal = staticCompositionLocalOf { ThemeReveal() }

@Composable fun ThemeRevealOverlay(reveal: ThemeReveal) {
    val bitmap = reveal.bitmap ?: return
    val image = remember(bitmap) { bitmap.asImageBitmap() }
    val value = remember(bitmap) { Animatable(0f) }
    LaunchedEffect(bitmap) { value.animateTo(1f, tween(900, easing = Ease)); reveal.finish(bitmap) }
    Canvas(Modifier.fillMaxSize()) {
        val center = Offset(size.width * .84f, size.height * .2f)
        val far = maxOf(hypot(center.x, center.y), hypot(size.width - center.x, center.y), hypot(center.x, size.height - center.y), hypot(size.width - center.x, size.height - center.y))
        val radius = far * if (reveal.expanding) value.value else 1f - value.value
        val circle = Path().apply { addOval(androidx.compose.ui.geometry.Rect(center.x - radius, center.y - radius, center.x + radius, center.y + radius)) }
        clipPath(circle, if (reveal.expanding) ClipOp.Difference else ClipOp.Intersect) { drawImage(image, dstSize = IntSize(size.width.toInt(), size.height.toInt())) }
    }
}
