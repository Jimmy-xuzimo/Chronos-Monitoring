package top.xuzimo.workbench

import android.graphics.Bitmap
import androidx.compose.ui.test.*
import androidx.compose.ui.test.junit4.createAndroidComposeRule
import androidx.lifecycle.ViewModelProvider
import androidx.test.ext.junit.runners.AndroidJUnit4
import androidx.test.platform.app.InstrumentationRegistry
import kotlinx.coroutines.runBlocking
import org.json.JSONObject
import org.junit.Assert.*
import org.junit.Rule
import org.junit.Test
import org.junit.runner.RunWith
import java.io.File

@RunWith(AndroidJUnit4::class)
class WorkspaceTest {
    @get:Rule val rule = createAndroidComposeRule<MainActivity>()
    private val fixture = "http://10.0.2.2:5093"
    private fun model() = ViewModelProvider(rule.activity)[WorkspaceModel::class.java]
    private fun login() {
        rule.waitUntil(45_000){!model().booting}
        if(!model().signedIn){rule.onNodeWithTag("login-server").performTextReplacement(fixture)
            rule.onNodeWithTag("login-user").performTextReplacement("demo")
            rule.onNodeWithTag("login-password").performTextReplacement("fixture-only-password")
            rule.onNodeWithTag("login-password").performImeAction()}
        rule.waitUntil(30_000) { model().signedIn && model().overview.rows("nodes").size == 2 && model().homeHistories.size == 2 && !model().busy }
    }
    private fun click(text: String) { if(text in listOf("总览","课表","设备","项目","更多"))rule.onAllNodesWithContentDescription(text).onLast().performClick()else rule.onAllNodesWithText(text).onLast().performClick(); rule.waitForIdle() }
    private fun photo(name: String) {
        rule.waitForIdle()
        android.os.SystemClock.sleep(1000)
        val instrumentation = InstrumentationRegistry.getInstrumentation()
        val dir = File(instrumentation.targetContext.getExternalFilesDir(null), "qa").apply { mkdirs() }
        instrumentation.uiAutomation.takeScreenshot().let { bitmap -> File(dir, "$name.png").outputStream().use { bitmap.compress(Bitmap.CompressFormat.PNG, 100, it) }; bitmap.recycle() }
    }
    @Test fun nativeNavigationAndTheme() {
        login(); rule.onNodeWithText("今日课程").assertExists(); rule.onNodeWithText("性能监控").assertExists(); photo("01-home-light")
        click("课表"); click("周课表"); rule.onNodeWithText("演示课表", substring=true).assertDoesNotExist(); click("月历"); photo("02-calendar")
        click("设备"); rule.onNodeWithText("CPU / 内存").assertExists(); photo("03-devices"); click("本地电脑 · Demo")
        click("存储"); rule.onNodeWithText("C:").assertExists(); click("网卡"); rule.onNodeWithText("Ethernet").assertExists(); click("进程"); rule.onNodeWithText("example-service").assertExists(); click("网站"); rule.onNodeWithText("示例服务", substring = true).assertExists()
        click("项目"); rule.onNodeWithText("example-workspace").assertExists(); click("Pull Request"); rule.onAllNodesWithText("CI 正常 · 审阅 已批准").onFirst().assertExists(); photo("04-projects"); click("版本"); rule.onNodeWithText("v1.0.0", substring = true).assertExists()
        click("更多"); click("AI 资讯"); rule.onAllNodesWithText("开发工具").onFirst().assertExists(); photo("05-news"); rule.onAllNodesWithText("研究前沿").onFirst().performClick(); rule.onNodeWithText("多模态研究的新进展与开放评测").assertExists(); rule.onNodeWithText("开发者工具更新：更顺畅的创作流程").assertDoesNotExist()
        click("更多");click("设置"); click("深色"); rule.runOnIdle { assertEquals("深色", model().theme) }; click("总览"); photo("06-home-dark")
        click("更多"); click("设置"); rule.onAllNodesWithText("课表").onFirst().performClick(); rule.onNodeWithText(model().config.rows("calendars").first().s("name")).assertExists(); rule.onAllNodesWithText("时区", substring = true).onFirst().assertExists(); click("清理"); photo("07-maintenance")
        rule.runOnUiThread { rule.activity.recreate() }
        rule.waitUntil(15_000) { model().signedIn }; rule.onNodeWithText("光影与风格").assertExists()
    }
    @Test fun serverContractAndMaintenance() = runBlocking {
        val api = WorkspaceApi(fixture)
        assertFalse(api.call("/api/session").optBoolean("authenticated"))
        try { api.call("/api/overview"); fail("Auth must be required") } catch (e: ApiFailure) { assertEquals(401, e.code) }
        api.call("/api/login", "POST", JSONObject().put("username", "demo").put("password", "fixture-only-password"))
        val initial = api.call("/api/config")
        assertFalse(initial.has("secret_key")); assertFalse(initial.has("password")); assertFalse(initial.has("github_token")); assertFalse(initial.rows("calendars").first().has("url"))
        try {
            api.call("/api/config", "PUT", JSONObject().put("retention", JSONObject().put("raw_days", 2).put("history_days", 31).put("event_days", 91).put("news_days", 92)))
            assertEquals(31, api.call("/api/config").obj("retention").optInt("history_days"))
            val calendars = initial.rows("calendars").map { JSONObject(it.toString()).put("name", "已更新的演示订阅") }
            api.call("/api/config", "PUT", JSONObject().put("calendars", jsonList(calendars)))
            assertTrue(api.call("/api/config").rows("calendars").first().optBoolean("configured"))
            val entries = initial.rows("entries").map { JSONObject(it.toString()).put("pinned", true) }.reversed()
            api.call("/api/config", "PUT", JSONObject().put("entries", jsonList(entries)))
            assertEquals(entries.first().s("id"), api.call("/api/overview").rows("entries").first().s("id"))
            for (range in listOf("1h", "24h", "7d", "30d")) assertTrue(api.call("/api/history?node=desktop&range=$range").rows("points").isNotEmpty())
            val day = api.call("/api/news").obj("data").strings("dates").last()
            assertEquals(day, api.call("/api/news?date=$day").obj("data").s("date"))
            assertTrue(api.call("/api/services/site/history").rows("checks").isNotEmpty())
            val agent = api.call("/api/agents", "POST", JSONObject().put("name", "Temporary test node"))
            assertTrue(agent.s("token").isNotBlank()); api.call("/api/agents/" + agent.s("id"), "DELETE")
            api.call("/api/alerts/seen", "POST", JSONObject()); api.call("/api/news/sync", "POST", JSONObject())
        } finally {
            api.call("/api/config", "PUT", JSONObject().put("retention", initial.obj("retention")).put("calendars", jsonList(initial.rows("calendars"))).put("entries", jsonList(initial.rows("entries"))))
        }
        api.call("/api/logout", "POST", JSONObject())
        try { api.call("/api/stats"); fail("Logout must revoke access") } catch (e: ApiFailure) { assertEquals(401, e.code) }
    }
    @Test fun httpsProductionHandshakeAndUrlBoundary() = runBlocking {
        val liveServer=InstrumentationRegistry.getArguments().getString("productionServer")
        if(liveServer!=null)assertFalse(WorkspaceApi(liveServer).call("/api/session").optBoolean("authenticated"))
        for (url in listOf("http://example.com", "https://user:password@example.com", "https://example.com/path", "https://example.com?token=secret", "file:///tmp/test")) {
            try { WorkspaceApi(url); fail("Must reject $url") } catch (_: IllegalArgumentException) { }
        }
        assertEquals("https://example.com", WorkspaceApi.normalize("https://example.com/"))
    }
    @Test fun nativeMaintenanceAndExpiredSession() {
        login()
        val api = WorkspaceApi(fixture)
        runBlocking { api.call("/api/session"); api.call("/api/login", "POST", JSONObject().put("username", "demo").put("password", "fixture-only-password")) }
        val initial = runBlocking { api.call("/api/config") }
        try {
            click("更多"); click("设置"); click("清理")
            rule.onAllNodes(hasSetTextAction())[1].performTextReplacement("32")
            rule.onNodeWithText("保存清理规则").performScrollTo().performClick()
            rule.waitUntil(15_000) { model().config.obj("retention").optInt("history_days") == 32 && !model().busy }
            assertEquals(32, runBlocking { api.call("/api/config") }.obj("retention").optInt("history_days"))
            click("总览")
            runBlocking { api.call("/api/fixture/control", "POST", JSONObject().put("action", "stale")) }
            rule.runOnUiThread { model().refreshNow() }
            rule.waitUntil(15_000) { model().overview.obj("calendar").rows("sources").first().s("status") == "stale" }
            rule.onNodeWithText("同步异常，显示上次结果", substring = true).assertExists()
            rule.onNodeWithText("交互设计").assertExists()
        } finally {
            runBlocking { api.call("/api/config", "PUT", JSONObject().put("retention", initial.obj("retention"))); api.call("/api/fixture/control", "POST", JSONObject().put("action", "recover")) }
        }
        runBlocking { api.call("/api/fixture/control", "POST", JSONObject().put("action", "expire")) }
        rule.runOnUiThread { model().refreshNow() }
        rule.waitUntil(15_000) { !model().signedIn }
        rule.onNodeWithText("连接我的工作台").assertExists()
        rule.runOnIdle { assertEquals(0, model().overview.length()); assertTrue(model().stats.isEmpty()) }
    }
    @Test fun responsiveSmoke() {
        login()
        val label=InstrumentationRegistry.getArguments().getString("profile")?:"responsive"
        rule.onNodeWithText("南京").assertExists();photo(label+"-home")
        if(label !in listOf("tablet-landscape","tablet-portrait")){
            val performance=rule.onNodeWithTag("home-performance").getUnclippedBoundsInRoot()
            val dock=rule.onNodeWithTag("navigation-dock").getUnclippedBoundsInRoot()
            if(label!="phone-landscape")assertTrue("Performance must fit above navigation: $performance / $dock",performance.bottom<=dock.top)
        }
        rule.onNodeWithTag("home-list").performScrollToNode(hasText("网站与证书"));photo(label+"-home-more")
        click("课表");click("月历");photo(label+"-calendar")
        click("设备");rule.onNodeWithTag("device-list").performScrollToNode(hasText("CPU / 内存"));rule.onNodeWithText("CPU / 内存").assertExists();photo(label+"-devices")
        click("项目");rule.onNodeWithText("example-workspace").assertExists()
        click("更多");click("AI 资讯");rule.onNode(SemanticsMatcher.keyIsDefined(androidx.compose.ui.semantics.SemanticsActions.ScrollToIndex)).performScrollToNode(hasText("多模态研究的新进展与开放评测"));rule.onNodeWithText("多模态研究的新进展与开放评测").assertExists()
        click("更多");click("设置");rule.onNodeWithText("光影与风格").assertExists();photo(label+"-settings")
    }
    @Test fun allGlassStylesPersist() {
        login()
        for(style in listOf("ocean","ice","aurora","graphite","industrial")) for(theme in listOf("浅色","深色")) {
            rule.runOnUiThread { model().updateAppearance(style,theme) }
            rule.waitUntil(15_000){!model().busy && model().config.obj("android_appearance").s("style")==style && model().theme==theme}
            photo("style-$style-"+if(theme=="浅色")"light"else"dark")
        }
        rule.runOnUiThread{model().updateAppearance("ocean","浅色")}
        rule.waitUntil(15_000){!model().busy}
    }
    @Test fun weatherCanBeChangedOnServer(){
        login();click("更多");click("设置");click("天气")
        rule.onAllNodes(hasSetTextAction())[0].performTextReplacement("北京")
        rule.runOnUiThread{val manager=rule.activity.getSystemService(android.content.Context.INPUT_METHOD_SERVICE)as android.view.inputmethod.InputMethodManager;manager.hideSoftInputFromWindow(rule.activity.window.decorView.windowToken,0);rule.activity.currentFocus?.clearFocus()}
        click("检索地点");rule.waitUntil(15_000){model().weatherLocations.any{it.s("name")=="北京"}}
        rule.onAllNodesWithText("北京").onLast().performClick();rule.onNodeWithText("保存天气地点").performScrollTo().performClick()
        rule.waitUntil(15_000){model().config.obj("weather_location").s("station_id")=="54511"&&!model().busy}
        click("总览");rule.waitUntil(30_000){model().overview.obj("weather").obj("data").s("station_id")=="54511"}
        rule.onNodeWithText("北京").assertExists();photo("weather-beijing")
        rule.runOnUiThread{model().save(JSONObject().put("weather_location",JSONObject().put("name","南京").put("station_id","58238")))}
        rule.waitUntil(15_000){!model().busy}
    }
    @Test fun persistenceAndThemeNavigation(){
        login();val context=InstrumentationRegistry.getInstrumentation().targetContext
        val saved=LoginVault(context).read()!!
        assertEquals("demo",saved.s("username"));assertEquals("fixture-only-password",saved.s("password"))
        val encrypted=File(context.noBackupFilesDir,"login.aes").readText()
        assertFalse(encrypted.contains("fixture-only-password"));assertFalse(encrypted.contains("demo"))
        lateinit var restored:WorkspaceModel
        rule.runOnUiThread{restored=WorkspaceModel();restored.attach(context)}
        rule.waitUntil(45_000){restored.signedIn&&!restored.booting}
        assertEquals("demo",restored.loginUser)
        click("更多");click("外观");photo("v101-style-list")
        val before=rule.activity
        for(id in listOf("ice","industrial","ocean")){
            rule.runOnUiThread{model().updateAppearance(id,"深色")}
            rule.waitUntil(15_000){!model().busy&&model().style==id}
            assertSame(before,rule.activity);rule.onNodeWithText("光影与风格").assertExists()
        }
        rule.activity.onBackPressedDispatcher.let{dispatcher->rule.runOnUiThread{dispatcher.onBackPressed()}}
        click("总览")
        val dock=rule.onNodeWithTag("navigation-dock")
        dock.performTouchInput{down(centerLeft+androidx.compose.ui.geometry.Offset(12f,0f));moveTo(centerRight-androidx.compose.ui.geometry.Offset(12f,0f),800);up()}
        rule.onNodeWithText("我的工作台").assertExists()
        rule.runOnUiThread{restored.logout()};rule.waitUntil(15_000){!restored.busy}
        assertNull(LoginVault(context).read())
    }
    @Test fun coldLoginCheck(){
        if(InstrumentationRegistry.getArguments().getString("cold")!="true")return
        rule.waitUntil(45_000){model().signedIn&&!model().booting}
        rule.onNodeWithTag("login-password").assertDoesNotExist()
        assertEquals("demo",model().loginUser)
    }
}
