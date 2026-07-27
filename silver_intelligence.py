"""Read-only HEL-035 Silver Intelligence dashboard consumer.

This module does not calculate authority, freshness, confidence, or action
bias. It accepts the deterministic Apps Script runtime integration contract
and exposes an internal-preview view model consumed by ``app.py``.
"""

from __future__ import annotations

from dataclasses import dataclass
import json
import os
from typing import Any, Mapping


TARGET_INSTRUMENT = "XAGUSD"
SCHEMA_PREFIX = "HEL-035.schema."
INTERNAL_PREVIEW_ENV = "HARMONEXUS_HEL035_INTERNAL_PREVIEW"
INTEGRATION_SECTION_ORDER = (
    "Executive Market Assessment",
    "Evidence Integrity",
    "Monetary Environment",
    "VIX — Volatility Environment",
    "Liquidity Environment",
    "Silver Intelligence",
    "Market Structure",
)
OPERATOR_DECISION_FLOW = (
    "What is happening?",
    "Why?",
    "What does it mean for silver?",
    "What should I watch?",
    "How confident is the system?",
)

REQUIRED_FIELDS = frozenset(
    {
        "section_id",
        "section_name",
        "target_instrument",
        "as_of",
        "source_status",
        "freshness_status",
        "evidence_state",
        "current_state",
        "silver_impact",
        "action_bias",
        "confidence_score",
        "confidence_label",
        "dashboard_summary",
        "source_provenance",
        "schema_version",
        "rule_version",
    }
)


@dataclass(frozen=True)
class SilverDashboardViewModel:
    """Typed, presentation-only view of a SilverInterpretation."""

    section_id: str
    section_name: str
    target_instrument: str
    as_of: str
    headline: str
    status: str
    freshness: str
    current_state: str
    silver_impact: str
    action_bias: str
    action_language: str
    confidence_score: float | None
    confidence_label: str
    primary_risk: str
    required_confirmation: str
    expandable: Mapping[str, Any]
    schema_version: str
    rule_version: str


def internal_preview_enabled(environ: Mapping[str, str] | None = None) -> bool:
    """Return true only for an explicit internal-preview environment flag."""

    values = os.environ if environ is None else environ
    return str(values.get(INTERNAL_PREVIEW_ENV, "")).strip().lower() == "true"


def parse_silver_interpretation(payload: str | Mapping[str, Any]) -> Mapping[str, Any]:
    """Validate and return a serialized HEL-035 interpretation.

    No missing field is defaulted because defaulting authority or status could
    turn unavailable evidence into a misleading conclusion.
    """

    value = json.loads(payload) if isinstance(payload, str) else dict(payload)
    missing = sorted(REQUIRED_FIELDS.difference(value))
    if missing:
        raise ValueError(f"Missing SilverInterpretation fields: {', '.join(missing)}")
    if value["target_instrument"] != TARGET_INSTRUMENT:
        raise ValueError("HEL-035 accepts XAGUSD only")
    if not str(value["schema_version"]).startswith(SCHEMA_PREFIX):
        raise ValueError("Unsupported HEL-035 schema version")
    if not isinstance(value["dashboard_summary"], Mapping):
        raise ValueError("dashboard_summary must be an object")
    return value


def dashboard_view_model(payload: str | Mapping[str, Any]) -> SilverDashboardViewModel:
    """Project the authoritative dashboard renderer output without recomputing it."""

    value = parse_silver_interpretation(payload)
    dashboard = value["dashboard_summary"]
    if dashboard.get("target_instrument") != TARGET_INSTRUMENT:
        raise ValueError("Dashboard summary target must be XAGUSD")
    return SilverDashboardViewModel(
        section_id=str(value["section_id"]),
        section_name=str(value["section_name"]),
        target_instrument=TARGET_INSTRUMENT,
        as_of=str(value["as_of"]),
        headline=str(dashboard["headline"]),
        status=str(dashboard["status"]),
        freshness=str(dashboard["freshness"]),
        current_state=str(value["current_state"]),
        silver_impact=str(dashboard["silver_impact"]),
        action_bias=str(dashboard["action_bias"]),
        action_language=str(dashboard["action_language"]),
        confidence_score=value["confidence_score"],
        confidence_label=str(value["confidence_label"]),
        primary_risk=str(dashboard["primary_risk"]),
        required_confirmation=str(dashboard["required_confirmation"]),
        expandable=dict(dashboard["expandable"]),
        schema_version=str(value["schema_version"]),
        rule_version=str(value["rule_version"]),
    )


