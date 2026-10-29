import concurrent.futures
import datetime as dt
import json
import re
import subprocess
import sys
import time
from zoneinfo import ZoneInfo
from urllib.parse import urljoin,urlsplit,quote
from bs4 import BeautifulSoup
from net import fetch, get_json, certificate, SourceError
from store import cache,put_cache,alert,db

def calendars(cfg):
    for source in cfg['calendars']:
        key='calendar:'+source['id']
        try:
            status,body,_=fetch(source['url'])
            if status!=200:raise SourceError(f'订阅返回 HTTP {status}')
            body=body.decode('utf-8-sig')
            if 'BEGIN:VCALENDAR' not in body:raise SourceError('订阅内容不是 ICS 日历')
            result=subprocess.run([sys.executable,'-X','utf8','-m','calendars'],input=json.dumps({'body':body,'source':source,'timezone':cfg['timezone']}),capture_output=True,text=True,encoding='utf-8',timeout=20)
            if result.returncode:raise SourceError('日历解析失败，请检查订阅格式和时区')
            put_cache(key,json.loads(result.stdout));alert(key,source['name']+'同步失败',active=False)
        except Exception as e:
            error=clean_error(e);put_cache(key,error=error);alert(key,source['name']+'同步失败',error)

def clean_error(e):
    if isinstance(e,SourceError):return str(e)[:180]
    if isinstance(e,subprocess.TimeoutExpired):return '日历解析超时，保留上次结果'
    return '连接或解析失败（'+type(e).__name__+'），保留上次结果'

def service_check(service):
    old=cache('service:'+service['id']); data=old['data'] or {}
    start=time.monotonic()
    error=None;code=None
    try:
        code,_,_=fetch(service['url'],timeout=6,redirects=0,read_body=False)
        # Redirects are valid responses when explicitly expected.
        good=code in service.get('expected',[200])
        if not good:error=f'预期 {service.get("expected",[200])}，实际 HTTP {code}'
    except Exception as e:
        good=False;error=clean_error(e)
    failed=0 if good else data.get('failed',0)+1
    recovered=data.get('recovered',0)+1 if good else 0
    status='up' if good else 'down' if failed>=3 else 'checking'
    result={'id':service['id'],'name':service['name'],'url':service['url'],'status':status,'code':code,
            'ms':round((time.monotonic()-start)*1000),'failed':failed,'recovered':recovered,'error':error,
            'cert_expires':data.get('cert_expires'),'cert_checked':data.get('cert_checked'), 'cert_error':data.get('cert_error')}
    if not data.get('cert_checked') or time.time()-data['cert_checked']>86400:
        try:
            result['cert_expires']=certificate(service['url']);result['cert_error']=None
        except Exception as e:result['cert_error']=clean_error(e)
        result['cert_checked']=time.time()
    put_cache('service:'+service['id'],result)
    with db() as c:
        c.execute('INSERT INTO checks(service,ts,status,code,ms) VALUES(?,?,?,?,?)',(service['id'],time.time(),status,code,result['ms']))
    if failed>=3:alert('service:'+service['id'],service['name']+'不可用',error or '连续三次探测失败',severity='critical')
    elif recovered>=2:alert('service:'+service['id'],'',active=False)
    expires=result.get('cert_expires')
    if expires:
        days=int((expires-time.time())/86400)
        alert('cert:'+service['id'],service['name']+'证书即将到期',f'剩余 {days} 天',active=days<=30,severity='critical' if days<=7 else 'warning')
    alert('cert-error:'+service['id'],service['name']+'证书检查失败',result.get('cert_error') or '',active=bool(result.get('cert_error')))
    return result

def services(cfg):
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:
        list(pool.map(service_check,cfg['services']))
    put_cache('services',{'count':len(cfg['services'])})

