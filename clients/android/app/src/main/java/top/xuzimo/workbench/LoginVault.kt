package top.xuzimo.workbench

import android.content.Context
import android.security.keystore.KeyGenParameterSpec
import android.security.keystore.KeyProperties
import android.util.AtomicFile
import android.util.Base64
import org.json.JSONObject
import java.io.File
import java.security.KeyStore
import javax.crypto.Cipher
import javax.crypto.KeyGenerator
import javax.crypto.SecretKey
import javax.crypto.spec.GCMParameterSpec

/** Only login material is persisted. Key is non-exportable; file is excluded from backups. */
class LoginVault(context: Context) {
    private val file = AtomicFile(File(context.noBackupFilesDir, "login.aes"))
    private val alias = "workbench.login.v1"
    private val aad = (context.packageName + ":login:v1").toByteArray()
    private fun key(): SecretKey {
        val store = KeyStore.getInstance("AndroidKeyStore").apply { load(null) }
        (store.getKey(alias, null) as? SecretKey)?.let { return it }
        return KeyGenerator.getInstance(KeyProperties.KEY_ALGORITHM_AES, "AndroidKeyStore").apply {
            init(KeyGenParameterSpec.Builder(alias, KeyProperties.PURPOSE_ENCRYPT or KeyProperties.PURPOSE_DECRYPT)
                .setBlockModes(KeyProperties.BLOCK_MODE_GCM).setEncryptionPaddings(KeyProperties.ENCRYPTION_PADDING_NONE)
                .setKeySize(256).setRandomizedEncryptionRequired(true).build())
        }.generateKey()
    }
    @Synchronized fun read(): JSONObject? {
        if (!file.baseFile.exists()&&!File(file.baseFile.path+".bak").exists()) return null
        return try {
            require(file.baseFile.length() <= 32_768)
            val envelope = JSONObject(String(file.readFully(), Charsets.UTF_8))
            val cipher = Cipher.getInstance("AES/GCM/NoPadding")
            cipher.init(Cipher.DECRYPT_MODE, key(), GCMParameterSpec(128, Base64.decode(envelope.getString("iv"), Base64.NO_WRAP)))
            cipher.updateAAD(aad)
            JSONObject(String(cipher.doFinal(Base64.decode(envelope.getString("data"), Base64.NO_WRAP)), Charsets.UTF_8))
        } catch (_: Exception) {
            clear()
            runCatching{KeyStore.getInstance("AndroidKeyStore").apply { load(null); deleteEntry(alias) }}
            null
        }
    }
    @Synchronized fun save(value: JSONObject) {
        val cipher = Cipher.getInstance("AES/GCM/NoPadding")
        cipher.init(Cipher.ENCRYPT_MODE, key()); cipher.updateAAD(aad)
        val encrypted = cipher.doFinal(value.toString().toByteArray(Charsets.UTF_8))
        val envelope = JSONObject().put("v", 1).put("iv", Base64.encodeToString(cipher.iv, Base64.NO_WRAP))
            .put("data", Base64.encodeToString(encrypted, Base64.NO_WRAP)).toString().toByteArray()
        val output = file.startWrite()
        try { output.write(envelope); file.finishWrite(output) } catch (e: Exception) { file.failWrite(output); throw e }
    }
    @Synchronized fun clear() { file.delete() }
}