def monetary_environment_preview(
    payload: str | Mapping[str, Any],
    environ: Mapping[str, str] | None = None,
) -> Mapping[str, Any]:
    """Expose every authoritative Monetary Environment surface internally.

    This is a presentation-only projection. It cannot recompute or alter the
    interpretation, and it refuses to render unless the explicit HEL-035
    internal-preview flag is enabled.
    """

    if not internal_preview_enabled(environ):
        raise PermissionError("HEL-035 internal preview is disabled")
    value = parse_silver_interpretation(payload)
    if value["section_id"] != "monetary_environment":
        raise ValueError("Monetary Environment preview requires monetary_environment")
    required = {
        "monetary_environment",
        "monetary_contradictions",
        "long_summary",
        "short_summary",
        "confidence_basis",
        "reason_codes",
        "source_provenance",
    }
    missing = sorted(required.difference(value))
    if missing:
        raise ValueError(f"Missing Monetary Environment preview fields: {', '.join(missing)}")
    monetary = value["monetary_environment"]
    if not isinstance(monetary, Mapping) or not isinstance(
        monetary.get("data_freshness"), Mapping
    ):
        raise ValueError("Monetary Environment freshness contract is required")
    return {
        "structured_interpretation": value,
        "long_rendering": value["long_summary"],
        "short_rendering": value["short_summary"],
        "dashboard_view_model": value["dashboard_summary"],
        "provenance": value["source_provenance"],
        "confidence_basis": value["confidence_basis"],
        "reason_codes": value["reason_codes"],
        "freshness": monetary["data_freshness"],
        "production_effect": value.get("production_effect"),
    }


def vix_volatility_environment_preview(
    payload: str | Mapping[str, Any],
    environ: Mapping[str, str] | None = None,
) -> Mapping[str, Any]:
    """Expose the deterministic VIX section only inside HEL-035 preview."""

    if not internal_preview_enabled(environ):
        raise PermissionError("HEL-035 internal preview is disabled")
    value = parse_silver_interpretation(payload)
    if value["section_id"] != "vix_volatility_environment":
        raise ValueError(
            "VIX preview requires vix_volatility_environment"
        )
    required = {
        "vix_volatility_environment",
        "vix_contradictions",
        "long_summary",
        "short_summary",
        "notification_preview",
        "confidence_basis",
        "reason_codes",
        "source_provenance",
    }
    missing = sorted(required.difference(value))
    if missing:
        raise ValueError(f"Missing VIX preview fields: {', '.join(missing)}")
    detail = value["vix_volatility_environment"]
    if not isinstance(detail, Mapping) or not isinstance(
        detail.get("data_freshness"), Mapping
    ):
        raise ValueError("VIX freshness contract is required")
    return {
        "structured_interpretation": value,
        "long_rendering": value["long_summary"],
        "short_rendering": value["short_summary"],
        "dashboard_view_model": value["dashboard_summary"],
        "notification_rendering": value["notification_preview"],
        "provenance": value["source_provenance"],
        "confidence_basis": value["confidence_basis"],
        "freshness": detail["data_freshness"],
        "reason_codes": value["reason_codes"],
        "production_effect": value.get("production_effect"),
    }


