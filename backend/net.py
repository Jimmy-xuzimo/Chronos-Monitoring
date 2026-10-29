"""Bounded HTTP client with public-address validation and DNS pinning per hop."""
import http.client
import ipaddress
import json
import socket
import ssl
import time
from urllib.parse import urlsplit, urljoin
from settings import validate_url

class SourceError(Exception): pass

def address(host,port):
    addresses = socket.getaddrinfo(host,port,type=socket.SOCK_STREAM)
    if not addresses or any(not ipaddress.ip_address(a[4][0]).is_global for a in addresses):
        raise SourceError('目标必须是公网地址')
    return addresses[0][4][0]

def fetch(url,headers=None,max_bytes=2*1024*1024,timeout=8,redirects=3,read_body=True):
    validate_url(url)
    original = urlsplit(url).netloc
    for hop in range(redirects+1):
        u=urlsplit(url); port=u.port or (443 if u.scheme=='https' else 80)
        ip=address(u.hostname,port)
        conn=http.client.HTTPConnection(u.hostname,port,timeout=timeout)
        sock=socket.create_connection((ip,port),timeout)
        deadline=time.monotonic()+timeout
        try:
            if u.scheme=='https': sock=ssl.create_default_context().wrap_socket(sock,server_hostname=u.hostname)
            conn.sock=sock
            h={'User-Agent':'ChronosWorkspace/3.0 (+personal-dashboard)','Accept-Encoding':'identity',**(headers or {})}
            if u.netloc!=original: h.pop('Authorization',None)
            conn.request('GET',(u.path or '/')+('?' + u.query if u.query else ''),headers=h)
            response=conn.getresponse(); status=response.status; meta=dict(response.getheaders())
            if redirects and status in (301,302,303,307,308) and response.getheader('Location'):
                if hop==redirects: raise SourceError('重定向次数过多')
                url=urljoin(url,response.getheader('Location')); validate_url(url);continue
            if not read_body:return status,b'',meta
            if int(response.getheader('Content-Length','0'))>max_bytes: raise SourceError('响应超过大小限制')
            chunks=[]; size=0
            while True:
                remaining=deadline-time.monotonic()
                if remaining<=0:raise SourceError('数据源响应超时')
                sock.settimeout(remaining)
                part=response.read(min(65536,max_bytes+1-size))
                if not part:break
                size+=len(part)
                if size>max_bytes:raise SourceError('响应超过大小限制')
                chunks.append(part)
            return status,b''.join(chunks),meta
        finally:
            conn.close();sock.close()
    raise SourceError('重定向失败')

def get_json(url,headers=None):
    status,body,meta=fetch(url,headers=headers)
    if status in (403,429):raise SourceError('GitHub 访问受限或已限流，请稍后重试或配置 Token')
    if status!=200:raise SourceError(f'数据源返回 HTTP {status}')
    return json.loads(body),meta

def certificate(url):
    u=urlsplit(url)
    if u.scheme!='https':return None
    ip=address(u.hostname,u.port or 443)
    with socket.create_connection((ip,u.port or 443),timeout=6) as s:
        with ssl.create_default_context().wrap_socket(s,server_hostname=u.hostname) as tls:
            return ssl.cert_time_to_seconds(tls.getpeercert()['notAfter'])
