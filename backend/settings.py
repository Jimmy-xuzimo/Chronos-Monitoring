import copy
import hashlib
import hmac
import json
import os
import secrets
import threading
from pathlib import Path
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo
from store import DATA

LOCK = threading.RLock()
FILE = DATA / 'config.json'
DEFAULT = {
    'timezone': 'Asia/Shanghai', 'semester_start': '2026-08-31', 'semester_weeks': 20,
    'github_user': '', 'github_token': '', 'pinned_repos': [],
    'news_url': '',
    'calendars': [],
    'services': [], 'entries': [], 'agents': [],
    'retention':{'raw_days':1,'history_days':30,'event_days':90,'news_days':90},
}

def hash_password(password, salt=None, iterations=200000):
    salt = salt or secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac('sha256',password.encode(),salt.encode(),iterations)
    return f'pbkdf2_sha256${iterations}${salt}${dk.hex()}'

def verify_password(password, stored):
    try:
        algo, n, salt, digest = stored.split('$')
        return algo == 'pbkdf2_sha256' and hmac.compare_digest(hash_password(password,salt,int(n)), stored)
    except (ValueError,TypeError):
        return False

def save(cfg):
    with LOCK:
        tmp = FILE.with_suffix('.tmp')
        tmp.write_text(json.dumps(cfg,ensure_ascii=False,indent=2),encoding='utf-8')
        os.chmod(tmp,0o600); os.replace(tmp,FILE)

def load():
    with LOCK:
        if not FILE.exists():
            legacy = Path(__file__).parent/'config.json'
            old = json.loads(legacy.read_text()) if legacy.exists() else {}
            password = os.environ.get('PANEL_INITIAL_PASSWORD')
            if not old and not password:
                raise RuntimeError('首次启动请设置 PANEL_INITIAL_PASSWORD，或迁移旧 config.json')
            save({**copy.deepcopy(DEFAULT), 'username': old.get('username','admin'),
                  'password': old.get('password') or hash_password(password),
                  'secret_key': old.get('secret_key') or secrets.token_hex(32)})
        return {**copy.deepcopy(DEFAULT), **json.loads(FILE.read_text(encoding='utf-8'))}

def public(cfg):
    result = copy.deepcopy(cfg)
    for key in ['password','secret_key','github_token']:
        result.pop(key,None)
    result['github_token_set'] = bool(cfg.get('github_token'))
    result['agents']=[{k:a[k] for k in ['id','name','created'] if k in a} for a in cfg.get('agents',[])]
    for cal in result['calendars']:
        cal['configured'] = bool(cal.pop('url',None))
        cal['host'] = urlsplit(next((x['url'] for x in cfg['calendars'] if x['id']==cal['id']), '')).hostname
    return result

def validate_url(url):
    u = urlsplit(url)
    if u.scheme not in ('http','https') or not u.hostname or u.username or u.password or u.fragment:
        raise ValueError('仅支持无用户名密码的 HTTP(S) 地址')
    if u.port not in (None,80,443):
        raise ValueError('订阅和探测仅支持 80/443 端口')
    return url

def update(payload):
    from datetime import date
    import re
    cfg=load()
    for key in ['timezone','semester_start','semester_weeks','github_user','pinned_repos','news_url','entries','services','retention']:
        if key in payload: cfg[key]=payload[key]
    ZoneInfo(cfg['timezone']); date.fromisoformat(cfg['semester_start'])
    if not isinstance(cfg['semester_weeks'],int) or not 1<=cfg['semester_weeks']<=52: raise ValueError('学期周数须为 1–52')
    if cfg['github_user'] and not re.fullmatch(r'[A-Za-z0-9-]{1,39}',cfg['github_user']): raise ValueError('GitHub 用户名无效')
    if not isinstance(cfg['pinned_repos'],list) or len(cfg['pinned_repos'])>30 or any(not isinstance(x,str) or len(x)>160 for x in cfg['pinned_repos']): raise ValueError('置顶仓库配置无效')
    if 'github_token' in payload and payload['github_token'] is not None: cfg['github_token']=str(payload['github_token']).strip()
    if 'calendars' in payload:
        calendars=payload['calendars']
        if not isinstance(calendars,list) or len(calendars)>10: raise ValueError('最多支持 10 个日历')
        ids=set(); normalized=[]
        for cal in calendars:
            id=cal.get('id') or secrets.token_hex(6)
            if not re.fullmatch(r'[a-zA-Z0-9_-]{1,50}',id) or id in ids: raise ValueError('日历 ID 无效或重复')
            ids.add(id)
            old=next((x for x in cfg['calendars'] if x['id']==id),{})
            url=cal.get('url') or old.get('url')
            if not url: raise ValueError('新日历需要订阅地址')
            color=cal.get('color','#6e8bff')
            if not re.fullmatch(r'#[0-9a-fA-F]{6}',color): raise ValueError('日历颜色无效')
            normalized.append({'id':id,'name':str(cal.get('name','课表'))[:80],'color':color,'url':validate_url(url)})
        cfg['calendars']=normalized
    if cfg['news_url']: validate_url(cfg['news_url'])
    if not isinstance(cfg['entries'],list) or len(cfg['entries'])>100: raise ValueError('入口配置无效')
    if not isinstance(cfg['services'],list) or len(cfg['services'])>30: raise ValueError('最多监测 30 个网站')
    ids=set()
    for service in cfg['services']:
        if not re.fullmatch(r'[a-zA-Z0-9_-]{1,50}',service.get('id','')) or service['id'] in ids: raise ValueError('服务 ID 无效或重复')
        ids.add(service['id']); validate_url(service['url'])
        codes=service.get('expected',[200])
        if not isinstance(codes,list) or not codes or any(type(n)!=int or not 100<=n<=599 for n in codes): raise ValueError('预期状态码无效')
    for entry in cfg['entries']:
        # Private management entrances may use other ports, but are never fetched.
        u=urlsplit(entry.get('url',''))
        if u.scheme not in ('http','https') or not u.hostname or u.username or u.password: raise ValueError('入口地址无效')
        for field in ['name','group','id']:
            if not isinstance(entry.get(field),str) or len(entry[field])>100: raise ValueError('入口名称或分组无效')
    limits={'raw_days':(1,30),'history_days':(7,365),'event_days':(7,365),'news_days':(7,365)}
    if not isinstance(cfg['retention'],dict):raise ValueError('清理设置无效')
    for k,(a,b) in limits.items():
        v=cfg['retention'].get(k)
        if type(v)!=int or not a<=v<=b:raise ValueError('保留时限无效')
    save(cfg)
    return public(cfg)
