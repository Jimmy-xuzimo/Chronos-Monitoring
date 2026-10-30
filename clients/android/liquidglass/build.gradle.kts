plugins { id("com.android.library") }
android {
    namespace="com.qmdeve.liquidglass"
    compileSdk=37
    defaultConfig { minSdk=24 }
    compileOptions { sourceCompatibility=JavaVersion.VERSION_21;targetCompatibility=JavaVersion.VERSION_21 }
}
dependencies {
    implementation("androidx.annotation:annotation:1.9.1")
    implementation("androidx.dynamicanimation:dynamicanimation:1.1.0")
    compileOnly("org.jetbrains:annotations:26.0.2")
}
