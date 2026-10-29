import datetime as dt
import json
import os
import secrets
import threading
import time
from functools import wraps
from pathlib import Path
from zoneinfo import ZoneInfo,ZoneInfoNotFoundError
from flask import Flask,jsonify,request,session,send_from_directory
from werkzeug.middleware.proxy_fix import ProxyFix
from settings import load,save,public,update,verify_password,hash_password
from store import cache,db,alerts
from nodes import list_nodes,authenticate_agent,validate_report,receive

app=Flask(__name__,static_folder=None)
app.secret_key=load()['secret_key']
app.config.update(SESSION_COOKIE_HTTPONLY=True,SESSION_COOKIE_SAMESITE='Lax',SESSION_COOKIE_SECURE=os.environ.get('PANEL_COOKIE_SECURE','1')=='1',PERMANENT_SESSION_LIFETIME=dt.timedelta(days=7),MAX_CONTENT_LENGTH=256*1024)
app.wsgi_app=ProxyFix(app.wsgi_app,x_for=1,x_proto=1)
failures={};lock=threading.Lock()

def authenticated(fn):
    @wraps(fn)
    def wrapper(*args,**kwargs):
        cfg=load()
        if session.get('user')!=cfg['username'] or session.get('version',0)!=cfg.get('auth_version',0):
            return jsonify(error='unauthorized'),401
        return fn(*args,**kwargs)
    return wrapper

@app.before_request
def csrf():
    if request.path.startswith('/api/') and request.path!='/api/agent/report' and request.method in ['POST','PUT','DELETE','PATCH']:
        token=session.get('csrf')
        if not token or not secrets.compare_digest(token,request.headers.get('X-CSRF-Token','')):return jsonify(error='csrf',message='会话已更新，请刷新后重试'),403

@app.after_request
def headers(response):
    if request.path.startswith('/api/'):response.headers['Cache-Control']='no-store'
    response.headers['X-Content-Type-Options']='nosniff'
    response.headers['Referrer-Policy']='same-origin'
    return response

@app.get('/api/session')
def api_session():
    session.setdefault('csrf',secrets.token_urlsafe(32))
    cfg=load();ok=session.get('user')==cfg['username'] and session.get('version',0)==cfg.get('auth_version',0)
    return jsonify(authenticated=ok,username=session.get('user') if ok else None,csrf=session['csrf'])

@app.post('/api/login')
def login():
    ip=request.remote_addr;now=time.time()
    with lock:
        if len(failures)>5000:
            for key in list(failures):
                if not failures[key] or now-failures[key][-1]>60:failures.pop(key,None)
        attempts=failures.setdefault(ip,[]);attempts[:]=[x for x in attempts if now-x<60]
        if len(attempts)>=5:return jsonify(message='尝试次数过多，请一分钟后再试'),429
    data=request.get_json(silent=True) or {};cfg=load()
    if data.get('username')!=cfg['username'] or not verify_password(data.get('password',''),cfg['password']):
        with lock:failures.setdefault(ip,[]).append(now)
        return jsonify(message='账号或密码错误'),401
    session.clear();session.permanent=True;session.update(user=cfg['username'],version=cfg.get('auth_version',0),csrf=secrets.token_urlsafe(32))
    with lock:failures.pop(ip,None)
    return jsonify(ok=True,csrf=session['csrf'],username=cfg['username'])

@app.post('/api/logout')
def logout():session.clear();return jsonify(ok=True)

@app.post('/api/credentials')
@authenticated
def credentials():
    data=request.get_json() or {};cfg=load()
    if not verify_password(data.get('current_password',''),cfg['password']):return jsonify(message='当前密码错误'),400
    username=str(data.get('new_username') or cfg['username']).strip();password=data.get('new_password','')
    if not username or len(username)>80:return jsonify(message='账号无效'),400
    if password and len(password)<10:return jsonify(message='新密码至少 10 位'),400
    cfg['username']=username
    if password:cfg['password']=hash_password(password)
    cfg['auth_version']=cfg.get('auth_version',0)+1;save(cfg);session.update(user=username,version=cfg['auth_version'])
    return jsonify(ok=True)

