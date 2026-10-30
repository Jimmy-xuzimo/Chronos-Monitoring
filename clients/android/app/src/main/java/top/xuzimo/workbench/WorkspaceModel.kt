package top.xuzimo.workbench

import androidx.compose.runtime.*
import androidx.lifecycle.ViewModel
import androidx.lifecycle.viewModelScope
import kotlinx.coroutines.*
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import org.json.JSONObject
import java.net.URLEncoder
import java.time.*
import java.time.format.DateTimeFormatter
import java.util.Locale

val China: ZoneId = ZoneId.of("Asia/Shanghai")
fun courseTime(c: JSONObject, key: String): ZonedDateTime? = try { OffsetDateTime.parse(c.s(key)).atZoneSameInstant(China) } catch (_: Exception) { try { LocalDateTime.parse(c.s(key)).atZone(China) } catch (_: Exception) { null } }
fun courseDay(c: JSONObject): LocalDate? = try { LocalDate.parse(c.s("date")) } catch (_: Exception) { courseTime(c, "start")?.toLocalDate() }
fun clockTime(c: JSONObject, key: String) = courseTime(c, key)?.format(DateTimeFormatter.ofPattern("HH:mm")) ?: "待定"
fun friendlyTime(ts: Double): String = if (ts <= 0) "尚未同步" else Instant.ofEpochSecond(ts.toLong()).atZone(China).format(DateTimeFormatter.ofPattern("MM-dd HH:mm:ss"))
fun greeting(hour: Int) = when (hour) { in 0..5 -> "凌晨好"; in 6..10 -> "上午好"; in 11..13 -> "中午好"; in 14..17 -> "下午好"; in 18..21 -> "晚上好"; else -> "深夜好" }
fun bytes(value: Double): String { var n = value; val units = arrayOf("B", "KB", "MB", "GB", "TB"); var i = 0; while (n >= 1024 && i < 4) { n /= 1024; i++ }; return String.format(Locale.US, if (i >= 2) "%.1f %s" else "%.0f %s", n, units[i]) }
fun percent(o: JSONObject, key: String) = if (o.isNull(key) || !o.has(key)) "—" else String.format(Locale.US, "%.1f%%", o.optDouble(key))

class WorkspaceModel : ViewModel() {
    var booting by mutableStateOf(true); private set
    var loginAddress by mutableStateOf(BuildConfig.SERVER_URL); private set
    var loginUser by mutableStateOf(""); private set
    var savedLoginAvailable by mutableStateOf(false); private set
    private var vault:LoginVault?=null
    private var savedLogin:JSONObject?=null
    private var authJob:Job?=null
    var api: WorkspaceApi? = null; private set
    var signedIn by mutableStateOf(false); private set
    var busy by mutableStateOf(false); private set
    var refreshing by mutableStateOf(false); private set
    var message by mutableStateOf("")
    var error by mutableStateOf(""); private set
    var overview by mutableStateOf(JSONObject()); private set
    var config by mutableStateOf(JSONObject()); private set
    var news by mutableStateOf(JSONObject()); private set
    var newsDay by mutableStateOf(""); private set
    var newsBusy by mutableStateOf(false); private set
    var range by mutableStateOf("24h"); private set
    var theme by mutableStateOf("自动")
    var style by mutableStateOf("ocean"); private set
    var weatherLocations by mutableStateOf<List<JSONObject>>(emptyList());private set
    var weatherSearching by mutableStateOf(false);private set
    private var weatherSearchGeneration=0
    val stats = mutableStateMapOf<String, JSONObject>()
    val histories = mutableStateMapOf<String, JSONObject>()
    val homeHistories = mutableStateMapOf<String, JSONObject>()
    var serviceHistory by mutableStateOf(JSONObject()); private set
    var serviceHistoryId by mutableStateOf(""); private set
    private var historyUpdated = 0L
    private var newsGeneration = 0
    private var generation = 0
    private val refreshLock = Mutex()
    private val writeLock = Mutex()

