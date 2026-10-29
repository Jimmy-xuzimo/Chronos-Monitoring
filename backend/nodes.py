"""Agent reports are authenticated, bounded data ingestion; never remote commands."""
import hashlib
import hmac
import math
import time
import json
from store import cache,put_cache,db,alert

def authenticate_agent(token,cfg):
    if len(token)>300:return None
    digest=hashlib.sha256(token.encode()).hexdigest()
    return next((a for a in cfg.get('agents',[]) if hmac.compare_digest(a['token_hash'],digest)),None)

def validate_report(raw):
    def num(value,limit=10**18):
        if type(value) not in (int,float) or not math.isfinite(value) or not 0<=value<=limit:raise ValueError('invalid metric')
        return value
    def text(value):return str(value or '')[:300]
    def memory(d):return {k:num(d[k],100 if k=='percent' else 10**18) for k in ['percent','used','total']}
    cpu={'total':num(raw['cpu']['total'],100),'percpu':[num(n,100) for n in raw['cpu']['percpu'][:256]]}
    mem=memory(raw['mem']);mem['available']=num(raw['mem']['available'])
    net={k:num(raw['net'][k]) for k in ['tx','rx','total_tx','total_rx']}
    net['ifaces']=[{'name':text(n['name']),'addresses':[text(a) for a in n.get('addresses',[])[:20]],**{k:num(n[k]) for k in ['tx','rx','total_tx','total_rx']}} for n in raw['net'].get('ifaces',[])[:30]]
    net['conns']={k:None if raw['net'].get('conns',{}).get(k) is None else num(raw['net']['conns'][k]) for k in ['est','lsn']}
    disks=[{k:text(d[k]) for k in ['mount','device']}|{k:num(d[k],100 if k=='percent' else 10**18) for k in ['percent','used','total']}|{'io':{k:num(d['io'][k]) for k in ['r','w']}} for d in raw.get('disks',[])[:40]]
    system={k:text(raw['system'].get(k)) for k in ['os','cpu_model','hostname','kernel','boot_time','server_time','public_ip']}
    system.update({k:num(raw['system'].get(k,0)) for k in ['uptime','procs','cpu_cores']})
    system['load']=[num(n) for n in raw['system'].get('load',[])[:3]]
    processes=[{'pid':num(p['pid']),'name':text(p['name']),'cpu':num(p['cpu'],100000),'memory':num(p['memory'])} for p in raw.get('processes',[])[:12]]
    return dict(cpu=cpu,mem=mem,swap=memory(raw['swap']),net=net,disks=disks,system=system,processes=processes,sampled_at=time.time())

def receive(agent,data):
    node=agent['id'];now=int(time.time())
    put_cache('node:'+node,data);alert('node-offline:'+node,'',active=False)
    point={'cpu':data['cpu']['total'],'mem':data['mem']['percent'],'tx':data['net']['tx'],'rx':data['net']['rx'],'disk':max((d['percent'] for d in data['disks']),default=0),'read':sum(d['io']['r'] for d in data['disks']),'write':sum(d['io']['w'] for d in data['disks'])}
    minute=now//60*60
    with db() as c:
        c.execute('INSERT OR REPLACE INTO node_samples VALUES(?,?,?)',(node,now,json.dumps(point)))
        old=c.execute('SELECT data,n FROM node_minutes WHERE node=? AND ts=?',(node,minute)).fetchone()
        n=old['n'] if old else 0;mean=json.loads(old['data']) if old else point
        average={k:(mean[k]*n+point[k])/(n+1) for k in point}
        c.execute('INSERT OR REPLACE INTO node_minutes VALUES(?,?,?,?)',(node,minute,json.dumps(average),n+1))
    for key,threshold in [('cpu',85),('mem',90),('disk',85)]:
        watch='node-watch:'+node+':'+key
        previous=cache(watch)['data'] or {};high=point[key]>=threshold
        since=previous.get('since') if high else None
        if high and not since:since=now
        put_cache(watch,{'since':since})
        if high and (now-since>=300 or key=='disk'):alert('resource:'+node+':'+key,agent['name']+' · '+{'cpu':'CPU 持续高负载','mem':'内存持续紧张','disk':'磁盘容量不足'}[key],f'当前 {point[key]:.1f}%')
        if not high:alert('resource:'+node+':'+key,'',active=False)

def check_nodes(cfg):
    for agent in cfg.get('agents',[]):
        latest=cache('node:'+agent['id'])['updated'] or agent.get('created',time.time())
        alert('node-offline:'+agent['id'],agent['name']+'离线','超过 2 分钟未上报，设备可能关机、休眠或网络中断',active=time.time()-latest>120)

def list_nodes(cfg):
    import platform
    server=cache('stats')
    def summary(s):
        d=s.get('data') or {}
        return {'cores':d.get('system',{}).get('cpu_cores'),'memory':d.get('mem',{}).get('total'),'cpu':d.get('cpu',{}).get('total'),'mem':d.get('mem',{}).get('percent'),'disk':max((x.get('percent',0) for x in d.get('disks',[])),default=0),'tx':d.get('net',{}).get('tx',0),'rx':d.get('net',{}).get('rx',0),'uptime':d.get('system',{}).get('uptime',0)}
    local=platform.system()=='Windows'
    result=[{'id':'server','name':'本地预览 · 此电脑' if local else '云服务器','kind':'windows' if local else 'server','updated':server['updated'],'status':'online' if server['updated'] and time.time()-server['updated']<45 else 'offline',**summary(server)}]
    for a in cfg.get('agents',[]):
        s=cache('node:'+a['id'])
        result.append({'id':a['id'],'name':a['name'],'kind':'windows','updated':s['updated'],'status':'online' if s['updated'] and time.time()-s['updated']<45 else 'offline',**summary(s)})
    return result
