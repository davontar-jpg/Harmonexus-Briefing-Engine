"""DTCG token access and semantic dual-environment resolution."""

from __future__ import annotations

import math
import re
from dataclasses import dataclass
from types import MappingProxyType
from typing import Any, Iterable, Mapping

from hel_environment_contract import EnvironmentOwner

from .authority import SemanticTokenRole, TOKEN_BINDINGS
from .loader import EnvironmentPackage


class TokenResolutionError(RuntimeError):
    """A required token cannot be resolved safely."""


class UnsafeEnvironmentValueError(TokenResolutionError):
    """Generated presentation output contains a host path or secret marker."""


@dataclass(frozen=True)
class ResolvedToken:
    role: SemanticTokenRole
    owner: EnvironmentOwner
    source_path: str
    token_type: str
    value: Any

    def css_value(self) -> str:
        return to_css_value(self.value)


def to_css_value(value: Any) -> str:
    """Convert a resolved DTCG value to the renderer's stable CSS form."""

    if isinstance(value, Mapping) and "value" in value and "unit" in value:
        return f"{value['value']}{value['unit']}"
    if isinstance(value, (list, tuple)):
        return ", ".join(str(part) for part in value)
    return str(value)


def _token_node(tokens: Mapping[str, Any], token_path: str) -> Mapping[str, Any]:
    cursor: Any = tokens
    for part in token_path.split("."):
        if not isinstance(cursor, Mapping) or part not in cursor:
            raise TokenResolutionError(f"Required token '{token_path}' is missing")
        cursor = cursor[part]
    if not isinstance(cursor, Mapping) or "$value" not in cursor:
        raise TokenResolutionError(f"Token '{token_path}' has no DTCG value")
    return cursor


def resolve_token_value(
    tokens: Mapping[str, Any], token_path: str, trail: tuple[str, ...] = ()
) -> Any:
    if token_path in trail:
        raise TokenResolutionError(f"Circular token reference at '{token_path}'")
    node = _token_node(tokens, token_path)
    value = node["$value"]
    if isinstance(value, str) and value.startswith("{") and value.endswith("}"):
        return resolve_token_value(tokens, value[1:-1], trail + (token_path,))
    return value


def _walk_token_paths(node: Mapping[str, Any], prefix: tuple[str, ...] = ()) -> Iterable[str]:
    if "$value" in node:
        yield ".".join(prefix)
        return
    for name, child in node.items():
        if isinstance(child, Mapping):
            yield from _walk_token_paths(child, prefix + (str(name),))


def _css_name(prefix: str, token_path: str) -> str:
    safe = re.sub(r"[^a-zA-Z0-9_-]+", "-", token_path).strip("-").lower()
    return f"{prefix}{safe}"


_UNSAFE_PUBLIC_PATTERNS = (
    re.compile(r"-----BEGIN [A-Z ]*PRIVATE KEY-----", re.IGNORECASE),
    re.compile(r"\bprivate[_-]?key\b", re.IGNORECASE),
    re.compile(r"\bapi[_-]?key\b", re.IGNORECASE),
    re.compile(r"[a-z]:\\", re.IGNORECASE),
    re.compile(r"/(?:users|home)/", re.IGNORECASE),
    re.compile(r"\.secrets[/\\]", re.IGNORECASE),
)


def ensure_public_output(value: str) -> str:
    if any(pattern.search(value) for pattern in _UNSAFE_PUBLIC_PATTERNS):
        raise UnsafeEnvironmentValueError(
            "Environment output contains a protected value or machine path"
        )
    return value


def _oklch_to_hex(value: str) -> str:
    match = re.fullmatch(
        r"oklch\(\s*([0-9.]+)\s+([0-9.]+)\s+([0-9.]+)(?:\s*/\s*[0-9.]+)?\s*\)",
        value,
        flags=re.IGNORECASE,
    )
    if not match:
        if re.fullmatch(r"#[0-9a-fA-F]{6}", value):
            return value.upper()
        raise TokenResolutionError("Plotly color source is not a supported color token")

    lightness, chroma, hue = map(float, match.groups())
    angle = math.radians(hue)
    a = chroma * math.cos(angle)
    b = chroma * math.sin(angle)
    l_root = lightness + 0.3963377774 * a + 0.2158037573 * b
    m_root = lightness - 0.1055613458 * a - 0.0638541728 * b
    s_root = lightness - 0.0894841775 * a - 1.2914855480 * b
    l_value, m_value, s_value = l_root**3, m_root**3, s_root**3
    linear = (
        4.0767416621 * l_value - 3.3077115913 * m_value + 0.2309699292 * s_value,
        -1.2684380046 * l_value + 2.6097574011 * m_value - 0.3413193965 * s_value,
        -0.0041960863 * l_value - 0.7034186147 * m_value + 1.707614701 * s_value,
    )

    def encode(channel: float) -> int:
        clipped = max(0.0, min(1.0, channel))
        srgb = (
            12.92 * clipped
            if clipped <= 0.0031308
            else 1.055 * clipped ** (1 / 2.4) - 0.055
        )
        return round(max(0.0, min(1.0, srgb)) * 255)

    return "#{:02X}{:02X}{:02X}".format(*(encode(channel) for channel in linear))


