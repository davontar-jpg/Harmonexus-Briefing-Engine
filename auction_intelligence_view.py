"""Presentation only: the bound Apps Script runtime is the live auction authority."""
import json
from datetime import datetime, timezone
from math import isfinite

import pandas as pd
import streamlit as st

import hel_cartographer as hel


LABELS = {
    'not_configured': 'No authorized continuous candle feed is configured',
    'authorization_missing': 'Broker authorization is incomplete',
    'authorization_failed': 'Broker rejected the candle authorization',
    'instrument_not_entitled': 'Broker entitlement for XAG/USD is missing',
    'practice_observation': 'Practice data only; not live evidence',
    'session_calendar_unverified': 'Broker session hours are unverified',
    'scheduled_closure': 'Outside the configured broker session',
    'provider_unavailable': 'Source unavailable; no levels published',
    'stale': 'Source observation is stale',
    'missing': 'No validated observation',
    'incomplete_session': 'Expected closed bars are missing',
    'current_verified_observation': 'Current verified closed-bar observation',
    'published_daily': 'Latest expected daily observation',
    'publication_delay': 'One scheduled daily update behind',
    'shadow_current': 'Current shadow observation only',
    'factor_observation': 'Recent factor event; not an OHLC series',
    'covered': 'Published calendar coverage available',
    'verification_due': 'Official dates due for recheck',
    'coverage_ending': 'Published coverage ending',
    'expired': 'Published coverage expired',
}


def _stamp(value):
    try:
        d = datetime.fromisoformat(value)
        return d if d.tzinfo else None
    except (TypeError, ValueError):
        return None


def read_auction_runtime(frame):
    if frame is None or frame.empty or not {'Runtime ID', 'Payload Chunk', 'Chunk Index', 'Chunk Count'}.issubset(frame.columns):
        return None
    rid = str(frame.iloc[-1]['Runtime ID'])
    if not rid.startswith('HEL-035:'):
        return None
    try:
        subset = frame[frame['Runtime ID'].astype(str) == rid]
        chunks = [(int(row['Chunk Index']), int(row['Chunk Count']), str(row['Payload Chunk'])) for _, row in subset.iterrows()]
        if len(chunks) > 32 or sorted(x[0] for x in chunks) != list(range(1, len(chunks)+1)) or any(x[1] != len(chunks) for x in chunks):
            return None
        raw = ''.join(x[2] for x in sorted(chunks))
        if len(raw) > 1_440_000:
            return None
        packet = json.loads(raw)
        op = packet.get('operational_intelligence')
        if packet.get('runtime_id') != rid or not isinstance(op, dict) or op.get('schema') != 'harmonexus.operational-auction.v1':
            return None
        stamp = _stamp(op.get('asOf'))
        return op if stamp and stamp <= datetime.now(timezone.utc) else None
    except (TypeError, ValueError, AttributeError, KeyError):
        return None


def current_auction(packet, now):
    if not isinstance(packet, dict):
        return None, 'missing'
    state = packet.get('state', 'missing')
    if state != 'current_verified_observation':
        return None, state
    stamp = _stamp(packet.get('observedAt'))
    def valid_price(value):
        return isinstance(value, (int, float)) and not isinstance(value, bool) and isfinite(value) and value > 0

    def valid_range(window):
        return (isinstance(window, dict) and isinstance(window.get('range'), (int, float)) and isfinite(window['range'])
                and window['range'] >= 0 and all(isinstance(window.get(key), dict) and valid_price(window[key].get('value'))
                    and _stamp(window[key].get('barAt')) for key in ('high','low')) and window['high']['value'] >= window['low']['value'])

    if (not stamp or packet.get('environment') != 'live' or packet.get('instrument') != 'XAGUSD'
            or not valid_price(packet.get('price')) or not valid_range(packet.get('daily'))
            or packet.get('weekly') is not None and not valid_range(packet['weekly'])):
        return None, 'missing'
    age = (now-stamp).total_seconds()
    return (packet, state) if 0 <= age <= 1200 else (None, 'stale')


def render_auction_intelligence(op, table):
    packet = (op or {}).get('auction') or {}
    current, state = current_auction(packet, datetime.now(timezone.utc))
    caption = LABELS.get(state, LABELS['missing']) if op else 'Operational runtime has not been published for this source.'
    st.markdown(hel.inspection_surface('Live auction · XAGUSD', caption, state='informational' if current else 'unavailable'), unsafe_allow_html=True)
    if packet.get('observedAt'):
        st.caption('Latest verified candle close: '+str(packet['observedAt']))
    if current:
        st.caption(f"Latest completed 5-minute midpoint: ${current['price']:.3f}/oz · {current['priceBasis']}")
        rows = []
        for title, window in [('Daily', current['daily']), ('Weekly', current.get('weekly'))]:
            if window:
                rows.append({'Period':title, 'High':window['high']['value'], 'High bar (UTC)':window['high']['barAt'],
                             'Low':window['low']['value'], 'Low bar (UTC)':window['low']['barAt'], 'Range ($/oz)':window['range']})
        table(pd.DataFrame(rows),'Verified developing ranges and extreme bars','auction_live_ranges')
        if current.get('weekly') is None:
            st.caption('Weekly extremes withheld because earlier scheduled bars are incomplete.')
        if current.get('dailyBaseline'):
            b = current['dailyBaseline']
            st.caption(f"Daily range: {b['consumedPct']}% of the median of {b['sample']} comparable sessions. Not a remaining-expansion forecast.")
        if current.get('boundary'):
            b = current['boundary']
            st.caption(f"Prior session {b['day']}: ${b['high']:.3f} high · ${b['low']:.3f} low. Acceptance requires two closed five-minute bars beyond that boundary.")
        table(pd.DataFrame([{'Session':x['name'], 'State':x['status'].title(), 'Opens UTC':x['opensAt'],
                             'Observed range':(x.get('range') or {}).get('range'), 'Added range':x.get('addedRange')}
                            for x in current.get('sessions', [])]),'Market-center windows','auction_live_sessions')
    if packet.get('missingBars'):
        st.caption(f"Missing expected bars: {packet['missingBars']}")
    if op:
        with st.expander('Source health · observation dates', expanded=False):
            rows = [{'Source':r['label'], 'Provider':r['provider'], 'Observed':r['observation'] or 'Not available',
                     'Status':LABELS.get(r['state'], LABELS['missing'])} for r in op.get('health', [])]
            rows.insert(0, {'Source':'XAGUSD candles', 'Provider':packet.get('provider') or 'None configured',
                            'Observed':packet.get('observedAt') or 'Not available', 'Status':caption})
            table(pd.DataFrame(rows),'Source health · observation dates','auction_source_health')
            calendar = op.get('calendar') or {}
            if calendar.get('through'):
                st.caption(f"Official calendar reviewed {calendar['verifiedOn']} · through {calendar['through']} · next review {calendar['nextReview']}.")
                if calendar.get('warning'):
                    st.caption(calendar['warning'])
