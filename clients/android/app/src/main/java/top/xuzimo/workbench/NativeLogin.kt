package top.xuzimo.workbench

import androidx.compose.foundation.*
import androidx.compose.foundation.layout.*
import androidx.compose.foundation.text.KeyboardActions
import androidx.compose.foundation.text.KeyboardOptions
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.platform.testTag
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.text.input.*
import androidx.compose.ui.unit.*

@Composable fun Login(model:WorkspaceModel) {
    var address by remember { mutableStateOf(model.loginAddress) };var user by remember{mutableStateOf(model.loginUser)};var password by remember{mutableStateOf("")};var visible by remember{mutableStateOf(false)}
    val keyboard=androidx.compose.ui.platform.LocalSoftwareKeyboardController.current
    val submit={if(!model.busy && user.isNotBlank() && password.isNotBlank()){keyboard?.hide();model.login(address,user.trim(),password);password=""}}
    BoxWithConstraints(Modifier.fillMaxSize().safeDrawingPadding().imePadding()) {
        Column(Modifier.fillMaxSize().verticalScroll(rememberScrollState()).padding(horizontal=if(maxWidth<400.dp)20.dp else 32.dp,vertical=24.dp),horizontalAlignment=Alignment.CenterHorizontally,verticalArrangement=Arrangement.Center) {
            Column(Modifier.widthIn(max=440.dp).fillMaxWidth(),horizontalAlignment=Alignment.Start) {
                Logo(52.dp);Spacer(Modifier.height(20.dp));Text("我的工作台",fontSize=32.sp,fontWeight=FontWeight.Bold);Caption("让日程、设备与灵感，有处安放。",Modifier.padding(top=5.dp,bottom=26.dp))
                GlassCard(inset=24.dp,radius=30.dp) {
                    Text("连接工作台",fontSize=18.sp,fontWeight=FontWeight.Bold);Spacer(Modifier.height(5.dp))
                    OutlinedTextField(address,{address=it},Modifier.fillMaxWidth().testTag("login-server"),label={Text("服务器")},singleLine=true,enabled=!model.busy,shape=Rounded)
                    OutlinedTextField(user,{user=it},Modifier.fillMaxWidth().testTag("login-user"),label={Text("账号")},singleLine=true,enabled=!model.busy,shape=Rounded)
                    OutlinedTextField(password,{password=it},Modifier.fillMaxWidth().testTag("login-password"),label={Text("密码")},singleLine=true,enabled=!model.busy,shape=Rounded,visualTransformation=if(visible)VisualTransformation.None else PasswordVisualTransformation(),keyboardOptions=KeyboardOptions(imeAction=ImeAction.Done,keyboardType=KeyboardType.Password),keyboardActions=KeyboardActions(onDone={submit()}),trailingIcon={IconButton({visible=!visible}){Icon(if(visible)Icons.Outlined.VisibilityOff else Icons.Outlined.Visibility,"显示或隐藏密码")}})
                    if(model.error.isNotBlank())Text(model.error,color=MaterialTheme.colorScheme.error,fontSize=12.sp)
                    Button(submit,Modifier.fillMaxWidth().padding(top=12.dp).height(54.dp).testTag("login-submit"),enabled=!model.busy && user.isNotBlank() && password.isNotBlank(),shape=Rounded){if(model.busy)CircularProgressIndicator(Modifier.size(20.dp),strokeWidth=2.dp)else Text("连接我的工作台")}
                    if(model.savedLoginAvailable)TextButton({model.restoreLogin()},Modifier.fillMaxWidth()){Text("重试自动登录")}
                }
                Caption("登录凭据在本机加密保存，下次自动登录。课表、监控和设置保存在服务器。",Modifier.padding(top=18.dp,start=4.dp,end=4.dp))
            }
        }
    }
}
