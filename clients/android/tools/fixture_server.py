"""Isolated, fictitious server for Android instrumentation. Never point at production data.
Usage: python fixture_server.py --backend /path/to/Chronos-Monitoring/backend --data /tmp/android-fixture
"""
import argparse, datetime as dt, hashlib, json, math, os, sys, threading, time
from pathlib import Path

parser=argparse.ArgumentParser();parser.add_argument('--backend',required=True);parser.add_argument('--data',required=True);args=parser.parse_args()
data_path=Path(args.data).resolve()
assert data_path.name.startswith('android-fixture'), 'Use a separate android-fixture* directory'
os.environ.update(PANEL_DATA=str(data_path),PANEL_INITIAL_PASSWORD='fixture-only-password',PANEL_COOKIE_SECURE='0')
sys.path.insert(0,str(Path(args.backend).resolve()))
from settings import load,save,hash_password
from store import put_cache,db,alert,cache
from app import app
import app as app_module
original_nodes=app_module.list_nodes
def fixture_nodes(config):
    rows=original_nodes(config)
    rows[0].update(name='云服务器 · Demo',kind='server')
    return rows
app_module.list_nodes=fixture_nodes

now=int(time.time());today=dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).date()
cfg=load();cfg.update(username='demo',password=hash_password('fixture-only-password'),github_user='octocat',news_url='https://news.example.com',calendars=[dict(id='demo',name='演示课表',url='https://calendar.example.com/demo.ics',color='#3974f6')],services=[dict(id='site',name='示例服务',url='https://example.com',expected=[200,302])],entries=[dict(id='portfolio',name='作品集',url='https://example.com/portfolio',group='个人网站',pinned=True),dict(id='nas',name='飞牛 · FRP',url='https://nas.example.com',group='自托管服务',pinned=True),dict(id='nas-lan',name='飞牛 · 内网',url='http://192.168.1.5:5666',group='自托管服务',pinned=False)],agents=[dict(id='desktop',name='本地电脑 · Demo',created=now,token_hash=hashlib.sha256(b'fixture-token').hexdigest())])
save(cfg)
cfg['android_appearance']={'style':'ocean','theme':'light'};cfg['weather_location']={'station_id':'58238','name':'南京'};save(cfg)
import weather as fixture_weather
fixture_weather.search_locations=lambda q:[{'station_id':i,'name':n} for i,n in [('58238','南京'),('54511','北京')] if q.lower() in n.lower()]
events=[]
for offset,title,hour,room in [(0,'交互设计',9,'设计楼 A302'),(0,'数字媒体技术',14,'实验楼 B206'),(1,'信息可视化',10,'教学楼 C408'),(3,'创意工作坊',15,'创作中心 201')]:
    day=today+dt.timedelta(days=offset);start=f'{day}T{hour:02}:00:00+08:00';end=f'{day}T{hour+1:02}:30:00+08:00'
    events.append(dict(id=f'event-{offset}-{hour}',uid=f'demo-{offset}-{hour}',calendar_id='demo',calendar='演示课表',color='#3974f6',title=title,start=start,end=end,date=str(day),all_day=False,untimed=False,location=room,description='仅用于客户端布局验收的虚构课程。',teacher='示例教师',periods='3—4',week=9,warning=''))
put_cache('calendar:demo',dict(events=events))
put_cache('weather',dict(city='南京',station_id='58238',temperature=17.2,feels_like=18.0,humidity=72,wind_direction='东北风',wind_speed=2.1,high=23,low=15,condition='多云',condition_period='今晚',condition_kind='forecast',condition_code=1,observed_at=dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).isoformat(),source='演示气象数据',source_url='https://weather.cma.cn/web/weather/58238.html',forecast=[dict(date=str(today+dt.timedelta(days=i)),high=23+i,low=15+i,day='多云',night='晴') for i in range(5)]))
repos=[dict(name='example-workspace',full_name='octocat/example-workspace',html_url='https://github.com/octocat',description='A calm place for everything you build.',language='TypeScript',stargazers_count=128,open_issues_count=3,pushed_at=dt.datetime.now(dt.timezone.utc).isoformat())]
put_cache('github',dict(user='octocat',repos=repos,prs=[dict(id=1,number=24,title='优化工作台信息布局',repo='octocat/example-workspace',url='https://github.com/octocat',state='open',ci='success',review='approved',updated_at=str(today)),dict(id=2,number=19,title='设备曲线支持新的时间范围',repo='octocat/example-workspace',url='https://github.com/octocat',state='merged',ci='success',review='approved',updated_at=str(today))],releases={'octocat/example-workspace':dict(tag_name='v1.0.0',html_url='https://github.com/octocat',published_at=str(today))}))
dates=[str(today),str(today-dt.timedelta(days=1))]
for day in dates:
    news=dict(date=day,dates=dates,source='https://news.example.com',items=[dict(title='开发者工具更新：更顺畅的创作流程',category='开发工具',source='示例日报',url='https://example.com/article/1',published=day),dict(title='多模态研究的新进展与开放评测',category='研究前沿',source='示例研究',url='https://example.com/article/2',published=day)])
    with db() as c:c.execute('INSERT OR REPLACE INTO news_editions VALUES(?,?,?)',(day,json.dumps(news,ensure_ascii=False),time.time()))
    if day==dates[0]:put_cache('news',news)
