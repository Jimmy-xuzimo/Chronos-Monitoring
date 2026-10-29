"""Outbound-only desktop agent. Config/token stay on this device; no listening port."""
import argparse
import json
import logging
from logging.handlers import RotatingFileHandler
import os
from pathlib import Path
import time
import urllib.request
import urllib.error
from urllib.parse import urlsplit

class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        raise urllib.error.HTTPError(req.full_url,code,'Agent endpoint must not redirect',headers,fp)

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--config',required=True);args=parser.parse_args()
    path=Path(args.config);cfg=json.loads(path.read_text(encoding='utf-8'))
    u=urlsplit(cfg['server'])
    if u.scheme!='https' or not u.hostname or u.username or u.password:raise ValueError('HTTPS server URL required')
    os.environ['PANEL_DATA']=str(path.parent/'data')
    from store import DATA,cleanup
    from metrics import Monitor
    import msvcrt
    lock=(DATA/'agent.lock').open('a+');lock.write('0');lock.flush();lock.seek(0)
    try:msvcrt.locking(lock.fileno(),msvcrt.LK_NBLCK,1)
    except OSError:return
    logger=logging.getLogger('agent');logger.setLevel(logging.INFO)
    handler=RotatingFileHandler(path.parent/'agent.log',maxBytes=200000,backupCount=2,encoding='utf-8');handler.setFormatter(logging.Formatter('%(asctime)s %(message)s'));logger.addHandler(handler)
    monitor=Monitor();failures=0;last_cleanup=0;last_success_log=0
    opener=urllib.request.build_opener(NoRedirect)
    logger.info('Agent started; outbound HTTPS only')
    while True:
        started=time.monotonic()
        try:
            payload=monitor.collect()
            # Windows pseudo-idle process is not an application consuming CPU.
            payload['processes']=[p for p in payload['processes'] if p['pid']!=0]
            request=urllib.request.Request(cfg['server'].rstrip('/')+'/api/agent/report',data=json.dumps(payload,allow_nan=False).encode(),headers={'Authorization':'Bearer '+cfg['token'],'Content-Type':'application/json'},method='POST')
            with opener.open(request,timeout=10) as response:
                if response.status!=200:raise RuntimeError('Report rejected')
            failures=0
            status={'state':'online','last_success':time.time(),'node_id':cfg['node_id']}
            if time.time()-last_success_log>3600:logger.info('Report accepted');last_success_log=time.time()
        except Exception as e:
            failures+=1;status={'state':'retrying','last_attempt':time.time(),'error_type':type(e).__name__,'node_id':cfg['node_id']}
            if failures==1 or failures%30==0:logger.warning('Report failed (%s); retrying',type(e).__name__)
        (path.parent/'status.json').write_text(json.dumps(status),encoding='utf-8')
        if time.time()-last_cleanup>3600:cleanup();last_cleanup=time.time()
        time.sleep(max(1,(min(60,10*failures) if failures else 10)-(time.monotonic()-started)))

if __name__=='__main__':main()
