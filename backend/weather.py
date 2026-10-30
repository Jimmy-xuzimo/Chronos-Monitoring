"""Configurable Chinese city weather. Data is fetched and cached on the server."""
import datetime as dt
import json,math,re,urllib.request,urllib.parse
from zoneinfo import ZoneInfo
from net import SourceError
from store import put_cache

def location(cfg):return cfg.get('weather_location',{'station_id':'58238','name':'南京'})
def key(cfg):return 'weather:'+location(cfg)['station_id']
def page(station):return 'https://weather.cma.cn/web/weather/'+station+'.html'

def read_json(path):
    class NoRedirect(urllib.request.HTTPRedirectHandler):
        def redirect_request(self,*args,**kwargs):return None
    request=urllib.request.Request('https://weather.cma.cn'+path,headers={'User-Agent':'Mozilla/5.0','Referer':'https://weather.cma.cn/','Accept':'application/json'})
    with urllib.request.build_opener(NoRedirect).open(request,timeout=8) as response:
        if response.status!=200:raise SourceError(f'气象数据源返回 HTTP {response.status}')
        body=response.read(256*1024+1)
    if len(body)>256*1024:raise SourceError('气象数据源响应过大')
    return json.loads(body)

def search_locations(query):
    query=str(query).strip()
    if not 1<=len(query)<=40:raise ValueError('请输入 1—40 字的城市或区县名称')
    payload=read_json('/api/autocomplete?q='+urllib.parse.quote(query))
    if payload.get('code')!=0:raise SourceError('城市检索暂时不可用')
    rows=[];seen=set()
    for raw in payload.get('data',[]):
        parts=str(raw).split('|')
        if len(parts)>=4 and re.fullmatch('[0-9]{5}',parts[0]) and parts[3]=='中国' and query.lower() in (parts[1]+parts[2]).lower() and parts[0] not in seen:
            seen.add(parts[0]);rows.append({'station_id':parts[0],'name':parts[1]})
    return rows[:20]

def fetch_payload(station_id='58238'):
    if not re.fullmatch('[0-9]{5}',station_id):raise SourceError('气象站点无效')
    return read_json('/api/weather/view?stationid='+station_id)

def normalize(payload,now=None,station_id='58238',city='南京'):
    if payload.get('code')!=0:raise SourceError('气象数据源暂时不可用')
    data=payload['data'];loc=data['location']
    if str(loc['id'])!=station_id:raise SourceError('气象站点不匹配')
    if loc.get('path') and not str(loc['path']).startswith('中国'):raise SourceError('仅支持中国城市气象站')
    zone=ZoneInfo('Asia/Shanghai');now=now or dt.datetime.now(zone)
    observed=dt.datetime.strptime(data['lastUpdate'],'%Y/%m/%d %H:%M').replace(tzinfo=zone)
    if (now-observed).total_seconds()>7200 or (observed-now).total_seconds()>1200:raise SourceError('气象站实况已过期，保留上次结果')
    def number(value,low,high):
        try:n=float(value)
        except (ValueError,TypeError):return None
        return n if math.isfinite(n) and low<=n<=high else None
    current=data['now'];temperature=number(current.get('temperature'),-80,65)
    if temperature is None:raise SourceError('气象站温度读数无效')
    daily=data.get('daily',[]);today=next((d for d in daily if d.get('date')==now.strftime('%Y/%m/%d')),{})
    period='day' if 6<=now.hour<18 else 'night'
    return dict(city=str(loc.get('name') or city),location_path=str(loc.get('path','')),station_id=station_id,temperature=temperature,feels_like=number(current.get('feelst'),-100,80),humidity=number(current.get('humidity'),0,100),wind_direction=str(current.get('windDirection',''))[:30],wind_speed=number(current.get('windSpeed'),0,150),high=number(today.get('high'),-80,65),low=number(today.get('low'),-80,65),condition=str(today.get(period+'Text',''))[:30],condition_period='今日' if period=='day' else '今晚',condition_kind='forecast',condition_code=today.get(period+'Code'),observed_at=observed.isoformat(),source='中国气象局',source_url=page(station_id),forecast=[dict(date=d.get('date'),high=number(d.get('high'),-80,65),low=number(d.get('low'),-80,65),day=d.get('dayText'),night=d.get('nightText')) for d in daily[:7]])

def weather(cfg):
    selected=location(cfg)
    try:put_cache(key(cfg),normalize(fetch_payload(selected['station_id']),station_id=selected['station_id'],city=selected['name']))
    except Exception:
        put_cache(key(cfg),error='天气同步失败，保留该地点的上次结果')
        raise