service=dict(id='site',name='示例服务',url='https://example.com',status='up',code=200,ms=68,failed=0,recovered=4,error=None,cert_expires=now+80*86400,cert_checked=now,cert_error=None)
put_cache('service:site',service)
with db() as c:
    for i in range(100):c.execute('INSERT INTO checks(service,ts,status,code,ms) VALUES(?,?,?,?,?)',('site',now-i*600,'down' if i in [7,8,9] else 'up',503 if i in [7,8,9] else 200,68+i))
    for i in range(1440):
        ts=(now//60-i)*60;p=dict(cpu=18+math.sin(i/13)*9,mem=43+math.sin(i/50)*4,tx=2500+max(0,math.sin(i/17))*12000,rx=12000+max(0,math.sin(i/7))*100000,disk=32,read=1200,write=1000+max(0,math.sin(i/9))*20000)
        c.execute('INSERT OR REPLACE INTO minutes VALUES(?,?)',(ts,json.dumps(p)));c.execute('INSERT OR REPLACE INTO samples VALUES(?,?)',(ts,json.dumps(p)))
        c.execute('INSERT OR REPLACE INTO node_minutes VALUES(?,?,?,?)',('desktop',ts,json.dumps({**p,'cpu':p['cpu']+8,'mem':54}),1));c.execute('INSERT OR REPLACE INTO node_samples VALUES(?,?,?)',('desktop',ts,json.dumps(p)))
alert('demo-reminder','示例提醒：测试服务曾短暂异常','仅为验收数据，当前已恢复',active=True)
alert('demo-reminder','',active=False)
def sample():
    selected=load().get('weather_location',{'station_id':'58238','name':'南京'})
    weather_data=cache('weather')['data']
    if weather_data:
        weather_data.update(city=selected['name'],station_id=selected['station_id'],observed_at=dt.datetime.now(dt.timezone(dt.timedelta(hours=8))).isoformat());put_cache('weather:'+selected['station_id'],weather_data)
    for node,cores,memory,cpu in [('stats',2,2*1024**3,18.4),('node:desktop',24,64*1024**3,27.6)]:
        data=dict(cpu=dict(total=cpu,percpu=[round(cpu+math.sin(i)*7,1) for i in range(cores)]),mem=dict(percent=43.2,used=memory*.432,total=memory,available=memory*.568),swap=dict(percent=0,used=0,total=1024**3),net=dict(tx=8400,rx=64200,total_tx=12*1024**3,total_rx=25*1024**3,conns=dict(est=32,lsn=9),ifaces=[dict(name='Ethernet',addresses=['192.0.2.10'],tx=8400,rx=64200,total_tx=12*1024**3,total_rx=25*1024**3)]),disks=[dict(mount='/' if cores==2 else 'C:',device='Example SSD',percent=32,used=32*1024**3,total=100*1024**3,io=dict(r=2048,w=4096))],system=dict(os='Linux' if cores==2 else 'Windows 11',cpu_model='Example CPU',hostname='demo-node',kernel='demo',uptime=864000,load=[.3,.4,.2],cpu_cores=cores,procs=64,public_ip='192.0.2.10'),processes=[dict(pid=100,name='example-service',cpu=3.2,memory=256*1024**2)],sampled_at=time.time())
        put_cache(node,data)
    put_cache('collector',dict(running=True))
def tick():
    while True:sample();time.sleep(10)
sample();threading.Thread(target=tick,daemon=True).start()
@app.post('/api/fixture/control')
@app_module.authenticated
def control():
    from flask import request,jsonify
    action=request.get_json()['action']
    if action=='stale':put_cache('calendar:demo',error='模拟订阅暂时不可用')
    elif action=='recover':put_cache('calendar:demo',dict(events=events))
    elif action=='expire':
        current=load();current['auth_version']=current.get('auth_version',0)+1;save(current)
    return jsonify(ok=True)
app.run(host='127.0.0.1',port=5093,threaded=True)
