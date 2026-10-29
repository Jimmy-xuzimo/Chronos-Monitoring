import datetime as dt
import json,time
from pathlib import Path
from unittest.mock import patch
import pytest
from app import app
from settings import load,update,public,verify_password,hash_password
from store import cache,put_cache,db,alert,alerts,cleanup
from calendars import parse_calendar
from integrations import service_check,run_source
from net import address,SourceError

@pytest.fixture
def client():
    with app.test_client() as c:
        s=c.get('/api/session').json
        r=c.post('/api/login',json={'username':load()['username'],'password':'test-password-12345'},headers={'X-CSRF-Token':s['csrf']})
        assert r.status_code==200
        yield c,{'X-CSRF-Token':r.json['csrf']}

def test_auth_and_csrf():
    with app.test_client() as c:
        for endpoint in ['/api/overview','/api/stats','/api/calendar','/api/history','/api/config','/api/alerts','/api/github','/api/news','/api/services']:
            assert c.get(endpoint).status_code==401
        assert c.put('/api/config',json={}).status_code==403

def test_config_redaction_and_preserve(client):
    c,h=client
    assert c.put('/api/config',json={},headers={}).status_code==403
    config=c.get('/api/config').json
    assert not any(k in config for k in ['secret_key','password','github_token'])
    assert 'url' not in config['calendars'][0]
    original=load()['calendars'][0]['url']
    assert c.put('/api/config',json={'calendars':config['calendars']},headers=h).status_code==200
    assert load()['calendars'][0]['url']==original
    assert c.put('/api/config',json={'timezone':'invalid/timezone'},headers=h).status_code==400

def test_failure_keeps_last_good_data():
    put_cache('test-source',{'events':[1]});old=cache('test-source')
    put_cache('test-source',error='temporary')
    result=cache('test-source')
    assert result['data']==old['data'] and result['updated']==old['updated'] and result['status']=='stale'

def test_alert_dedup_recovery():
    alert('unique','异常');alert('unique','异常')
    assert len([a for a in alerts() if a['key']=='unique' and not a['resolved']])==1
    alert('unique','',active=False)
    assert [a for a in alerts() if a['key']=='unique'][0]['resolved']

def test_service_redirect_and_failure_recovery():
    s={'id':'test-site','name':'test','url':'http://example.com/','expected':[302]}
    with patch('integrations.fetch',return_value=(302,b'',{})):
        assert service_check(s)['status']=='up'
    with patch('integrations.fetch',return_value=(500,b'',{})):
        assert service_check(s)['status']=='checking';service_check(s);assert service_check(s)['status']=='down'
    assert any(a['key']=='service:test-site' and not a['resolved'] for a in alerts())
    with patch('integrations.fetch',return_value=(302,b'',{})):
        service_check(s);service_check(s)
    assert not any(a['key']=='service:test-site' and not a['resolved'] for a in alerts())

def test_ssrf_dns_rebinding_protection():
    for ip in ['127.0.0.1','10.0.0.2','169.254.169.254','::1','::ffff:127.0.0.1']:
        with patch('socket.getaddrinfo',return_value=[(2,1,6,'',(ip,443))]):
            with pytest.raises(SourceError):address('example.com',443)

def test_calendar_recurrence_override_cancel_and_untimed():
    body='''BEGIN:VCALENDAR\r
VERSION:2.0\r
BEGIN:VEVENT\r
UID:course\r
SUMMARY:Weekly class\r
DTSTART;TZID=Asia/Shanghai:20261005T080000\r
DTEND;TZID=Asia/Shanghai:20261005T093500\r
RRULE:FREQ=WEEKLY;COUNT=4\r
EXDATE;TZID=Asia/Shanghai:20261012T080000\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:course\r
RECURRENCE-ID;TZID=Asia/Shanghai:20261019T080000\r
DTSTART;TZID=Asia/Shanghai:20261020T100000\r
DTEND;TZID=Asia/Shanghai:20261020T113000\r
SUMMARY:Moved class\r
DESCRIPTION:教师：Teacher\\n【假期待确认】\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:course\r
RECURRENCE-ID;TZID=Asia/Shanghai:20261026T080000\r
DTSTART;TZID=Asia/Shanghai:20261026T080000\r
STATUS:CANCELLED\r
END:VEVENT\r
BEGIN:VEVENT\r
UID:period\r
DTSTART;VALUE=DATE:20261011\r
DTEND;VALUE=DATE:20261025\r
SUMMARY:时间未定\r
END:VEVENT\r
END:VCALENDAR\r
'''
    r=parse_calendar(body.encode(),{'id':'test','name':'test','color':'#ffffff'},'Asia/Shanghai',dt.datetime(2026,10,1),dt.datetime(2026,11,1))
    events=r['events'];timed=[e for e in events if not e['untimed']]
    assert len(timed)==2
    assert timed[1]['date']=='2026-10-20' and timed[1]['teacher']=='Teacher' and timed[1]['warning']=='假期待确认'
    assert any(e['untimed'] for e in events)
    assert timed[0]['start'].endswith('+08:00')

def test_history_and_retention(client):
    c,h=client;now=int(time.time())
    with db() as conn:
        for ts,n in [(now-120,10),(now-60,30),(now-40*86400,100)]:
            conn.execute('INSERT OR REPLACE INTO minutes VALUES(?,?)',(ts,json.dumps({'cpu':n,'mem':20})))
    assert c.get('/api/history?range=30d').status_code==200
    assert c.get('/api/history?range=30d').json['points']
    cleanup()
    with db() as conn:assert not conn.execute('SELECT * FROM minutes WHERE ts<?',(now-31*86400,)).fetchone()

def test_wrong_password_and_hash():
    h=hash_password('hello world')
    assert verify_password('hello world',h) and not verify_password('bad',h)


def test_unconfigured_integrations_do_not_fetch():
    from integrations import github,news
    with patch('integrations.get_json', side_effect=AssertionError('disabled sources must not request network')):
        github({'github_user':''});news({'news_url':''})
    assert cache('github')['data']['disabled'] is True
    assert cache('news')['data']['disabled'] is True

def test_sources_can_be_disabled(client):
    c,h=client
    response=c.put('/api/config',json={'github_user':'','news_url':''},headers=h)
    assert response.status_code==200
    assert load()['github_user']=='' and load()['news_url']==''
