import datetime as dt
import json
import platform
import socket
import time
import psutil
from store import db,put_cache,alert,cache

class Monitor:
    def __init__(self):
        self.prev=None; self.minute=[];self.minute_id=None;self.high={};self.processes={}
        self.os=platform.platform();self.model=platform.processor();self.disk_map={}
        if os_name_is_windows():
            try:
                import subprocess
                result=subprocess.run(['powershell.exe','-NoProfile','-NonInteractive','-WindowStyle','Hidden','-Command','Get-Partition | Where-Object DriveLetter | Select-Object DriveLetter,DiskNumber | ConvertTo-Json -Compress'],capture_output=True,text=True,timeout=20,creationflags=subprocess.CREATE_NO_WINDOW)
                partitions=json.loads(result.stdout)
                if isinstance(partitions,dict):partitions=[partitions]
                self.disk_map={x['DriveLetter']+':':'PhysicalDrive'+str(x['DiskNumber']) for x in partitions}
            except (OSError,ValueError,subprocess.SubprocessError):pass
        try:
            from pathlib import Path
            import re
            self.os=re.search(r'^PRETTY_NAME="?([^"\n]+)',Path('/etc/os-release').read_text(),re.M)[1]
            self.model=re.search(r'^model name\s*:\s*(.+)',Path('/proc/cpuinfo').read_text(),re.M)[1]
        except (OSError,TypeError):pass
        psutil.cpu_percent(percpu=True)

    def collect(self):
        now=time.time(); net=psutil.net_io_counters(pernic=True);diskio=psutil.disk_io_counters(perdisk=True) or {}
        previous=self.prev;duration=max(now-previous[0],.1) if previous else 1
        def rate(obj,old,key):return max(0,(getattr(obj,key)-getattr(old,key))/duration) if old else 0
        interfaces=[]
        for name,counters in net.items():
            if name=='lo':continue
            old=previous[1].get(name) if previous else None
            addresses=psutil.net_if_addrs().get(name,[])
            interfaces.append({'name':name,'ipv4':next((a.address for a in addresses if a.family==socket.AF_INET),''),'tx':rate(counters,old,'bytes_sent'),'rx':rate(counters,old,'bytes_recv'),'total_tx':counters.bytes_sent,'total_rx':counters.bytes_recv,
                               'addresses':[a.address for a in addresses if a.family in (socket.AF_INET,socket.AF_INET6)]})
        disks=[]
        for part in psutil.disk_partitions(all=False):
            if any(x in part.device for x in ('loop','ram','overlay')) or '/docker' in part.mountpoint:continue
            try:
                usage=psutil.disk_usage(part.mountpoint);name=part.device.split('/')[-1]
                # Prefer an exact partition counter, then its parent block device.
                key=self.disk_map.get(part.device.rstrip('\\')) or (name if name in diskio else next((x for x in sorted(diskio,key=len,reverse=True) if name.startswith(x)),None))
                counters=diskio.get(key);old=previous[2].get(key) if previous else None
                disks.append({'mount':part.mountpoint,'device':part.device,'total':usage.total,'used':usage.used,'percent':usage.percent,'io':{'r':rate(counters,old,'read_bytes') if counters else 0,'w':rate(counters,old,'write_bytes') if counters else 0}})
            except (OSError,PermissionError):continue
        processes=[];live=set()
        for p in psutil.process_iter(['pid','name','memory_info','create_time']):
            if p.pid==0:continue
            try:
                key=(p.pid,p.info['create_time']);live.add(key)
                proc=self.processes.setdefault(key,p)
                processes.append({'pid':p.pid,'name':p.info['name'],'cpu':proc.cpu_percent(),'memory':p.info['memory_info'].rss})
            except (psutil.NoSuchProcess,psutil.AccessDenied):continue
        self.processes={k:v for k,v in self.processes.items() if k in live}
        conns={'est':None,'lsn':None}
        try:
            connections=psutil.net_connections('inet');conns={'est':sum(x.status=='ESTABLISHED' for x in connections),'lsn':sum(x.status=='LISTEN' for x in connections)}
        except (psutil.AccessDenied,OSError):pass
        mem=psutil.virtual_memory();swap=psutil.swap_memory();cores=psutil.cpu_percent(percpu=True)
        try:load=list(psutil.getloadavg())
        except AttributeError:load=[]
        self.prev=(now,net,diskio)
        data={'cpu':{'total':round(sum(cores)/len(cores),1) if cores else 0,'percpu':cores},
              'mem':{k:getattr(mem,k) for k in ['percent','used','total','available']},'swap':{k:getattr(swap,k) for k in ['percent','used','total']},
              'net':{'tx':sum(x['tx'] for x in interfaces),'rx':sum(x['rx'] for x in interfaces),'total_tx':sum(x['total_tx'] for x in interfaces),'total_rx':sum(x['total_rx'] for x in interfaces),'ifaces':interfaces,'conns':conns},
              'disks':disks,'processes':sorted(processes,key=lambda x:(-x['cpu'],-x['memory']))[:12],
              'system':{'load':load,'procs':len(processes),'boot_time':dt.datetime.fromtimestamp(psutil.boot_time(),dt.timezone.utc).isoformat(),'uptime':int(now-psutil.boot_time()),'kernel':platform.release(),'hostname':socket.gethostname(),'os':self.os,'cpu_model':self.model,'public_ip':(cache('network')['data'] or {}).get('public_ip','Checking...'),'cpu_cores':psutil.cpu_count(),'server_time':dt.datetime.now(dt.timezone.utc).isoformat()},'sampled_at':now}
        put_cache('stats',data)
        point={'cpu':data['cpu']['total'],'mem':mem.percent,'tx':data['net']['tx'],'rx':data['net']['rx'],'disk':max((d['percent'] for d in disks),default=0),'read':sum(d['io']['r'] for d in disks),'write':sum(d['io']['w'] for d in disks)}
        with db() as c:c.execute('INSERT OR REPLACE INTO samples VALUES(?,?)',(int(now),json.dumps(point)))
        minute=int(now)//60*60
        if self.minute_id!=minute:
            if self.minute:
                mean={k:round(sum(p[k] for p in self.minute)/len(self.minute),2) for k in point}
                with db() as c:c.execute('INSERT OR REPLACE INTO minutes VALUES(?,?)',(self.minute_id,json.dumps(mean)))
            self.minute=[];self.minute_id=minute
        self.minute.append(point)
        for key,value,threshold in [('cpu',point['cpu'],85),('mem',mem.percent,90),('disk',point['disk'],85)]:
            if value>=threshold:
                self.high.setdefault(key,now)
                if now-self.high[key]>=300 or key=='disk':alert('resource:'+key,{'cpu':'CPU 持续高负载','mem':'内存持续紧张','disk':'磁盘容量不足'}[key],f'当前 {value:.1f}%',severity='critical' if value>=95 else 'warning')
            else:
                self.high.pop(key,None);alert('resource:'+key,'',active=False)
        return data

def os_name_is_windows():return platform.system()=='Windows'
