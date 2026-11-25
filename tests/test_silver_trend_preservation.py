from datetime import date, datetime, timedelta, timezone

from silver_temporal import Bar
from silver_trend_preservation import path_outcome, trading_days, distinction
from silver_trend_executive_view import ORDER, _references, load_trend_reference, load_executive_points, render_point_cards
from tools.build_silver_trend_executive import executive, points


def test_trading_horizons_are_not_calendar_period_ranges():
    wednesday = date(2024, 8, 7)
    assert trading_days(wednesday, 5) == [
        date(2024, 8, 7), date(2024, 8, 8), date(2024, 8, 9),
        date(2024, 8, 12), date(2024, 8, 13),
    ]
    assert trading_days(date(2024, 8, 6), 4)[-1] == date(2024, 8, 9)


def test_recovered_depth_distinguishes_terminal_drawdown_and_mirrors_directions():
    start = datetime(2025, 1, 2, 14, tzinfo=timezone.utc)
    def path(values):
        return [Bar(start+timedelta(minutes=5*i), p, p+.01, p-.01, p) for i,p in enumerate(values)]
    bullish = path_outcome(path([31,30.5,31.4,30.6]),30,1,1)
    bearish = path_outcome(path([29,29.5,28.6,29.4]),30,-1,1)
    for result in (bullish,bearish):
        assert result["state"] == "healthy"
        assert round(result["recovered"],3)==.5
        assert round(result["drawdown"],3)==.8
    assert path_outcome(path([31,30.5,29.5]),30,1,1)["state"] == "reversal"
    assert path_outcome(path([30.02,30.12,29.97]),30,1,1)["state"] == "consolidation"


def test_drawdown_separation_is_directionally_interpretable_and_missing_stays_missing():
    assert distinction([{"state":"healthy","drawdown":1},{"state":"failure","drawdown":2}])["largerDrawdownAUC"]==1
    assert distinction([{"state":"healthy","drawdown":1},{"state":"reversal","drawdown":1}])["largerDrawdownAUC"]==.5
    assert distinction([])["largerDrawdownAUC"] is None


def test_published_research_respects_sample_gates_and_reference_parity():
    packet=load_trend_reference()
    data=packet["long"]["horizons"]
    assert packet["operationalValidated"] is packet["brokerPointVerified"] is False
    assert set(data)==set(ORDER)
    lines=packet["briefing"]["short"]
    assert packet["briefing"]["email"][:len(lines)]==lines
    refs=list(_references(data))
    for r in refs:
        match=next(line for line in lines if line.startswith(r["Horizon"]+" "))
        if r["Reference ($/oz)"]=="Withheld":
            assert f'{r["Direction"].lower()} withheld (n={r["Recovered n"]})' in match
        else:
            assert r["Recovered n"]>=25
            assert f'{r["Direction"].lower()} ${r["Reference ($/oz)"]}/oz (n={r["Recovered n"]})' in match
    assert all(r["Reference ($/oz)"]!="Withheld" for r in refs if r["Horizon"]=="Weekly")
    assert all(r["Reference ($/oz)"]=="Withheld" for r in refs if r["Horizon"]=="Monthly")


def test_executive_projection_has_exact_points_and_no_monthly_promotion():
    packet = load_executive_points()
    e = packet["executive"]
    assert e == executive(load_trend_reference())
    assert points(0.6005) == 601
    assert points(None) is None
    assert [(r["key"], list(r["points"].values())) for r in e["rows"]] == [
        ("daily",[177,166]),("weekly",[595,601]),("monthly",[None,None])
    ]
    assert "Monthly trend trail: Pending sufficient evidence." in e["text"]
    for token in ("p75","n=","Rolling weekly","Observable-prefix","%"):
        assert token not in e["text"]
    assert "broker unverified" in e["qualification"]
    assert "Not adjusted" in e["qualification"]
    html = render_point_cards(e)
    assert "PRIMARY HOLDING REFERENCE" in html
    for value in (177,166,595,601):
        assert f"<span>{value}</span> <small>pts</small>" in html
    assert packet["checks"]["monthlyQualified"] is packet["checks"]["currentNormalizationQualified"] is False
