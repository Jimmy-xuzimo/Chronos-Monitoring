import hashlib,time
from unittest.mock import patch
from app import app
from settings import load,save,public
from store import cache,db,alerts
from nodes import validate_report,receive,check_nodes,list_nodes
import pytest

def report():
    return dict(cpu={'total':12,'percpu':[12,12]},mem={'percent':40,'total':1000,'used':400,'available':600},swap={'percent':0,'total':0,'used':0},net={'tx':2,'rx':3,'total_tx':4,'total_rx':5,'conns':{'est':2,'lsn':3},'ifaces':[]},disks=[{'mount':'C:','device':'C:','total':100,'used':40,'percent':40,'io':{'r':2,'w':4}}],system={'hostname':'test-pc','cpu_cores':2,'load':[],'uptime':100,'procs':20},processes=[])

def test_agent_auth_schema_and_isolated_history():
    cfg=load();agent={'id':'test-windows','name':'本地电脑','created':time.time(),'token_hash':hashlib.sha256(b'unit-test-secret').hexdigest()};cfg.setdefault('agents',[]).append(agent);save(cfg)
    assert 'token_hash' not in str(public(load()))
    with app.test_client() as client:
        assert client.post('/api/agent/report',json=report()).status_code==401
        h={'Authorization':'Bearer unit-test-secret'}
        assert client.post('/api/agent/report',json={},headers=h).status_code==400
        assert client.post('/api/agent/report',json=report(),headers=h).status_code==200
        assert client.post('/api/agent/report',json=report(),headers=h).status_code==429
    assert cache('node:test-windows')['data']['cpu']['total']==12
    with db() as c:
        assert c.execute('SELECT count(*) FROM node_samples WHERE node=?',('test-windows',)).fetchone()[0]==1
    node=next(n for n in list_nodes(load()) if n['id']=='test-windows');assert node['status']=='online' and node['cores']==2
    cfg['agents']=[];save(cfg)
    with app.test_client() as client:assert client.post('/api/agent/report',json=report(),headers=h).status_code==401

def test_bad_agent_numbers():
    for bad in [float('nan'),float('inf'),-1,101,'5']:
        data=report();data['cpu']['total']=bad
        with pytest.raises(ValueError):validate_report(data)

def test_offline_and_recovery():
    a={'id':'offline-pc','name':'电脑','created':time.time()-300}
    check_nodes({'agents':[a]});assert any(x['key']=='node-offline:offline-pc' and not x['resolved'] for x in alerts())
    receive(a,validate_report(report()));assert not any(x['key']=='node-offline:offline-pc' and not x['resolved'] for x in alerts())
