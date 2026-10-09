# -*- coding: utf-8 -*-
"""
CHRONOS —— 个人面板后端
=====================================================
功能：
  1. 服务器监控采集（CPU 含每核 / 内存 / 网络 含网卡与 TCP 连接 / 磁盘 / 系统信息）
  2. 登录鉴权（Flask 签名 Cookie 会话）
  3. 凭证管理（账号密码持久化于 config.json，可在面板内修改）

设计原则：
  - 仅监听 127.0.0.1，通过 Nginx 反向代理对外发布
  - 低频轮询（前端 5s 一次）+ 数据差分缓存，资源占用极低
  - 仅依赖 flask / flask-cors / psutil / requests
"""
import os
import time
import hmac
import json
import socket
import hashlib
import secrets
import platform
import datetime
import threading
from functools import wraps

import psutil
import requests
from flask import Flask, jsonify, request, session
from flask_cors import CORS

# ============================================================
# 配置与凭证持久化
# ============================================================
BASE_DIR = os.path.dirname(os.path.abspath(__file__))
CONFIG_FILE = os.path.join(BASE_DIR, "config.json")

DEFAULT_USERNAME = "admin"
DEFAULT_PASSWORD = "admin123"


def hash_password(password, salt=None, iterations=200_000):
    """使用 PBKDF2-HMAC-SHA256 生成密码哈希（标准库实现，无额外依赖）。"""
    salt = salt or secrets.token_hex(16)
    dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), iterations)
    return "pbkdf2_sha256${}${}${}".format(iterations, salt, dk.hex())


def verify_password(password, stored):
    """校验密码，使用恒定时间比较避免时序攻击。"""
    try:
        algo, iterations, salt, hashed = stored.split("$")
        if algo != "pbkdf2_sha256":
            return False
        dk = hashlib.pbkdf2_hmac("sha256", password.encode("utf-8"), salt.encode("utf-8"), int(iterations))
        return hmac.compare_digest(dk.hex(), hashed)
    except Exception:
        return False


def load_config():
    """读取配置，首次运行自动生成（含默认账号密码与随机 secret_key）。"""
    if os.path.exists(CONFIG_FILE):
        try:
            with open(CONFIG_FILE, "r", encoding="utf-8") as f:
                cfg = json.load(f)
            if "secret_key" in cfg and "password" in cfg:
                return cfg
        except Exception:
            pass
    cfg = {
        "secret_key": secrets.token_hex(32),
        "username": DEFAULT_USERNAME,
        "password": hash_password(DEFAULT_PASSWORD),
    }
    save_config(cfg)
    return cfg


def save_config(cfg):
    with open(CONFIG_FILE, "w", encoding="utf-8") as f:
        json.dump(cfg, f, ensure_ascii=False, indent=2)
    try:
        os.chmod(CONFIG_FILE, 0o600)
    except Exception:
        pass


CONFIG = load_config()

app = Flask(__name__)
app.secret_key = CONFIG["secret_key"]
app.config.update(
    SESSION_COOKIE_HTTPONLY=True,
    SESSION_COOKIE_SAMESITE="Lax",
    # 若通过 HTTPS(Nginx) 发布，建议改为 True
    SESSION_COOKIE_SECURE=False,
    PERMANENT_SESSION_LIFETIME=datetime.timedelta(days=7),
)
# 同源部署下 CORS 非必需，保留以方便本地联调
CORS(app, supports_credentials=True)

# ============================================================
# 登录失败节流（按 IP，简单内存计数）
# ============================================================
LOGIN_WINDOW = 60      # 秒
LOGIN_MAX_FAILS = 5    # 窗口内最大失败次数
_login_fails = {}      # ip -> [timestamps]
_fail_lock = threading.Lock()


def _too_many_fails(ip):
    now = time.time()
    with _fail_lock:
        stamps = [t for t in _login_fails.get(ip, []) if now - t < LOGIN_WINDOW]
        _login_fails[ip] = stamps
        return len(stamps) >= LOGIN_MAX_FAILS


def _record_fail(ip):
    with _fail_lock:
        _login_fails.setdefault(ip, []).append(time.time())


def _clear_fails(ip):
    with _fail_lock:
        _login_fails.pop(ip, None)


def require_auth(fn):
    """要求已登录会话，否则返回 401。"""
    @wraps(fn)
    def wrapper(*args, **kwargs):
        if not session.get("user"):
            return jsonify({"error": "unauthorized"}), 401
        return fn(*args, **kwargs)
    return wrapper


