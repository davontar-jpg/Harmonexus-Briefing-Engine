"""Immutable ownership contract for the Harmonexus dual-HEL environment.

This module contains declarations only. It intentionally defines no colors,
dimensions, timings, type scales, component markup, or application behavior.
Visual values remain in the selected HEL packages and are resolved by the
presentation layer that consumes this contract.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from types import MappingProxyType
from typing import Final, Mapping, Tuple


class EnvironmentOwner(str, Enum):
    """The only environments permitted to own dual-HEL presentation domains."""

    WORLD = "HEL-032"
    OPERATOR = "HEL-028"


class AuthorityDomain(str, Enum):
    """Presentation domains with an immutable owner."""

    GLOBAL_WORLD_ARCHITECTURE = "global_world_architecture"
    SPATIAL_COMPOSITION = "spatial_composition"
    ENVIRONMENTAL_SHELL = "environmental_shell"
    MARKET_CARTOGRAPHY = "market_cartography"
    GLOBAL_NAVIGATION_METAPHOR = "global_navigation_metaphor"
    GEOGRAPHIC_CAUSALITY = "geographic_causality"
    MACRO_GEOGRAPHY = "macro_geography"
    CROSS_ASSET_RELATIONSHIP_VISUALIZATION = "cross_asset_relationship_visualization"
    ENVIRONMENTAL_LIGHTING = "environmental_lighting"
    PRIMARY_MATERIAL_IDENTITY = "primary_material_identity"
    ENVIRONMENTAL_ATMOSPHERE = "environmental_atmosphere"
    PAGE_LEVEL_COMPOSITION = "page_level_composition"
    WORLD_SCALE_MOTION = "world_scale_motion"
    ENVIRONMENTAL_STATE_TRANSITIONS = "environmental_state_transitions"
    GLOBAL_RESPONSIVE_SPATIAL_MODEL = "global_responsive_spatial_model"
    DISCOVERY_AND_SURVEY_LANGUAGE = "discovery_and_survey_language"
    OPERATOR_REACH_ZONES = "operator_reach_zones"
    INSTRUMENT_CONTROLS = "instrument_controls"
    ACTION_HIERARCHY = "action_hierarchy"
    BUTTONS_AND_INPUTS = "buttons_and_inputs"
    DENSE_DATA_SURFACES = "dense_data_surfaces"
    EXECUTION_AND_DECISION_RAILS = "execution_and_decision_rails"
    NUMERIC_TYPOGRAPHY = "numeric_typography"
    ORDER_AND_STATUS_MECHANISMS = "order_and_status_mechanisms"
    RISK_CONTROL_CLARITY = "risk_control_clarity"
    ALERT_ACKNOWLEDGEMENT = "alert_acknowledgement"
    FOCUS_BEHAVIOR = "focus_behavior"
    KEYBOARD_INTERACTION = "keyboard_interaction"
    ROUTINE_INTERACTION_SPEED = "routine_interaction_speed"
    INSPECTION_INSTRUMENTS = "inspection_instruments"
    SOURCE_FRESHNESS_CONTROLS = "source_freshness_controls"
    SCENARIO_CONTROLS = "scenario_controls"
    BRIEFING_OPERATOR_SURFACES = "briefing_operator_surfaces"
    SYSTEM_FEEDBACK_MECHANISMS = "system_feedback_mechanisms"
    OPERATIONAL_SURFACE_SPACING = "operational_surface_spacing"


class PrecedenceMode(str, Enum):
    """How the secondary layer may participate in an owned domain."""

    OWNER_EXCLUSIVE = "owner_exclusive"
    OPERATOR_REFINES_WITHIN_WORLD = "operator_refines_within_world"
    ACCESSIBILITY_STRICTEST_WINS = "accessibility_strictest_wins"
    APPLICATION_LOGIC_EXCLUDED = "application_logic_excluded"


@dataclass(frozen=True)
class OwnershipDeclaration:
    """Typed authority statement without implementation or visual values."""

    domain: AuthorityDomain
    owner: EnvironmentOwner
    mode: PrecedenceMode
    boundary: str


WORLD_DOMAINS: Final[Tuple[AuthorityDomain, ...]] = (
    AuthorityDomain.GLOBAL_WORLD_ARCHITECTURE,
    AuthorityDomain.SPATIAL_COMPOSITION,
    AuthorityDomain.ENVIRONMENTAL_SHELL,
    AuthorityDomain.MARKET_CARTOGRAPHY,
    AuthorityDomain.GLOBAL_NAVIGATION_METAPHOR,
    AuthorityDomain.GEOGRAPHIC_CAUSALITY,
    AuthorityDomain.MACRO_GEOGRAPHY,
    AuthorityDomain.CROSS_ASSET_RELATIONSHIP_VISUALIZATION,
    AuthorityDomain.ENVIRONMENTAL_LIGHTING,
    AuthorityDomain.PRIMARY_MATERIAL_IDENTITY,
    AuthorityDomain.ENVIRONMENTAL_ATMOSPHERE,
    AuthorityDomain.PAGE_LEVEL_COMPOSITION,
    AuthorityDomain.WORLD_SCALE_MOTION,
    AuthorityDomain.ENVIRONMENTAL_STATE_TRANSITIONS,
    AuthorityDomain.GLOBAL_RESPONSIVE_SPATIAL_MODEL,
    AuthorityDomain.DISCOVERY_AND_SURVEY_LANGUAGE,
)

OPERATOR_DOMAINS: Final[Tuple[AuthorityDomain, ...]] = (
    AuthorityDomain.OPERATOR_REACH_ZONES,
    AuthorityDomain.INSTRUMENT_CONTROLS,
    AuthorityDomain.ACTION_HIERARCHY,
    AuthorityDomain.BUTTONS_AND_INPUTS,
    AuthorityDomain.DENSE_DATA_SURFACES,
    AuthorityDomain.EXECUTION_AND_DECISION_RAILS,
    AuthorityDomain.NUMERIC_TYPOGRAPHY,
    AuthorityDomain.ORDER_AND_STATUS_MECHANISMS,
    AuthorityDomain.RISK_CONTROL_CLARITY,
    AuthorityDomain.ALERT_ACKNOWLEDGEMENT,
    AuthorityDomain.FOCUS_BEHAVIOR,
    AuthorityDomain.KEYBOARD_INTERACTION,
    AuthorityDomain.ROUTINE_INTERACTION_SPEED,
    AuthorityDomain.INSPECTION_INSTRUMENTS,
    AuthorityDomain.SOURCE_FRESHNESS_CONTROLS,
    AuthorityDomain.SCENARIO_CONTROLS,
    AuthorityDomain.BRIEFING_OPERATOR_SURFACES,
    AuthorityDomain.SYSTEM_FEEDBACK_MECHANISMS,
    AuthorityDomain.OPERATIONAL_SURFACE_SPACING,
)


def _declaration(
    domain: AuthorityDomain,
    owner: EnvironmentOwner,
    mode: PrecedenceMode,
    boundary: str,
) -> OwnershipDeclaration:
    return OwnershipDeclaration(
        domain=domain,
        owner=owner,
        mode=mode,
        boundary=boundary,
    )


_OWNERSHIP = {
    domain: _declaration(
        domain,
        EnvironmentOwner.WORLD,
        PrecedenceMode.OWNER_EXCLUSIVE,
        "HEL-028 may mount instruments inside this world but may not replace it.",
    )
    for domain in WORLD_DOMAINS
}
_OWNERSHIP.update(
    {
        domain: _declaration(
            domain,
            EnvironmentOwner.OPERATOR,
            PrecedenceMode.OPERATOR_REFINES_WITHIN_WORLD,
            "HEL-028 governs the instrument behavior while inheriting HEL-032 world context.",
        )
        for domain in OPERATOR_DOMAINS
    }
)

OWNERSHIP: Final[Mapping[AuthorityDomain, OwnershipDeclaration]] = MappingProxyType(
    _OWNERSHIP
)

AUTHORITY_LAW: Final[str] = (
    "HEL-032 controls the world; HEL-028 controls the instruments."
)

CONFLICT_RESOLUTION: Final[Tuple[str, ...]] = (
    "HEL-032 wins for world architecture, materials, atmosphere, and page composition.",
    "HEL-028 wins for operator controls, dense data presentation, ergonomics, and action behavior.",
    "HEL-028 may refine a HEL-032 surface but may not replace its environmental identity.",
    "HEL-028 may reduce decorative friction but may not remove cartographic causality.",
    "HEL-028 may increase legibility and density but may not create a generic dealing dashboard.",
    "The strictest accessibility requirement wins without transferring visual ownership.",
    "Neither environment may alter business logic, market data, scoring, or integrations.",
    "Visual values are resolved from package tokens; this contract never duplicates them.",
)

FORBIDDEN_COMBINATIONS: Final[Tuple[str, ...]] = (
    "HEL-028 global shell with HEL-032 used only as decorative accents",
    "HEL-028 material or lighting tokens applied to the page-level world",
    "HEL-032 atmospheric motion applied to routine operator control feedback",
    "raw visual values copied from either package into this authority module",
    "operator controls that erase route, terrain, boundary, or discovery causality",
    "world decoration that obscures risk, status, freshness, focus, or acknowledgement",
    "presentation-layer authority used to change business or trading behavior",
)


def owner_for(domain: AuthorityDomain) -> EnvironmentOwner:
    """Return the declared owner for a presentation domain."""

    return OWNERSHIP[domain].owner


__all__ = [
    "AUTHORITY_LAW",
    "CONFLICT_RESOLUTION",
    "FORBIDDEN_COMBINATIONS",
    "OPERATOR_DOMAINS",
    "OWNERSHIP",
    "WORLD_DOMAINS",
    "AuthorityDomain",
    "EnvironmentOwner",
    "OwnershipDeclaration",
    "PrecedenceMode",
    "owner_for",
]
