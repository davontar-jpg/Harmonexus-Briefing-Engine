"""Cartographic visualization values with HEL-032 world precedence."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from types import MappingProxyType
from typing import Any, Final, Mapping

from .loader import EnvironmentPackage


class VisualizationRole(str, Enum):
    CHARTS = "charts"
    MARKET = "market"
    MAPS = "maps"
    RULES = "rules"


VISUALIZATION_PATHS: Final[Mapping[VisualizationRole, str]] = MappingProxyType(
    {role: role.value for role in VisualizationRole}
)


@dataclass(frozen=True)
class CartographicVisualizationResolver:
    world: EnvironmentPackage

    def resolve(self, role: VisualizationRole) -> Any:
        return self.world.document("visualization")[VISUALIZATION_PATHS[role]]


__all__ = [
    "CartographicVisualizationResolver",
    "VISUALIZATION_PATHS",
    "VisualizationRole",
]
