"""Read-only incremental OANDA XAG/USD acquisition into the existing private SQLite store."""
from __future__ import annotations

import argparse
import json
import os
import re
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path
from urllib.error import HTTPError
from urllib.parse import urlencode
from urllib.request import HTTPRedirectHandler, Request, build_opener

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT))
from silver_candle_store import OANDA_LIVE, OANDA_PRACTICE, connect, import_archive


class NoRedirect(HTTPRedirectHandler):
    def redirect_request(self, *args):
        return None


def fetch(base, route, token, limit=2_000_000):
    opener = build_opener(NoRedirect())
    with opener.open(Request(base + route, headers={'Authorization': 'Bearer ' + token, 'Accept': 'application/json'}), timeout=15) as response:
        body = response.read(limit + 1)
    if len(body) > limit:
        raise ValueError('Provider response exceeds safety limit')
    return body


def main():
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument('--db', type=Path, required=True)
    p.add_argument('--history-days', type=int, default=14, choices=range(1, 31), metavar='1..30')
    args = p.parse_args()
    token = os.environ.get('HBE_OANDA_API_TOKEN')
    account = os.environ.get('HBE_OANDA_ACCOUNT_ID', '')
    environment = os.environ.get('HBE_OANDA_ENVIRONMENT')
    if not token or not re.fullmatch(r'[0-9-]{8,40}', account) or environment not in ('live', 'practice'):
        p.exit(2, 'Existing OANDA token, account identifier and environment must be configured privately. No provider request was made.\n')
    dbpath = args.db.resolve()
    if dbpath.is_relative_to(ROOT) and not dbpath.is_relative_to(ROOT / '.secrets'):
        p.exit(2, 'Choose a private database path outside Git or inside ignored .secrets/.\n')
    base = 'https://api-fxtrade.oanda.com' if environment == 'live' else 'https://api-fxpractice.oanda.com'
    provider = OANDA_LIVE if environment == 'live' else OANDA_PRACTICE
    try:
        entitlements = json.loads(fetch(base, '/v3/accounts/' + account + '/instruments?instruments=XAG_USD', token))
        if not any(x.get('name') == 'XAG_USD' for x in entitlements.get('instruments', [])):
            p.exit(2, 'XAG_USD entitlement absent; no candles were requested.\n')
        now = datetime.now(timezone.utc)
        dbpath.parent.mkdir(parents=True, exist_ok=True)
        total = 0
        with connect(dbpath) as db:
            last = db.execute('SELECT max(epoch) FROM candles WHERE provider=? AND minutes=5',(provider,)).fetchone()[0]
            start = datetime.fromtimestamp(last, timezone.utc) - timedelta(hours=1) if last else now - timedelta(days=args.history_days)
            if start > now:
                raise ValueError('Stored checkpoint is in the future')
            for _ in range(40):  # 30-day initial request in bounded chunks, then gap recovery from stored checkpoint.
                if start >= now:
                    break
                end = min(now, start + timedelta(days=7))
                query = urlencode({'price':'M','granularity':'M5','from':start.isoformat(timespec='seconds'),
                                   'to':end.isoformat(timespec='seconds'),'smooth':'false','includeFirst':'true'})
                route = '/v3/instruments/XAG_USD/candles?' + query
                body = fetch(base, route, token)
                if any(c.get('complete') is True for c in json.loads(body).get('candles', [])):
                    total += import_archive(db, body, provider, base + route, now)['new']
                start = end
            bounds = db.execute('SELECT count(*),min(epoch),max(epoch) FROM candles WHERE provider=? AND minutes=5',(provider,)).fetchone()
        stamps = [datetime.fromtimestamp(x, timezone.utc).isoformat() if x is not None else None for x in bounds[1:]]
        print(json.dumps({'provider':provider,'new':total,'total':bounds[0], 'firstOpen':stamps[0], 'lastOpen':stamps[1], 'caughtUp':start>=now}))
    except HTTPError as error:
        p.exit(2, f'OANDA request failed (HTTP {error.code}); no credentials or account identifiers logged.\n')
    except (ValueError, OSError, KeyError, TypeError):
        p.exit(2, 'Acquisition stopped on provider, integrity, or local storage failure; no secrets logged.\n')


if __name__ == '__main__':
    main()