def source(key,max_age):
    data=cache(key)
    if data['updated'] and time.time()-data['updated']>max_age:
        data['status']='stale';data['error']=data['error'] or '数据已过期，等待后台同步'
    return data

def calendar_data():
    cfg=load();events=[];sources=[]
    for cal in cfg['calendars']:
        s=source('calendar:'+cal['id'],2100)
        sources.append({'id':cal['id'],'name':cal['name'],'color':cal['color'],**{k:v for k,v in s.items() if k!='data'}})
        if s['data']:events.extend(s['data']['events'])
    return {'events':sorted(events,key=lambda e:e['start']),'sources':sources,'timezone':cfg['timezone'],'semester_start':cfg['semester_start'],'semester_weeks':cfg['semester_weeks']}

def service_data():
    cfg=load();items=[]
    for service in cfg['services']:
        s=source('service:'+service['id'],1320)
        items.append({'id':service['id'],'name':service['name'],'url':service['url'],**s})
    return {'items':items,'probe_location':'服务器探测'}

@app.get('/api/overview')
@authenticated
def overview():
    cfg=load()
    node=request.args.get('node','server')
    if node!='server' and node not in [a['id'] for a in cfg.get('agents',[])]:return jsonify(message='节点不存在'),404
    selected=source('stats' if node=='server' else 'node:'+node,35 if node=='server' else 45)
    return jsonify(stats=selected,collector=source('collector',35),node_id=node,nodes=list_nodes(cfg),calendar=calendar_data(),services=service_data(),github=source('github',2100),news=source('news',100000),alerts=alerts(),entries=cfg['entries'],timezone=cfg['timezone'],server_time=time.time())

@app.get('/api/stats')
@authenticated
def stats():
    node=request.args.get('node','server')
    if node!='server' and node not in [a['id'] for a in load().get('agents',[])]:return jsonify(message='节点不存在'),404
    s=source('stats' if node=='server' else 'node:'+node,35 if node=='server' else 45)
    if not s['data']:return jsonify(error='collect_pending',source=s),503
    return jsonify(**s['data'],source={k:v for k,v in s.items() if k!='data'})

@app.get('/api/calendar')
@authenticated
def calendar():return jsonify(calendar_data())

@app.get('/api/services')
@authenticated
def service_list():return jsonify(service_data())

@app.get('/api/github')
@authenticated
def github():return jsonify(source('github',2100))

@app.get('/api/news')
@authenticated
def news():
    day=request.args.get('date')
    if not day:return jsonify(source('news',100000))
    with db() as c:
        row=c.execute('SELECT * FROM news_editions WHERE day=?',(day,)).fetchone()
        dates=[r['day'] for r in c.execute('SELECT day FROM news_editions ORDER BY day DESC')]
    if not row:return jsonify(message='未找到该日资讯'),404
    data=json.loads(row['data']);data['dates']=dates
    return jsonify(data=data,status='ok',updated=row['updated'],attempted=row['updated'],error=None)

@app.post('/api/news/sync')
@authenticated
def sync_news():
    from store import put_cache
    put_cache('news-request',True)
    return jsonify(ok=True)

@app.get('/api/history')
@authenticated
def history():
    hours={'1h':1,'24h':24,'7d':168,'30d':720}.get(request.args.get('range'),24)
    table='samples' if hours==1 else 'minutes'
    node=request.args.get('node','server')
    with db() as c:
        if node=='server':rows=c.execute(f'SELECT * FROM {table} WHERE ts>=? ORDER BY ts',(time.time()-hours*3600,)).fetchall()
        elif node in [a['id'] for a in load().get('agents',[])]:rows=c.execute(f'SELECT * FROM node_{table} WHERE node=? AND ts>=? ORDER BY ts',(node,time.time()-hours*3600)).fetchall()
        else:return jsonify(message='节点不存在'),404
    # Average buckets, instead of simply dropping samples, for long views.
    buckets={};width=max(10 if hours==1 else 60,int(hours*3600/360))
    for row in rows:
        key=row['ts']//width*width;buckets.setdefault(key,[]).append(json.loads(row['data']))
    points=[{'ts':key,**{k:sum(x[k] for x in values)/len(values) for k in values[0]}} for key,values in buckets.items()]
    return jsonify(points=points,range=request.args.get('range','24h'),resolution_seconds=width,source=source('collector',35))

