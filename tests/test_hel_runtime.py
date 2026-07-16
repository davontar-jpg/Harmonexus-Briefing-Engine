import hashlib
import json
import re
from pathlib import Path

import pytest

import hel_cartographer
from hel_environment_contract import EnvironmentOwner
from hel_runtime import SemanticTokenRole, get_runtime, load_runtime
from hel_runtime.authority import TOKEN_BINDINGS
from hel_runtime.components import ComponentRole
from hel_runtime.loader import MissingPackageFileError, load_package
from hel_runtime.materials import MaterialRole
from hel_runtime.motion import MotionRole
from hel_runtime.typography import TypographyRole


REPO_ROOT = Path(__file__).resolve().parents[1]
EXPECTED_REFERENCES = {
    "entrypoint",
    "environment",
    "story",
    "architecture",
    "tokens",
    "materials",
    "lighting",
    "motion",
    "effects",
    "audio",
    "components",
    "navigation",
    "typography",
    "visualization",
    "shaders",
    "marketPhysics",
    "risk",
    "rituals",
    "validation",
}


def digest(value: str) -> str:
    return hashlib.sha256(value.encode()).hexdigest()


def test_both_packages_load_as_immutable_sources():
    runtime = load_runtime(REPO_ROOT)

    assert runtime.world.environment_id == "HEL-032"
    assert runtime.operator.environment_id == "HEL-028"
    assert runtime.world.document("environment")["id"] == "HEL-032"
    assert runtime.operator.document("environment")["id"] == "HEL-028"
    with pytest.raises(TypeError):
        runtime.world.document("tokens")["meta"] = {}  # type: ignore[index]


def test_every_manifest_reference_resolves():
    runtime = get_runtime()

    for package in (runtime.world, runtime.operator):
        assert set(package.reference_names()) == EXPECTED_REFERENCES
        assert all(package.document(name) is not None for name in EXPECTED_REFERENCES)


def test_semantic_precedence_is_explicit_and_deterministic():
    first = load_runtime(REPO_ROOT)
    second = load_runtime(REPO_ROOT)

    assert list(first.semantic_tokens()) == list(second.semantic_tokens())
    assert first.css_variables() == second.css_variables()
    assert all(first.semantic_token(role).owner is binding.owner for role, binding in TOKEN_BINDINGS.items())


def test_hel_032_remains_authoritative_for_world_roles():
    runtime = get_runtime()
    role = SemanticTokenRole.WORLD_BACKGROUND
    token = runtime.semantic_token(role)

    assert token.owner is EnvironmentOwner.WORLD
    assert token.value == runtime.tokens.package_value(
        EnvironmentOwner.WORLD, "color.semantic.environment.void"
    )
    assert token.value != runtime.tokens.package_value(
        EnvironmentOwner.OPERATOR, "color.semantic.environment.void"
    )
    assert runtime.materials.resolve(MaterialRole.WORLD_STRUCTURE) is (
        runtime.world.document("materials")["structural"]
    )
    assert runtime.motion.resolve(MotionRole.WORLD_PRIMARY_SPRING) is (
        runtime.world.document("motion")["spring.primary"]
    )


def test_hel_028_remains_authoritative_for_operator_roles():
    runtime = get_runtime()
    role = SemanticTokenRole.OPERATOR_CONTROL_PRIMARY
    token = runtime.semantic_token(role)

    assert token.owner is EnvironmentOwner.OPERATOR
    assert token.value == runtime.tokens.package_value(
        EnvironmentOwner.OPERATOR, "color.semantic.signal.primary"
    )
    assert token.value != runtime.tokens.package_value(
        EnvironmentOwner.WORLD, "color.semantic.signal.primary"
    )
    assert runtime.materials.resolve(MaterialRole.OPERATOR_HOUSING) is (
        runtime.operator.document("materials")["structural"]
    )
    assert runtime.motion.resolve(MotionRole.OPERATOR_PRIMARY_SPRING) is (
        runtime.operator.document("motion")["spring.primary"]
    )
    assert runtime.typography_value(TypographyRole.OPERATOR_NUMERIC) == (
        runtime.operator.document("typography")["families"]["numeric"]
    )


