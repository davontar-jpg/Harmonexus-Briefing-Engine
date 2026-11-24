import json
from datetime import datetime, timezone

import pandas as pd
import pytest

from auction_intelligence_view import current_auction, read_auction_runtime
from silver_candle_store import OANDA_LIVE, OANDA_PRACTICE, aggregate, connect, import_archive, read_bars


def _bytes(candles, instrument='XAG_USD'):
    return json.dumps({'instrument': instrument, 'granularity':'M5', 'candles':candles}).encode()


def test_oanda_archive_requires_closed_utc_midpoint_and_isolated_checkpoints(tmp_path):
    db = connect(tmp_path / 'candles.sqlite')
    now = datetime(2026, 11, 24, 16, tzinfo=timezone.utc)
    rows = [{'time':f'2026-11-24T15:{minute:02d}:00.000000000Z', 'complete':True,
             'mid':{'o':'30.10','h':'30.30','l':'30.00','c':'30.15'}} for minute in (0, 5, 10)]
    rows.append({'time':'2026-11-24T16:00:00Z','complete':False})
    src = 'https://api-fxtrade.oanda.com/v3/instruments/XAG_USD/candles'
    assert import_archive(db, _bytes(rows), OANDA_LIVE, src, now)['new'] == 3
    assert import_archive(db, _bytes(rows), OANDA_LIVE, src, now)['new'] == 0
    assert len(aggregate(read_bars(db, OANDA_LIVE, 5), 5, 15)) == 1
    assert read_bars(db, OANDA_PRACTICE, 5) == []
    with pytest.raises(ValueError, match='identity'):
        import_archive(db, _bytes(rows, 'SI_FUTURES'), OANDA_LIVE, src, now)
    with pytest.raises(ValueError, match='Conflicting'):
        import_archive(db, _bytes(rows + [{**rows[0], 'mid':{'o':'30.10','h':'30.50','l':'30.00','c':'30.15'}}]), OANDA_LIVE, src, now)


def test_view_rejects_stale_practice_and_incomplete_runtime_chunks():
    context = {'schema':'harmonexus.operational-auction.v1','asOf':'2026-01-01T12:00:00Z','auction':{'state':'not_configured'}}
    rid = 'HEL-035:2026-01-01T12:00:00Z'
    raw = json.dumps({'runtime_id':rid,'operational_intelligence':context})
    f = pd.DataFrame([{'Runtime ID':rid, 'Payload Chunk':raw, 'Chunk Index':'1','Chunk Count':'1'}])
    assert read_auction_runtime(f) == context
    f.loc[0,'Chunk Count'] = '2'
    assert read_auction_runtime(f) is None
    t = datetime(2026, 11, 24, 16, tzinfo=timezone.utc)
    day = {'high':{'value':30.4,'barAt':'2026-11-24T15:55:00Z'},'low':{'value':29.9,'barAt':'2026-11-24T15:50:00Z'},'range':.5}
    packet = {'state':'current_verified_observation','environment':'live','instrument':'XAGUSD','price':30.1,'daily':day,
              'observedAt':'2026-11-24T15:55:00Z'}
    assert current_auction(packet, t)[0] == packet
    assert current_auction({**packet,'observedAt':'2026-11-24T15:30:00Z'}, t) == (None,'stale')
    assert current_auction({**packet,'environment':'practice'}, t)[0] is None
    assert current_auction({**packet,'daily':{}}, t)[0] is None
