import hashlib
import pandas as pd

from silver_temporal_view_v2 import PUBLIC_ARCHIVE, published_runtime_id, read_published_observations


def test_briefing_archive_identifies_exact_instrument_lab_aggregate():
    result = read_published_observations(PUBLIC_ARCHIVE, PUBLIC_ARCHIVE.stat().st_mtime_ns)
    assert result['archiveDigest'] == hashlib.sha256(PUBLIC_ARCHIVE.read_text(encoding='utf-8').encode()).hexdigest()
    assert result['currentEligible'] is False
    holdout = result['sections']['longM5']['trailing']['dailyNewYork']['bullish trend']
    assert holdout['pullback']['p50'] == .140
    assert holdout['healthyPullback']['p50'] != holdout['pullback']['p50']


def test_runtime_reference_must_be_valid_and_never_reads_private_blob():
    match = 'HEL-035:2026-01-02T12:00:00.000Z'
    runtime = pd.DataFrame([{'Runtime ID': match, 'Payload Chunk': 'never surface raw payload'}])
    assert published_runtime_id(runtime) == match
    runtime.loc[0, 'Runtime ID'] = 'HEL-035:2100-01-02T12:00:00.000Z'
    assert published_runtime_id(runtime) is None
    runtime.loc[0, 'Runtime ID'] = 'other value'
    assert published_runtime_id(runtime) is None
