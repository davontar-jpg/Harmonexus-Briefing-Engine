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
]