@app.get('/api/nodes')
@authenticated
def nodes():return jsonify(items=list_nodes(load()))

@app.post('/api/agents')
@authenticated
def add_agent():
    import hashlib
    cfg=load()
    if len(cfg.get('agents',[]))>=10:return jsonify(message='最多 10 个采集节点'),400
    name=str((request.get_json() or {}).get('name','新设备'))[:80]
    token=secrets.token_urlsafe(32);id=secrets.token_hex(6)
    cfg.setdefault('agents',[]).append({'id':id,'name':name,'created':time.time(),'token_hash':hashlib.sha256(token.encode()).hexdigest()})
    save(cfg);return jsonify(id=id,token=token,name=name),201

@app.delete('/api/agents/<id>')
@authenticated
def remove_agent(id):
    cfg=load();cfg['agents']=[a for a in cfg.get('agents',[]) if a['id']!=id];save(cfg)
    from store import alert
    alert('node-offline:'+id,'',active=False)
    for key in ['cpu','mem','disk']:alert('resource:'+id+':'+key,'',active=False)
    return jsonify(ok=True)

@app.post('/api/agent/report')
def agent_report():
    agent=authenticate_agent(request.headers.get('Authorization','').removeprefix('Bearer '),load())
    if not agent:return jsonify(error='invalid_agent'),401
    old=cache('node:'+agent['id'])
    if old['updated'] and time.time()-old['updated']<5:return jsonify(error='too_frequent'),429
    try:data=validate_report(request.get_json() or {})
    except (KeyError,TypeError,ValueError,AttributeError):return jsonify(error='invalid_report'),400
    data['system']['public_ip']=request.remote_addr
    receive(agent,data);return jsonify(ok=True,received_at=time.time())

@app.get('/api/services/<id>/history')
@authenticated
def service_history(id):
    with db() as c:
        rows=[dict(r) for r in c.execute('SELECT * FROM checks WHERE service=? AND ts>? ORDER BY ts DESC LIMIT 1440',(id,time.time()-86400))]
        summary=c.execute("SELECT COUNT(*) n, SUM(status='up') good FROM checks WHERE service=? AND ts>?",(id,time.time()-86400)).fetchone()
    return jsonify(checks=rows,availability=round(100*summary['good']/summary['n'],2) if summary['n'] else None)

@app.get('/api/alerts')
@authenticated
def notifications():return jsonify(items=alerts())

@app.post('/api/alerts/seen')
@authenticated
def seen():
    with db() as c:c.execute('UPDATE alerts SET seen=1')
    return jsonify(ok=True)

@app.get('/api/config')
@authenticated
def config_get():return jsonify(public(load()))

@app.put('/api/config')
@authenticated
def config_put():
    try:return jsonify(update(request.get_json() or {}))
    except (ValueError,TypeError,KeyError,ZoneInfoNotFoundError):return jsonify(message='配置无效，请检查地址、时区、状态码和必填字段'),400

DIST=Path(os.environ.get('PANEL_DIST',Path(__file__).parent.parent/'frontend/dist')).resolve()
@app.get('/')
@app.get('/<path:path>')
def static(path='index.html'):
    if path.startswith('api/'):return jsonify(error='not_found'),404
    if path in ['login.html','settings.html']:path='index.html'
    if not (DIST/path).is_file():return send_from_directory(DIST,'index.html')
    return send_from_directory(DIST,path)

if __name__=='__main__':app.run(host='127.0.0.1',port=int(os.environ.get('PORT','5000')))
