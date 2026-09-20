"""Receive one encrypted, scoped QA session; never persist it in the repository.

The private RSA key remains on this Actions runner. A maintainer encrypts the
Vercel-issued, short-lived preview link to the public key retained by this run.
Only ciphertext travels through the PR. No upstream code or commands are accepted.
"""
import base64
import json
import os
import subprocess
import time
from pathlib import Path
from urllib.request import Request, urlopen
from urllib.parse import urlparse, parse_qs

run_id = os.environ['GITHUB_RUN_ID']
commit = os.environ['GITHUB_SHA']
private_key = Path(os.environ['RUNNER_TEMP']) / 'uixo-preview-private.pem'
output = Path(os.environ['RUNNER_TEMP']) / 'uixo-preview-session.txt'
endpoint = 'https://api.github.com/repos/EmotiveImpact/uixo/issues/44/comments?per_page=100'
headers = {'Accept': 'application/vnd.github+json', 'Authorization': 'Bearer ' + os.environ['GH_TOKEN'], 'User-Agent': 'UIXO-read-only-preview-QA'}
prefix = 'UIXO-QA-SESSION:'
for attempt in range(120):
    with urlopen(Request(endpoint, headers=headers), timeout=15) as response:
        body = response.read(2000001)
    if len(body) > 2000000:
        raise RuntimeError('QA handoff response exceeded its byte budget.')
    comments = json.loads(body)
    for comment in reversed(comments):
        body = comment.get('body', '')
        if comment.get('user', {}).get('login') != 'EmotiveImpact' or not body.startswith(prefix):
            continue
        try:
            value = json.loads(body[len(prefix):].strip())
        except ValueError:
            continue
        if value.get('runId') != run_id or value.get('commit') != commit:
            continue
        encrypted = base64.b64decode(value['ciphertext'], validate=True)
        if len(encrypted) != 384:
            raise RuntimeError('Unexpected QA handoff size.')
        result = subprocess.run(['openssl', 'pkeyutl', '-decrypt', '-inkey', str(private_key), '-pkeyopt', 'rsa_padding_mode:oaep', '-pkeyopt', 'rsa_oaep_md:sha256', '-pkeyopt', 'rsa_mgf1_md:sha256'], input=encrypted, capture_output=True, check=True)
        url = result.stdout.decode().strip()
        parsed = urlparse(url)
        query = parse_qs(parsed.query)
        if parsed.scheme != 'https' or parsed.netloc != 'uixo-git-astra-provider-dd32cd-emotiveimpact-gmailcoms-projects.vercel.app' or parsed.path != '/' or parsed.fragment or set(query) != {'_vercel_share'}:
            raise RuntimeError('QA handoff did not name the reviewed preview.')
        output.write_text(url)
        output.chmod(0o600)
        print('Scoped preview session received; credentials withheld from logs and artifacts.')
        raise SystemExit(0)
    time.sleep(5)
raise RuntimeError('No matching encrypted preview session was received in this bounded run.')
