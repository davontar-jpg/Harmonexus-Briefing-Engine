"""HEL-032 Cartographer's Chamber integration helpers.

This module is intentionally presentation-only. It reads the selected
Harmonexus Environment Library package and exposes derived variables,
component wrappers, and visual semantics for the Streamlit application
without touching market logic, ingestion, alerts, persistence, or secrets.
"""

from __future__ import annotations

import html
import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Iterable, Mapping


HEL_ROOT = Path(__file__).parent / "HEL" / "HEL-032_cartographers-chamber"


@lru_cache(maxsize=1)
def hel_spec() -> dict[str, Any]:
    def read_json(relative: str) -> dict[str, Any]:
        return json.loads((HEL_ROOT / relative).read_text(encoding="utf-8"))

    manifest = read_json("manifest.json")
    files = manifest["files"]
    return {
        "manifest": manifest,
        "environment": read_json(files["environment"]),
        "architecture": read_json(files["architecture"]),
        "tokens": read_json(files["tokens"]),
        "materials": read_json(files["materials"]),
        "lighting": read_json(files["lighting"]),
        "motion": read_json(files["motion"]),
        "effects": read_json(files["effects"]),
        "components": read_json(files["components"]),
        "navigation": read_json(files["navigation"]),
        "typography": read_json(files["typography"]),
        "visualization": read_json(files["visualization"]),
        "marketPhysics": read_json(files["marketPhysics"]),
        "risk": read_json(files["risk"]),
        "rituals": read_json(files["rituals"]),
        "validation": read_json(files["validation"]),
        "shaders": read_json(files["shaders"]),
        "audio": read_json(files["audio"]),
    }


def _token_value(node: Mapping[str, Any]) -> str:
    value = node.get("$value")
    if isinstance(value, dict) and "value" in value and "unit" in value:
        return f"{value['value']}{value['unit']}"
    if isinstance(value, list):
        return ", ".join(str(part) for part in value)
    return str(value)


def _resolve_reference(value: str, tokens: Mapping[str, Any]) -> str:
    if not (value.startswith("{") and value.endswith("}")):
        return value
    cursor: Any = tokens
    for part in value.strip("{}").split("."):
        cursor = cursor[part]
    return _resolve_reference(_token_value(cursor), tokens)


def _walk_tokens(prefix: list[str], node: Mapping[str, Any], out: dict[str, str], root: Mapping[str, Any]) -> None:
    if "$value" in node:
        key = "--hel-" + "-".join(prefix)
        out[key] = _resolve_reference(_token_value(node), root)
        return
    for name, child in node.items():
        if isinstance(child, Mapping):
            _walk_tokens(prefix + [str(name)], child, out, root)


@lru_cache(maxsize=1)
def css_variables() -> str:
    tokens = hel_spec()["tokens"]
    variables: dict[str, str] = {}
    _walk_tokens([], tokens, variables, tokens)
    return "\n".join(f"  {name}: {value};" for name, value in sorted(variables.items()))


def esc(value: Any) -> str:
    return html.escape("" if value is None else str(value), quote=True)


