"""Runtime authority declarations for the HEL-032 + HEL-028 composition.

This module adds resolver-facing semantic roles to the immutable contract. It
contains ownership declarations only; package values are always resolved from
the HEL source files by :mod:`hel_runtime.tokens` and related accessors.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from types import MappingProxyType
from typing import Final, Mapping

from hel_environment_contract import (
    AUTHORITY_LAW,
    AuthorityDomain,
    EnvironmentOwner,
    OWNERSHIP,
    OwnershipDeclaration,
    owner_for,
)


class SemanticTokenRole(str, Enum):
    """Cross-package token aliases with a single explicit owner and source."""

    WORLD_BACKGROUND = "world.background"
    WORLD_STRUCTURE = "world.structure"
    ARCHITECTURAL_SURFACE = "world.surface.architectural"
    ARCHITECTURAL_OPTICAL_SURFACE = "world.surface.optical"
    WORLD_CONTENT_PRIMARY = "world.content.primary"
    WORLD_CONTENT_SECONDARY = "world.content.secondary"
    ENVIRONMENTAL_ROUTE_ACCENT = "world.route.accent"
    ENVIRONMENTAL_ROUTE_SECONDARY = "world.route.secondary"
    CARTOGRAPHIC_RISK = "world.risk.critical"
    WORLD_ARCHITECTURAL_RADIUS = "world.radius.architectural"
    WORLD_PAGE_SPACING = "world.spacing.page"
    WORLD_MOTION_DURATION = "world.motion.duration"
    OPERATOR_INSTRUMENT_SURFACE = "operator.surface.instrument"
    OPERATOR_INSTRUMENT_OPTICAL_SURFACE = "operator.surface.optical"
    OPERATOR_CONTENT_PRIMARY = "operator.content.primary"
    OPERATOR_CONTENT_SECONDARY = "operator.content.secondary"
    OPERATOR_CONTROL_PRIMARY = "operator.control.primary"
    OPERATOR_CONTROL_SECONDARY = "operator.control.secondary"
    OPERATOR_STATUS_CRITICAL = "operator.status.critical"
    OPERATOR_CONTROL_RADIUS = "operator.radius.control"
    OPERATOR_DENSE_SPACING = "operator.spacing.dense"
    OPERATOR_MOTION_DURATION = "operator.motion.duration"


@dataclass(frozen=True)
class TokenBinding:
    """Reference a token in one package without copying its raw value."""

    role: SemanticTokenRole
    owner: EnvironmentOwner
    token_path: str
    authority_domain: AuthorityDomain


def _binding(
    role: SemanticTokenRole,
    owner: EnvironmentOwner,
    token_path: str,
    domain: AuthorityDomain,
) -> TokenBinding:
    if owner_for(domain) is not owner:
        raise ValueError(f"Authority mismatch for semantic role {role.value}")
    return TokenBinding(role, owner, token_path, domain)


_TOKEN_BINDINGS = {
    SemanticTokenRole.WORLD_BACKGROUND: _binding(
        SemanticTokenRole.WORLD_BACKGROUND,
        EnvironmentOwner.WORLD,
        "color.semantic.environment.void",
        AuthorityDomain.ENVIRONMENTAL_SHELL,
    ),
    SemanticTokenRole.WORLD_STRUCTURE: _binding(
        SemanticTokenRole.WORLD_STRUCTURE,
        EnvironmentOwner.WORLD,
        "color.semantic.structure.primary",
        AuthorityDomain.GLOBAL_WORLD_ARCHITECTURE,
    ),
    SemanticTokenRole.ARCHITECTURAL_SURFACE: _binding(
        SemanticTokenRole.ARCHITECTURAL_SURFACE,
        EnvironmentOwner.WORLD,
        "color.semantic.surface.base",
        AuthorityDomain.PRIMARY_MATERIAL_IDENTITY,
    ),
    SemanticTokenRole.ARCHITECTURAL_OPTICAL_SURFACE: _binding(
        SemanticTokenRole.ARCHITECTURAL_OPTICAL_SURFACE,
        EnvironmentOwner.WORLD,
        "color.semantic.surface.optical",
        AuthorityDomain.PRIMARY_MATERIAL_IDENTITY,
    ),
    SemanticTokenRole.WORLD_CONTENT_PRIMARY: _binding(
        SemanticTokenRole.WORLD_CONTENT_PRIMARY,
        EnvironmentOwner.WORLD,
        "color.semantic.content.primary",
        AuthorityDomain.DISCOVERY_AND_SURVEY_LANGUAGE,
    ),
    SemanticTokenRole.WORLD_CONTENT_SECONDARY: _binding(
        SemanticTokenRole.WORLD_CONTENT_SECONDARY,
        EnvironmentOwner.WORLD,
        "color.semantic.content.secondary",
        AuthorityDomain.DISCOVERY_AND_SURVEY_LANGUAGE,
    ),
    SemanticTokenRole.ENVIRONMENTAL_ROUTE_ACCENT: _binding(
        SemanticTokenRole.ENVIRONMENTAL_ROUTE_ACCENT,
        EnvironmentOwner.WORLD,
        "color.semantic.signal.primary",
        AuthorityDomain.MARKET_CARTOGRAPHY,
    ),
    SemanticTokenRole.ENVIRONMENTAL_ROUTE_SECONDARY: _binding(
        SemanticTokenRole.ENVIRONMENTAL_ROUTE_SECONDARY,
        EnvironmentOwner.WORLD,
        "color.semantic.signal.secondary",
        AuthorityDomain.MARKET_CARTOGRAPHY,
    ),
    SemanticTokenRole.CARTOGRAPHIC_RISK: _binding(
        SemanticTokenRole.CARTOGRAPHIC_RISK,
        EnvironmentOwner.WORLD,
        "color.semantic.signal.critical",
        AuthorityDomain.GEOGRAPHIC_CAUSALITY,
    ),
    SemanticTokenRole.WORLD_ARCHITECTURAL_RADIUS: _binding(
        SemanticTokenRole.WORLD_ARCHITECTURAL_RADIUS,
        EnvironmentOwner.WORLD,
        "dimension.radius.architectural",
        AuthorityDomain.PAGE_LEVEL_COMPOSITION,
    ),
    SemanticTokenRole.WORLD_PAGE_SPACING: _binding(
        SemanticTokenRole.WORLD_PAGE_SPACING,
        EnvironmentOwner.WORLD,
        "dimension.space.5",
        AuthorityDomain.SPATIAL_COMPOSITION,
    ),
    SemanticTokenRole.WORLD_MOTION_DURATION: _binding(
        SemanticTokenRole.WORLD_MOTION_DURATION,
        EnvironmentOwner.WORLD,
        "duration.environmental",
        AuthorityDomain.WORLD_SCALE_MOTION,
    ),
    SemanticTokenRole.OPERATOR_INSTRUMENT_SURFACE: _binding(
        SemanticTokenRole.OPERATOR_INSTRUMENT_SURFACE,
        EnvironmentOwner.OPERATOR,
        "color.semantic.surface.base",
        AuthorityDomain.INSTRUMENT_CONTROLS,
    ),
    SemanticTokenRole.OPERATOR_INSTRUMENT_OPTICAL_SURFACE: _binding(
        SemanticTokenRole.OPERATOR_INSTRUMENT_OPTICAL_SURFACE,
        EnvironmentOwner.OPERATOR,
        "color.semantic.surface.optical",
        AuthorityDomain.INSTRUMENT_CONTROLS,
    ),
    SemanticTokenRole.OPERATOR_CONTENT_PRIMARY: _binding(
        SemanticTokenRole.OPERATOR_CONTENT_PRIMARY,
        EnvironmentOwner.OPERATOR,
        "color.semantic.content.primary",
        AuthorityDomain.DENSE_DATA_SURFACES,
    ),
    SemanticTokenRole.OPERATOR_CONTENT_SECONDARY: _binding(
        SemanticTokenRole.OPERATOR_CONTENT_SECONDARY,
        EnvironmentOwner.OPERATOR,
        "color.semantic.content.secondary",
        AuthorityDomain.DENSE_DATA_SURFACES,
    ),
    SemanticTokenRole.OPERATOR_CONTROL_PRIMARY: _binding(
        SemanticTokenRole.OPERATOR_CONTROL_PRIMARY,
        EnvironmentOwner.OPERATOR,
        "color.semantic.signal.primary",
        AuthorityDomain.BUTTONS_AND_INPUTS,
    ),
    SemanticTokenRole.OPERATOR_CONTROL_SECONDARY: _binding(
        SemanticTokenRole.OPERATOR_CONTROL_SECONDARY,
        EnvironmentOwner.OPERATOR,
        "color.semantic.signal.secondary",
        AuthorityDomain.ORDER_AND_STATUS_MECHANISMS,
    ),
    SemanticTokenRole.OPERATOR_STATUS_CRITICAL: _binding(
        SemanticTokenRole.OPERATOR_STATUS_CRITICAL,
        EnvironmentOwner.OPERATOR,
        "color.semantic.signal.critical",
        AuthorityDomain.RISK_CONTROL_CLARITY,
    ),
    SemanticTokenRole.OPERATOR_CONTROL_RADIUS: _binding(
        SemanticTokenRole.OPERATOR_CONTROL_RADIUS,
        EnvironmentOwner.OPERATOR,
        "dimension.radius.control",
        AuthorityDomain.BUTTONS_AND_INPUTS,
    ),
    SemanticTokenRole.OPERATOR_DENSE_SPACING: _binding(
        SemanticTokenRole.OPERATOR_DENSE_SPACING,
        EnvironmentOwner.OPERATOR,
        "dimension.space.3",
        AuthorityDomain.OPERATIONAL_SURFACE_SPACING,
    ),
    SemanticTokenRole.OPERATOR_MOTION_DURATION: _binding(
        SemanticTokenRole.OPERATOR_MOTION_DURATION,
        EnvironmentOwner.OPERATOR,
        "duration.fast",
        AuthorityDomain.ROUTINE_INTERACTION_SPEED,
    ),
}

TOKEN_BINDINGS: Final[Mapping[SemanticTokenRole, TokenBinding]] = MappingProxyType(
    _TOKEN_BINDINGS
)


def token_binding(role: SemanticTokenRole) -> TokenBinding:
    return TOKEN_BINDINGS[role]


__all__ = [
    "AUTHORITY_LAW",
    "OWNERSHIP",
    "OwnershipDeclaration",
    "SemanticTokenRole",
    "TOKEN_BINDINGS",
    "TokenBinding",
    "token_binding",
]
