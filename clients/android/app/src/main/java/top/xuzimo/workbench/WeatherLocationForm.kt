package top.xuzimo.workbench

import androidx.compose.foundation.clickable
import androidx.compose.foundation.layout.*
import androidx.compose.material.icons.Icons
import androidx.compose.material.icons.outlined.*
import androidx.compose.material3.*
import androidx.compose.runtime.*
import androidx.compose.ui.*
import androidx.compose.ui.text.font.FontWeight
import androidx.compose.ui.unit.*
import org.json.JSONObject

@Composable fun WeatherLocationForm(model:WorkspaceModel){
    val saved=model.config.obj("weather_location")
    var query by remember(saved.toString()){mutableStateOf(saved.s("name","南京"))}
    var selected by remember(saved.toString()){mutableStateOf(saved)}
    GlassCard {
        Text("天气地点",fontWeight=FontWeight.Bold,fontSize=18.sp)
        Caption("当前：${saved.s("name","南京")} · 气象站 ${saved.s("station_id","58238")}")
        Field("搜索中国城市或区县",query,{query=it})
        OutlinedButton({model.searchWeather(query)},enabled=!model.weatherSearching&&query.isNotBlank()&&query.length<=40){Icon(Icons.Outlined.Search,null,Modifier.size(17.dp));Spacer(Modifier.width(4.dp));Text("检索地点")}
        if(model.weatherSearching)LinearProgressIndicator(Modifier.fillMaxWidth())
        model.weatherLocations.forEach{row->Row(Modifier.fillMaxWidth().clickable{selected=row}.padding(vertical=13.dp),verticalAlignment=Alignment.CenterVertically){Icon(Icons.Outlined.LocationOn,null,tint=LocalGlass.current.accent);Column(Modifier.weight(1f).padding(start=10.dp)){Text(row.s("name"),fontWeight=FontWeight.SemiBold);Caption("中国气象局 · ${row.s("station_id")}")};if(selected.s("station_id")==row.s("station_id"))Icon(Icons.Outlined.Check,null,tint=LocalGlass.current.accent)}}
        if(model.weatherLocations.isEmpty()&&!model.weatherSearching)Caption("输入名称并检索后，从结果中选择地点。")
        Caption("待保存：${selected.s("name","南京")} · ${selected.s("station_id","58238")}")
        Button({model.save(JSONObject().put("weather_location",JSONObject().put("name",selected.s("name")).put("station_id",selected.s("station_id"))))},enabled=!model.busy&&selected.s("station_id").isNotBlank(),modifier=Modifier.fillMaxWidth()){Text("保存天气地点")}
        Caption("地点保存在服务器。后台统一更新天气，更换城市时不会显示上一个城市的缓存；不申请手机定位权限。")
    }
}