    fun attach(context:android.content.Context){if(vault!=null)return;vault=LoginVault(context.applicationContext);restoreLogin()}
    fun restoreLogin(){
        if(authJob?.isActive==true)return
        booting=true;error=""
        authJob=viewModelScope.launch{
            try{
                val saved=withContext(Dispatchers.IO){vault?.read()}
                savedLogin=saved;savedLoginAvailable=saved!=null
                if(saved!=null){
                    loginAddress=saved.s("server");loginUser=saved.s("username")
                    val connection=WorkspaceApi(loginAddress);connection.restoreSession(saved.obj("session"))
                    val session=connection.call("/api/session")
                    if(!session.optBoolean("authenticated"))connection.call("/api/login","POST",JSONObject().put("username",loginUser).put("password",saved.s("password")))
                    acceptLogin(connection,saved)
                }
            }catch(e:Exception){
                if(e is ApiFailure&&e.code==401){withContext(Dispatchers.IO){vault?.clear()};savedLogin=null;savedLoginAvailable=false}
                report(e)
            }finally{booting=false}
        }
    }
    private suspend fun persistLogin(){val saved=savedLogin?:return;saved.put("session",api?.savedSession()?:JSONObject());withContext(Dispatchers.IO){vault?.save(saved)};savedLoginAvailable=true}
    private suspend fun acceptLogin(connection:WorkspaceApi,saved:JSONObject){
        api?.forget();api=connection;savedLogin=saved;loginAddress=connection.origin;loginUser=saved.s("username");generation++;signedIn=true
        persistLogin();refresh()
        if(signedIn){config=connection.call("/api/config");val appearance=config.obj("android_appearance");style=appearance.s("style","ocean");theme=when(appearance.s("theme")){"light"->"浅色";"dark"->"深色";else->"自动"}}
    }

