"""Only this process collects metrics; HTTP workers never start collectors."""
import concurrent.futures
import logging
import os
import signal
import threading
import time
import json
from pathlib import Path
from store import DATA,put_cache,cleanup,db,cache
from settings import load
from metrics import Monitor
from integrations import calendars,services,github,news,network,run_source
from nodes import check_nodes
from scheduling import daily_slot,weekly_slot
from weather import weather

def main():
    # OS lock prevents duplicate collection even if launched twice.
    lock=(DATA/'collector.lock').open('a+')
    if os.name=='nt':
        import msvcrt
        lock.seek(0);lock.write('0');lock.flush();lock.seek(0)
        msvcrt.locking(lock.fileno(),msvcrt.LK_NBLCK,1)
    else:
        import fcntl
        fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB)
    stop=threading.Event()
    for sig in (signal.SIGINT,signal.SIGTERM):signal.signal(sig,lambda *_:stop.set())
    monitor=Monitor();pool=concurrent.futures.ThreadPoolExecutor(max_workers=4)
    jobs={'calendars':(900,calendars),'services':(600,services),'github':(900,github),'network':(300,network),'weather':(600,weather)}
    due={k:0 for k in jobs};futures={};last_sample=0;last_clean=0;signature=None;fingerprints={}
    try:
        while not stop.is_set():
            now=time.time();cfg=load()
            current=(DATA/'config.json').stat().st_mtime_ns
            if current!=signature:
                signature=current
                fields={'calendars':['calendars','timezone'],'services':['services'],'github':['github_user','github_token','pinned_repos'],'network':[],'weather':['weather_location']}
                for name,keys in fields.items():
                    value=json.dumps({k:cfg.get(k) for k in keys},sort_keys=True)
                    if value!=fingerprints.get(name):due[name]=0;fingerprints[name]=value
                valid={x['id'] for x in cfg['services']}
                calids={x['id'] for x in cfg['calendars']}
                with db() as c:
                    for row in c.execute('SELECT key FROM alerts WHERE resolved IS NULL').fetchall():
                        key=row['key']
                        if (key.startswith(('service:','cert:','cert-error:')) and key.split(':',1)[1] not in valid) or (key.startswith('calendar:') and key.split(':',1)[1] not in calids):
                            c.execute('UPDATE alerts SET resolved=? WHERE key=? AND resolved IS NULL',(now,key))
            if now-last_sample>=10:
                try:monitor.collect();check_nodes(cfg);put_cache('collector',{'pid':os.getpid(),'heartbeat':now})
                except Exception:logging.exception('metrics collection failed')
                last_sample=now
            for name,(interval,fn) in jobs.items():
                if now>=due[name] and (name not in futures or futures[name].done()):
                    futures[name]=pool.submit(run_source,name,fn,cfg);due[name]=now+interval
            news_state=cache('news')
            slot=daily_slot().timestamp()
            requested=bool(cache('news-request')['data'])
            if (not news_state['updated'] or news_state['updated']<slot or news_state['error'] or requested) and (requested or now>=due.get('news',0)) and ('news' not in futures or futures['news'].done()):
                futures['news']=pool.submit(run_source,'news',news,cfg);due['news']=now+900
                put_cache('news-request',None)
            maintenance=cache('maintenance')
            if not maintenance['updated'] or maintenance['updated']<weekly_slot().timestamp():
                cleanup(cfg.get('retention'));put_cache('maintenance',{'schedule':'每周一 04:00','policy':cfg.get('retention')})
            stop.wait(1)
    finally:pool.shutdown(wait=True);lock.close()

if __name__=='__main__':
    logging.basicConfig(level=logging.INFO);main()
