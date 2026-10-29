import contextlib
import json
import os
import sqlite3
import time
from pathlib import Path

DATA = Path(os.environ.get('PANEL_DATA', Path(__file__).parent / 'data'))
DATA.mkdir(parents=True, exist_ok=True, mode=0o700)

@contextlib.contextmanager
def db():
    c = sqlite3.connect(DATA / 'panel.sqlite3', timeout=15)
    c.row_factory = sqlite3.Row
    try:
        yield c
        c.commit()
    finally:
        c.close()

def init():
    with db() as c:
        c.executescript('''
        PRAGMA journal_mode=WAL;
        CREATE TABLE IF NOT EXISTS cache (key TEXT PRIMARY KEY, data TEXT, updated REAL, attempted REAL, error TEXT);
        CREATE TABLE IF NOT EXISTS samples (ts INTEGER PRIMARY KEY, data TEXT);
        CREATE TABLE IF NOT EXISTS news_editions (day TEXT PRIMARY KEY, data TEXT, updated REAL);
        CREATE TABLE IF NOT EXISTS minutes (ts INTEGER PRIMARY KEY, data TEXT);
        CREATE TABLE IF NOT EXISTS node_samples (node TEXT, ts INTEGER, data TEXT, PRIMARY KEY(node,ts));
        CREATE TABLE IF NOT EXISTS node_minutes (node TEXT, ts INTEGER, data TEXT, n INTEGER, PRIMARY KEY(node,ts));
        CREATE TABLE IF NOT EXISTS checks (id INTEGER PRIMARY KEY, service TEXT, ts REAL, status TEXT, code INTEGER, ms REAL);
        CREATE INDEX IF NOT EXISTS checks_time ON checks(ts);
        CREATE TABLE IF NOT EXISTS alerts (id INTEGER PRIMARY KEY, key TEXT, title TEXT, detail TEXT, severity TEXT, created REAL, resolved REAL, seen INTEGER DEFAULT 0);
        CREATE UNIQUE INDEX IF NOT EXISTS one_active_alert ON alerts(key) WHERE resolved IS NULL;
        ''')

def cache(key):
    with db() as c:
        r = c.execute('SELECT * FROM cache WHERE key=?', (key,)).fetchone()
    if not r:
        return {'data': None, 'updated': None, 'attempted': None, 'error': None, 'status': 'pending'}
    r = dict(r); r['data'] = json.loads(r['data']) if r['data'] else None
    r['status'] = 'stale' if r['error'] and r['updated'] else 'error' if r['error'] else 'ok'
    r.pop('key', None)
    return r

def put_cache(key, data=None, error=None):
    now = time.time()
    with db() as c:
        if error:
            c.execute('INSERT INTO cache(key,attempted,error) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET attempted=excluded.attempted,error=excluded.error', (key, now, error))
        else:
            c.execute('INSERT INTO cache VALUES(?,?,?,?,NULL) ON CONFLICT(key) DO UPDATE SET data=excluded.data,updated=excluded.updated,attempted=excluded.attempted,error=NULL', (key, json.dumps(data, ensure_ascii=False), now, now))

def alert(key, title, detail='', active=True, severity='warning'):
    with db() as c:
        if active:
            c.execute('INSERT OR IGNORE INTO alerts(key,title,detail,severity,created) VALUES(?,?,?,?,?)', (key,title,detail,severity,time.time()))
            c.execute('UPDATE alerts SET detail=?,severity=? WHERE key=? AND resolved IS NULL', (detail,severity,key))
        else:
            c.execute('UPDATE alerts SET resolved=? WHERE key=? AND resolved IS NULL', (time.time(),key))

def alerts():
    with db() as c:
        return [dict(r) for r in c.execute('SELECT * FROM alerts ORDER BY resolved IS NULL DESC, created DESC LIMIT 150')]

def cleanup(policy=None):
    now = time.time()
    policy=policy or {}
    with db() as c:
        c.execute('DELETE FROM samples WHERE ts<?', (now-policy.get("raw_days",1)*86400,))
        c.execute('DELETE FROM minutes WHERE ts<?', (now-policy.get("history_days",30)*86400,))
        c.execute('DELETE FROM node_samples WHERE ts<?', (now-policy.get("raw_days",1)*86400,))
        c.execute('DELETE FROM node_minutes WHERE ts<?', (now-policy.get("history_days",30)*86400,))
        c.execute('DELETE FROM checks WHERE ts<?', (now-policy.get("event_days",90)*86400,))
        c.execute('DELETE FROM alerts WHERE resolved IS NOT NULL AND resolved<?', (now-policy.get("event_days",90)*86400,))

        import datetime
        cutoff=datetime.datetime.fromtimestamp(now-policy.get("news_days",90)*86400).strftime("%Y-%m-%d")
        c.execute("DELETE FROM news_editions WHERE day<?",(cutoff,))

init()
