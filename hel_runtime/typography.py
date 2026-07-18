"""Typed typography roles split between world identity and operator numerics."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from types import MappingProxyType
from typing import Any, Final, Mapping

from hel_environment_contract import EnvironmentOwner

from .loader import EnvironmentPackage


class TypographyRole(str, Enum):
    GLOBAL_DISPLAY = "global.display"
    GLOBAL_INTERFACE = "global.interface"
    GLOBAL_NARRATIVE_SCALE = "global.narrative_scale"
    OPERATOR_NUMERIC = "operator.numeric"
    OPERATOR_LABEL_TRACKING = "operator.label_tracking"
    OPERATOR_DENSE_LINE_HEIGHT = "operator.dense_line_height"


@dataclass(frozen=True)
class TypographyBinding:
    role: TypographyRole
    owner: EnvironmentOwner
    source_path: str


_TYPOGRAPHY_BINDINGS = {
    TypographyRole.GLOBAL_DISPLAY: TypographyBinding(
        TypographyRole.GLOBAL_DISPLAY, EnvironmentOwner.WORLD, "families.display"
    ),
    TypographyRole.GLOBAL_INTERFACE: TypographyBinding(
        TypographyRole.GLOBAL_INTERFACE, EnvironmentOwner.WORLD, "families.interface"
    ),
    TypographyRole.GLOBAL_NARRATIVE_SCALE: TypographyBinding(
        TypographyRole.GLOBAL_NARRATIVE_SCALE, EnvironmentOwner.WORLD, "scale"
    ),
    TypographyRole.OPERATOR_NUMERIC: TypographyBinding(
        TypographyRole.OPERATOR_NUMERIC, EnvironmentOwner.OPERATOR, "families.numeric"
    ),
    TypographyRole.OPERATOR_LABEL_TRACKING: TypographyBinding(
        TypographyRole.OPERATOR_LABEL_TRACKING,
        EnvironmentOwner.OPERATOR,
        "tracking.labelEm",
    ),
    TypographyRole.OPERATOR_DENSE_LINE_HEIGHT: TypographyBinding(
        TypographyRole.OPERATOR_DENSE_LINE_HEIGHT,
        EnvironmentOwner.OPERATOR,
        "lineHeight.standard",
    ),
}

TYPOGRAPHY_BINDINGS: Final[Mapping[TypographyRole, TypographyBinding]] = (
    MappingProxyType(_TYPOGRAPHY_BINDINGS)
)


def _lookup(document: Mapping[str, Any], path: str) -> Any:
    cursor: Any = document
    for part in path.split("."):
        cursor = cursor[part]
    return cursor


@dataclass(frozen=True)
class DualTypographyResolver:
    world: EnvironmentPackage
    operator: EnvironmentPackage

    def resolve(self, role: TypographyRole) -> Any:
        binding = TYPOGRAPHY_BINDINGS[role]
        package = self.world if binding.owner is EnvironmentOwner.WORLD else self.operator
        return _lookup(package.document("typography"), binding.source_path)


__all__ = [
    "DualTypographyResolver",
    "TYPOGRAPHY_BINDINGS",
    "TypographyBinding",
    "TypographyRole",
]