def css() -> str:
    spec = hel_spec()
    typography = spec["typography"]
    motion = spec["motion"]
    materials = spec["materials"]
    optical = materials["optical"]
    structural = materials["structural"]
    document = materials["document"]
    atmosphere = materials["atmosphere"]
    magnetic = motion["magnetic.field"]
    weighted = motion["press.weighted"]
    reveal = motion["reveal.environment"]
    return f"""
<style>
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@500;600;700&family=IBM+Plex+Mono:wght@400;500;600&family=IBM+Plex+Sans:wght@400;500;600;700&display=swap');
:root{{
{css_variables()}
  --hel-font-display:{typography['families']['display']};
  --hel-font-interface:{typography['families']['interface']};
  --hel-font-numeric:{typography['families']['numeric']};
  --hel-optical-opacity:{optical['opacity']};
  --hel-optical-blur:{optical['backdropBlurPx']}px;
  --hel-structural-grain:{structural['grainScale']};
  --hel-document-fiber:{document['fiberAmount']};
  --hel-atmosphere-density:{atmosphere['density']};
  --hel-magnetic-radius:{magnetic['radiusPx']}px;
  --hel-magnetic-offset:{magnetic['maxOffsetPx']}px;
  --hel-weighted-scale:{weighted['scale']};
  --hel-weighted-y:{weighted['translateY']}px;
  --hel-reveal-duration:{reveal['durationMs']}ms;
  --hel-ease-enter:cubic-bezier(0.16,1,0.3,1);
}}
html,body,[class*="css"]{{font-family:var(--hel-font-interface),sans-serif;color:var(--hel-color-semantic-content-primary)}}
.stApp{{background:
  radial-gradient(circle at 18% 12%, color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 84%), transparent 26rem),
  radial-gradient(circle at 86% 4%, color-mix(in oklch, var(--hel-color-semantic-signal-secondary), transparent 88%), transparent 24rem),
  linear-gradient(145deg, var(--hel-color-semantic-environment-void), var(--hel-color-semantic-structure-primary) 62%, var(--hel-color-semantic-environment-void));
  color:var(--hel-color-semantic-content-primary);
}}
.stApp::before{{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;background:
  linear-gradient(90deg, color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 94%) 1px, transparent 1px),
  linear-gradient(0deg, color-mix(in oklch, var(--hel-color-semantic-signal-secondary), transparent 96%) 1px, transparent 1px);
  background-size:72px 72px;mask-image:radial-gradient(circle at 50% 18%, black, transparent 78%);opacity:.48;
}}
.stApp::after{{content:"";position:fixed;inset:0;pointer-events:none;z-index:0;background:
  radial-gradient(ellipse at 50% 0%, color-mix(in oklch, var(--hel-color-raw-glass), transparent 72%), transparent 58%),
  repeating-linear-gradient(108deg, transparent 0 38px, color-mix(in oklch, var(--hel-color-semantic-content-primary), transparent 98%) 39px 40px);
  mix-blend-mode:screen;opacity:.5;
}}
.block-container{{position:relative;z-index:1;max-width:1540px;padding:var(--hel-dimension-space-4) var(--hel-dimension-space-6) var(--hel-dimension-space-8)}}
.stApp header{{background:transparent}}
#MainMenu, footer, [data-testid="stDecoration"]{{display:none!important}}
h1,h2,h3,h4{{font-family:var(--hel-font-display),serif;letter-spacing:var(--hel-typography-tracking-display, -.018em);color:var(--hel-color-semantic-content-primary)}}
p,li{{line-height:1.62}}
.mono,.hel-mono{{font-family:var(--hel-font-numeric),monospace;font-variant-numeric:tabular-nums}}
.hel-muted{{color:var(--hel-color-semantic-content-secondary)}}
[data-testid="stSidebar"]{{background:linear-gradient(180deg, color-mix(in oklch, var(--hel-color-semantic-structure-primary), black 12%), var(--hel-color-semantic-environment-void));border-right:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 78%)}}
[data-testid="stSidebar"] [data-testid="stMarkdownContainer"] h3{{font-family:var(--hel-font-display);font-size:1.25rem;letter-spacing:.02em}}
[data-testid="stSidebar"] [role="radiogroup"], [data-testid="stSidebar"] [data-baseweb="select"]{{border:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 78%);background:color-mix(in oklch, var(--hel-color-semantic-surface-optical), transparent 18%);border-radius:var(--hel-dimension-radius-architectural);padding:var(--hel-dimension-space-3);box-shadow:inset 0 1px color-mix(in oklch, var(--hel-color-semantic-content-primary), transparent 92%)}}
[data-testid="stSidebar"] label, [data-testid="stSidebar"] p{{font-family:var(--hel-font-numeric);font-size:.72rem;letter-spacing:.07em;text-transform:uppercase;color:var(--hel-color-semantic-content-secondary)}}
.hel-shell{{display:grid;gap:var(--hel-dimension-space-5)}}
.hel-topbar{{display:flex;align-items:center;justify-content:space-between;gap:var(--hel-dimension-space-4);padding:var(--hel-dimension-space-4) 0 var(--hel-dimension-space-5);border-bottom:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 78%)}}
.hel-brand{{display:flex;align-items:center;gap:var(--hel-dimension-space-3);font-family:var(--hel-font-numeric);letter-spacing:.16em;font-size:.86rem;text-transform:uppercase}}
.hel-brand i{{width:.62rem;height:.62rem;border-radius:50%;background:var(--hel-color-semantic-signal-primary);box-shadow:0 0 24px color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 24%)}}
.hel-asof{{font-family:var(--hel-font-numeric);font-size:.72rem;color:var(--hel-color-semantic-content-secondary)}}
.hel-status-strip{{display:flex;gap:var(--hel-dimension-space-2);flex-wrap:wrap;margin:0 0 var(--hel-dimension-space-5)}}
.hel-chip{{padding:var(--hel-dimension-space-2) var(--hel-dimension-space-3);border:1px solid color-mix(in oklch, var(--hel-chip-tone, var(--hel-color-semantic-signal-primary)), transparent 68%);border-radius:999px;background:color-mix(in oklch, var(--hel-chip-tone, var(--hel-color-semantic-signal-primary)), transparent 92%);font-family:var(--hel-font-numeric);font-size:.66rem;letter-spacing:.05em;color:color-mix(in oklch, var(--hel-chip-tone, var(--hel-color-semantic-signal-primary)), white 30%)}}
.hel-chip.warn{{--hel-chip-tone:var(--hel-color-semantic-signal-secondary)}}.hel-chip.critical{{--hel-chip-tone:var(--hel-color-semantic-signal-critical)}}.hel-chip.ok{{--hel-chip-tone:var(--hel-color-semantic-signal-primary)}}
.hel-hero{{position:relative;overflow:hidden;border:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 72%);border-radius:var(--hel-dimension-radius-architectural);padding:var(--hel-dimension-space-7);background:
  linear-gradient(135deg, color-mix(in oklch, var(--hel-color-semantic-surface-optical), transparent 8%), color-mix(in oklch, var(--hel-color-semantic-structure-primary), black 10%));
  backdrop-filter:blur(var(--hel-optical-blur));box-shadow:0 var(--hel-dimension-depth-6) var(--hel-dimension-depth-7) color-mix(in oklch, black, transparent 52%), inset 0 1px color-mix(in oklch, var(--hel-color-semantic-content-primary), transparent 92%);animation:helReveal var(--hel-reveal-duration) var(--hel-ease-enter) both;
}}
.hel-hero::before{{content:"";position:absolute;inset:0;background:radial-gradient(circle at 74% 24%, color-mix(in oklch, var(--hel-color-semantic-signal-secondary), transparent 78%), transparent 18rem), linear-gradient(120deg, transparent 0 38%, color-mix(in oklch, var(--hel-color-semantic-content-primary), transparent 96%) 50%, transparent 62%);opacity:.82}}
.hel-hero>*{{position:relative;z-index:1}}.hel-eyebrow{{font-family:var(--hel-font-numeric);font-size:.7rem;letter-spacing:.14em;text-transform:uppercase;color:var(--hel-color-semantic-signal-primary);margin-bottom:var(--hel-dimension-space-3)}}.hel-hero h1{{font-size:clamp(2.8rem,6vw,5.8rem);line-height:.93;margin:0;max-width:900px}}.hel-hero p{{max-width:780px;color:var(--hel-color-semantic-content-secondary);font-size:1rem;margin:var(--hel-dimension-space-4) 0 0}}
.hel-zone-grid{{display:grid;grid-template-columns:repeat(12,minmax(0,1fr));gap:var(--hel-dimension-space-4)}}.hel-span-3{{grid-column:span 3}}.hel-span-4{{grid-column:span 4}}.hel-span-5{{grid-column:span 5}}.hel-span-6{{grid-column:span 6}}.hel-span-7{{grid-column:span 7}}.hel-span-8{{grid-column:span 8}}.hel-span-12{{grid-column:1/-1}}
.hel-surface{{position:relative;border:1px solid color-mix(in oklch, var(--hel-surface-tone, var(--hel-color-semantic-signal-primary)), transparent 78%);border-radius:var(--hel-dimension-radius-architectural);background:linear-gradient(160deg, color-mix(in oklch, var(--hel-color-semantic-surface-optical), transparent 12%), color-mix(in oklch, var(--hel-color-semantic-surface-base), transparent 4%));backdrop-filter:blur(var(--hel-optical-blur));box-shadow:0 var(--hel-dimension-depth-5) var(--hel-dimension-depth-6) color-mix(in oklch, black, transparent 58%), inset 0 1px color-mix(in oklch, white, transparent 94%);padding:var(--hel-dimension-space-5);overflow:hidden;animation:helReveal var(--hel-reveal-duration) var(--hel-ease-enter) both}}
.hel-surface::before{{content:"";position:absolute;inset:0;pointer-events:none;background:linear-gradient(90deg, color-mix(in oklch, var(--hel-surface-tone, var(--hel-color-semantic-signal-primary)), transparent 96%) 1px, transparent 1px),linear-gradient(0deg, color-mix(in oklch, var(--hel-surface-tone, var(--hel-color-semantic-signal-primary)), transparent 97%) 1px, transparent 1px);background-size:28px 28px;opacity:.58;mask-image:linear-gradient(180deg, black, transparent 88%)}}
.hel-surface>*{{position:relative;z-index:1}}.hel-title{{font-family:var(--hel-font-numeric);font-size:.72rem;letter-spacing:.12em;text-transform:uppercase;color:var(--hel-color-semantic-content-secondary);margin-bottom:var(--hel-dimension-space-4)}}.hel-title strong{{font-family:var(--hel-font-display);font-size:1.25rem;letter-spacing:.02em;text-transform:none;color:var(--hel-color-semantic-content-primary);display:block;margin-top:var(--hel-dimension-space-1)}}
.hel-map-card{{--hel-surface-tone:var(--tone);min-height:218px;display:flex;flex-direction:column;justify-content:space-between;transition:transform var(--hel-duration-standard) var(--hel-ease-enter),border-color var(--hel-duration-standard) var(--hel-ease-enter)}}.hel-map-card:hover{{transform:translateY(calc(var(--hel-magnetic-offset) * -.35));border-color:color-mix(in oklch, var(--tone), transparent 52%)}}.hel-map-card::after{{content:"";position:absolute;width:11rem;height:11rem;border-radius:50%;right:-4rem;top:-4rem;background:radial-gradient(circle, color-mix(in oklch, var(--tone), transparent 72%), transparent 68%);filter:blur(10px);opacity:.9}}
.hel-card-head{{display:flex;justify-content:space-between;gap:var(--hel-dimension-space-3)}}.hel-ticker{{font-family:var(--hel-font-numeric);font-size:.72rem;letter-spacing:.12em;color:var(--hel-color-semantic-content-secondary)}}.hel-asset{{font-weight:650;margin-top:var(--hel-dimension-space-1)}}.hel-delta{{font-family:var(--hel-font-numeric);font-size:.66rem;border:1px solid color-mix(in oklch, var(--tone), transparent 70%);border-radius:var(--hel-dimension-radius-control);padding:var(--hel-dimension-space-1) var(--hel-dimension-space-2);color:color-mix(in oklch, var(--tone), white 18%)}}
.hel-reading{{font-family:var(--hel-font-display);font-size:1.9rem;line-height:1;margin-top:var(--hel-dimension-space-4)}}.hel-reading span,.hel-score{{color:var(--tone)}}.hel-score{{font-family:var(--hel-font-numeric);font-size:1.05rem}}.hel-confidence{{height:4px;background:color-mix(in oklch, var(--hel-color-semantic-content-primary), transparent 92%);border-radius:999px;overflow:hidden}}.hel-confidence i{{display:block;height:100%;width:var(--confidence);background:var(--tone);box-shadow:0 0 16px color-mix(in oklch, var(--tone), transparent 40%)}}.hel-meta{{display:flex;justify-content:space-between;font-family:var(--hel-font-numeric);font-size:.64rem;color:var(--hel-color-semantic-content-secondary);margin-top:var(--hel-dimension-space-2)}}.hel-reliability{{align-self:flex-start;border:1px solid color-mix(in oklch, var(--tone), transparent 72%);border-radius:999px;padding:var(--hel-dimension-space-1) var(--hel-dimension-space-2);font-family:var(--hel-font-numeric);font-size:.62rem;letter-spacing:.06em;color:var(--hel-color-semantic-content-secondary)}}
.flip-shell{{position:relative;display:block;min-height:218px;perspective:1200px;cursor:pointer;isolation:isolate}}.flip-toggle{{position:absolute;opacity:0;pointer-events:none}}.flip-card-inner{{position:relative;min-height:218px;transform-style:preserve-3d;transition:transform var(--hel-duration-environmental) var(--hel-ease-enter);will-change:transform}}.flip-toggle:checked+.flip-card-inner{{transform:rotateY(180deg)}}.flip-toggle:focus-visible+.flip-card-inner{{outline:2px solid var(--hel-color-semantic-signal-secondary);outline-offset:4px;border-radius:var(--hel-dimension-radius-architectural)}}.card-face{{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;transform-style:preserve-3d;transform:translateZ(0)}}.card-front{{transform:rotateY(0deg) translateZ(.1px)}}.card-back{{transform:rotateY(180deg) translateZ(.1px);padding:var(--hel-dimension-space-4)!important}}.hel-context-row{{display:flex;justify-content:space-between;border-bottom:1px solid color-mix(in oklch, var(--hel-color-semantic-content-primary), transparent 92%);padding:.2rem 0;font-size:.72rem;line-height:1.25}}.hel-context-row span{{color:var(--hel-color-semantic-content-secondary)}}.hel-context-row b{{font-family:var(--hel-font-numeric)}}.hel-agreement,.agreement{{display:flex;justify-content:space-between;align-items:end;margin-top:var(--hel-dimension-space-2)}}.hel-agreement strong,.agreement strong{{font-family:var(--hel-font-numeric);font-size:1.08rem;color:var(--tone)}}.hel-age,.regime-age,.flip-hint{{font-family:var(--hel-font-numeric);font-size:.58rem;letter-spacing:.06em;text-transform:uppercase;color:var(--hel-color-semantic-content-secondary)}}
.hel-flow-row{{display:grid;grid-template-columns:1fr 72px 82px;gap:var(--hel-dimension-space-3);align-items:center;padding:var(--hel-dimension-space-3) 0;border-bottom:1px solid color-mix(in oklch, var(--hel-color-semantic-content-primary), transparent 92%)}}.hel-flow-row:last-child{{border-bottom:0}}.hel-flow-row b,.hel-flow-row em{{font-family:var(--hel-font-numeric);font-style:normal;text-align:right}}.hel-flow-row em{{font-size:.72rem;color:var(--hel-color-semantic-content-secondary)}}.hel-brief{{font-size:1.03rem;line-height:1.62;color:color-mix(in oklch, var(--hel-color-semantic-content-primary), transparent 10%)}}.hel-brief strong{{color:var(--hel-color-semantic-content-primary)}}.hel-statline{{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--hel-dimension-space-3)}}.hel-stat{{border:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 80%);border-radius:var(--hel-dimension-radius-architectural);padding:var(--hel-dimension-space-4);background:color-mix(in oklch, var(--hel-color-semantic-surface-base), transparent 18%)}}.hel-stat label{{display:block;font-family:var(--hel-font-numeric);font-size:.66rem;letter-spacing:.08em;text-transform:uppercase;color:var(--hel-color-semantic-content-secondary);margin-bottom:var(--hel-dimension-space-2)}}.hel-stat strong{{font-family:var(--hel-font-display);font-size:1.8rem;line-height:1}}.hel-table-shell [data-testid="stDataFrame"]{{border:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 78%);border-radius:var(--hel-dimension-radius-architectural);overflow:hidden;background:color-mix(in oklch, var(--hel-color-semantic-surface-base), transparent 8%)}}.hel-json pre{{background:color-mix(in oklch, var(--hel-color-semantic-environment-void), transparent 8%)!important;border:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 80%);border-radius:var(--hel-dimension-radius-architectural);color:var(--hel-color-semantic-content-primary)!important}}
.topbar{{display:flex;align-items:center;justify-content:space-between;gap:var(--hel-dimension-space-4);padding:var(--hel-dimension-space-4) 0 var(--hel-dimension-space-5);border-bottom:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 78%);margin-bottom:var(--hel-dimension-space-5)}}.brand{{display:flex;align-items:center;gap:var(--hel-dimension-space-2);font-family:var(--hel-font-numeric);letter-spacing:.16em;font-size:.86rem;text-transform:uppercase;font-weight:600}}.brand i{{width:.62rem!important;height:.62rem!important;border-radius:50%;background:var(--hel-color-semantic-signal-primary)!important;box-shadow:0 0 24px color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 24%)!important;margin-right:var(--hel-dimension-space-2)!important}}.asof{{font-family:var(--hel-font-numeric)!important;font-size:.72rem!important;color:var(--hel-color-semantic-content-secondary)!important}}.status-strip{{display:flex;gap:var(--hel-dimension-space-2);flex-wrap:wrap;margin:0 0 var(--hel-dimension-space-5)}}.status-chip{{padding:var(--hel-dimension-space-2) var(--hel-dimension-space-3)!important;border:1px solid color-mix(in oklch, var(--hel-chip-tone, var(--hel-color-semantic-signal-primary)), transparent 68%)!important;border-radius:999px!important;background:color-mix(in oklch, var(--hel-chip-tone, var(--hel-color-semantic-signal-primary)), transparent 92%)!important;font-family:var(--hel-font-numeric)!important;font-size:.66rem!important;letter-spacing:.05em!important;color:color-mix(in oklch, var(--hel-chip-tone, var(--hel-color-semantic-signal-primary)), white 30%)!important}}.status-chip.ok{{--hel-chip-tone:var(--hel-color-semantic-signal-primary)}}.status-chip.warn{{--hel-chip-tone:var(--hel-color-semantic-signal-secondary)}}
.hero{{position:relative;overflow:hidden;border:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 72%)!important;border-radius:var(--hel-dimension-radius-architectural)!important;padding:var(--hel-dimension-space-7)!important;background:linear-gradient(135deg, color-mix(in oklch, var(--hel-color-semantic-surface-optical), transparent 8%), color-mix(in oklch, var(--hel-color-semantic-structure-primary), black 10%))!important;backdrop-filter:blur(var(--hel-optical-blur));box-shadow:0 var(--hel-dimension-depth-6) var(--hel-dimension-depth-7) color-mix(in oklch, black, transparent 52%), inset 0 1px color-mix(in oklch, white, transparent 94%)!important;animation:helReveal var(--hel-reveal-duration) var(--hel-ease-enter) both}}.hero::before{{content:"";position:absolute;inset:0;background:radial-gradient(circle at 74% 24%, color-mix(in oklch, var(--hel-color-semantic-signal-secondary), transparent 78%), transparent 18rem),linear-gradient(120deg, transparent 0 38%, color-mix(in oklch, var(--hel-color-semantic-content-primary), transparent 96%) 50%, transparent 62%);opacity:.82}}.hero>*{{position:relative;z-index:1}}.hero h1{{font-family:var(--hel-font-display)!important;font-size:clamp(2.8rem,6vw,5.8rem)!important;line-height:.93!important;margin:0!important}}.hero p{{max-width:780px!important;color:var(--hel-color-semantic-content-secondary)!important;font-size:1rem!important;margin:var(--hel-dimension-space-4) 0 0!important}}.eyebrow{{font-family:var(--hel-font-numeric)!important;font-size:.7rem!important;letter-spacing:.14em!important;text-transform:uppercase!important;color:var(--hel-color-semantic-signal-primary)!important;margin-bottom:var(--hel-dimension-space-3)!important}}
.panel{{position:relative;border:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 78%)!important;border-radius:var(--hel-dimension-radius-architectural)!important;background:linear-gradient(160deg, color-mix(in oklch, var(--hel-color-semantic-surface-optical), transparent 12%), color-mix(in oklch, var(--hel-color-semantic-surface-base), transparent 4%))!important;backdrop-filter:blur(var(--hel-optical-blur));box-shadow:0 var(--hel-dimension-depth-5) var(--hel-dimension-depth-6) color-mix(in oklch, black, transparent 58%), inset 0 1px color-mix(in oklch, white, transparent 94%)!important;padding:var(--hel-dimension-space-5)!important;overflow:hidden;animation:helReveal var(--hel-reveal-duration) var(--hel-ease-enter) both}}.panel-title{{font-family:var(--hel-font-numeric)!important;font-size:.72rem!important;letter-spacing:.12em!important;text-transform:uppercase!important;color:var(--hel-color-semantic-content-secondary)!important;margin-bottom:var(--hel-dimension-space-4)!important}}.driver{{display:grid!important;grid-template-columns:1fr 72px 82px!important;gap:var(--hel-dimension-space-3)!important;align-items:center!important;padding:var(--hel-dimension-space-3) 0!important;border-bottom:1px solid color-mix(in oklch, var(--hel-color-semantic-content-primary), transparent 92%)!important}}.driver b,.driver em{{font-family:var(--hel-font-numeric)!important;font-style:normal!important;text-align:right!important}}.driver em{{font-size:.72rem!important;color:var(--hel-color-semantic-content-secondary)!important}}.brief{{font-size:1.03rem!important;line-height:1.62!important;color:color-mix(in oklch, var(--hel-color-semantic-content-primary), transparent 10%)!important}}.brief strong{{color:var(--hel-color-semantic-content-primary)!important}}.pill{{display:inline-flex!important;align-items:center!important;gap:var(--hel-dimension-space-2)!important;padding:var(--hel-dimension-space-2) var(--hel-dimension-space-3)!important;border:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 76%)!important;border-radius:999px!important;font-family:var(--hel-font-numeric)!important;font-size:.66rem!important;color:var(--hel-color-semantic-content-secondary)!important}}.pill i{{background:var(--hel-color-semantic-signal-primary)!important;box-shadow:0 0 16px color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 35%)!important}}
[data-testid="stAlert"]{{border-radius:var(--hel-dimension-radius-architectural);border:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-secondary), transparent 64%);background:color-mix(in oklch, var(--hel-color-semantic-signal-secondary), transparent 90%);color:var(--hel-color-semantic-content-primary)}}button,[data-testid="stBaseButton-secondary"]{{border-radius:999px!important;border:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 68%)!important;background:color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 92%)!important;color:var(--hel-color-semantic-content-primary)!important;min-height:44px!important;transition:transform var(--hel-duration-fast) var(--hel-ease-focus)}}button:active{{transform:scale(var(--hel-weighted-scale)) translateY(var(--hel-weighted-y))}}*:focus-visible{{outline:2px solid var(--hel-color-semantic-signal-secondary)!important;outline-offset:3px!important}}
[data-testid="stMetric"]{{border:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 78%);border-radius:var(--hel-dimension-radius-architectural);background:linear-gradient(160deg, color-mix(in oklch, var(--hel-color-semantic-surface-optical), transparent 18%), color-mix(in oklch, var(--hel-color-semantic-surface-base), transparent 8%));padding:var(--hel-dimension-space-4);box-shadow:inset 0 1px color-mix(in oklch, white, transparent 94%)}}[data-testid="stMetricLabel"]{{font-family:var(--hel-font-numeric);font-size:.66rem;letter-spacing:.08em;text-transform:uppercase;color:var(--hel-color-semantic-content-secondary)}}[data-testid="stMetricValue"]{{font-family:var(--hel-font-display);font-size:1.9rem;color:var(--hel-color-semantic-content-primary)}}.stTabs [data-baseweb="tab-list"]{{gap:var(--hel-dimension-space-3);border-bottom:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 78%);background:color-mix(in oklch, var(--hel-color-semantic-surface-base), transparent 12%);border-radius:var(--hel-dimension-radius-architectural);padding:var(--hel-dimension-space-2)}}.stTabs [data-baseweb="tab"]{{font-family:var(--hel-font-numeric);font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;border-radius:999px;padding:var(--hel-dimension-space-2) var(--hel-dimension-space-4);color:var(--hel-color-semantic-content-secondary)}}.stTabs [aria-selected="true"]{{background:color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 86%);color:var(--hel-color-semantic-content-primary)}}[data-testid="stDataFrame"]{{border:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 78%)!important;border-radius:var(--hel-dimension-radius-architectural)!important;overflow:hidden!important;background:color-mix(in oklch, var(--hel-color-semantic-surface-base), transparent 8%)!important}}[data-testid="stDataFrame"] iframe{{border-radius:var(--hel-dimension-radius-architectural)!important}}[data-testid="stFileUploader"]{{border:1px dashed color-mix(in oklch, var(--hel-color-semantic-signal-secondary), transparent 55%);border-radius:var(--hel-dimension-radius-architectural);background:color-mix(in oklch, var(--hel-color-semantic-signal-secondary), transparent 94%);padding:var(--hel-dimension-space-3)}}[data-testid="stSelectbox"],[data-testid="stRadio"],[data-testid="stFileUploader"]{{min-height:44px}}.hel-json-block{{white-space:pre-wrap;font-family:var(--hel-font-numeric);font-size:.72rem;line-height:1.5;color:var(--hel-color-semantic-content-secondary);background:color-mix(in oklch, var(--hel-color-semantic-environment-void), transparent 8%);border:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 80%);border-radius:var(--hel-dimension-radius-architectural);padding:var(--hel-dimension-space-4);max-height:420px;overflow:auto}}
@keyframes helReveal{{from{{opacity:0;transform:translateY(26px);filter:blur(18px)}}to{{opacity:1;transform:translateY(0);filter:blur(0)}}}}
@media (prefers-reduced-motion: reduce){{*,*::before,*::after{{animation-duration:1ms!important;transition-duration:1ms!important;scroll-behavior:auto!important}}.flip-card-inner{{transition:none!important}}}}
@media (prefers-contrast: more){{.hel-surface,.hel-hero,.hel-chip{{border-width:2px}}}}
@media(max-width:980px){{.block-container{{padding:var(--hel-dimension-space-3) var(--hel-dimension-space-4) var(--hel-dimension-space-7)}}.hel-zone-grid{{grid-template-columns:repeat(6,minmax(0,1fr))}}.hel-span-3,.hel-span-4,.hel-span-5,.hel-span-6,.hel-span-7,.hel-span-8{{grid-column:span 6}}.hel-statline{{grid-template-columns:repeat(2,minmax(0,1fr))}}.hel-hero{{padding:var(--hel-dimension-space-5)}}}}
@media(max-width:640px){{.block-container{{padding:var(--hel-dimension-space-3) var(--hel-dimension-space-3) var(--hel-dimension-space-7)}}.hel-topbar{{align-items:flex-start;flex-direction:column}}.hel-zone-grid,.hel-statline{{grid-template-columns:1fr}}.hel-span-3,.hel-span-4,.hel-span-5,.hel-span-6,.hel-span-7,.hel-span-8,.hel-span-12{{grid-column:1/-1}}.hel-hero h1{{font-size:2.55rem}}.hel-map-card,.flip-shell,.flip-card-inner{{min-height:206px}}.hel-surface{{padding:var(--hel-dimension-space-4)}}}}
@media (prefers-reduced-transparency: reduce){{.hel-surface,.hel-hero,[data-testid="stSidebar"] [role="radiogroup"]{{backdrop-filter:none;background:var(--hel-color-semantic-surface-base)}}}}
</style>
"""


