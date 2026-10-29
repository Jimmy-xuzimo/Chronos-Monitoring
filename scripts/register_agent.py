"""Interactive Windows registration. Credentials stay in memory; Token goes to a private file."""
import argparse
import csv
import getpass
import http.cookiejar
import io
import json
import os
from pathlib import Path
import subprocess
import urllib.request
from urllib.parse import urlsplit


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, *args, **kwargs):
        return None


def main():
    if os.name != 'nt':
        raise SystemExit('This helper registers the Windows Agent; run it on Windows.')
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--output', required=True)
    args = parser.parse_args()
    output = Path(args.output).resolve()
    private_dir = (Path(os.environ['LOCALAPPDATA']) / 'ChronosAgent').resolve()
    if output.parent != private_dir or output.exists():
        raise SystemExit('Use a new file directly inside %LOCALAPPDATA%/ChronosAgent.')
    private_dir.mkdir(exist_ok=True)
    sid = next(csv.reader(io.StringIO(subprocess.check_output(
        ['whoami', '/user', '/fo', 'csv', '/nh'], text=True))))[1]
    subprocess.run(['icacls', str(private_dir), '/inheritance:r', '/grant:r',
                    f'*{sid}:(OI)(CI)F', '*S-1-5-18:(OI)(CI)F'],
                   check=True, stdout=subprocess.DEVNULL)
    server = input('HTTPS panel URL: ').strip().rstrip('/')
    parsed = urlsplit(server)
    if parsed.scheme != 'https' or not parsed.hostname or parsed.username or parsed.password or parsed.path or parsed.query or parsed.fragment:
        raise SystemExit('An HTTPS origin without a path or embedded credentials is required.')
    opener = urllib.request.build_opener(urllib.request.HTTPCookieProcessor(http.cookiejar.CookieJar()), NoRedirect())

    def call(path, data=None, csrf=None):
        headers = {'Content-Type': 'application/json'}
        if csrf:
            headers['X-CSRF-Token'] = csrf
        request = urllib.request.Request(server + '/api/' + path,
                  data=json.dumps(data).encode() if data is not None else None,
                  headers=headers)
        with opener.open(request, timeout=15) as response:
            return json.load(response)

    username = input('Admin username [admin]: ').strip() or 'admin'
    session = call('session')
    login = call('login', {'username': username, 'password': getpass.getpass('Password: ')}, session['csrf'])
    agent = call('agents', {'name': input('Device name [Windows PC]: ').strip() or 'Windows PC'}, login['csrf'])
    with output.open('x', encoding='utf-8') as file:
        json.dump({'server': server, 'node_id': agent['id'], 'token': agent['token']}, file)
    try:
        call('logout', {}, login['csrf'])
    except Exception:
        pass
    print('Agent registered. Private configuration saved to:', output)
    print('Node ID:', agent['id'])


if __name__ == '__main__':
    main()
