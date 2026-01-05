import time, psutil, platform, threading, requests, datetime, socket
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

class SystemMonitor:
    def __init__(self):
        self.last_time = time.time()
        self.last_net = psutil.net_io_counters()
        self.last_disk_io = psutil.disk_io_counters(perdisk=True)
        self.lock = threading.Lock()
        self.public_ip = "Checking..."
        self.last_ip_check = 0

    def get_data(self):
        with self.lock:
            now = time.time()
            duration = now - self.last_time if now - self.last_time > 0.1 else 0.1
            c_net = psutil.net_io_counters()
            tx = (c_net.bytes_sent - self.last_net.bytes_sent) / duration
            rx = (c_net.bytes_recv - self.last_net.bytes_recv) / duration
            c_disk_io = psutil.disk_io_counters(perdisk=True)
            disk_rates = {}
            for disk_name, counters in c_disk_io.items():
                if disk_name in self.last_disk_io:
                    last = self.last_disk_io[disk_name]
                    disk_rates[disk_name] = {'r': (counters.read_bytes - last.read_bytes) / duration, 'w': (counters.write_bytes - last.write_bytes) / duration}
            self.last_time = now; self.last_net = c_net; self.last_disk_io = c_disk_io
            return tx, rx, c_net.bytes_sent, c_net.bytes_recv, disk_rates

    def get_ip(self):
        if time.time() - self.last_ip_check > 300:
            threading.Thread(target=self._fetch).start()
            self.last_ip_check = time.time()
        return self.public_ip
        
    def _fetch(self):
        try: self.public_ip = requests.get('https://api64.ipify.org?format=json', timeout=3).json()['ip']
        except: pass

monitor = SystemMonitor()

@app.route('/api/stats')
def stats():
    try:
        tx, rx, ttx, trx, disk_rates = monitor.get_data()
        mem = psutil.virtual_memory()
        load = psutil.getloadavg()
        uname = platform.uname()
        disks = []
        try:
            for p in psutil.disk_partitions(all=False):
                if any(x in p.device for x in ['loop', 'snap', 'ram', 'overlay']) or '/docker' in p.mountpoint: continue
                try:
                    u = psutil.disk_usage(p.mountpoint)
                    dev_name = p.device.split('/')[-1]
                    io_stat = {'r': 0, 'w': 0}
                    for k, v in disk_rates.items():
                        if k in dev_name or dev_name in k: io_stat = v; break
                    disks.append({"mount": p.mountpoint, "total": u.total, "percent": u.percent, "io": io_stat})
                except: pass
        except: pass
        
        temp = {'cpu': 0, 'wifi': 0, 'nvme': 0}
        try:
            for name, entries in psutil.sensors_temperatures().items():
                name = name.lower(); val = entries[0].current
                if 'cpu' in name or 'core' in name or 'pkg' in name: temp['cpu'] = val
                elif 'wifi' in name: temp['wifi'] = val
                elif 'nvme' in name: temp['nvme'] = val
        except: pass

        return jsonify({
            "cpu": { "total": psutil.cpu_percent(interval=None) },
            "mem": { "percent": mem.percent, "used": mem.used, "total": mem.total, "swap": psutil.swap_memory().percent },
            "net": { "tx": tx, "rx": rx, "total_tx": ttx, "total_rx": trx },
            "disks": sorted(disks, key=lambda x: x['mount']),
            "temp": temp,
            "system": { "load": load, "procs": len(psutil.pids()), "boot_time": datetime.datetime.fromtimestamp(psutil.boot_time()).strftime("%Y-%m-%d %H:%M:%S"), "kernel": uname.release, "hostname": socket.gethostname(), "public_ip": monitor.get_ip() }
        })
    except Exception as e: return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    # Listen only on localhost for security (requires Nginx)
    app.run(host='127.0.0.1', port=5000)