def liquidity_environment_preview(
    payload: str | Mapping[str, Any],
    environ: Mapping[str, str] | None = None,
) -> Mapping[str, Any]:
    """Expose the capability-limited Liquidity Environment internally."""

    if not internal_preview_enabled(environ):
        raise PermissionError("HEL-035 internal preview is disabled")
    value = parse_silver_interpretation(payload)
    if value["section_id"] != "liquidity_environment":
        raise ValueError("Liquidity preview requires liquidity_environment")
    required = {
        "liquidity_environment",
        "long_summary",
        "short_summary",
        "confidence_basis",
        "limitations",
        "reason_codes",
        "source_provenance",
    }
    missing = sorted(required.difference(value))
    if missing:
        raise ValueError(f"Missing Liquidity preview fields: {', '.join(missing)}")
    detail = value["liquidity_environment"]
    if not isinstance(detail, Mapping) or not isinstance(
        detail.get("capability"), Mapping
    ):
        raise ValueError("Liquidity capability contract is required")
    return {
        "capability": detail["capability"],
        "provider_status": detail["provider_status"],
        "structured_interpretation": value,
        "long_rendering": value["long_summary"],
        "short_rendering": value["short_summary"],
        "dashboard_view_model": value["dashboard_summary"],
        "provenance": value["source_provenance"],
        "limitations": value["limitations"],
        "reason_codes": value["reason_codes"],
        "production_effect": value.get("production_effect"),
    }


def silver_external_intelligence_preview(
    payload: str | Mapping[str, Any],
    environ: Mapping[str, str] | None = None,
) -> Mapping[str, Any]:
    """Expose the read-only HEL-034 translation inside HEL-035 preview.

    This projection does not read research paths, recalculate a candidate,
    change a disposition, increment an OOS count, or infer a production action.
    """

    if not internal_preview_enabled(environ):
        raise PermissionError("HEL-035 internal preview is disabled")
    value = parse_silver_interpretation(payload)
    if value["section_id"] != "silver_intelligence":
        raise ValueError("Silver Intelligence preview requires silver_intelligence")
    required = {
        "silver_intelligence",
        "long_summary",
        "short_summary",
        "confidence_basis",
        "limitations",
        "reason_codes",
        "source_provenance",
        "production_effect",
    }
    missing = sorted(required.difference(value))
    if missing:
        raise ValueError(f"Missing Silver Intelligence preview fields: {', '.join(missing)}")
    detail = value["silver_intelligence"]
    if not isinstance(detail, Mapping):
        raise ValueError("Silver Intelligence contract is required")
    subsections = detail.get("subsections")
    if not isinstance(subsections, list):
        raise ValueError("Silver Intelligence subsections must be a list")
    subsection_fields = {
        "subsection_id",
        "subsection_name",
        "source_label",
        "current_state",
        "interpretation",
        "silver_impact",
        "action_bias",
        "primary_risk",
        "required_confirmation",
        "confidence",
        "evidence",
        "freshness",
        "provenance",
    }
    for subsection in subsections:
        if not isinstance(subsection, Mapping):
            raise ValueError("Silver Intelligence subsection must be an object")
        missing_subsection = sorted(subsection_fields.difference(subsection))
        if missing_subsection:
            raise ValueError(
                "Missing Silver Intelligence subsection fields: "
                + ", ".join(missing_subsection)
            )
        if subsection["source_label"] not in {
            "Shadow Observation",
            "Validation",
            "Production Approved",
            "Research",
            "Blocked",
        }:
            raise ValueError("Unsupported Silver Intelligence authority label")
    if value["production_effect"] != "none":
        raise ValueError("Silver Intelligence production_effect must be none")
    provenance = value["source_provenance"]
    if provenance.get("authority") != "HEL-034" or not provenance.get("read_only"):
        raise ValueError("Silver Intelligence requires read-only HEL-034 authority")
    return {
        "structured_interpretation": value,
        "long_rendering": value["long_summary"],
        "short_rendering": value["short_summary"],
        "dashboard_view_model": value["dashboard_summary"],
        "overall_external_confirmation": detail["overall_external_confirmation"],
        "subsections": subsections,
        "provenance": provenance,
        "confidence_basis": value["confidence_basis"],
        "limitations": value["limitations"],
        "reason_codes": value["reason_codes"],
        "production_effect": value["production_effect"],
    }


