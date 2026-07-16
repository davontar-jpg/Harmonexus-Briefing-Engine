"""Page-scale and control-scale motion resolution with accessibility modes."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from types import MappingProxyType
from typing import Final, Mapping

from hel_environment_contract import EnvironmentOwner

from .loader import EnvironmentPackage


class MotionRole(str, Enum):
    WORLD_PRIMARY_SPRING = "world.spring.primary"
    WORLD_RETURN_SPRING = "world.spring.return"
    WORLD_REVEAL = "world.reveal"
    WORLD_SCROLL = "world.scroll"
    WORLD_MARKET_HANDOFF = "world.market_handoff"
    OPERATOR_PRIMARY_SPRING = "operator.spring.primary"
    OPERATOR_RETURN_SPRING = "operator.spring.return"
    OPERATOR_MAGNETIC_FIELD = "operator.magnetic_field"
    OPERATOR_PRESS = "operator.press"


@dataclass(frozen=True)
class MotionBinding:
    role: MotionRole
    owner: EnvironmentOwner
    motion_key: str


_MOTION_BINDINGS = {
    MotionRole.WORLD_PRIMARY_SPRING: MotionBinding(
        MotionRole.WORLD_PRIMARY_SPRING, EnvironmentOwner.WORLD, "spring.primary"
    ),
    MotionRole.WORLD_RETURN_SPRING: MotionBinding(
        MotionRole.WORLD_RETURN_SPRING, EnvironmentOwner.WORLD, "spring.return"
    ),
    MotionRole.WORLD_REVEAL: MotionBinding(
        MotionRole.WORLD_REVEAL, EnvironmentOwner.WORLD, "reveal.environment"
    ),
    MotionRole.WORLD_SCROLL: MotionBinding(
        MotionRole.WORLD_SCROLL, EnvironmentOwner.WORLD, "scroll.inertial"
    ),
    MotionRole.WORLD_MARKET_HANDOFF: MotionBinding(
        MotionRole.WORLD_MARKET_HANDOFF, EnvironmentOwner.WORLD, "handoff.market"
    ),
    MotionRole.OPERATOR_PRIMARY_SPRING: MotionBinding(
        MotionRole.OPERATOR_PRIMARY_SPRING,
        EnvironmentOwner.OPERATOR,
        "spring.primary",
    ),
    MotionRole.OPERATOR_RETURN_SPRING: MotionBinding(
        MotionRole.OPERATOR_RETURN_SPRING,
        EnvironmentOwner.OPERATOR,
        "spring.return",
    ),
    MotionRole.OPERATOR_MAGNETIC_FIELD: MotionBinding(
        MotionRole.OPERATOR_MAGNETIC_FIELD,
        EnvironmentOwner.OPERATOR,
        "magnetic.field",
    ),
    MotionRole.OPERATOR_PRESS: MotionBinding(
        MotionRole.OPERATOR_PRESS, EnvironmentOwner.OPERATOR, "press.weighted"
    ),
}

MOTION_BINDINGS: Final[Mapping[MotionRole, MotionBinding]] = MappingProxyType(
    _MOTION_BINDINGS
)


@dataclass(frozen=True)
class ReducedMotionValues:
    animation_enabled: bool = False
    transforms_enabled: bool = False
    duration_ms: int = 1
    scroll_behavior: str = "auto"


@dataclass(frozen=True)
class ReducedSensoryValues:
    atmospheric_effects_enabled: bool = False
    translucent_surfaces_enabled: bool = False
    depth_shadows_enabled: bool = False
    blur_px: int = 0


@dataclass(frozen=True)
class DualMotionResolver:
    world: EnvironmentPackage
    operator: EnvironmentPackage

    def _package(self, owner: EnvironmentOwner) -> EnvironmentPackage:
        return self.world if owner is EnvironmentOwner.WORLD else self.operator

    def resolve(self, role: MotionRole) -> Mapping[str, object]:
        binding = MOTION_BINDINGS[role]
        motion = self._package(binding.owner).document("motion")
        return motion[binding.motion_key]

    def system(self, owner: EnvironmentOwner) -> Mapping[str, object]:
        return self._package(owner).document("motion")

    @staticmethod
    def reduced_motion() -> ReducedMotionValues:
        return ReducedMotionValues()

    @staticmethod
    def reduced_sensory() -> ReducedSensoryValues:
        return ReducedSensoryValues()


__all__ = [
    "DualMotionResolver",
    "MOTION_BINDINGS",
    "MotionBinding",
    "MotionRole",
    "ReducedMotionValues",
    "ReducedSensoryValues",
]