@dataclass(frozen=True)
class DualTokenResolver:
    world: EnvironmentPackage
    operator: EnvironmentPackage

    def __post_init__(self) -> None:
        for binding in TOKEN_BINDINGS.values():
            package = self._package(binding.owner)
            resolve_token_value(package.document("tokens"), binding.token_path)

    def _package(self, owner: EnvironmentOwner) -> EnvironmentPackage:
        return self.world if owner is EnvironmentOwner.WORLD else self.operator

    def package_tokens(self, owner: EnvironmentOwner) -> Mapping[str, Any]:
        return self._package(owner).document("tokens")

    def package_value(self, owner: EnvironmentOwner, token_path: str) -> Any:
        return resolve_token_value(self.package_tokens(owner), token_path)

    def resolve(self, role: SemanticTokenRole) -> ResolvedToken:
        binding = TOKEN_BINDINGS[role]
        tokens = self.package_tokens(binding.owner)
        node = _token_node(tokens, binding.token_path)
        return ResolvedToken(
            role=role,
            owner=binding.owner,
            source_path=binding.token_path,
            token_type=str(node.get("$type", "unknown")),
            value=resolve_token_value(tokens, binding.token_path),
        )

    def semantic_tokens(self) -> Mapping[SemanticTokenRole, ResolvedToken]:
        return MappingProxyType({role: self.resolve(role) for role in TOKEN_BINDINGS})

    def package_css_variables(self, owner: EnvironmentOwner, prefix: str) -> dict[str, str]:
        tokens = self.package_tokens(owner)
        variables = {
            _css_name(prefix, path): to_css_value(resolve_token_value(tokens, path))
            for path in _walk_token_paths(tokens)
        }
        return dict(sorted(variables.items()))

    def legacy_world_css_variables(self) -> str:
        """Emit exactly the original HEL-032 ``--hel-*`` variable contract."""

        tokens = self.package_tokens(EnvironmentOwner.WORLD)
        variables = dict(
            sorted(
                (
                    "--hel-" + "-".join(path.split(".")),
                    to_css_value(resolve_token_value(tokens, path)),
                )
                for path in _walk_token_paths(tokens)
            )
        )
        return ensure_public_output(
            "\n".join(f"  {name}: {value};" for name, value in variables.items())
        )

    def css_variables(self) -> str:
        """Emit deterministic package namespaces plus semantic owner aliases."""

        variables: dict[str, str] = {}
        variables.update(
            self.package_css_variables(EnvironmentOwner.WORLD, "--hel-world-")
        )
        variables.update(
            self.package_css_variables(EnvironmentOwner.OPERATOR, "--hel-operator-")
        )
        for role, binding in TOKEN_BINDINGS.items():
            owner_name = "world" if binding.owner is EnvironmentOwner.WORLD else "operator"
            variables[_css_name("--hel-semantic-", role.value)] = (
                f"var({_css_name(f'--hel-{owner_name}-', binding.token_path)})"
            )
        return ensure_public_output(
            "\n".join(f"  {name}: {value};" for name, value in sorted(variables.items()))
        )

    def plotly_color(self, role: SemanticTokenRole) -> str:
        token = self.resolve(role)
        if token.token_type != "color":
            raise TokenResolutionError(
                f"Semantic role '{role.value}' is not backed by a color token"
            )
        return _oklch_to_hex(str(token.value))


__all__ = [
    "DualTokenResolver",
    "ResolvedToken",
    "TokenResolutionError",
    "UnsafeEnvironmentValueError",
    "ensure_public_output",
    "resolve_token_value",
    "to_css_value",
]