# ============================================================
# 系统监控采集
# ============================================================
class SystemMonitor:
    """低频采样的系统指标采集器；差分计算网络/磁盘速率并缓存公网 IP。"""

    def __init__(self):
        self.last_time = time.time()
        self.last_net = psutil.net_io_counters()
        self.last_disk_io = self._safe_disk_io()
        self.lock = threading.Lock()
        self.public_ip = "Checking..."
        self.last_ip_check = 0.0

    @staticmethod
    def _safe_disk_io():
        try:
            return psutil.disk_io_counters(perdisk=True) or {}
        except Exception:
            return {}

    def sample_rates(self):
        """返回 (tx, rx, 累计发送, 累计接收, 各磁盘读写速率)。"""
        with self.lock:
            now = time.time()
            duration = now - self.last_time
            if duration < 0.1:
                duration = 0.1

            cur_net = psutil.net_io_counters()
            tx = max(0.0, (cur_net.bytes_sent - self.last_net.bytes_sent) / duration)
            rx = max(0.0, (cur_net.bytes_recv - self.last_net.bytes_recv) / duration)

            cur_disk_io = self._safe_disk_io()
            disk_rates = {}
            for name, counters in cur_disk_io.items():
                last = self.last_disk_io.get(name)
                if last is not None:
                    disk_rates[name] = {
                        "r": max(0.0, (counters.read_bytes - last.read_bytes) / duration),
                        "w": max(0.0, (counters.write_bytes - last.write_bytes) / duration),
                    }

            self.last_time = now
            self.last_net = cur_net
            self.last_disk_io = cur_disk_io
            return tx, rx, cur_net.bytes_sent, cur_net.bytes_recv, disk_rates

    def get_public_ip(self):
        """公网 IP 每 300 秒刷新一次，避免频繁外网请求。"""
        if time.time() - self.last_ip_check > 300:
            self.last_ip_check = time.time()
            threading.Thread(target=self._fetch_ip, daemon=True).start()
        return self.public_ip

    def _fetch_ip(self):
        for url in ("https://api64.ipify.org?format=json", "https://ifconfig.me/ip"):
            try:
                r = requests.get(url, timeout=3)
                ip = r.json()["ip"] if "ipify" in url else r.text.strip()
                if ip:
                    self.public_ip = ip
                    return
            except Exception:
                continue


monitor = SystemMonitor()


