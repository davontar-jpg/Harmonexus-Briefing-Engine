"""Material accessors that preserve world and instrument ownership."""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from types import MappingProxyType
from typing import Final, Mapping

from hel_environment_contract import EnvironmentOwner

from .loader import EnvironmentPackage


class MaterialRole(str, Enum):
    WORLD_STRUCTURE = "world.structure"
    WORLD_OPTICAL_SURFACE = "world.optical_surface"
    WORLD_INSTRUMENT = "world.cartographic_instrument"
    WORLD_DOCUMENT = "world.document"
    WORLD_ATMOSPHERE = "world.atmosphere"
    OPERATOR_HOUSING = "operator.housing"
    OPERATOR_GLASS = "operator.glass"
    OPERATOR_MECHANISM = "operator.mechanism"
    OPERATOR_DOCUMENT = "operator.document"


@dataclass(frozen=True)
class MaterialBinding:
    role: MaterialRole
    owner: EnvironmentOwner
    material_key: str


_MATERIAL_BINDINGS = {
    MaterialRole.WORLD_STRUCTURE: MaterialBinding(
        MaterialRole.WORLD_STRUCTURE, EnvironmentOwner.WORLD, "structural"
    ),
    MaterialRole.WORLD_OPTICAL_SURFACE: MaterialBinding(
        MaterialRole.WORLD_OPTICAL_SURFACE, EnvironmentOwner.WORLD, "optical"
    ),
    MaterialRole.WORLD_INSTRUMENT: MaterialBinding(
        MaterialRole.WORLD_INSTRUMENT, EnvironmentOwner.WORLD, "mechanical"
    ),
    MaterialRole.WORLD_DOCUMENT: MaterialBinding(
        MaterialRole.WORLD_DOCUMENT, EnvironmentOwner.WORLD, "document"
    ),
    MaterialRole.WORLD_ATMOSPHERE: MaterialBinding(
        MaterialRole.WORLD_ATMOSPHERE, EnvironmentOwner.WORLD, "atmosphere"
    ),
    MaterialRole.OPERATOR_HOUSING: MaterialBinding(
        MaterialRole.OPERATOR_HOUSING, EnvironmentOwner.OPERATOR, "structural"
    ),
    MaterialRole.OPERATOR_GLASS: MaterialBinding(
        MaterialRole.OPERATOR_GLASS, EnvironmentOwner.OPERATOR, "optical"
    ),
    MaterialRole.OPERATOR_MECHANISM: MaterialBinding(
        MaterialRole.OPERATOR_MECHANISM, EnvironmentOwner.OPERATOR, "mechanical"
    ),
    MaterialRole.OPERATOR_DOCUMENT: MaterialBinding(
        MaterialRole.OPERATOR_DOCUMENT, EnvironmentOwner.OPERATOR, "document"
    ),
}

MATERIAL_BINDINGS: Final[Mapping[MaterialRole, MaterialBinding]] = MappingProxyType(
    _MATERIAL_BINDINGS
)


@dataclass(frozen=True)
class DualMaterialResolver:
    world: EnvironmentPackage
    operator: EnvironmentPackage

    def _package(self, owner: EnvironmentOwner) -> EnvironmentPackage:
        return self.world if owner is EnvironmentOwner.WORLD else self.operator

    def resolve(self, role: MaterialRole) -> Mapping[str, object]:
        binding = MATERIAL_BINDINGS[role]
        materials = self._package(binding.owner).document("materials")
        return materials[binding.material_key]

    def library(self, owner: EnvironmentOwner) -> Mapping[str, object]:
        return self._package(owner).document("materials")


__all__ = [
    "DualMaterialResolver",
    "MATERIAL_BINDINGS",
    "MaterialBinding",
    "MaterialRole",
]