def market_structure_preview(
    payload: str | Mapping[str, Any],
    environ: Mapping[str, str] | None = None,
) -> Mapping[str, Any]:
    """Expose the existing-structure interpretation inside HEL-035 preview."""

    if not internal_preview_enabled(environ):
        raise PermissionError("HEL-035 internal preview is disabled")
    value = parse_silver_interpretation(payload)
    if value["section_id"] != "market_structure":
        raise ValueError("Market Structure preview requires market_structure")
    required = {
        "market_structure",
        "long_summary",
        "short_summary",
        "confidence_basis",
        "limitations",
        "reason_codes",
        "source_provenance",
        "production_effect",
    }
    missing = sorted(required.difference(value))
    if missing:
        raise ValueError(f"Missing Market Structure preview fields: {', '.join(missing)}")
    detail = value["market_structure"]
    if not isinstance(detail, Mapping):
        raise ValueError("Market Structure contract is required")
    required_detail = {
        "current_structure",
        "auction_state",
        "liquidity_sweep_status",
        "higher_timeframe_bias",
        "current_session",
        "continuation_state",
        "exhaustion_state",
        "structural_confirmation",
        "structural_weakness",
        "internal_harmonexus_structure",
        "data_freshness",
    }
    missing_detail = sorted(required_detail.difference(detail))
    if missing_detail:
        raise ValueError(
            "Missing Market Structure fields: " + ", ".join(missing_detail)
        )
    provenance = value["source_provenance"]
    if provenance.get("authority") != "Existing Harmonexus Market Structure":
        raise ValueError("Existing Harmonexus Market Structure authority is required")
    if not provenance.get("read_only") or provenance.get("structure_recalculated"):
        raise ValueError("Market Structure source must remain read-only and unrecalculated")
    if provenance.get("order_book_consumed"):
        raise ValueError("Market Structure may not consume order-book evidence")
    if value["production_effect"] != "none":
        raise ValueError("Market Structure production_effect must be none")
    return {
        "structured_interpretation": value,
        "long_rendering": value["long_summary"],
        "short_rendering": value["short_summary"],
        "dashboard_view_model": value["dashboard_summary"],
        "market_structure": detail,
        "provenance": provenance,
        "confidence_basis": value["confidence_basis"],
        "freshness": detail["data_freshness"],
        "limitations": value["limitations"],
        "reason_codes": value["reason_codes"],
        "production_effect": value["production_effect"],
    }


def executive_market_assessment_preview(
    payload: str | Mapping[str, Any],
    environ: Mapping[str, str] | None = None,
) -> Mapping[str, Any]:
    """Expose the one-paragraph HEL-035 executive synthesis internally."""

    if not internal_preview_enabled(environ):
        raise PermissionError("HEL-035 internal preview is disabled")
    value = parse_silver_interpretation(payload)
    if value["section_id"] != "executive_market_assessment":
        raise ValueError(
            "Executive Market Assessment preview requires executive_market_assessment"
        )
    required = {
        "executive_market_assessment",
        "supporting_evidence",
        "contradicting_evidence",
        "operator_summary",
        "long_summary",
        "short_summary",
        "confidence_basis",
        "reason_codes",
        "source_provenance",
        "intended_long_briefing_order",
        "production_effect",
    }
    missing = sorted(required.difference(value))
    if missing:
        raise ValueError(
            "Missing Executive Market Assessment fields: " + ", ".join(missing)
        )
    detail = value["executive_market_assessment"]
    if not isinstance(detail, Mapping):
        raise ValueError("Executive Market Assessment contract is required")
    if value["intended_long_briefing_order"] != 1:
        raise ValueError("Executive Market Assessment must be first in future long briefing")
    if value["production_effect"] != "none":
        raise ValueError("Executive Market Assessment production_effect must be none")
    provenance = value["source_provenance"]
    if provenance.get("new_evidence_created") is not False:
        raise ValueError("Executive Market Assessment may not create evidence")
    if provenance.get("statistics_summarized") is not False:
        raise ValueError("Executive Market Assessment may not summarize statistics")
    paragraph = str(value["operator_summary"])
    if "\n\n" in paragraph:
        raise ValueError("Executive Market Assessment must be one paragraph")
    if any(token in paragraph.lower() for token in ("%", "correlation", "percentile", " score ")):
        raise ValueError("Executive Market Assessment contains statistical language")
    return {
        "structured_interpretation": value,
        "long_rendering": value["long_summary"],
        "short_rendering": value["short_summary"],
        "dashboard_view_model": value["dashboard_summary"],
        "paragraph": paragraph,
        "current_market_state": detail["current_market_state"],
        "supporting_evidence": value["supporting_evidence"],
        "contradicting_evidence": value["contradicting_evidence"],
        "primary_risk": value["primary_risk"],
        "required_confirmation": value["required_confirmation"],
        "current_operational_bias": detail["current_operational_bias"],
        "confidence_label": value["confidence_label"],
        "provenance": provenance,
        "reason_codes": value["reason_codes"],
        "production_effect": value["production_effect"],
    }