# ============================================================
# 静态系统信息（启动时读取一次并缓存，避免每轮轮询重复解析）
# ============================================================
def _read_static_info():
    info = {"os": "--", "cpu_model": "--"}
    try:
        with open("/etc/os-release", "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("PRETTY_NAME="):
                    info["os"] = line.split("=", 1)[1].strip().strip('"')
                    break
    except Exception:
        pass
    try:
        with open("/proc/cpuinfo", "r", encoding="utf-8") as f:
            for line in f:
                if line.startswith("model name"):
                    info["cpu_model"] = line.split(":", 1)[1].strip()
                    break
    except Exception:
        pass
    return info


_STATIC_INFO = _read_static_info()

# 网卡地址缓存（60 秒刷新，net_if_addrs 读 /proc 成本低但无需每轮做）
_iface_cache = {"ts": 0.0, "data": []}


def _collect_ifaces():
    now = time.time()
    if now - _iface_cache["ts"] > 60:
        ifaces = []
        try:
            for name, addrs in psutil.net_if_addrs().items():
                if name == "lo":
                    continue
                ipv4 = next((a.address for a in addrs if a.family == socket.AF_INET), "")
                if not ipv4:
                    continue
                ifaces.append({"name": name, "ipv4": ipv4})
        except Exception:
            pass
        _iface_cache["data"] = ifaces
        _iface_cache["ts"] = now
    return _iface_cache["data"]


def _collect_conns():
    """TCP 连接统计（需 root；失败时返回空）。"""
    est = lsn = 0
    try:
        for c in psutil.net_connections(kind="inet"):
            if c.status == psutil.CONN_ESTABLISHED:
                est += 1
            elif c.status == psutil.CONN_LISTEN:
                lsn += 1
    except Exception:
        pass
    return {"est": est, "lsn": lsn}



def _collect_disks(disk_rates):
    disks = []
    try:
        for part in psutil.disk_partitions(all=False):
            device = part.device or ""
            mount = part.mountpoint or ""
            if any(x in device for x in ("loop", "snap", "ram", "overlay")) or "/docker" in mount:
                continue
            try:
                usage = psutil.disk_usage(mount)
            except Exception:
                continue
            dev_name = device.split("/")[-1]
            io_stat = {"r": 0.0, "w": 0.0}
            for key, val in disk_rates.items():
                if key in dev_name or dev_name in key:
                    io_stat = val
                    break
            disks.append({
                "mount": mount,
                "device": device,
                "total": usage.total,
                "used": usage.used,
                "percent": usage.percent,
                "io": io_stat,
            })
    except Exception:
        pass
    return sorted(disks, key=lambda x: x["mount"])


# ============================================================
# 接口：鉴权
# ============================================================
@app.route("/api/session", methods=["GET"])
def api_session():
    return jsonify({
        "authenticated": bool(session.get("user")),
        "username": session.get("user"),
    })


@app.route("/api/login", methods=["POST"])
def api_login():
    ip = request.headers.get("X-Real-IP") or request.remote_addr or "unknown"
    if _too_many_fails(ip):
        return jsonify({"error": "too_many_attempts",
                        "message": "尝试次数过多，请 60 秒后重试"}), 429

    data = request.get_json(silent=True) or {}
    username = (data.get("username") or "").strip()
    password = data.get("password") or ""

    cfg = load_config()
    if username == cfg.get("username") and verify_password(password, cfg.get("password", "")):
        session.permanent = True
        session["user"] = username
        _clear_fails(ip)
        return jsonify({"ok": True, "username": username})

    _record_fail(ip)
    return jsonify({"error": "invalid_credentials", "message": "账号或密码错误"}), 401


@app.route("/api/logout", methods=["POST"])
def api_logout():
    session.clear()
    return jsonify({"ok": True})


@app.route("/api/credentials", methods=["POST"])
@require_auth
def api_credentials():
    """修改账号/密码：需校验当前密码，随后写回 config.json。"""
    data = request.get_json(silent=True) or {}
    current = data.get("current_password") or ""
    new_username = (data.get("new_username") or "").strip()
    new_password = data.get("new_password") or ""

    cfg = load_config()
    if not verify_password(current, cfg.get("password", "")):
        return jsonify({"error": "invalid_current_password", "message": "当前密码不正确"}), 401

    if new_username:
        cfg["username"] = new_username
    if new_password:
        if len(new_password) < 6:
            return jsonify({"error": "weak_password", "message": "新密码至少 6 位"}), 400
        cfg["password"] = hash_password(new_password)

    save_config(cfg)
    # 用户信息变更后让当前会话同步
    session["user"] = cfg["username"]
    return jsonify({"ok": True, "username": cfg["username"]})


# ============================================================
# 接口：服务器监控
# ============================================================
@app.route("/api/stats", methods=["GET"])
@require_auth
def api_stats():
    try:
        tx, rx, total_tx, total_rx, disk_rates = monitor.sample_rates()
        mem = psutil.virtual_memory()
        try:
            load = list(psutil.getloadavg())
        except Exception:
            load = [0.0, 0.0, 0.0]
        uname = platform.uname()

        return jsonify({
            "cpu": {
                "total": psutil.cpu_percent(interval=None),
                "percpu": [round(x, 1) for x in psutil.cpu_percent(interval=None, percpu=True)],
            },
            "mem": {
                "percent": mem.percent,
                "used": mem.used,
                "total": mem.total,
                "available": mem.available,
            },
            "net": {
                "tx": tx, "rx": rx, "total_tx": total_tx, "total_rx": total_rx,
                "ifaces": _collect_ifaces(),
                "conns": _collect_conns(),
            },
            "disks": _collect_disks(disk_rates),
            "system": {
                "load": [round(x, 2) for x in load],
                "procs": len(psutil.pids()),
                "boot_time": datetime.datetime.fromtimestamp(psutil.boot_time()).strftime("%Y-%m-%d %H:%M:%S"),
                "uptime": int(time.time() - psutil.boot_time()),
                "kernel": uname.release,
                "hostname": socket.gethostname(),
                "public_ip": monitor.get_public_ip(),
                "server_time": datetime.datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "os": _STATIC_INFO["os"],
                "cpu_model": _STATIC_INFO["cpu_model"],
                "cpu_cores": psutil.cpu_count(logical=True) or 0,
            },
        })
    except Exception as e:
        return jsonify({"error": "collect_failed", "message": str(e)}), 500


if __name__ == "__main__":
    # 出于安全考虑，仅监听本地，由 Nginx 反向代理对外发布
    app.run(host="127.0.0.1", port=5000, threaded=True)