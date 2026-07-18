"""Validation diagnostics for the centralized dual-HEL runtime."""

from __future__ import annotations

from dataclasses import asdict, dataclass
from enum import Enum
from typing import Iterable

from hel_environment_contract import EnvironmentOwner

from .authority import SemanticTokenRole, TOKEN_BINDINGS
from .components import COMPONENT_OWNERSHIP, DualComponentResolver
from .loader import EnvironmentPackage
from .materials import MATERIAL_BINDINGS, DualMaterialResolver
from .motion import MOTION_BINDINGS, DualMotionResolver
from .tokens import DualTokenResolver, ensure_public_output
from .typography import TYPOGRAPHY_BINDINGS, DualTypographyResolver
from .visualization import CartographicVisualizationResolver, VisualizationRole


class DiagnosticLevel(str, Enum):
    PASS = "pass"
    ERROR = "error"


@dataclass(frozen=True)
class RuntimeDiagnostic:
    level: DiagnosticLevel
    code: str
    environment: str
    message: str

    def public_dict(self) -> dict[str, str]:
        output = {
            key: value.value if isinstance(value, Enum) else str(value)
            for key, value in asdict(self).items()
        }
        ensure_public_output(" ".join(output.values()))
        return output


class RuntimeValidationError(RuntimeError):
    """The dual runtime loaded source files but failed a composition gate."""


def _pass(code: str, environment: str, message: str) -> RuntimeDiagnostic:
    return RuntimeDiagnostic(DiagnosticLevel.PASS, code, environment, message)


def validate_runtime(
    world: EnvironmentPackage,
    operator: EnvironmentPackage,
    tokens: DualTokenResolver,
    materials: DualMaterialResolver,
    motion: DualMotionResolver,
    components: DualComponentResolver,
    typography: DualTypographyResolver,
    visualization: CartographicVisualizationResolver,
) -> tuple[RuntimeDiagnostic, ...]:
    """Run deterministic source, authority, accessibility, and output gates."""

    diagnostics: list[RuntimeDiagnostic] = []
    for package in (world, operator):
        for name in package.reference_names():
            package.document(name)
        diagnostics.append(
            _pass(
                "manifest.references.resolved",
                package.environment_id,
                f"All {len(package.reference_names())} manifest references resolved",
            )
        )

    for role, binding in TOKEN_BINDINGS.items():
        resolved = tokens.resolve(role)
        if resolved.owner is not binding.owner:
            raise RuntimeValidationError(
                f"Semantic ownership failed for role '{role.value}'"
            )
    diagnostics.append(
        _pass(
            "tokens.authority.deterministic",
            "HEL-032+HEL-028",
            f"{len(TOKEN_BINDINGS)} semantic token bindings have explicit owners",
        )
    )

    for role in MATERIAL_BINDINGS:
        materials.resolve(role)
    for role in MOTION_BINDINGS:
        motion.resolve(role)
    for role in COMPONENT_OWNERSHIP:
        components.ownership(role)
    for role in TYPOGRAPHY_BINDINGS:
        typography.resolve(role)
    for role in VisualizationRole:
        visualization.resolve(role)
    diagnostics.append(
        _pass(
            "accessors.typed.ready",
            "HEL-032+HEL-028",
            "Material, motion, component, typography, and visualization roles resolved",
        )
    )

    for package in (world, operator):
        gate = package.document("validation")
        if gate.get("reduced_motion") != "required" or gate.get(
            "reduced_sensory"
        ) != "required":
            raise RuntimeValidationError(
                f"{package.environment_id} accessibility gates are incomplete"
            )
    motion.reduced_motion()
    motion.reduced_sensory()
    diagnostics.append(
        _pass(
            "accessibility.modes.ready",
            "HEL-032+HEL-028",
            "Reduced-motion and reduced-sensory values are available",
        )
    )

    dual_css = tokens.css_variables()
    legacy_css = tokens.legacy_world_css_variables()
    ensure_public_output(dual_css)
    ensure_public_output(legacy_css)
    diagnostics.append(
        _pass(
            "css.public.stable",
            "HEL-032+HEL-028",
            "Generated CSS is deterministic and contains no protected host values",
        )
    )

    color_roles: Iterable[SemanticTokenRole] = (
        SemanticTokenRole.ENVIRONMENTAL_ROUTE_ACCENT,
        SemanticTokenRole.ENVIRONMENTAL_ROUTE_SECONDARY,
        SemanticTokenRole.CARTOGRAPHIC_RISK,
        SemanticTokenRole.OPERATOR_CONTROL_PRIMARY,
        SemanticTokenRole.OPERATOR_STATUS_CRITICAL,
    )
    for role in color_roles:
        tokens.plotly_color(role)
    diagnostics.append(
        _pass(
            "plotly.colors.safe",
            "HEL-032+HEL-028",
            "Semantic color roles produce Plotly-safe fallbacks",
        )
    )

    world_gate = world.document("validation")
    operator_gate = operator.document("validation")
    if world_gate.get("raw_visual_values_outside_tokens") != 0:
        raise RuntimeValidationError("HEL-032 raw-value gate is not locked")
    if operator_gate.get("raw_visual_values_outside_tokens") != 0:
        raise RuntimeValidationError("HEL-028 raw-value gate is not locked")
    diagnostics.append(
        _pass(
            "packages.immutable.inputs",
            "HEL-032+HEL-028",
            "Both source packages remain isolated authoritative inputs",
        )
    )
    return tuple(diagnostics)


def raise_for_diagnostics(diagnostics: Iterable[RuntimeDiagnostic]) -> None:
    failures = [item for item in diagnostics if item.level is DiagnosticLevel.ERROR]
    if failures:
        raise RuntimeValidationError(failures[0].message)


__all__ = [
    "DiagnosticLevel",
    "RuntimeDiagnostic",
    "RuntimeValidationError",
    "raise_for_diagnostics",
    "validate_runtime",
]
