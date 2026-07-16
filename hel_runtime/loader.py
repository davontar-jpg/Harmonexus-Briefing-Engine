"""Validated, immutable loading for Harmonexus Environment Library packages."""

from __future__ import annotations

import json
import re
from dataclasses import dataclass, field
from pathlib import Path, PurePosixPath
from types import MappingProxyType
from typing import Any, Mapping


class EnvironmentLoadError(RuntimeError):
    """Base class for safe HEL package failures."""


class MissingPackageFileError(EnvironmentLoadError):
    """A required package or manifest reference is unavailable."""


class ManifestValidationError(EnvironmentLoadError):
    """A manifest or referenced document violates the HEL contract."""


def deep_freeze(value: Any) -> Any:
    """Recursively make parsed package data read-only."""

    if isinstance(value, Mapping):
        return MappingProxyType({str(key): deep_freeze(item) for key, item in value.items()})
    if isinstance(value, list):
        return tuple(deep_freeze(item) for item in value)
    return value


def deep_thaw(value: Any) -> Any:
    """Return a detached mutable representation for legacy consumers."""

    if isinstance(value, Mapping):
        return {str(key): deep_thaw(item) for key, item in value.items()}
    if isinstance(value, tuple):
        return [deep_thaw(item) for item in value]
    return value


def _safe_reference(reference: str, environment_id: str) -> PurePosixPath:
    normalized = reference.replace("\\", "/")
    path = PurePosixPath(normalized)
    if not normalized or path.is_absolute() or ".." in path.parts:
        raise ManifestValidationError(
            f"{environment_id} contains an unsafe manifest reference"
        )
    return path


def _read_json(path: Path, environment_id: str, reference_name: str) -> Mapping[str, Any]:
    try:
        payload = json.loads(path.read_text(encoding="utf-8"))
    except (OSError, UnicodeError, json.JSONDecodeError):
        raise ManifestValidationError(
            f"{environment_id} reference '{reference_name}' is not valid JSON"
        ) from None
    if not isinstance(payload, dict):
        raise ManifestValidationError(
            f"{environment_id} reference '{reference_name}' must be a JSON object"
        )
    return payload


@dataclass(frozen=True)
class EnvironmentPackage:
    """A validated HEL package whose source documents cannot be mutated."""

    environment_id: str
    manifest: Mapping[str, Any]
    references: Mapping[str, str]
    documents: Mapping[str, Any]
    _root: Path = field(repr=False, compare=False)

    def document(self, name: str) -> Any:
        try:
            return self.documents[name]
        except KeyError:
            raise ManifestValidationError(
                f"{self.environment_id} has no manifest reference named '{name}'"
            ) from None

    def reference_names(self) -> tuple[str, ...]:
        return tuple(sorted(self.references))

    def legacy_spec(self) -> dict[str, Any]:
        """Match the original HEL-032 renderer's JSON-only specification shape."""

        ordered_names = (
            "environment",
            "architecture",
            "tokens",
            "materials",
            "lighting",
            "motion",
            "effects",
            "components",
            "navigation",
            "typography",
            "visualization",
            "marketPhysics",
            "risk",
            "rituals",
            "validation",
            "shaders",
            "audio",
        )
        return {
            "manifest": deep_thaw(self.manifest),
            **{name: deep_thaw(self.document(name)) for name in ordered_names},
        }


def load_package(
    package_root: Path,
    *,
    expected_environment: str,
) -> EnvironmentPackage:
    """Load and validate every manifest reference without leaking host paths."""

    if not package_root.is_dir():
        raise MissingPackageFileError(
            f"Required environment package {expected_environment} is missing"
        )
    manifest_path = package_root / "manifest.json"
    if not manifest_path.is_file():
        raise MissingPackageFileError(
            f"{expected_environment} manifest.json is missing"
        )

    manifest = _read_json(manifest_path, expected_environment, "manifest")
    environment_id = str(manifest.get("environment", ""))
    if environment_id != expected_environment:
        raise ManifestValidationError(
            f"Expected {expected_environment}, received package {environment_id or 'UNKNOWN'}"
        )
    files = manifest.get("files")
    entrypoint = manifest.get("entrypoint")
    integrity = manifest.get("integrity_sha256")
    if not isinstance(files, dict) or not isinstance(entrypoint, str):
        raise ManifestValidationError(
            f"{environment_id} manifest must define entrypoint and files"
        )
    if not isinstance(integrity, str) or not re.fullmatch(r"[0-9a-f]{64}", integrity):
        raise ManifestValidationError(
            f"{environment_id} manifest integrity declaration is invalid"
        )

    raw_references: dict[str, str] = {"entrypoint": entrypoint}
    for name, reference in files.items():
        if not isinstance(name, str) or not isinstance(reference, str):
            raise ManifestValidationError(
                f"{environment_id} manifest references must be named strings"
            )
        raw_references[name] = reference

    documents: dict[str, Any] = {}
    for name, reference in raw_references.items():
        safe_path = _safe_reference(reference, environment_id)
        path = package_root.joinpath(*safe_path.parts)
        if not path.is_file():
            raise MissingPackageFileError(
                f"{environment_id} manifest reference '{name}' is missing"
            )
        if path.suffix.lower() == ".json":
            documents[name] = _read_json(path, environment_id, name)
        else:
            try:
                documents[name] = path.read_text(encoding="utf-8")
            except (OSError, UnicodeError):
                raise ManifestValidationError(
                    f"{environment_id} reference '{name}' is unreadable"
                ) from None

    environment = documents.get("environment", {})
    tokens = documents.get("tokens", {})
    components = documents.get("components", {})
    token_id = (
        tokens.get("meta", {}).get("id", {}).get("$value")
        if isinstance(tokens, dict)
        else None
    )
    if not isinstance(environment, dict) or environment.get("id") != environment_id:
        raise ManifestValidationError(
            f"{environment_id} environment document identity does not match its manifest"
        )
    if token_id != environment_id:
        raise ManifestValidationError(
            f"{environment_id} token identity does not match its manifest"
        )
    if not isinstance(components, dict) or components.get("environment") != environment_id:
        raise ManifestValidationError(
            f"{environment_id} component identity does not match its manifest"
        )

    return EnvironmentPackage(
        environment_id=environment_id,
        manifest=deep_freeze(manifest),
        references=MappingProxyType(dict(raw_references)),
        documents=MappingProxyType(
            {name: deep_freeze(document) for name, document in documents.items()}
        ),
        _root=package_root,
    )


__all__ = [
    "EnvironmentLoadError",
    "EnvironmentPackage",
    "ManifestValidationError",
    "MissingPackageFileError",
    "deep_freeze",
    "deep_thaw",
    "load_package",
]