    fun login(address: String, username: String, password: String) {
        if (busy) return
        busy = true; error = ""
        authJob=viewModelScope.launch {
            try {
                val connection = WorkspaceApi(address)
                connection.call("/api/session")
                connection.call("/api/login", "POST", JSONObject().put("username", username).put("password", password))
                acceptLogin(connection,JSONObject().put("server",connection.origin).put("username",username).put("password",password))
            } catch (e: Exception) { report(e) } finally { busy = false }
        }
    }
    private fun report(e: Exception) {
        if (e is CancellationException) throw e
        if (e is ApiFailure && e.code == 401) clearSession()
        error = if (e is ApiFailure || e is IllegalArgumentException) e.message.orEmpty() else "连接失败，请检查网络或服务器；已读取的内容保留在当前会话"
    }
    private fun clearSession() {
        generation++; newsGeneration++; api?.forget(); api = null; signedIn = false
        overview = JSONObject(); config = JSONObject(); news = JSONObject(); newsDay = ""; stats.clear(); histories.clear(); homeHistories.clear(); historyUpdated = 0
        serviceHistory = JSONObject(); serviceHistoryId = ""
    }
    fun logout():Job {authJob?.cancel();booting=false;return viewModelScope.launch{busy=true;val connection=api;clearSession();savedLogin=null;savedLoginAvailable=false;withContext(Dispatchers.IO){vault?.clear()};try{connection?.call("/api/logout","POST",JSONObject())}catch(_:Exception){}finally{error="";busy=false}}}
    fun refreshNow() = viewModelScope.launch { refresh() }
    suspend fun poll() { while (currentCoroutineContext().isActive && signedIn) { refresh(); delay(10_000) } }
    private suspend fun refresh() {
        if (!refreshLock.tryLock()) return
        val connection = api
        val ticket = generation
        if (connection == null) { refreshLock.unlock(); return }
        refreshing = true
        try {
            val result = connection.call("/api/overview")
            if (ticket != generation) return
            overview = result; error = ""
            stats["server"] = result.obj("stats")
            if (newsDay.isEmpty()) news = result.obj("news")
            for (node in result.rows("nodes").filter { it.s("id") != "server" }) {
                try {
                    val data = connection.call("/api/stats?node=" + URLEncoder.encode(node.s("id"), "UTF-8"))
                    if (ticket == generation) stats[node.s("id")] = JSONObject().put("data", data).put("updated", data.obj("source").opt("updated")).put("status", data.obj("source").s("status"))
                } catch (e: ApiFailure) { if (e.code == 401) throw e; if (ticket == generation) stats[node.s("id")] = JSONObject().put("status", "pending") }
            }
            if (System.currentTimeMillis() - historyUpdated > 60_000) {
                val selectedRange = range
                for (node in result.rows("nodes")) {
                    val h = connection.call("/api/history?range=$selectedRange&node=" + URLEncoder.encode(node.s("id"), "UTF-8"))
                    if (ticket == generation && selectedRange == range) histories[node.s("id")] = h
                    if (selectedRange == "24h" && ticket == generation) homeHistories[node.s("id")] = h
                    if (selectedRange != "24h") {
                        val home = connection.call("/api/history?range=24h&node=" + URLEncoder.encode(node.s("id"), "UTF-8"))
                        if (ticket == generation) homeHistories[node.s("id")] = home
                    }
                }
                if (ticket == generation && selectedRange == range) historyUpdated = System.currentTimeMillis()
            }
        } catch (e: Exception) { if (ticket == generation) report(e) } finally { refreshing = false; refreshLock.unlock() }
    }
    fun changeRange(value: String) { if (value == range) return; range = value; histories.clear(); historyUpdated = 0; refreshNow() }
    fun loadNews(day: String) {
        newsDay = day; val ticket = ++newsGeneration
        viewModelScope.launch {
            newsBusy = true
            try {
                val result = api?.call("/api/news" + if (day.isBlank()) "" else "?date=$day")
                if (ticket == newsGeneration && result != null) news = result
            } catch (e: Exception) { if (ticket == newsGeneration) report(e) } finally { if (ticket == newsGeneration) newsBusy = false }
        }
    }
    fun searchWeather(query:String){val ticket=++weatherSearchGeneration;weatherSearching=true;viewModelScope.launch{try{val result=requireNotNull(api).call("/api/weather/locations?q="+URLEncoder.encode(query.trim(),"UTF-8"));if(ticket==weatherSearchGeneration)weatherLocations=result.rows("items")}catch(e:Exception){if(ticket==weatherSearchGeneration)report(e)}finally{if(ticket==weatherSearchGeneration)weatherSearching=false}}}
    fun loadServiceHistory(id: String) {
        serviceHistoryId = id; serviceHistory = JSONObject()
        viewModelScope.launch { try { val result = api?.call("/api/services/$id/history"); if (serviceHistoryId == id && result != null) serviceHistory = result } catch (e: Exception) { report(e) } }
    }
    fun reloadConfig() = viewModelScope.launch { try { api?.call("/api/config")?.let { config = it } } catch (e: Exception) { report(e) } }
    fun save(patch: JSONObject, done: () -> Unit = {}) = action {
        config = requireNotNull(api).call("/api/config", "PUT", patch)
        message = "已保存到服务器"; done(); refresh()
    }
    fun updateAppearance(nextStyle:String,nextTheme:String) = action {
        style=nextStyle;theme=nextTheme
        val patch=JSONObject().put("android_appearance",JSONObject().put("style",nextStyle).put("theme",when(nextTheme){"深色"->"dark";"浅色"->"light";else->"device"}))
        config=requireNotNull(api).call("/api/config","PUT",patch)
    }
    fun editList(key: String, done: () -> Unit = {}, transform: (List<JSONObject>) -> List<JSONObject>) = action {
        val fresh = requireNotNull(api).call("/api/config")
        config = requireNotNull(api).call("/api/config", "PUT", JSONObject().put(key, jsonList(transform(fresh.rows(key)))))
        message = "已保存到服务器"; done(); refresh()
    }
    fun pinRepo(name: String) = action {
        val fresh = requireNotNull(api).call("/api/config")
        val pins = fresh.strings("pinned_repos").toMutableList()
        if (!pins.remove(name)) pins.add(name)
        config = requireNotNull(api).call("/api/config", "PUT", JSONObject().put("pinned_repos", org.json.JSONArray(pins)))
        message = "仓库收藏已同步"; refresh()
    }
    fun seen() = action { requireNotNull(api).call("/api/alerts/seen", "POST", JSONObject()); refresh() }
    fun syncNews() = action { requireNotNull(api).call("/api/news/sync", "POST", JSONObject()); message = "已请求后台同步，采集进程将继续处理" }
    fun credentials(payload: JSONObject, done: () -> Unit) = action { requireNotNull(api).call("/api/credentials", "POST", payload);savedLogin?.let{if(payload.s("new_username").isNotBlank())it.put("username",payload.s("new_username"));if(payload.s("new_password").isNotBlank())it.put("password",payload.s("new_password"))};persistLogin();message = "账号已在服务器更新"; done() }
    fun registerAgent(name: String, done: (JSONObject) -> Unit) = action { val result = requireNotNull(api).call("/api/agents", "POST", JSONObject().put("name", name)); config = requireNotNull(api).call("/api/config"); done(result) }
    fun removeAgent(id: String) = action { requireNotNull(api).call("/api/agents/$id", "DELETE"); config = requireNotNull(api).call("/api/config"); refresh() }
    private fun action(block: suspend () -> Unit) {
        if (busy) return
        busy = true
        viewModelScope.launch { writeLock.withLock { try { block() } catch (e: Exception) { report(e) } finally { busy = false } } }
    }
    override fun onCleared() { api?.forget() }
}