def surface(title: str, body: str, *, strong: str | None = None, span: int = 12, tone: str | None = None) -> str:
    style = f' style="--hel-surface-tone:{esc(tone)}"' if tone else ""
    strong_html = f"<strong>{esc(strong)}</strong>" if strong else ""
    return f'<section class="hel-surface hel-span-{span}"{style}><div class="hel-title">{esc(title)}{strong_html}</div>{body}</section>'


def stat(label: str, value: Any, detail: str = "") -> str:
    return f'<div class="hel-stat"><label>{esc(label)}</label><strong>{esc(value)}</strong><div class="hel-muted hel-mono">{esc(detail)}</div></div>'


def statline(items: Iterable[tuple[str, Any, str]]) -> str:
    return '<div class="hel-statline">' + "".join(stat(label, value, detail) for label, value, detail in items) + "</div>"


def table_shell_start() -> str:
    return '<div class="hel-table-shell">'


def table_shell_end() -> str:
    return "</div>"


def json_block(payload: Any) -> str:
    return f'<pre class="hel-json-block">{esc(json.dumps(payload, indent=2, default=str))}</pre>'


def notice(title: str, message: str, *, tone: str = "var(--hel-color-semantic-signal-secondary)") -> str:
    body = f'<div class="hel-brief">{esc(message)}</div>'
    return surface(title, body, span=12, tone=tone)
