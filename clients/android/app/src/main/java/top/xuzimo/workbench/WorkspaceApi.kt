package top.xuzimo.workbench

import java.net.HttpURLConnection
import java.net.URI
import java.net.URL
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.sync.Mutex
import kotlinx.coroutines.sync.withLock
import kotlinx.coroutines.withContext
import org.json.JSONArray
import org.json.JSONObject

class ApiFailure(val code: Int, message: String) : Exception(message)

/** HTTPS, platform certificate validation, no redirects or disk cache; cookies live in RAM. */
class WorkspaceApi(address: String) {
    val origin = normalize(address)
    private var sessionCookie = ""
    private var csrf = ""
    private val mutex = Mutex()

    companion object {
        fun normalize(value: String): String {
            val uri = try { URI(value.trim()) } catch (_: Exception) { throw IllegalArgumentException("服务器地址格式不正确") }
            val debugLoopback = BuildConfig.DEBUG && uri.scheme == "http" && uri.host in listOf("10.0.2.2", "127.0.0.1", "localhost")
            require((uri.scheme == "https" || debugLoopback) && !uri.host.isNullOrBlank() && uri.userInfo == null && uri.query == null && uri.fragment == null && uri.path.orEmpty() in listOf("", "/")) { "请输入 HTTPS 服务器域名，不包含路径、账号或参数" }
            return uri.toASCIIString().trimEnd('/')
        }
    }

    suspend fun call(path: String, method: String = "GET", payload: JSONObject? = null): JSONObject = mutex.withLock {
        withContext(Dispatchers.IO) {
            require(path.startsWith("/api/") && !path.contains(".."))
            val connection = URL(origin + path).openConnection() as HttpURLConnection
            try {
                connection.requestMethod = method
                connection.instanceFollowRedirects = false
                connection.useCaches = false
                connection.connectTimeout = 12_000
                connection.readTimeout = 18_000
                connection.setRequestProperty("Accept", "application/json")
                connection.setRequestProperty("Cache-Control", "no-store")
                if (sessionCookie.isNotEmpty()) connection.setRequestProperty("Cookie", sessionCookie)
                if (method != "GET") connection.setRequestProperty("X-CSRF-Token", csrf)
                if (payload != null) {
                    connection.doOutput = true
                    connection.setRequestProperty("Content-Type", "application/json; charset=utf-8")
                    connection.outputStream.use { it.write(payload.toString().toByteArray(Charsets.UTF_8)) }
                }
                val status = connection.responseCode
                connection.headerFields.entries.filter { it.key?.equals("Set-Cookie", true) == true }.flatMap { it.value }.forEach {
                    if (it.startsWith("session=")) sessionCookie = it.substringBefore(';')
                }
                val input = if (status in 200..299) connection.inputStream else connection.errorStream
                val bytes = input?.use { stream ->
                    val output = java.io.ByteArrayOutputStream()
                    val buffer = ByteArray(8192)
                    while (output.size() <= 4 * 1024 * 1024) {
                        val count = stream.read(buffer)
                        if (count < 0) break
                        output.write(buffer, 0, count)
                    }
                    output.toByteArray()
                } ?: byteArrayOf()
                if (bytes.size > 4 * 1024 * 1024) throw ApiFailure(status, "响应过大，请在服务器缩小数据范围")
                val body = try { JSONObject(String(bytes, Charsets.UTF_8)) } catch (_: Exception) { throw ApiFailure(status, "服务器返回格式异常（HTTP $status）") }
                if (status !in 200..299) throw ApiFailure(status, body.s("message").ifBlank { if (status == 401) "登录已过期，请重新登录" else "请求失败（HTTP $status）" })
                if (body.has("csrf")) csrf = body.s("csrf")
                body
            } finally { connection.disconnect() }
        }
    }
    fun forget() { sessionCookie = ""; csrf = "" }
    fun savedSession() = JSONObject().put("cookie",sessionCookie).put("csrf",csrf)
    fun restoreSession(value:JSONObject){sessionCookie=value.s("cookie");csrf=value.s("csrf")}
}

fun JSONObject.s(key: String, fallback: String = ""): String = if (isNull(key)) fallback else optString(key, fallback)
fun JSONObject.obj(key: String) = optJSONObject(key) ?: JSONObject()
fun JSONObject.rows(key: String): List<JSONObject> = optJSONArray(key)?.objects() ?: emptyList()
fun JSONObject.strings(key: String): List<String> = optJSONArray(key)?.let { a -> (0 until a.length()).map { a.optString(it) } } ?: emptyList()
fun JSONArray.objects(): List<JSONObject> = (0 until length()).mapNotNull { optJSONObject(it) }
fun jsonList(items: List<JSONObject>) = JSONArray(items.map { JSONObject(it.toString()) })
