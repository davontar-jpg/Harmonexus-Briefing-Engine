"""Centralized dual-environment runtime for Harmonexus presentation layers.

HEL-032 controls the world; HEL-028 controls the instruments. The runtime
loads each immutable package separately and exposes semantic bindings rather
than performing a recursive dictionary merge.
"""

from __future__ import annotations

from dataclasses import dataclass
from functools import lru_cache
from pathlib import Path
from typing import Any, Mapping

from hel_environment_contract import AUTHORITY_LAW, EnvironmentOwner

from .authority import SemanticTokenRole
from .components import (
    ComponentOwnership,
    ComponentRole,
    DualComponentResolver,
    OperationalState,
)
from .loader import EnvironmentPackage, load_package
from .materials import DualMaterialResolver
from .motion import DualMotionResolver
from .tokens import DualTokenResolver, ResolvedToken
from .typography import DualTypographyResolver, TypographyRole
from .validation import RuntimeDiagnostic, validate_runtime
from .visualization import CartographicVisualizationResolver, VisualizationRole


WORLD_PACKAGE = "HEL/HEL-032_cartographers-chamber"
OPERATOR_PACKAGE = "HEL/HEL-028_institutional-dealing-room"


@dataclass(frozen=True)
class DualEnvironmentRuntime:
    world: EnvironmentPackage
    operator: EnvironmentPackage
    tokens: DualTokenResolver
    materials: DualMaterialResolver
    motion: DualMotionResolver
    components: DualComponentResolver
    typography: DualTypographyResolver
    visualization: CartographicVisualizationResolver
    diagnostics: tuple[RuntimeDiagnostic, ...]

    @property
    def authority_law(self) -> str:
        return AUTHORITY_LAW

    @property
    def world_tokens(self) -> Mapping[str, Any]:
        return self.tokens.package_tokens(EnvironmentOwner.WORLD)

    @property
    def operator_tokens(self) -> Mapping[str, Any]:
        return self.tokens.package_tokens(EnvironmentOwner.OPERATOR)

    def semantic_token(self, role: SemanticTokenRole) -> ResolvedToken:
        return self.tokens.resolve(role)

    def semantic_tokens(self) -> Mapping[SemanticTokenRole, ResolvedToken]:
        return self.tokens.semantic_tokens()

    def css_variables(self) -> str:
        return self.tokens.css_variables()

    def legacy_world_css_variables(self) -> str:
        return self.tokens.legacy_world_css_variables()

    def plotly_color(self, role: SemanticTokenRole) -> str:
        return self.tokens.plotly_color(role)

    def component_ownership(self, role: ComponentRole) -> ComponentOwnership:
        return self.components.ownership(role)

    def typography_value(self, role: TypographyRole) -> Any:
        return self.typography.resolve(role)

    def visualization_value(self, role: VisualizationRole) -> Any:
        return self.visualization.resolve(role)

    def navigation_model(self, owner: EnvironmentOwner) -> Mapping[str, Any]:
        package = self.world if owner is EnvironmentOwner.WORLD else self.operator
        return package.document("navigation")

    def validation_gate(self, owner: EnvironmentOwner) -> Mapping[str, Any]:
        package = self.world if owner is EnvironmentOwner.WORLD else self.operator
        return package.document("validation")

    def legacy_world_spec(self) -> dict[str, Any]:
        return self.world.legacy_spec()


def load_runtime(repo_root: Path | None = None) -> DualEnvironmentRuntime:
    """Create a validated runtime or fail with a safe, explicit package error."""

    root = repo_root if repo_root is not None else Path(__file__).resolve().parents[1]
    world = load_package(root / Path(WORLD_PACKAGE), expected_environment="HEL-032")
    operator = load_package(
        root / Path(OPERATOR_PACKAGE), expected_environment="HEL-028"
    )
    tokens = DualTokenResolver(world, operator)
    materials = DualMaterialResolver(world, operator)
    motion = DualMotionResolver(world, operator)
    components = DualComponentResolver(world, operator)
    typography = DualTypographyResolver(world, operator)
    visualization = CartographicVisualizationResolver(world)
    diagnostics = validate_runtime(
        world,
        operator,
        tokens,
        materials,
        motion,
        components,
        typography,
        visualization,
    )
    return DualEnvironmentRuntime(
        world=world,
        operator=operator,
        tokens=tokens,
        materials=materials,
        motion=motion,
        components=components,
        typography=typography,
        visualization=visualization,
        diagnostics=diagnostics,
    )


@lru_cache(maxsize=1)
def get_runtime() -> DualEnvironmentRuntime:
    return load_runtime()


__all__ = [
    "AUTHORITY_LAW",
    "DualEnvironmentRuntime",
    "OPERATOR_PACKAGE",
    "OperationalState",
    "SemanticTokenRole",
    "WORLD_PACKAGE",
    "get_runtime",
    "load_runtime",
]
