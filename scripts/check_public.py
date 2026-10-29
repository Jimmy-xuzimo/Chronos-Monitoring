"""Check staged/tracked public files for obvious credentials and runtime artifacts."""
from pathlib import Path
import re
import subprocess
import sys

ROOT = Path(__file__).resolve().parents[1]
names = subprocess.check_output(['git', 'ls-files', '-z'], cwd=ROOT).decode().split('\0')
patterns = [
    re.compile(rb'gh[pousr]_[A-Za-z0-9]{30,}'),
    re.compile(rb'github_pat_[A-Za-z0-9_]{40,}'),
    re.compile(rb'-----BEGIN (?:RSA |EC |OPENSSH )?PRIVATE KEY-----'),
    re.compile(rb'AKIA[A-Z0-9]{16}'),
]
failures = []
for name in filter(None, names):
    path = ROOT / name
    if not path.is_file():
        continue
    parts = Path(name).parts
    if (path.name in {'config.json', 'agent-config.json', '.env', 'status.json'}
            or any(p in {'node_modules', '.venv'} for p in parts)
            or ('data' in parts and parts[:3] != ('examples', 'news', 'data'))
            or path.suffix in {'.sqlite', '.sqlite3', '.db', '.log', '.zip', '.gz'}):
        failures.append(name + ': runtime artifact')
    if any(pattern.search(path.read_bytes()) for pattern in patterns):
        failures.append(name + ': possible credential')
if failures:
    print('\n'.join(failures))
    sys.exit(1)
print('Public file check passed. Manual review is still required.')