def silver_briefing_integration_preview(
    payload: str | Mapping[str, Any],
    environ: Mapping[str, str] | None = None,
) -> Mapping[str, Any]:
    """Project the integrated HEL-035 surfaces without recalculating them."""

    if not internal_preview_enabled(environ):
        raise PermissionError("HEL-035 internal preview is disabled")
    value = json.loads(payload) if isinstance(payload, str) else dict(payload)
    required = {
        "target_instrument",
        "section_order",
        "sections",
        "long_briefing",
        "short_briefing",
        "dashboard",
        "silver_card_preview",
        "notification",
        "production_effect",
        "integration_version",
    }
    missing = sorted(required.difference(value))
    if missing:
        raise ValueError(
            "Missing HEL-035 integration fields: " + ", ".join(missing)
        )
    if value["target_instrument"] != TARGET_INSTRUMENT:
        raise ValueError("HEL-035 integration accepts XAGUSD only")
    if tuple(value["section_order"]) != INTEGRATION_SECTION_ORDER:
        raise ValueError("HEL-035 integration section order is invalid")
    if value["production_effect"] != "none":
        raise ValueError("HEL-035 integration production_effect must be none")

    sections = value["sections"]
    if not isinstance(sections, list) or len(sections) != len(INTEGRATION_SECTION_ORDER):
        raise ValueError("HEL-035 integration requires every runtime section")
    names = tuple(str(section.get("section_name", "")) for section in sections)
    if names != INTEGRATION_SECTION_ORDER:
        raise ValueError("HEL-035 structured sections are out of order")
    for section in sections:
        if section.get("target_instrument") != TARGET_INSTRUMENT:
            raise ValueError("Every integrated section must target XAGUSD")
        if section.get("production_effect") != "none":
            raise ValueError("Integrated sections may not mutate production")
        for field in (
            "current_state",
            "silver_impact",
            "confidence_label",
            "long_summary",
            "short_summary",
            "dashboard_summary",
        ):
            if field not in section:
                raise ValueError(
                    f"Integrated section {section.get('section_name')} lacks {field}"
                )

    long_briefing = str(value["long_briefing"])
    positions = []
    cursor = 0
    for section in sections:
        heading = str(section["long_summary"]).strip().splitlines()[0]
        marker = heading + "\n" if not positions else "\n" + heading + "\n"
        position = long_briefing.find(marker, cursor)
        if position < 0:
            raise ValueError("Long briefing does not preserve HEL-035 section order")
        positions.append(position)
        cursor = position + len(marker)
    existing_macro = long_briefing.find("MARKET REGIME:")
    if existing_macro >= 0 and positions[-1] > existing_macro:
        raise ValueError("Existing macro sections must follow HEL-035")

    short_briefing = str(value["short_briefing"])
    for section in sections:
        for text in (
            section["section_name"],
            str(section["current_state"]),
            str(section["silver_impact"]),
            str(section["confidence_label"]),
        ):
            if text not in short_briefing:
                raise ValueError("Short briefing lost required section meaning")

    dashboard = value["dashboard"]
    if (
        dashboard.get("layout_policy")
        != "headline_interpretation_conclusion_expandable_evidence"
    ):
        raise ValueError("Dashboard must render interpretation before statistics")
    if tuple(dashboard.get("operator_flow", ())) != OPERATOR_DECISION_FLOW:
        raise ValueError("Dashboard operator decision flow is invalid")
    if tuple(dashboard.get("section_order", ())) != INTEGRATION_SECTION_ORDER:
        raise ValueError("Dashboard section order is invalid")
    dashboard_sections = dashboard.get("sections", [])
    if len(dashboard_sections) != len(INTEGRATION_SECTION_ORDER):
        raise ValueError("Dashboard must contain every runtime section")
    for section in dashboard_sections:
        required_card = {
            "section_id",
            "section_name",
            "headline",
            "interpretation",
            "silver_impact",
            "operational_conclusion",
            "primary_risk",
            "required_confirmation",
            "confidence",
            "freshness",
            "expandable_details",
        }
        if not required_card.issubset(section):
            raise ValueError("Dashboard section layering is incomplete")
        if not isinstance(section["interpretation"], str):
            raise ValueError("Dashboard interpretation must remain primary prose")
        required_expansion = {
            "evidence",
            "metrics",
            "sources",
            "freshness",
            "reason_codes",
            "research_notes",
            "limitations",
        }
        if not required_expansion.issubset(section["expandable_details"]):
            raise ValueError("Dashboard expansion contract is incomplete")
        collapsed = {
            str(section.get("headline", "")).strip().lower(),
            str(section.get("interpretation", "")).strip().lower(),
            str(section.get("silver_impact", "")).strip().lower(),
            str(section.get("operational_conclusion", "")).strip().lower(),
            str(section.get("required_confirmation", "")).strip().lower(),
            str(section.get("primary_risk", "")).strip().lower(),
        }
        expanded_scalars: set[str] = set()

        def collect_scalars(item: Any) -> None:
            if isinstance(item, Mapping):
                for child in item.values():
                    collect_scalars(child)
            elif isinstance(item, list):
                for child in item:
                    collect_scalars(child)
            elif item is not None:
                text = str(item).strip().lower()
                if text:
                    expanded_scalars.add(text)

        collect_scalars(section["expandable_details"])
        duplicates = collapsed.intersection(expanded_scalars).difference({""})
        if duplicates:
            raise ValueError("Dashboard expansion duplicates summarized information")

    performance = dashboard.get("performance", {})
    if (
        performance.get("cached_interpretation_preferred") is not True
        or performance.get("source_objects_reused") is not True
        or performance.get("network_calls_added") != 0
        or performance.get("background_jobs_added") != 0
    ):
        raise ValueError("Dashboard performance contract is invalid")

    shadow = next(
        section for section in dashboard_sections
        if section.get("section_id") == "silver_intelligence"
    )
    if shadow.get("authority_label") != "Shadow Observation":
        raise ValueError("HEL-034 shadow intelligence must remain labeled")

    card = value["silver_card_preview"]
    if (
        card.get("status") != "preview_only"
        or card.get("current_production_card_preserved") is not True
        or card.get("card_redesigned") is not False
        or card.get("production_effect") != "none"
    ):
        raise ValueError("Silver card preview crossed the production boundary")

    notification = value["notification"]
    if (
        notification.get("new_alerts") is not False
        or notification.get("independent_section_notifications") is not False
        or notification.get("message_surface") != "long_briefing"
    ):
        raise ValueError("HEL-035 integration may not create notification behavior")

    return {
        "structured_integration": value,
        "long_briefing": long_briefing,
        "short_briefing": short_briefing,
        "dashboard": dashboard,
        "silver_card_preview": card,
        "notification": notification,
        "section_order": list(INTEGRATION_SECTION_ORDER),
        "production_effect": value["production_effect"],
    }