def test_component_ownership_preserves_world_container_and_operator_behavior():
    runtime = get_runtime()
    audit = runtime.component_ownership(ComponentRole.SIGNAL_AUDIT)
    shell = runtime.component_ownership(ComponentRole.APPLICATION_SHELL)

    assert audit.structure_owner is EnvironmentOwner.WORLD
    assert audit.interaction_owner is EnvironmentOwner.OPERATOR
    assert shell.structure_owner is EnvironmentOwner.WORLD
    assert shell.interaction_owner is EnvironmentOwner.WORLD


def test_missing_package_failure_is_explicit_and_path_safe():
    missing_root = REPO_ROOT / "_missing_dual_hel_runtime_test_root"
    with pytest.raises(MissingPackageFileError) as captured:
        load_runtime(missing_root)

    message = str(captured.value)
    assert "HEL-032" in message
    assert "missing" in message.lower()
    assert str(missing_root) not in message


def test_missing_manifest_reference_identifies_logical_file_only(monkeypatch):
    package_root = REPO_ROOT / "HEL" / "HEL-032_cartographers-chamber"
    original_is_file = Path.is_file

    def hide_token_file(path: Path) -> bool:
        if path.name == "environment.tokens.dtcg.json":
            return False
        return original_is_file(path)

    monkeypatch.setattr(Path, "is_file", hide_token_file)
    with pytest.raises(MissingPackageFileError) as captured:
        load_package(package_root, expected_environment="HEL-032")

    assert str(captured.value) == "HEL-032 manifest reference 'tokens' is missing"
    assert str(package_root) not in str(captured.value)


def test_generated_output_exposes_no_secret_or_machine_path():
    runtime = get_runtime()
    output = runtime.css_variables()
    diagnostics = json.dumps(
        [item.public_dict() for item in runtime.diagnostics], sort_keys=True
    )
    combined = output + diagnostics

    assert str(REPO_ROOT) not in combined
    assert "BEGIN PRIVATE KEY" not in combined
    assert ".secrets" not in combined
    assert not re.search(r"[A-Za-z]:\\", combined)


def test_css_namespaces_are_stable_and_semantic_aliases_do_not_copy_values():
    runtime = get_runtime()
    first = runtime.css_variables()
    second = load_runtime(REPO_ROOT).css_variables()

    assert first == second
    assert "--hel-world-color-semantic-environment-void:" in first
    assert "--hel-operator-color-semantic-surface-base:" in first
    assert (
        "--hel-semantic-operator-control-primary: "
        "var(--hel-operator-color-semantic-signal-primary);"
    ) in first


def test_plotly_fallbacks_are_derived_from_owned_color_tokens():
    runtime = get_runtime()

    for role in (
        SemanticTokenRole.ENVIRONMENTAL_ROUTE_ACCENT,
        SemanticTokenRole.CARTOGRAPHIC_RISK,
        SemanticTokenRole.OPERATOR_CONTROL_PRIMARY,
        SemanticTokenRole.OPERATOR_STATUS_CRITICAL,
    ):
        assert re.fullmatch(r"#[0-9A-F]{6}", runtime.plotly_color(role))


def test_reduced_modes_are_available_and_stricter_than_normal_motion():
    runtime = get_runtime()
    reduced_motion = runtime.motion.reduced_motion()
    reduced_sensory = runtime.motion.reduced_sensory()

    assert reduced_motion.animation_enabled is False
    assert reduced_motion.transforms_enabled is False
    assert reduced_motion.duration_ms < runtime.tokens.package_value(
        EnvironmentOwner.WORLD, "duration.instant"
    )["value"]
    assert reduced_sensory.atmospheric_effects_enabled is False
    assert reduced_sensory.translucent_surfaces_enabled is False


def test_legacy_renderer_is_byte_identical_to_sealed_hel_032_baseline():
    spec = json.dumps(
        hel_cartographer.hel_spec(), sort_keys=True, separators=(",", ":")
    )

    assert digest(spec) == "3f3ab520d33dcea4ff05298d068116937924567b426b05a14eec7fdf84a7a67b"
    assert digest(hel_cartographer.css_variables()) == (
        "c10e78e3ceaa47605d849999ef41e3bfdd1807f37f7c8355efb65666e1b7c149"
    )
    assert digest(hel_cartographer.css()) == (
        "1a9dc2c6c40df3c3b7816685b20470217dfc37a873f8eb32168288463b96562d"
    )
    assert digest(hel_cartographer.reduced_sensory_css()) == (
        "8175d6dd9798f372039f9e8db0299cdd8322c2813bb0d73a8d62eba60122a3c7"
    )