def github(cfg):
    if not cfg.get('github_user'):
        put_cache('github',{'repos':[],'prs':[],'releases':{},'disabled':True});return
    headers={'Accept':'application/vnd.github+json','X-GitHub-Api-Version':'2022-11-28'}
    if cfg.get('github_token'):headers['Authorization']='Bearer '+cfg['github_token']
    user=cfg['github_user'];base='https://api.github.com'
    repos,_=get_json(f'{base}/users/{quote(user)}/repos?sort=pushed&per_page=100',headers)
    # Only public user data is rendered even when a token is supplied.
    repos=[r for r in repos if not r.get('private')]
    pinned=cfg.get('pinned_repos',[])
    repos.sort(key=lambda r:(r['full_name'] not in pinned, pinned.index(r['full_name']) if r['full_name'] in pinned else 0))
    items=[]
    for r in repos[:30]:
        items.append({k:r.get(k) for k in ['name','full_name','html_url','description','stargazers_count','open_issues_count','language','pushed_at','fork']})
    old=cache('github')['data'] or {};releases={}
    for r in items[:5]:
        try:
            data,_=get_json(f'{base}/repos/{r["full_name"]}/releases?per_page=1',headers)
            if data:releases[r['full_name']]={k:data[0].get(k) for k in ['tag_name','html_url','published_at']}
        except Exception:releases[r['full_name']]=old.get('releases',{}).get(r['full_name'])
    prs,meta=get_json(base+'/search/issues?q='+quote(f'is:pr involves:{user} is:public')+'&sort=updated&order=desc&per_page=20',headers)
    pr_items=[]
    for p in prs.get('items',[]):
        repo=p['repository_url'].split('/repos/')[-1]
        item={'id':p['id'],'number':p['number'],'title':p['title'],'url':p['html_url'],'repo':repo,'state':'merged' if p.get('pull_request',{}).get('merged_at') else p['state'],'updated_at':p['updated_at'],'ci':'unknown','review':'unknown'}
        pr_items.append(item)
    # Bound requests to stay within the unauthenticated public API budget.
    detail_limit=3 if cfg.get('github_token') else 1
    for p in [p for p in pr_items if p['state']=='open'][:detail_limit]:
        try:
            detail,_=get_json(f'{base}/repos/{p["repo"]}/pulls/{p["number"]}',headers)
            reviews,_=get_json(f'{base}/repos/{p["repo"]}/pulls/{p["number"]}/reviews?per_page=50',headers)
            latest={}
            for review in reviews:
                if review.get('state') in ['APPROVED','CHANGES_REQUESTED','DISMISSED']:latest[review['user']['login']]=review['state']
            states=list(latest.values())
            p['review']='changes_requested' if 'CHANGES_REQUESTED' in states else 'approved' if 'APPROVED' in states else 'requested' if detail.get('requested_reviewers') else 'pending'
            sha=detail['head']['sha']
            combined,_=get_json(f'{base}/repos/{p["repo"]}/commits/{sha}/status',headers)
            checks,_=get_json(f'{base}/repos/{p["repo"]}/commits/{sha}/check-runs?per_page=100',headers)
            states=[s['state'] for s in combined.get('statuses',[])]
            runs=checks.get('check_runs',[])
            p['ci']='failure' if any(s in ['failure','error'] for s in states) or any(r.get('conclusion') in ['failure','timed_out','cancelled','action_required'] for r in runs) else 'pending' if 'pending' in states or any(r['status']!='completed' for r in runs) else 'success' if states or runs else 'none'
        except Exception as e:p['ci']='unavailable';p['detail_error']=clean_error(e)
    put_cache('github',{'user':user,'repos':items,'releases':releases,'prs':pr_items,'detail_limit':detail_limit,'partial':len(pr_items)>detail_limit,'limit_remaining':meta.get('X-RateLimit-Remaining')})

def news(cfg):
    if not cfg.get('news_url'):
        put_cache('news',{'items':[],'dates':[],'date':None,'disabled':True});return
    base=cfg['news_url'].rstrip('/')+'/data/'
    index,_=get_json(urljoin(base,'index.json'))
    dates=sorted({d for d in index.get('dates',[]) if re.fullmatch(r'\d{4}-\d{2}-\d{2}',d)},reverse=True)
    if not dates:raise SourceError('资讯索引没有有效日期')
    cutoff=(dt.datetime.now(ZoneInfo('Asia/Shanghai')).date()-dt.timedelta(days=cfg.get('retention',{}).get('news_days',90))).isoformat()
    dates=[d for d in dates if d>=cutoff][:366]
    def edition(day):
        with db() as c:old=c.execute('SELECT data FROM news_editions WHERE day=?',(day,)).fetchone()
        if old and day!=dates[0] and json.loads(old['data']).get('parser_version',0)>=2:return
        payload,_=get_json(urljoin(base,day+'.json'))
        items=[];seen=set()
        for cat in payload.get('categories',[]):
            for item in cat.get('items',[]):
                url=item.get('url','');u=urlsplit(url)
                key=(cat.get('name',cat.get('id','其他')),url)
                if u.scheme not in ('https','http') or not u.hostname or u.username or key in seen:continue
                seen.add(key);items.append({'title':str(item.get('title',''))[:300],'url':url,'source':str(item.get('source') or u.hostname),'published':item.get('time'),'category':cat.get('name',cat.get('id','其他'))})
        if not items:raise SourceError('资讯条目为空，保留上次结果')
        data={'parser_version':2,'items':items[:300],'date':day,'source':cfg['news_url'],'generated_at':payload.get('generated_at')}
        with db() as c:c.execute('INSERT OR REPLACE INTO news_editions VALUES(?,?,?)',(day,json.dumps(data,ensure_ascii=False),time.time()))
    edition(dates[0])
    # Backfill archives with bounded parallelism. Existing historical editions are immutable snapshots.
    with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:list(pool.map(edition,dates[1:]))
    with db() as c:
        rows=c.execute('SELECT day,data FROM news_editions ORDER BY day DESC').fetchall()
    latest=json.loads(rows[0]['data']);latest['dates']=[r['day'] for r in rows];latest['schedule']='每天 07:30 · 上海时间'
    put_cache('news',latest)
    from scheduling import daily_slot
    if dates[0]<daily_slot().date().isoformat():raise SourceError('今日资讯尚未发布，保留最近一期；15 分钟后重试')


def run_source(name,fn,cfg):
    try:
        fn(cfg);alert('source:'+name,'',active=False)
    except Exception as e:
        error=clean_error(e);put_cache(name,error=error);alert('source:'+name,{'github':'GitHub','news':'AI 资讯'}.get(name,name)+'同步失败',error)

def network(cfg):
    import ipaddress
    data,_=get_json('https://api64.ipify.org?format=json')
    ip=str(ipaddress.ip_address(data['ip']))
    put_cache('network',{'public_ip':ip})
