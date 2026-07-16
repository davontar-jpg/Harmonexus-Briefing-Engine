"""Component ownership and package-contract access for dual HEL surfaces."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from types import MappingProxyType
from typing import Final, Mapping

from hel_environment_contract import AuthorityDomain, EnvironmentOwner

from .loader import EnvironmentPackage


class ComponentRole(str, Enum):
    APPLICATION_SHELL = "application_shell"
    GLOBAL_NAVIGATION = "global_navigation"
    BRIEFING_CARD = "briefing_card"
    CONTEXT_CARD_BACK = "context_card_back"
    INSTRUMENT_LAB = "instrument_lab"
    SIGNAL_AUDIT = "signal_audit"
    OPERATIONS = "operations"
    DATA_EXPLORER = "data_explorer"
    CHART_AND_GAUGE = "chart_and_gauge"
    RISK_AND_INVALIDATION = "risk_and_invalidation"
    SOURCE_FRESHNESS_CONTROL = "source_freshness_control"
    SYSTEM_FEEDBACK = "system_feedback"
    OPERATOR_CONTROL = "operator_control"
    INSTRUMENT_SELECTOR = "instrument_selector"
    SOURCE_SELECTOR = "source_selector"
    TIME_FRESHNESS_CONTROL = "time_freshness_control"
    STATUS_SUMMARY = "status_summary"
    METRIC_INSTRUMENT = "metric_instrument"
    DATA_TABLE = "data_table"
    SCENARIO_CONTROL = "scenario_control"
    ALERT_NOTICE = "alert_notice"
    PROGRESS_LOADING = "progress_loading"
    EMPTY_STATE = "empty_state"
    EXPANDABLE_INSPECTION = "expandable_inspection"
    JSON_RAW_INSPECTION = "json_raw_inspection"
    FILTER_CONTROL = "filter_control"
    DATE_CALENDAR_CONTROL = "date_calendar_control"


class OperationalState(str, Enum):
    """Text-first states shared by every HEL-028 operational instrument."""

    NOMINAL = "nominal"
    INFORMATIONAL = "informational"
    STALE = "stale"
    WARNING = "warning"
    CRITICAL = "critical"
    ACKNOWLEDGED = "acknowledged"
    UNAVAILABLE = "unavailable"
    LOADING = "loading"
    FAILED = "failed"


@dataclass(frozen=True)
class ComponentOwnership:
    role: ComponentRole
    structure_owner: EnvironmentOwner
    interaction_owner: EnvironmentOwner
    structure_domain: AuthorityDomain
    interaction_domain: AuthorityDomain


def _ownership(
    role: ComponentRole,
    structure_owner: EnvironmentOwner,
    interaction_owner: EnvironmentOwner,
    structure_domain: AuthorityDomain,
    interaction_domain: AuthorityDomain,
) -> ComponentOwnership:
    return ComponentOwnership(
        role,
        structure_owner,
        interaction_owner,
        structure_domain,
        interaction_domain,
    )


_COMPONENT_OWNERSHIP = {
    ComponentRole.APPLICATION_SHELL: _ownership(
        ComponentRole.APPLICATION_SHELL,
        EnvironmentOwner.WORLD,
        EnvironmentOwner.WORLD,
        AuthorityDomain.ENVIRONMENTAL_SHELL,
        AuthorityDomain.ENVIRONMENTAL_STATE_TRANSITIONS,
    ),
    ComponentRole.GLOBAL_NAVIGATION: _ownership(
        ComponentRole.GLOBAL_NAVIGATION,
        EnvironmentOwner.WORLD,
        EnvironmentOwner.OPERATOR,
        AuthorityDomain.GLOBAL_NAVIGATION_METAPHOR,
        AuthorityDomain.KEYBOARD_INTERACTION,
    ),
    ComponentRole.BRIEFING_CARD: _ownership(
        ComponentRole.BRIEFING_CARD,
        EnvironmentOwner.WORLD,
        EnvironmentOwner.OPERATOR,
        AuthorityDomain.MARKET_CARTOGRAPHY,
        AuthorityDomain.FOCUS_BEHAVIOR,
    ),
    ComponentRole.CONTEXT_CARD_BACK: _ownership(
        ComponentRole.CONTEXT_CARD_BACK,
        EnvironmentOwner.WORLD,
        EnvironmentOwner.OPERATOR,
        AuthorityDomain.MARKET_CARTOGRAPHY,
        AuthorityDomain.INSPECTION_INSTRUMENTS,
    ),
    ComponentRole.INSTRUMENT_LAB: _ownership(
        ComponentRole.INSTRUMENT_LAB,
        EnvironmentOwner.WORLD,
        EnvironmentOwner.OPERATOR,
        AuthorityDomain.PAGE_LEVEL_COMPOSITION,
        AuthorityDomain.INSPECTION_INSTRUMENTS,
    ),
    ComponentRole.SIGNAL_AUDIT: _ownership(
        ComponentRole.SIGNAL_AUDIT,
        EnvironmentOwner.WORLD,
        EnvironmentOwner.OPERATOR,
        AuthorityDomain.GEOGRAPHIC_CAUSALITY,
        AuthorityDomain.DENSE_DATA_SURFACES,
    ),
    ComponentRole.OPERATIONS: _ownership(
        ComponentRole.OPERATIONS,
        EnvironmentOwner.WORLD,
        EnvironmentOwner.OPERATOR,
        AuthorityDomain.PAGE_LEVEL_COMPOSITION,
        AuthorityDomain.ORDER_AND_STATUS_MECHANISMS,
    ),
    ComponentRole.DATA_EXPLORER: _ownership(
        ComponentRole.DATA_EXPLORER,
        EnvironmentOwner.WORLD,
        EnvironmentOwner.OPERATOR,
        AuthorityDomain.MACRO_GEOGRAPHY,
        AuthorityDomain.DENSE_DATA_SURFACES,
    ),
    ComponentRole.CHART_AND_GAUGE: _ownership(
        ComponentRole.CHART_AND_GAUGE,
        EnvironmentOwner.WORLD,
        EnvironmentOwner.OPERATOR,
        AuthorityDomain.CROSS_ASSET_RELATIONSHIP_VISUALIZATION,
        AuthorityDomain.INSPECTION_INSTRUMENTS,
    ),
    ComponentRole.RISK_AND_INVALIDATION: _ownership(
        ComponentRole.RISK_AND_INVALIDATION,
        EnvironmentOwner.WORLD,
        EnvironmentOwner.OPERATOR,
        AuthorityDomain.GEOGRAPHIC_CAUSALITY,
        AuthorityDomain.RISK_CONTROL_CLARITY,
    ),
    ComponentRole.SOURCE_FRESHNESS_CONTROL: _ownership(
        ComponentRole.SOURCE_FRESHNESS_CONTROL,
        EnvironmentOwner.WORLD,
        EnvironmentOwner.OPERATOR,
        AuthorityDomain.DISCOVERY_AND_SURVEY_LANGUAGE,
        AuthorityDomain.SOURCE_FRESHNESS_CONTROLS,
    ),
    ComponentRole.SYSTEM_FEEDBACK: _ownership(
        ComponentRole.SYSTEM_FEEDBACK,
        EnvironmentOwner.WORLD,
        EnvironmentOwner.OPERATOR,
        AuthorityDomain.ENVIRONMENTAL_ATMOSPHERE,
        AuthorityDomain.SYSTEM_FEEDBACK_MECHANISMS,
    ),
    ComponentRole.OPERATOR_CONTROL: _ownership(
        ComponentRole.OPERATOR_CONTROL,
        EnvironmentOwner.OPERATOR,
        EnvironmentOwner.OPERATOR,
        AuthorityDomain.INSTRUMENT_CONTROLS,
        AuthorityDomain.BUTTONS_AND_INPUTS,
    ),
    ComponentRole.INSTRUMENT_SELECTOR: _ownership(
        ComponentRole.INSTRUMENT_SELECTOR,
        EnvironmentOwner.OPERATOR,
        EnvironmentOwner.OPERATOR,
        AuthorityDomain.INSTRUMENT_CONTROLS,
        AuthorityDomain.KEYBOARD_INTERACTION,
    ),
    ComponentRole.SOURCE_SELECTOR: _ownership(
        ComponentRole.SOURCE_SELECTOR,
        EnvironmentOwner.WORLD,
        EnvironmentOwner.OPERATOR,
        AuthorityDomain.DISCOVERY_AND_SURVEY_LANGUAGE,
        AuthorityDomain.SOURCE_FRESHNESS_CONTROLS,
    ),
    ComponentRole.TIME_FRESHNESS_CONTROL: _ownership(
        ComponentRole.TIME_FRESHNESS_CONTROL,
        EnvironmentOwner.WORLD,
        EnvironmentOwner.OPERATOR,
        AuthorityDomain.DISCOVERY_AND_SURVEY_LANGUAGE,
        AuthorityDomain.SOURCE_FRESHNESS_CONTROLS,
    ),
    ComponentRole.STATUS_SUMMARY: _ownership(
        ComponentRole.STATUS_SUMMARY,
        EnvironmentOwner.WORLD,
        EnvironmentOwner.OPERATOR,
        AuthorityDomain.ENVIRONMENTAL_STATE_TRANSITIONS,
        AuthorityDomain.ORDER_AND_STATUS_MECHANISMS,
    ),
    ComponentRole.METRIC_INSTRUMENT: _ownership(
        ComponentRole.METRIC_INSTRUMENT,
        EnvironmentOwner.WORLD,
        EnvironmentOwner.OPERATOR,
        AuthorityDomain.GEOGRAPHIC_CAUSALITY,
        AuthorityDomain.NUMERIC_TYPOGRAPHY,
    ),
    ComponentRole.DATA_TABLE: _ownership(
        ComponentRole.DATA_TABLE,
        EnvironmentOwner.WORLD,
        EnvironmentOwner.OPERATOR,
        AuthorityDomain.MACRO_GEOGRAPHY,
        AuthorityDomain.DENSE_DATA_SURFACES,
    ),
    ComponentRole.SCENARIO_CONTROL: _ownership(
        ComponentRole.SCENARIO_CONTROL,
        EnvironmentOwner.WORLD,
        EnvironmentOwner.OPERATOR,
        AuthorityDomain.GEOGRAPHIC_CAUSALITY,
        AuthorityDomain.SCENARIO_CONTROLS,
    ),
    ComponentRole.ALERT_NOTICE: _ownership(
        ComponentRole.ALERT_NOTICE,
        EnvironmentOwner.WORLD,
        EnvironmentOwner.OPERATOR,
        AuthorityDomain.ENVIRONMENTAL_ATMOSPHERE,
        AuthorityDomain.ALERT_ACKNOWLEDGEMENT,
    ),
    ComponentRole.PROGRESS_LOADING: _ownership(
        ComponentRole.PROGRESS_LOADING,
        EnvironmentOwner.WORLD,
        EnvironmentOwner.OPERATOR,
        AuthorityDomain.ENVIRONMENTAL_STATE_TRANSITIONS,
        AuthorityDomain.SYSTEM_FEEDBACK_MECHANISMS,
    ),
    ComponentRole.EMPTY_STATE: _ownership(
        ComponentRole.EMPTY_STATE,
        EnvironmentOwner.WORLD,
        EnvironmentOwner.OPERATOR,
        AuthorityDomain.DISCOVERY_AND_SURVEY_LANGUAGE,
        AuthorityDomain.SYSTEM_FEEDBACK_MECHANISMS,
    ),
    ComponentRole.EXPANDABLE_INSPECTION: _ownership(
        ComponentRole.EXPANDABLE_INSPECTION,
        EnvironmentOwner.WORLD,
        EnvironmentOwner.OPERATOR,
        AuthorityDomain.GEOGRAPHIC_CAUSALITY,
        AuthorityDomain.INSPECTION_INSTRUMENTS,
    ),
    ComponentRole.JSON_RAW_INSPECTION: _ownership(
        ComponentRole.JSON_RAW_INSPECTION,
        EnvironmentOwner.WORLD,
        EnvironmentOwner.OPERATOR,
        AuthorityDomain.MARKET_CARTOGRAPHY,
        AuthorityDomain.DENSE_DATA_SURFACES,
    ),
    ComponentRole.FILTER_CONTROL: _ownership(
        ComponentRole.FILTER_CONTROL,
        EnvironmentOwner.OPERATOR,
        EnvironmentOwner.OPERATOR,
        AuthorityDomain.INSTRUMENT_CONTROLS,
        AuthorityDomain.ROUTINE_INTERACTION_SPEED,
    ),
    ComponentRole.DATE_CALENDAR_CONTROL: _ownership(
        ComponentRole.DATE_CALENDAR_CONTROL,
        EnvironmentOwner.WORLD,
        EnvironmentOwner.OPERATOR,
        AuthorityDomain.DISCOVERY_AND_SURVEY_LANGUAGE,
        AuthorityDomain.BUTTONS_AND_INPUTS,
    ),
}

COMPONENT_OWNERSHIP: Final[Mapping[ComponentRole, ComponentOwnership]] = (
    MappingProxyType(_COMPONENT_OWNERSHIP)
)


@dataclass(frozen=True)
class DualComponentResolver:
    world: EnvironmentPackage
    operator: EnvironmentPackage

    def ownership(self, role: ComponentRole) -> ComponentOwnership:
        return COMPONENT_OWNERSHIP[role]

    def package_contract(
        self, owner: EnvironmentOwner, contract_name: str
    ) -> Mapping[str, object]:
        package = self.world if owner is EnvironmentOwner.WORLD else self.operator
        contracts = package.document("components")["contracts"]
        try:
            return contracts[contract_name]
        except KeyError as exc:
            raise KeyError(
                f"{package.environment_id} has no component contract '{contract_name}'"
            ) from exc


__all__ = [
    "COMPONENT_OWNERSHIP",
    "ComponentOwnership",
    "ComponentRole",
    "DualComponentResolver",
    "OperationalState",
]
