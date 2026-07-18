"""HEL-032 Cartographer's Chamber compatibility renderer.

The centralized dual-HEL runtime now validates and supplies package values,
while this adapter preserves the production-approved HEL-032 public API and
rendered output until individual operator surfaces are explicitly converted.
No market logic, ingestion, alerts, persistence, or secrets are handled here.
"""

from __future__ import annotations

import html
import json
from functools import lru_cache
from pathlib import Path
from typing import Any, Iterable

from hel_runtime import (
    ComponentRole,
    DualEnvironmentRuntime,
    OperationalState,
    get_runtime,
)
from hel_runtime.materials import MaterialRole
from hel_runtime.motion import MotionRole
from hel_runtime.typography import TypographyRole


HEL_ROOT = Path(__file__).parent / "HEL" / "HEL-032_cartographers-chamber"


@lru_cache(maxsize=1)
def environment_runtime() -> DualEnvironmentRuntime:
    """Return the validated dual-layer resolver behind the legacy renderer."""

    return get_runtime()


@lru_cache(maxsize=1)
def hel_spec() -> dict[str, Any]:
    return environment_runtime().legacy_world_spec()


@lru_cache(maxsize=1)
def css_variables() -> str:
    return environment_runtime().legacy_world_css_variables()


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
#MainMenu, footer, [data-testid="stDecoration"], button[data-testid="stBaseButton-header"]{{display:none!important}}
h1,h2,h3,h4{{font-family:var(--hel-font-display),serif;letter-spacing:var(--hel-typography-tracking-display, -.018em);color:var(--hel-color-semantic-content-primary)}}
p,li{{line-height:1.62}}
.mono,.hel-mono{{font-family:var(--hel-font-numeric),monospace;font-variant-numeric:tabular-nums}}
.hel-muted{{color:var(--hel-color-semantic-content-secondary)}}
[data-testid="stSidebar"]{{background:linear-gradient(180deg, color-mix(in oklch, var(--hel-color-semantic-structure-primary), black 12%), var(--hel-color-semantic-environment-void));border-right:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 78%)}}
[data-testid="stSidebar"] [data-testid="stMarkdownContainer"] h3{{font-family:var(--hel-font-display);font-size:1.25rem;letter-spacing:.02em}}
[data-testid="stSidebar"] [role="radiogroup"], [data-testid="stSidebar"] [data-baseweb="select"]{{border:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 78%);background:color-mix(in oklch, var(--hel-color-semantic-surface-optical), transparent 18%);border-radius:var(--hel-dimension-radius-architectural);padding:var(--hel-dimension-space-3);box-shadow:inset 0 1px color-mix(in oklch, var(--hel-color-semantic-content-primary), transparent 92%)}}
[data-testid="stSidebar"] label, [data-testid="stSidebar"] p{{font-family:var(--hel-font-numeric);font-size:.72rem;letter-spacing:.07em;text-transform:uppercase;color:var(--hel-color-semantic-content-secondary)}}
[data-baseweb="select"]>div{{background:var(--hel-color-semantic-environment-void)!important;border-color:color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 78%)!important;color:var(--hel-color-semantic-content-primary)!important}}[data-testid="stRadio"] [role="radiogroup"]{{flex-wrap:wrap}}input[type="radio"],input[type="checkbox"]{{accent-color:var(--hel-color-semantic-signal-primary)}}[data-testid="stRadio"] label:has(input:focus-visible),[data-testid="stCheckbox"] label:has(input:focus-visible){{outline:2px solid var(--hel-color-semantic-signal-secondary)!important;outline-offset:3px!important;border-radius:var(--hel-dimension-radius-control)}}
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
.hel-map-card{{--hel-surface-tone:var(--tone);min-height:218px;display:flex;flex-direction:column;justify-content:space-between;transition:border-color var(--hel-duration-standard) var(--hel-ease-enter)}}.hel-map-card:hover{{border-color:color-mix(in oklch, var(--tone), transparent 52%)}}.hel-map-card::after{{content:"";position:absolute;width:11rem;height:11rem;border-radius:50%;right:-4rem;top:-4rem;background:radial-gradient(circle, color-mix(in oklch, var(--tone), transparent 72%), transparent 68%);filter:blur(10px);opacity:.9}}
.hel-card-head{{display:flex;justify-content:space-between;gap:var(--hel-dimension-space-3)}}.hel-ticker{{font-family:var(--hel-font-numeric);font-size:.72rem;letter-spacing:.12em;color:var(--hel-color-semantic-content-secondary)}}.hel-asset{{font-weight:650;margin-top:var(--hel-dimension-space-1)}}.hel-delta{{font-family:var(--hel-font-numeric);font-size:.66rem;border:1px solid color-mix(in oklch, var(--tone), transparent 70%);border-radius:var(--hel-dimension-radius-control);padding:var(--hel-dimension-space-1) var(--hel-dimension-space-2);color:color-mix(in oklch, var(--tone), white 18%)}}
.hel-reading{{font-family:var(--hel-font-display);font-size:1.9rem;line-height:1;margin-top:var(--hel-dimension-space-4)}}.hel-reading span,.hel-score{{color:var(--tone)}}.hel-score{{font-family:var(--hel-font-numeric);font-size:1.05rem}}.hel-confidence{{height:4px;background:color-mix(in oklch, var(--hel-color-semantic-content-primary), transparent 92%);border-radius:999px;overflow:hidden}}.hel-confidence i{{display:block;height:100%;width:var(--confidence);background:var(--tone);box-shadow:0 0 16px color-mix(in oklch, var(--tone), transparent 40%)}}.hel-meta{{display:flex;justify-content:space-between;font-family:var(--hel-font-numeric);font-size:.64rem;color:var(--hel-color-semantic-content-secondary);margin-top:var(--hel-dimension-space-2)}}.hel-reliability{{align-self:flex-start;border:1px solid color-mix(in oklch, var(--tone), transparent 72%);border-radius:999px;padding:var(--hel-dimension-space-1) var(--hel-dimension-space-2);font-family:var(--hel-font-numeric);font-size:.62rem;letter-spacing:.06em;color:var(--hel-color-semantic-content-secondary)}}
.flip-shell{{position:relative;display:block;min-height:218px;perspective:1200px;cursor:pointer;isolation:isolate;transition:transform var(--hel-duration-standard) var(--hel-ease-enter)}}.flip-shell:hover{{transform:translateY(calc(var(--hel-magnetic-offset) * -.35))}}.flip-toggle{{position:absolute;opacity:0;pointer-events:none}}.flip-card-inner{{position:relative;min-height:218px;transform:translateZ(0);transform-style:preserve-3d;-webkit-transform-style:preserve-3d;transition:transform var(--hel-duration-environmental) var(--hel-ease-enter);will-change:transform}}.flip-toggle:checked+.flip-card-inner{{transform:rotateY(180deg) translateZ(0)}}.flip-toggle:focus-visible+.flip-card-inner{{outline:2px solid var(--hel-color-semantic-signal-secondary);outline-offset:4px;border-radius:var(--hel-dimension-radius-architectural)}}.card-face{{position:absolute;inset:0;backface-visibility:hidden;-webkit-backface-visibility:hidden;transform-style:preserve-3d;-webkit-transform-style:preserve-3d;will-change:transform}}.hel-map-card.card-face{{animation:none!important}}.hel-map-card.card-front{{transform:rotateY(0deg) translateZ(.1px);padding:18px 20px 15px!important}}.hel-map-card.card-back{{transform:rotateY(180deg) translateZ(.1px);padding:14px 16px 11px!important}}.hel-map-card.card-front:hover{{transform:rotateY(0deg) translateZ(.1px)}}.hel-map-card.card-back:hover{{transform:rotateY(180deg) translateZ(.1px)}}.card-back .hel-title{{margin-bottom:.2rem}}.card-back .hel-title strong{{font-size:1.08rem;margin-top:.1rem}}.hel-context-row{{display:flex;justify-content:space-between;border-bottom:1px solid color-mix(in oklch, var(--hel-color-semantic-content-primary), transparent 92%);padding:.14rem 0;font-size:.7rem;line-height:1.18}}.hel-context-row span{{color:var(--hel-color-semantic-content-secondary)}}.hel-context-row b{{font-family:var(--hel-font-numeric)}}.hel-agreement,.agreement{{display:flex;justify-content:space-between;align-items:end;margin-top:.2rem;line-height:1}}.hel-agreement strong,.agreement strong{{font-family:var(--hel-font-numeric);font-size:1.02rem;color:var(--tone)}}.hel-age,.regime-age,.flip-hint{{font-family:var(--hel-font-numeric);font-size:.55rem;letter-spacing:.05em;text-transform:uppercase;color:var(--hel-color-semantic-content-secondary)}}.flip-hint{{margin-top:.12rem;text-align:right}}
.hel-flow-row{{display:grid;grid-template-columns:1fr 72px 82px;gap:var(--hel-dimension-space-3);align-items:center;padding:var(--hel-dimension-space-3) 0;border-bottom:1px solid color-mix(in oklch, var(--hel-color-semantic-content-primary), transparent 92%)}}.hel-flow-row:last-child{{border-bottom:0}}.hel-flow-row b,.hel-flow-row em{{font-family:var(--hel-font-numeric);font-style:normal;text-align:right}}.hel-flow-row em{{font-size:.72rem;color:var(--hel-color-semantic-content-secondary)}}.hel-brief{{font-size:1.03rem;line-height:1.62;color:color-mix(in oklch, var(--hel-color-semantic-content-primary), transparent 10%)}}.hel-brief strong{{color:var(--hel-color-semantic-content-primary)}}.hel-statline{{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:var(--hel-dimension-space-3)}}.hel-stat{{border:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 80%);border-radius:var(--hel-dimension-radius-architectural);padding:var(--hel-dimension-space-4);background:color-mix(in oklch, var(--hel-color-semantic-surface-base), transparent 18%)}}.hel-stat label{{display:block;font-family:var(--hel-font-numeric);font-size:.66rem;letter-spacing:.08em;text-transform:uppercase;color:var(--hel-color-semantic-content-secondary);margin-bottom:var(--hel-dimension-space-2)}}.hel-stat strong{{font-family:var(--hel-font-display);font-size:1.8rem;line-height:1}}.hel-table-shell [data-testid="stDataFrame"]{{border:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 78%);border-radius:var(--hel-dimension-radius-architectural);overflow:hidden;background:color-mix(in oklch, var(--hel-color-semantic-surface-base), transparent 8%)}}.hel-json pre{{background:color-mix(in oklch, var(--hel-color-semantic-environment-void), transparent 8%)!important;border:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 80%);border-radius:var(--hel-dimension-radius-architectural);color:var(--hel-color-semantic-content-primary)!important}}
.topbar{{display:flex;align-items:center;justify-content:space-between;gap:var(--hel-dimension-space-4);padding:var(--hel-dimension-space-4) 0 var(--hel-dimension-space-5);border-bottom:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 78%);margin-bottom:var(--hel-dimension-space-5)}}.brand{{display:flex;align-items:center;gap:var(--hel-dimension-space-2);font-family:var(--hel-font-numeric);letter-spacing:.16em;font-size:.86rem;text-transform:uppercase;font-weight:600}}.brand i{{width:.62rem!important;height:.62rem!important;border-radius:50%;background:var(--hel-color-semantic-signal-primary)!important;box-shadow:0 0 24px color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 24%)!important;margin-right:var(--hel-dimension-space-2)!important}}.asof{{font-family:var(--hel-font-numeric)!important;font-size:.72rem!important;color:var(--hel-color-semantic-content-secondary)!important}}.status-strip{{display:flex;gap:var(--hel-dimension-space-2);flex-wrap:wrap;margin:0 0 var(--hel-dimension-space-5)}}.status-chip{{padding:var(--hel-dimension-space-2) var(--hel-dimension-space-3)!important;border:1px solid color-mix(in oklch, var(--hel-chip-tone, var(--hel-color-semantic-signal-primary)), transparent 68%)!important;border-radius:999px!important;background:color-mix(in oklch, var(--hel-chip-tone, var(--hel-color-semantic-signal-primary)), transparent 92%)!important;font-family:var(--hel-font-numeric)!important;font-size:.66rem!important;letter-spacing:.05em!important;color:color-mix(in oklch, var(--hel-chip-tone, var(--hel-color-semantic-signal-primary)), white 30%)!important}}.status-chip.ok{{--hel-chip-tone:var(--hel-color-semantic-signal-primary)}}.status-chip.warn{{--hel-chip-tone:var(--hel-color-semantic-signal-secondary)}}
.hero{{position:relative;overflow:hidden;border:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 72%)!important;border-radius:var(--hel-dimension-radius-architectural)!important;padding:var(--hel-dimension-space-7)!important;background:linear-gradient(135deg, color-mix(in oklch, var(--hel-color-semantic-surface-optical), transparent 8%), color-mix(in oklch, var(--hel-color-semantic-structure-primary), black 10%))!important;backdrop-filter:blur(var(--hel-optical-blur));box-shadow:0 var(--hel-dimension-depth-6) var(--hel-dimension-depth-7) color-mix(in oklch, black, transparent 52%), inset 0 1px color-mix(in oklch, white, transparent 94%)!important;animation:helReveal var(--hel-reveal-duration) var(--hel-ease-enter) both}}.hero::before{{content:"";position:absolute;inset:0;background:radial-gradient(circle at 74% 24%, color-mix(in oklch, var(--hel-color-semantic-signal-secondary), transparent 78%), transparent 18rem),linear-gradient(120deg, transparent 0 38%, color-mix(in oklch, var(--hel-color-semantic-content-primary), transparent 96%) 50%, transparent 62%);opacity:.82}}.hero>*{{position:relative;z-index:1}}.hero h1{{font-family:var(--hel-font-display)!important;font-size:clamp(2.8rem,6vw,5.8rem)!important;line-height:.93!important;margin:0!important}}.hero p{{max-width:780px!important;color:var(--hel-color-semantic-content-secondary)!important;font-size:1rem!important;margin:var(--hel-dimension-space-4) 0 0!important}}.eyebrow{{font-family:var(--hel-font-numeric)!important;font-size:.7rem!important;letter-spacing:.14em!important;text-transform:uppercase!important;color:var(--hel-color-semantic-signal-primary)!important;margin-bottom:var(--hel-dimension-space-3)!important}}
.panel{{position:relative;border:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 78%)!important;border-radius:var(--hel-dimension-radius-architectural)!important;background:linear-gradient(160deg, color-mix(in oklch, var(--hel-color-semantic-surface-optical), transparent 12%), color-mix(in oklch, var(--hel-color-semantic-surface-base), transparent 4%))!important;backdrop-filter:blur(var(--hel-optical-blur));box-shadow:0 var(--hel-dimension-depth-5) var(--hel-dimension-depth-6) color-mix(in oklch, black, transparent 58%), inset 0 1px color-mix(in oklch, white, transparent 94%)!important;padding:var(--hel-dimension-space-5)!important;overflow:hidden;animation:helReveal var(--hel-reveal-duration) var(--hel-ease-enter) both}}.panel-title{{font-family:var(--hel-font-numeric)!important;font-size:.72rem!important;letter-spacing:.12em!important;text-transform:uppercase!important;color:var(--hel-color-semantic-content-secondary)!important;margin-bottom:var(--hel-dimension-space-4)!important}}.driver{{display:grid!important;grid-template-columns:1fr 72px 82px!important;gap:var(--hel-dimension-space-3)!important;align-items:center!important;padding:var(--hel-dimension-space-3) 0!important;border-bottom:1px solid color-mix(in oklch, var(--hel-color-semantic-content-primary), transparent 92%)!important}}.driver b,.driver em{{font-family:var(--hel-font-numeric)!important;font-style:normal!important;text-align:right!important}}.driver em{{font-size:.72rem!important;color:var(--hel-color-semantic-content-secondary)!important}}.brief{{font-size:1.03rem!important;line-height:1.62!important;color:color-mix(in oklch, var(--hel-color-semantic-content-primary), transparent 10%)!important}}.brief strong{{color:var(--hel-color-semantic-content-primary)!important}}.pill{{display:inline-flex!important;align-items:center!important;gap:var(--hel-dimension-space-2)!important;padding:var(--hel-dimension-space-2) var(--hel-dimension-space-3)!important;border:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 76%)!important;border-radius:999px!important;font-family:var(--hel-font-numeric)!important;font-size:.66rem!important;color:var(--hel-color-semantic-content-secondary)!important}}.pill i{{background:var(--hel-color-semantic-signal-primary)!important;box-shadow:0 0 16px color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 35%)!important}}
[data-testid="stAlert"]{{border-radius:var(--hel-dimension-radius-architectural);border:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-secondary), transparent 64%);background:color-mix(in oklch, var(--hel-color-semantic-signal-secondary), transparent 90%);color:var(--hel-color-semantic-content-primary)}}button,[data-testid="stBaseButton-secondary"]{{border-radius:999px!important;border:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 68%)!important;background:color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 92%)!important;color:var(--hel-color-semantic-content-primary)!important;min-height:44px!important;transition:transform var(--hel-duration-fast) var(--hel-ease-focus)}}button:active{{transform:scale(var(--hel-weighted-scale)) translateY(var(--hel-weighted-y))}}*:focus-visible{{outline:2px solid var(--hel-color-semantic-signal-secondary)!important;outline-offset:3px!important}}
[data-testid="stMetric"]{{border:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 78%);border-radius:var(--hel-dimension-radius-architectural);background:linear-gradient(160deg, color-mix(in oklch, var(--hel-color-semantic-surface-optical), transparent 18%), color-mix(in oklch, var(--hel-color-semantic-surface-base), transparent 8%));padding:var(--hel-dimension-space-4);box-shadow:inset 0 1px color-mix(in oklch, white, transparent 94%)}}[data-testid="stMetricLabel"]{{font-family:var(--hel-font-numeric);font-size:.66rem;letter-spacing:.08em;text-transform:uppercase;color:var(--hel-color-semantic-content-secondary)}}[data-testid="stMetricValue"]{{font-family:var(--hel-font-display);font-size:1.9rem;color:var(--hel-color-semantic-content-primary)}}.stTabs [data-baseweb="tab-list"]{{gap:var(--hel-dimension-space-3);border-bottom:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 78%);background:color-mix(in oklch, var(--hel-color-semantic-surface-base), transparent 12%);border-radius:var(--hel-dimension-radius-architectural);padding:var(--hel-dimension-space-2)}}.stTabs [data-baseweb="tab"]{{font-family:var(--hel-font-numeric);font-size:.72rem;letter-spacing:.08em;text-transform:uppercase;border-radius:999px;padding:var(--hel-dimension-space-2) var(--hel-dimension-space-4);color:var(--hel-color-semantic-content-secondary)}}.stTabs [aria-selected="true"]{{background:color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 86%);color:var(--hel-color-semantic-content-primary)}}[data-testid="stDataFrame"]{{border:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 78%)!important;border-radius:var(--hel-dimension-radius-architectural)!important;overflow:hidden!important;background:color-mix(in oklch, var(--hel-color-semantic-surface-base), transparent 8%)!important}}[data-testid="stDataFrame"] iframe{{border-radius:var(--hel-dimension-radius-architectural)!important}}[data-testid="stFileUploader"]{{border:1px dashed color-mix(in oklch, var(--hel-color-semantic-signal-secondary), transparent 55%);border-radius:var(--hel-dimension-radius-architectural);background:color-mix(in oklch, var(--hel-color-semantic-signal-secondary), transparent 94%);padding:var(--hel-dimension-space-3)}}[data-testid="stSelectbox"],[data-testid="stRadio"],[data-testid="stFileUploader"]{{min-height:44px}}.hel-json-block{{white-space:pre-wrap;font-family:var(--hel-font-numeric);font-size:.72rem;line-height:1.5;color:var(--hel-color-semantic-content-secondary);background:color-mix(in oklch, var(--hel-color-semantic-environment-void), transparent 8%);border:1px solid color-mix(in oklch, var(--hel-color-semantic-signal-primary), transparent 80%);border-radius:var(--hel-dimension-radius-architectural);padding:var(--hel-dimension-space-4);max-height:420px;overflow:auto}}
@keyframes helReveal{{from{{opacity:0;transform:translateY(26px);filter:blur(18px)}}to{{opacity:1;transform:translateY(0);filter:blur(0)}}}}
@media (prefers-reduced-motion: reduce){{*,*::before,*::after{{animation-duration:1ms!important;transition-duration:1ms!important;scroll-behavior:auto!important}}.flip-card-inner{{transition:none!important}}.stApp::before,.stApp::after,.hel-surface::before,.hel-map-card::after,.hero::before{{display:none!important}}.hel-surface,.hero,.panel{{backdrop-filter:none!important;box-shadow:none!important}}}}
@media (prefers-contrast: more){{.hel-surface,.hel-hero,.hel-chip{{border-width:2px}}}}
@media(max-width:980px){{.block-container{{padding:var(--hel-dimension-space-3) var(--hel-dimension-space-4) var(--hel-dimension-space-7)}}.hel-zone-grid{{grid-template-columns:repeat(6,minmax(0,1fr))}}.hel-span-3,.hel-span-4,.hel-span-5,.hel-span-6,.hel-span-7,.hel-span-8{{grid-column:span 6}}.hel-statline{{grid-template-columns:repeat(2,minmax(0,1fr))}}.hel-hero{{padding:var(--hel-dimension-space-5)}}}}
@media(max-width:640px){{.block-container{{padding:var(--hel-dimension-space-3) var(--hel-dimension-space-3) var(--hel-dimension-space-7)}}.hel-topbar,.topbar{{align-items:flex-start;flex-direction:column}}.asof{{white-space:normal}}.hel-zone-grid,.hel-statline{{grid-template-columns:1fr}}.hel-span-3,.hel-span-4,.hel-span-5,.hel-span-6,.hel-span-7,.hel-span-8,.hel-span-12{{grid-column:1/-1}}.hel-hero h1{{font-size:2.55rem}}.hel-map-card,.flip-shell,.flip-card-inner{{min-height:206px}}.hel-surface{{padding:var(--hel-dimension-space-4)}}.hel-map-card.card-front{{padding:15px 18px 12px!important}}.hel-map-card.card-back{{padding:10px 14px 8px!important}}.card-back .hel-title{{font-size:.62rem;margin-bottom:.1rem}}.card-back .hel-title strong{{font-size:1rem}}.hel-context-row{{padding:.09rem 0;font-size:.67rem}}.agreement{{margin-top:.1rem}}.flip-hint,.regime-age{{font-size:.5rem}}}}
@media (prefers-reduced-transparency: reduce){{.hel-surface,.hel-hero,[data-testid="stSidebar"] [role="radiogroup"]{{backdrop-filter:none;background:var(--hel-color-semantic-surface-base)}}}}
</style>
"""


def surface(title: str, body: str, *, strong: str | None = None, span: int = 12, tone: str | None = None) -> str:
    style = f' style="--hel-surface-tone:{esc(tone)}"' if tone else ""
    strong_html = f"<strong>{esc(strong)}</strong>" if strong else ""
    return f'<section class="hel-surface hel-span-{span}"{style}><div class="hel-title">{esc(title)}{strong_html}</div>{body}</section>'


def _contract_attributes(role: ComponentRole) -> str:
    """Resolve and expose dual-HEL ownership without duplicating package values."""

    ownership = environment_runtime().component_ownership(role)
    return (
        f'data-hel-contract="{esc(role.value)}" '
        f'data-hel-structure="{esc(ownership.structure_owner.value)}" '
        f'data-hel-interaction="{esc(ownership.interaction_owner.value)}"'
    )


def contract_attributes(role: ComponentRole) -> str:
    """Expose a safe ownership marker for custom analytical markup."""

    return _contract_attributes(role)


def _state(value: OperationalState | str) -> OperationalState:
    if isinstance(value, OperationalState):
        return value
    aliases = {
        "ok": OperationalState.NOMINAL,
        "success": OperationalState.NOMINAL,
        "passive": OperationalState.INFORMATIONAL,
        "info": OperationalState.INFORMATIONAL,
        "warn": OperationalState.WARNING,
        "failure": OperationalState.FAILED,
        "empty": OperationalState.UNAVAILABLE,
    }
    normalized = str(value).lower()
    if normalized in aliases:
        return aliases[normalized]
    try:
        return OperationalState(normalized)
    except ValueError:
        return OperationalState.INFORMATIONAL


def workspace_header(
    title: str,
    detail: str,
    *,
    code: str,
    role: ComponentRole = ComponentRole.OPERATOR_CONTROL,
) -> str:
    return (
        f'<header class="hel-workspace-instrument" {_contract_attributes(role)}>'
        f'<div><span>{esc(code)}</span><h2>{esc(title)}</h2></div>'
        f'<p>{esc(detail)}</p></header>'
    )


def control_legend(title: str, detail: str, *, role: ComponentRole) -> str:
    """Label a native interactive control with its resolved dual-HEL contract."""

    return (
        f'<div class="hel-control-legend" {_contract_attributes(role)}>'
        f'<span>{esc(title)}</span><small>{esc(detail)}</small></div>'
    )


def stat(
    label: str,
    value: Any,
    detail: str = "",
    state: OperationalState | str = OperationalState.INFORMATIONAL,
) -> str:
    resolved = _state(state)
    return (
        f'<div class="hel-stat" data-state="{resolved.value}" '
        f'{_contract_attributes(ComponentRole.METRIC_INSTRUMENT)}>'
        f'<span class="hel-state-label">{esc(resolved.value)}</span>'
        f'<label>{esc(label)}</label><strong>{esc(value)}</strong>'
        f'<div class="hel-muted hel-mono">{esc(detail)}</div></div>'
    )


def statline(items: Iterable[tuple[str, Any, str] | tuple[str, Any, str, str]]) -> str:
    cells = []
    for item in items:
        label, value, detail, *state = item
        cells.append(stat(label, value, detail, state[0] if state else OperationalState.INFORMATIONAL))
    return '<div class="hel-statline" role="status">' + "".join(cells) + "</div>"


def table_shell_start() -> str:
    return f'<div class="hel-table-shell" {_contract_attributes(ComponentRole.DATA_TABLE)}>'


def table_shell_end() -> str:
    return "</div>"


def data_instrument_header(
    title: str,
    rows: int,
    *,
    source: str,
    freshness: str,
    state: OperationalState | str,
) -> str:
    resolved = _state(state)
    row_label = "row" if rows == 1 else "rows"
    return (
        f'<header class="hel-data-instrument-head" data-state="{resolved.value}" role="region" '
        f'aria-label="{esc(title)}" {_contract_attributes(ComponentRole.DATA_TABLE)}>'
        f'<div><span>HEL-028 · dense data instrument</span><strong role="heading" aria-level="3">{esc(title)}</strong></div>'
        '<dl>'
        f'<div><dt>State</dt><dd>{esc(resolved.value)}</dd></div>'
        f'<div><dt>Rows</dt><dd>{rows} {row_label}</dd></div>'
        f'<div><dt>Source</dt><dd>{esc(source)}</dd></div>'
        f'<div><dt>Freshness</dt><dd>{esc(freshness)}</dd></div>'
        '</dl></header>'
    )


def empty_state(title: str, message: str) -> str:
    return (
        f'<section class="hel-empty-instrument" data-state="unavailable" '
        f'{_contract_attributes(ComponentRole.EMPTY_STATE)} role="status">'
        f'<span>UNAVAILABLE · NO OBSERVATIONS</span><strong>{esc(title)}</strong>'
        f'<p>{esc(message)}</p></section>'
    )


def inspection_surface(title: str, body: str, *, state: str = "informational") -> str:
    resolved = _state(state)
    return (
        f'<section class="hel-inspection-instrument" data-state="{resolved.value}" '
        f'{_contract_attributes(ComponentRole.EXPANDABLE_INSPECTION)}>'
        f'<header><span>{esc(resolved.value)}</span><strong>{esc(title)}</strong></header>'
        f'<div>{body}</div></section>'
    )


def json_block(
    payload: Any,
    *,
    title: str = "Raw inspection",
    expanded: bool = True,
    role: ComponentRole = ComponentRole.JSON_RAW_INSPECTION,
) -> str:
    open_attribute = " open" if expanded else ""
    return (
        f'<details class="hel-json-inspector"{open_attribute} '
        f'{_contract_attributes(role)}>'
        f'<summary><span>INSPECTION · STRUCTURED DATA</span><strong>{esc(title)}</strong></summary>'
        f'<pre class="hel-json-block">{esc(json.dumps(payload, indent=2, default=str))}</pre></details>'
    )


def notice(
    title: str,
    message: str,
    *,
    state: OperationalState | str = OperationalState.INFORMATIONAL,
    tone: str | None = None,
) -> str:
    """Render text-first system feedback; tone is retained for API compatibility."""

    del tone
    resolved = _state(state)
    aria_role = "alert" if resolved in {OperationalState.CRITICAL, OperationalState.FAILED} else "status"
    component_role = ComponentRole.PROGRESS_LOADING if resolved is OperationalState.LOADING else ComponentRole.ALERT_NOTICE
    return (
        f'<section class="hel-operational-state" data-state="{resolved.value}" '
        f'{_contract_attributes(component_role)} role="{aria_role}" aria-live="polite">'
        f'<span>{esc(resolved.value)} · system feedback</span><strong>{esc(title)}</strong>'
        f'<p>{esc(message)}</p></section>'
    )


def risk_instrument(
    risk_state: Any,
    invalidation: Any,
    *,
    acknowledged: bool = False,
) -> str:
    risk_text = str(risk_state or "Unavailable")
    invalidation_text = str(invalidation or "Unavailable")
    lowered = risk_text.lower()
    state = (
        OperationalState.ACKNOWLEDGED
        if acknowledged
        else OperationalState.CRITICAL
        if "critical" in lowered or "high" in lowered
        else OperationalState.WARNING
        if "warn" in lowered or "elevated" in lowered
        else OperationalState.UNAVAILABLE
        if risk_text == "Unavailable"
        else OperationalState.INFORMATIONAL
    )
    return (
        f'<section class="hel-risk-instrument" data-state="{state.value}" role="region" '
        f'aria-label="Risk and invalidation" {_contract_attributes(ComponentRole.RISK_AND_INVALIDATION)}>'
        '<header><span>RISK · INVALIDATION</span>'
        f'<strong>{esc(state.value)}</strong></header><dl>'
        f'<div><dt>Risk state</dt><dd>{esc(risk_text)}</dd></div>'
        f'<div><dt>Invalidation</dt><dd>{esc(invalidation_text)}</dd></div>'
        '</dl></section>'
    )


def analytical_instrument(
    title: str,
    code: str,
    metrics: Iterable[tuple[str, Any, str]],
    *,
    role: ComponentRole,
    state: OperationalState | str = OperationalState.INFORMATIONAL,
    narrative: str | None = None,
) -> str:
    """Render exact analytical readouts inside a registered dual-HEL instrument."""

    resolved = _state(state)
    cells = "".join(
        '<div class="hel-analytical-readout">'
        f'<dt>{esc(label)}</dt><dd>{esc(value)}</dd><small>{esc(detail)}</small></div>'
        for label, value, detail in metrics
    )
    body = f'<p>{esc(narrative)}</p>' if narrative else ""
    return (
        f'<section class="hel-analytical-instrument" data-state="{resolved.value}" role="region" '
        f'aria-label="{esc(title)}" {_contract_attributes(role)}>'
        '<header><div>'
        f'<span>{esc(code)}</span><strong role="heading" aria-level="3">{esc(title)}</strong></div>'
        f'<b>{esc(resolved.value)}</b></header><dl>{cells}</dl>{body}</section>'
    )


def analytical_list(
    title: str,
    code: str,
    items: Iterable[tuple[str, str]],
    *,
    role: ComponentRole,
    state: OperationalState | str = OperationalState.INFORMATIONAL,
    empty_message: str = "UNKNOWN — evidence unavailable.",
) -> str:
    """Render compact evidence, contradiction, or priority rows without inference."""

    resolved = _state(state)
    rows = list(items)
    content = "".join(
        '<li><span>'
        f'{esc(label)}</span><strong>{esc(value)}</strong></li>'
        for label, value in rows
    )
    if not rows:
        content = f'<li class="hel-analytical-empty"><span>{esc(empty_message)}</span></li>'
    return (
        f'<section class="hel-analytical-instrument hel-analytical-list" data-state="{resolved.value}" role="region" '
        f'aria-label="{esc(title)}" {_contract_attributes(role)}>'
        '<header><div>'
        f'<span>{esc(code)}</span><strong role="heading" aria-level="3">{esc(title)}</strong></div>'
        f'<b>{esc(resolved.value)}</b></header><ol>{content}</ol></section>'
    )


def chart_instrument_header(
    title: str,
    detail: str,
    *,
    role: ComponentRole = ComponentRole.CHART_AND_GAUGE,
    state: OperationalState | str = OperationalState.INFORMATIONAL,
) -> str:
    """Label a Plotly view with its world/precision ownership contract."""

    resolved = _state(state)
    return (
        f'<header class="hel-chart-instrument-head" data-state="{resolved.value}" role="group" '
        f'aria-label="{esc(title)}" {_contract_attributes(role)}><div><span>HEL-032 terrain · HEL-028 precision</span>'
        f'<strong role="heading" aria-level="3">{esc(title)}</strong></div><p>{esc(detail)}</p></header>'
    )


def operator_shell_css() -> str:
    """Install HEL-028 instruments inside the unchanged HEL-032 world shell."""

    runtime = environment_runtime()
    glass = runtime.materials.resolve(MaterialRole.OPERATOR_GLASS)
    press = runtime.motion.resolve(MotionRole.OPERATOR_PRESS)
    magnetic = runtime.motion.resolve(MotionRole.OPERATOR_MAGNETIC_FIELD)
    numeric = runtime.typography_value(TypographyRole.OPERATOR_NUMERIC)
    tracking = runtime.typography_value(TypographyRole.OPERATOR_LABEL_TRACKING)
    line_height = runtime.typography_value(TypographyRole.OPERATOR_DENSE_LINE_HEIGHT)
    return f"""
<style>
:root{{
{runtime.css_variables()}
  --hel-operator-font-numeric:{numeric};
  --hel-operator-label-tracking:{tracking}em;
  --hel-operator-line-height:{line_height};
  --hel-operator-glass-opacity:{glass['opacity']};
  --hel-operator-glass-blur:{glass['backdropBlurPx']}px;
  --hel-operator-press-scale:{press['scale']};
  --hel-operator-press-y:{press['translateY']}px;
  --hel-operator-reach:{magnetic['radiusPx']}px;
  --hel-operator-ease-focus:cubic-bezier(var(--hel-operator-cubicbezier-focus));
}}
html{{-webkit-text-size-adjust:100%;text-size-adjust:100%;scroll-padding-top:var(--hel-dimension-space-4)}}
[data-testid="stMain"]{{overflow-y:auto;overscroll-behavior-y:contain;scrollbar-gutter:stable;scroll-behavior:smooth}}
[data-testid="stSidebarContent"]{{height:100dvh;overflow-y:auto;overscroll-behavior:contain;scrollbar-gutter:stable;padding-bottom:var(--hel-dimension-space-6)}}
:where(button,input,select,textarea,[tabindex]):focus-visible{{scroll-margin-block:var(--hel-dimension-space-5)}}
.flip-toggle{{inset:0 auto auto 0;width:1px;height:1px;margin:0;clip-path:inset(50%);white-space:nowrap}}
.flip-card-inner,.card-face{{will-change:auto}}
.flip-shell:hover .flip-card-inner,.flip-toggle:checked+.flip-card-inner,.flip-toggle:focus-visible+.flip-card-inner{{will-change:transform}}
.flip-toggle:focus-visible+.flip-card-inner{{outline:2px solid var(--hel-semantic-operator-control-secondary)!important;outline-offset:3px!important}}
[data-testid="stHorizontalBlock"]:has(.flip-shell){{align-items:start}}
.hel-operator-shell{{
  position:relative;
  margin:0 0 var(--hel-dimension-space-5);
  border:1px solid color-mix(in oklch,var(--hel-color-semantic-signal-primary),transparent 68%);
  border-radius:var(--hel-dimension-radius-architectural);
  overflow:hidden;
  isolation:isolate;
  background:linear-gradient(145deg,var(--hel-color-semantic-structure-primary),var(--hel-color-semantic-surface-base));
  box-shadow:0 var(--hel-dimension-depth-2) var(--hel-dimension-depth-5) color-mix(in oklch,black,transparent 52%),inset 0 1px color-mix(in oklch,var(--hel-color-semantic-content-primary),transparent 94%);
}}
.hel-operator-shell::before{{
  content:"";position:absolute;inset:0;pointer-events:none;z-index:0;
  background:linear-gradient(90deg,color-mix(in oklch,var(--hel-color-semantic-signal-primary),transparent 96%) 1px,transparent 1px);
  background-size:var(--hel-dimension-space-8) 100%;opacity:.46;
}}
.hel-operator-rail,.hel-operator-status-bank{{position:relative;z-index:1}}
.hel-operator-rail.topbar{{
  display:flex;align-items:center;justify-content:space-between;gap:var(--hel-dimension-space-4);
  margin:0;padding:var(--hel-dimension-space-3) var(--hel-dimension-space-4);
  border:0;border-bottom:1px solid color-mix(in oklch,var(--hel-semantic-operator-control-primary),transparent 70%);
  background:color-mix(in oklch,var(--hel-semantic-operator-surface-optical),transparent calc((1 - var(--hel-operator-glass-opacity)) * 100%));
  backdrop-filter:blur(var(--hel-operator-glass-blur));
}}
.hel-operator-identity.brand{{display:flex;align-items:center;gap:var(--hel-dimension-space-3);min-width:0}}
.hel-operator-identity.brand i{{
  flex:0 0 auto;width:8px!important;height:26px!important;border-radius:var(--hel-semantic-operator-radius-control)!important;
  margin:0!important;background:var(--hel-color-semantic-signal-primary)!important;
  box-shadow:0 0 18px color-mix(in oklch,var(--hel-color-semantic-signal-primary),transparent 34%)!important;
}}
.hel-operator-identity b,.hel-operator-identity small,.hel-operator-session span,.hel-operator-session strong,.hel-operator-session time{{display:block}}
.hel-operator-identity b{{font-family:var(--hel-font-display);font-size:1.08rem;letter-spacing:.04em;text-transform:none;color:var(--hel-color-semantic-content-primary)}}
.hel-operator-identity small,.hel-operator-session span{{
  font-family:var(--hel-operator-font-numeric);font-size:.58rem;line-height:1.25;
  letter-spacing:var(--hel-operator-label-tracking);text-transform:uppercase;color:var(--hel-semantic-operator-content-secondary);
}}
.hel-operator-session{{display:grid;grid-template-columns:auto;align-items:center;min-width:0;text-align:right}}
.hel-operator-session strong{{font-family:var(--hel-operator-font-numeric);font-size:.68rem;letter-spacing:.08em;color:var(--hel-semantic-operator-control-primary)}}
.hel-operator-session time{{max-width:30ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--hel-operator-font-numeric);font-size:.62rem;color:var(--hel-semantic-operator-content-secondary)}}
.hel-operator-status-bank.status-strip{{
  display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;margin:0;
  background:color-mix(in oklch,var(--hel-semantic-operator-surface-instrument),transparent 6%);
}}
.hel-operator-status-bank .status-chip{{
  --hel-operator-state-tone:var(--hel-semantic-operator-content-secondary);
  display:grid;grid-template-columns:minmax(0,1fr) auto;align-items:end;gap:var(--hel-dimension-space-2);
  position:relative;min-width:0;min-height:44px;padding:var(--hel-dimension-space-2) var(--hel-dimension-space-3)!important;
  border:0!important;border-right:1px solid color-mix(in oklch,var(--hel-semantic-operator-content-primary),transparent 90%)!important;
  border-radius:0!important;background:transparent!important;color:var(--hel-semantic-operator-content-primary)!important;
}}
.hel-operator-status-bank .status-chip:last-child{{border-right:0!important}}
.hel-operator-status-bank .status-chip small{{
  overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--hel-operator-font-numeric);
  font-size:.56rem;letter-spacing:var(--hel-operator-label-tracking);text-transform:uppercase;color:var(--hel-semantic-operator-content-secondary);
}}
.hel-operator-status-bank .status-chip strong{{
  min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;text-align:right;font-family:var(--hel-operator-font-numeric);
  font-size:.66rem;letter-spacing:.04em;color:var(--hel-operator-state-tone);
}}
.hel-operator-status-bank [data-state="success"]{{--hel-operator-state-tone:var(--hel-semantic-operator-control-primary)}}
.hel-operator-status-bank [data-state="warning"]{{--hel-operator-state-tone:var(--hel-semantic-operator-control-secondary)}}
.hel-operator-status-bank [data-state="failure"]{{--hel-operator-state-tone:var(--hel-semantic-operator-status-critical)}}
.hel-operator-status-bank [data-state="loading"]{{--hel-operator-state-tone:var(--hel-semantic-operator-control-secondary)}}
.hel-operator-status-bank [data-state="loading"]::after{{content:"";position:absolute;inset:auto 0 0;height:1px;background:var(--hel-operator-state-tone);animation:helOperatorScan var(--hel-semantic-operator-motion-duration) linear infinite alternate}}
.hel-operator-bay-heading{{
  margin:0 0 var(--hel-dimension-space-3);padding:var(--hel-dimension-space-3);
  border:1px solid color-mix(in oklch,var(--hel-color-semantic-signal-primary),transparent 70%);
  border-radius:var(--hel-dimension-radius-architectural);
  background:linear-gradient(145deg,color-mix(in oklch,var(--hel-color-semantic-surface-optical),transparent 8%),color-mix(in oklch,var(--hel-semantic-operator-surface-instrument),transparent 12%));
}}
.hel-operator-bay-heading span,.hel-operator-bay-heading strong{{display:block}}
.hel-operator-bay-heading span{{font-family:var(--hel-operator-font-numeric);font-size:.56rem;letter-spacing:var(--hel-operator-label-tracking);text-transform:uppercase;color:var(--hel-color-semantic-signal-primary)}}
.hel-operator-bay-heading strong{{margin-top:var(--hel-dimension-space-1);font-family:var(--hel-font-display);font-size:1.2rem;color:var(--hel-color-semantic-content-primary)}}
.hel-operator-bay-heading small{{display:block;margin-top:var(--hel-dimension-space-1);font-family:var(--hel-operator-font-numeric);font-size:.58rem;line-height:1.4;color:var(--hel-semantic-operator-content-secondary)}}
[data-testid="stSidebar"]{{background:linear-gradient(180deg,var(--hel-color-semantic-structure-primary),var(--hel-color-semantic-environment-void))!important}}
[data-testid="stSidebar"] [data-testid="stRadio"],
[data-testid="stSidebar"] [data-testid="stSelectbox"],
[data-testid="stSidebar"] [data-testid="stCheckbox"],
[data-testid="stSidebar"] [data-testid="stFileUploader"]{{margin-bottom:var(--hel-dimension-space-3)}}
[data-testid="stSidebar"] [role="radiogroup"]{{
  display:grid!important;gap:2px!important;padding:3px!important;
  border:1px solid color-mix(in oklch,var(--hel-semantic-operator-control-primary),transparent 76%)!important;
  border-radius:var(--hel-semantic-operator-radius-control)!important;
  background:color-mix(in oklch,var(--hel-semantic-operator-surface-instrument),transparent 8%)!important;
  box-shadow:inset 0 1px color-mix(in oklch,var(--hel-semantic-operator-content-primary),transparent 94%)!important;
}}
[data-testid="stSidebar"] [role="radiogroup"] label{{
  min-height:44px!important;margin:0!important;padding:0 var(--hel-dimension-space-2)!important;
  border:1px solid transparent;border-radius:var(--hel-semantic-operator-radius-control)!important;
  display:flex!important;align-items:center!important;transition:background var(--hel-semantic-operator-motion-duration) var(--hel-operator-ease-focus),border-color var(--hel-semantic-operator-motion-duration) var(--hel-operator-ease-focus),transform var(--hel-semantic-operator-motion-duration) var(--hel-operator-ease-focus)!important;
}}
[data-testid="stSidebar"] [role="radiogroup"] label:hover{{
  border-color:color-mix(in oklch,var(--hel-semantic-operator-control-primary),transparent 70%);
  background:color-mix(in oklch,var(--hel-semantic-operator-control-primary),transparent 92%);
}}
[data-testid="stSidebar"] [role="radiogroup"] label:has(input:checked){{
  border-color:color-mix(in oklch,var(--hel-semantic-operator-control-primary),transparent 54%);
  background:color-mix(in oklch,var(--hel-semantic-operator-control-primary),transparent 86%);
  box-shadow:inset 2px 0 var(--hel-semantic-operator-control-primary);
}}
[data-testid="stSidebar"] [role="radiogroup"] label:active{{transform:scale(var(--hel-operator-press-scale)) translateY(var(--hel-operator-press-y))}}
[data-testid="stSelectbox"] [data-baseweb="select"]>div{{
  min-height:44px!important;border:1px solid color-mix(in oklch,var(--hel-semantic-operator-control-primary),transparent 72%)!important;
  border-radius:var(--hel-semantic-operator-radius-control)!important;background:var(--hel-semantic-operator-surface-instrument)!important;
  font-family:var(--hel-operator-font-numeric)!important;color:var(--hel-semantic-operator-content-primary)!important;
  transition:border-color var(--hel-semantic-operator-motion-duration) var(--hel-operator-ease-focus),box-shadow var(--hel-semantic-operator-motion-duration) var(--hel-operator-ease-focus)!important;
}}
[data-testid="stSelectbox"] [data-baseweb="select"]>div:hover{{border-color:var(--hel-semantic-operator-control-primary)!important}}
[data-testid="stSelectbox"] [data-baseweb="select"]:focus-within>div{{outline:2px solid var(--hel-semantic-operator-control-secondary)!important;outline-offset:2px!important}}
[data-testid="stCheckbox"] label{{min-height:44px;display:flex;align-items:center;padding:0 var(--hel-dimension-space-2);border:1px solid color-mix(in oklch,var(--hel-semantic-operator-content-primary),transparent 88%);border-radius:var(--hel-semantic-operator-radius-control);background:color-mix(in oklch,var(--hel-semantic-operator-surface-instrument),transparent 10%)}}
[data-testid="stFileUploader"]{{border-color:color-mix(in oklch,var(--hel-semantic-operator-control-secondary),transparent 62%)!important;border-radius:var(--hel-semantic-operator-radius-control)!important;background:color-mix(in oklch,var(--hel-semantic-operator-surface-instrument),transparent 8%)!important}}
.hel-action,.stButton>button,[data-testid="stFileUploader"] button{{
  --hel-action-tone:var(--hel-semantic-operator-control-primary);
  min-height:44px!important;border:1px solid color-mix(in oklch,var(--hel-action-tone),transparent 54%)!important;
  border-radius:var(--hel-semantic-operator-radius-control)!important;background:color-mix(in oklch,var(--hel-action-tone),transparent 88%)!important;
  font-family:var(--hel-operator-font-numeric)!important;font-size:.68rem!important;font-weight:600!important;letter-spacing:.06em!important;text-transform:uppercase!important;
  color:color-mix(in oklch,var(--hel-action-tone),white 24%)!important;transition:background var(--hel-semantic-operator-motion-duration) var(--hel-operator-ease-focus),border-color var(--hel-semantic-operator-motion-duration) var(--hel-operator-ease-focus),transform var(--hel-semantic-operator-motion-duration) var(--hel-operator-ease-focus)!important;
}}
.hel-action--primary{{--hel-action-tone:var(--hel-semantic-operator-control-primary)}}
.hel-action--secondary{{--hel-action-tone:var(--hel-semantic-operator-control-secondary)}}
.hel-action--destructive{{--hel-action-tone:var(--hel-semantic-operator-status-critical)}}
.hel-action--confirmatory{{--hel-action-tone:var(--hel-semantic-operator-control-primary);box-shadow:inset 3px 0 var(--hel-action-tone)}}
.hel-action--passive{{--hel-action-tone:var(--hel-semantic-operator-content-secondary)}}
.hel-action[data-state="idle"]{{--hel-action-tone:var(--hel-semantic-operator-control-primary)}}
.hel-action:hover,.stButton>button:hover,[data-testid="stFileUploader"] button:hover{{background:color-mix(in oklch,var(--hel-action-tone),transparent 80%)!important;border-color:var(--hel-action-tone)!important}}
.hel-action:focus-visible,.stButton>button:focus-visible,[data-testid="stFileUploader"] button:focus-visible{{outline:2px solid var(--hel-semantic-operator-control-secondary)!important;outline-offset:3px!important}}
.hel-action:active,.stButton>button:active,[data-testid="stFileUploader"] button:active{{transform:scale(var(--hel-operator-press-scale)) translateY(var(--hel-operator-press-y))!important}}
.hel-action:disabled,.hel-action[aria-disabled="true"],.hel-action[data-state="disabled"],.stButton>button:disabled,[data-testid="stFileUploader"] button:disabled{{opacity:.42!important;cursor:not-allowed!important;filter:saturate(.35)!important;transform:none!important}}
.hel-action[data-state="loading"],[aria-busy="true"].hel-action{{cursor:progress}}
.hel-action[data-state="success"]{{--hel-action-tone:var(--hel-semantic-operator-control-primary)}}
.hel-action[data-state="warning"]{{--hel-action-tone:var(--hel-semantic-operator-control-secondary)}}
.hel-action[data-state="failure"]{{--hel-action-tone:var(--hel-semantic-operator-status-critical)}}
.hel-operator-risk-seal{{
  margin-top:var(--hel-dimension-space-6);padding:var(--hel-dimension-space-3) var(--hel-dimension-space-4);
  border-top:1px solid color-mix(in oklch,var(--hel-semantic-operator-status-critical),transparent 72%);
  border-bottom:1px solid color-mix(in oklch,var(--hel-semantic-operator-content-primary),transparent 92%);
  font-family:var(--hel-operator-font-numeric);font-size:.62rem;letter-spacing:.08em;text-transform:uppercase;
  color:var(--hel-semantic-operator-content-secondary);background:linear-gradient(90deg,color-mix(in oklch,var(--hel-semantic-operator-status-critical),transparent 94%),transparent 55%);
}}
.hel-workspace-instrument{{
  display:flex;align-items:end;justify-content:space-between;gap:var(--hel-dimension-space-5);
  margin:0 0 var(--hel-dimension-space-4);padding:0 0 var(--hel-dimension-space-3);
  border-bottom:1px solid color-mix(in oklch,var(--hel-color-semantic-signal-primary),transparent 74%);
}}
.hel-workspace-instrument span,.hel-workspace-instrument p{{font-family:var(--hel-operator-font-numeric);font-size:.62rem;line-height:1.45;color:var(--hel-semantic-operator-content-secondary)}}
.hel-workspace-instrument span{{letter-spacing:var(--hel-operator-label-tracking);text-transform:uppercase;color:var(--hel-color-semantic-signal-primary)}}
.hel-workspace-instrument h2{{margin:var(--hel-dimension-space-1) 0 0;font-size:clamp(1.65rem,3vw,2.35rem)}}
.hel-workspace-instrument p{{max-width:64ch;margin:0;text-align:right}}
.hel-control-legend{{display:flex;align-items:baseline;justify-content:space-between;gap:var(--hel-dimension-space-3);margin:var(--hel-dimension-space-2) 0 var(--hel-dimension-space-1);font-family:var(--hel-operator-font-numeric)}}.hel-control-legend span{{font-size:.58rem;letter-spacing:var(--hel-operator-label-tracking);text-transform:uppercase;color:var(--hel-semantic-operator-content-primary)}}.hel-control-legend small{{font-size:.52rem;line-height:1.35;text-align:right;color:var(--hel-semantic-operator-content-secondary)}}
.hel-statline{{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:0;margin:0 0 var(--hel-dimension-space-4);border:1px solid color-mix(in oklch,var(--hel-semantic-operator-control-primary),transparent 74%);border-radius:var(--hel-dimension-radius-architectural);overflow:hidden;background:var(--hel-semantic-operator-surface-instrument)}}
.hel-stat{{--hel-instrument-state:var(--hel-semantic-operator-content-secondary);position:relative;display:grid;align-content:start;min-width:0;min-height:104px;padding:var(--hel-dimension-space-3);border-right:1px solid color-mix(in oklch,var(--hel-semantic-operator-content-primary),transparent 90%);font-variant-numeric:tabular-nums}}
.hel-stat:last-child{{border-right:0}}.hel-stat[data-state="nominal"]{{--hel-instrument-state:var(--hel-semantic-operator-control-primary)}}.hel-stat[data-state="stale"],.hel-stat[data-state="warning"]{{--hel-instrument-state:var(--hel-semantic-operator-control-secondary)}}.hel-stat[data-state="critical"],.hel-stat[data-state="failed"]{{--hel-instrument-state:var(--hel-semantic-operator-status-critical)}}
.hel-stat .hel-state-label{{justify-self:start;margin-bottom:var(--hel-dimension-space-2);font-family:var(--hel-operator-font-numeric);font-size:.52rem;letter-spacing:.09em;text-transform:uppercase;color:var(--hel-instrument-state)}}
.hel-stat label{{font-family:var(--hel-operator-font-numeric);font-size:.58rem;letter-spacing:var(--hel-operator-label-tracking);text-transform:uppercase;color:var(--hel-semantic-operator-content-secondary)}}
.hel-stat strong{{overflow:hidden;text-overflow:ellipsis;margin:var(--hel-dimension-space-1) 0;font-family:var(--hel-operator-font-numeric);font-size:1.24rem;line-height:1.1;color:var(--hel-semantic-operator-content-primary);font-variant-numeric:tabular-nums}}
.hel-stat .hel-muted{{font-size:.6rem;line-height:1.35}}
.hel-data-instrument-head{{--hel-instrument-state:var(--hel-semantic-operator-content-secondary);display:flex;align-items:end;justify-content:space-between;gap:var(--hel-dimension-space-4);margin:var(--hel-dimension-space-4) 0 0;padding:var(--hel-dimension-space-3);border:1px solid color-mix(in oklch,var(--hel-instrument-state),transparent 72%);border-bottom:0;border-radius:var(--hel-dimension-radius-architectural) var(--hel-dimension-radius-architectural) 0 0;background:linear-gradient(145deg,color-mix(in oklch,var(--hel-semantic-operator-surface-optical),transparent 8%),var(--hel-semantic-operator-surface-instrument))}}
.hel-data-instrument-head[data-state="nominal"]{{--hel-instrument-state:var(--hel-semantic-operator-control-primary)}}.hel-data-instrument-head[data-state="stale"],.hel-data-instrument-head[data-state="warning"]{{--hel-instrument-state:var(--hel-semantic-operator-control-secondary)}}.hel-data-instrument-head[data-state="critical"],.hel-data-instrument-head[data-state="failed"]{{--hel-instrument-state:var(--hel-semantic-operator-status-critical)}}
.hel-data-instrument-head span,.hel-data-instrument-head strong{{display:block}}.hel-data-instrument-head span{{font-family:var(--hel-operator-font-numeric);font-size:.52rem;letter-spacing:var(--hel-operator-label-tracking);text-transform:uppercase;color:var(--hel-instrument-state)}}.hel-data-instrument-head strong{{margin-top:var(--hel-dimension-space-1);font-family:var(--hel-font-display);font-size:1.15rem;color:var(--hel-color-semantic-content-primary)}}
.hel-data-instrument-head dl{{display:flex;align-items:end;gap:var(--hel-dimension-space-4);margin:0}}.hel-data-instrument-head dl div{{min-width:0}}.hel-data-instrument-head dt,.hel-data-instrument-head dd{{margin:0;font-family:var(--hel-operator-font-numeric);font-size:.56rem;line-height:1.35}}.hel-data-instrument-head dt{{letter-spacing:.08em;text-transform:uppercase;color:var(--hel-semantic-operator-content-secondary)}}.hel-data-instrument-head dd{{max-width:18ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:var(--hel-semantic-operator-content-primary);font-variant-numeric:tabular-nums}}
[data-testid="stDataFrame"]{{margin-top:0!important;border:1px solid color-mix(in oklch,var(--hel-semantic-operator-content-primary),transparent 84%)!important;border-radius:0 0 var(--hel-dimension-radius-architectural) var(--hel-dimension-radius-architectural)!important;background:var(--hel-semantic-operator-surface-instrument)!important;box-shadow:inset 3px 0 color-mix(in oklch,var(--hel-semantic-operator-control-primary),transparent 38%)!important;font-family:var(--hel-operator-font-numeric)!important;font-variant-numeric:tabular-nums!important}}
[data-testid="stDataFrame"] button{{min-height:36px!important;border-radius:var(--hel-semantic-operator-radius-control)!important}}
[data-testid="stDataFrame"] [aria-selected="true"]{{outline:2px solid var(--hel-semantic-operator-control-secondary)!important;outline-offset:-2px!important}}
.hel-operational-state,.hel-empty-instrument{{--hel-instrument-state:var(--hel-semantic-operator-content-secondary);position:relative;margin:0 0 var(--hel-dimension-space-4);padding:var(--hel-dimension-space-4);border:1px solid color-mix(in oklch,var(--hel-instrument-state),transparent 62%);border-left-width:4px;border-radius:var(--hel-dimension-radius-architectural);background:linear-gradient(90deg,color-mix(in oklch,var(--hel-instrument-state),transparent 92%),var(--hel-semantic-operator-surface-instrument));box-shadow:inset 0 1px color-mix(in oklch,var(--hel-semantic-operator-content-primary),transparent 94%)}}
.hel-operational-state[data-state="nominal"],.hel-operational-state[data-state="acknowledged"]{{--hel-instrument-state:var(--hel-semantic-operator-control-primary)}}.hel-operational-state[data-state="stale"],.hel-operational-state[data-state="warning"],.hel-operational-state[data-state="loading"]{{--hel-instrument-state:var(--hel-semantic-operator-control-secondary)}}.hel-operational-state[data-state="critical"],.hel-operational-state[data-state="failed"]{{--hel-instrument-state:var(--hel-semantic-operator-status-critical)}}
.hel-operational-state>span,.hel-empty-instrument>span{{display:block;font-family:var(--hel-operator-font-numeric);font-size:.54rem;letter-spacing:var(--hel-operator-label-tracking);text-transform:uppercase;color:var(--hel-instrument-state)}}.hel-operational-state>strong,.hel-empty-instrument>strong{{display:block;margin:var(--hel-dimension-space-1) 0;font-family:var(--hel-font-display);font-size:1.2rem;color:var(--hel-semantic-operator-content-primary)}}.hel-operational-state>p,.hel-empty-instrument>p{{margin:0;font-size:.78rem;line-height:1.5;color:var(--hel-semantic-operator-content-secondary)}}
.hel-empty-instrument{{min-height:132px;display:grid;align-content:center;text-align:center;--hel-instrument-state:var(--hel-semantic-operator-content-secondary)}}
.hel-inspection-instrument,.hel-risk-instrument,.hel-json-inspector{{margin:var(--hel-dimension-space-3) 0;padding:var(--hel-dimension-space-3);border:1px solid color-mix(in oklch,var(--hel-semantic-operator-control-primary),transparent 76%);border-radius:var(--hel-dimension-radius-architectural);background:linear-gradient(150deg,color-mix(in oklch,var(--hel-color-semantic-surface-optical),transparent 14%),var(--hel-semantic-operator-surface-instrument));box-shadow:inset 3px 0 color-mix(in oklch,var(--hel-semantic-operator-control-primary),transparent 40%)}}
.hel-inspection-instrument header,.hel-risk-instrument header,.hel-json-inspector summary{{display:flex;align-items:center;justify-content:space-between;gap:var(--hel-dimension-space-3);font-family:var(--hel-operator-font-numeric)}}.hel-inspection-instrument header span,.hel-risk-instrument header span,.hel-json-inspector summary span{{font-size:.54rem;letter-spacing:var(--hel-operator-label-tracking);text-transform:uppercase;color:var(--hel-semantic-operator-content-secondary)}}.hel-inspection-instrument header strong,.hel-risk-instrument header strong,.hel-json-inspector summary strong{{font-size:.7rem;letter-spacing:.04em;color:var(--hel-semantic-operator-control-primary)}}.hel-inspection-instrument>div{{margin-top:var(--hel-dimension-space-3);font-size:.88rem;line-height:1.62;color:var(--hel-color-semantic-content-primary)}}
.hel-json-inspector summary{{min-height:44px;cursor:pointer;list-style:none}}.hel-json-inspector summary::-webkit-details-marker{{display:none}}.hel-json-inspector summary::after{{content:"OPEN";font-size:.52rem;letter-spacing:.08em;color:var(--hel-semantic-operator-content-secondary)}}.hel-json-inspector[open] summary::after{{content:"CLOSE"}}.hel-json-inspector summary:focus-visible{{outline:2px solid var(--hel-semantic-operator-control-secondary);outline-offset:3px;border-radius:var(--hel-semantic-operator-radius-control)}}.hel-json-inspector .hel-json-block{{margin:var(--hel-dimension-space-3) 0 0;border-radius:var(--hel-semantic-operator-radius-control);font-variant-numeric:tabular-nums}}
.hel-risk-instrument{{--hel-instrument-state:var(--hel-semantic-operator-content-secondary)}}.hel-risk-instrument[data-state="warning"]{{--hel-instrument-state:var(--hel-semantic-operator-control-secondary)}}.hel-risk-instrument[data-state="critical"]{{--hel-instrument-state:var(--hel-semantic-operator-status-critical)}}.hel-risk-instrument[data-state="acknowledged"]{{--hel-instrument-state:var(--hel-semantic-operator-control-primary)}}.hel-risk-instrument header strong{{text-transform:uppercase;color:var(--hel-instrument-state)}}.hel-risk-instrument dl{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--hel-dimension-space-3);margin:var(--hel-dimension-space-3) 0 0}}.hel-risk-instrument dl div{{padding:var(--hel-dimension-space-3);border:1px solid color-mix(in oklch,var(--hel-instrument-state),transparent 80%);border-radius:var(--hel-semantic-operator-radius-control);background:color-mix(in oklch,var(--hel-instrument-state),transparent 95%)}}.hel-risk-instrument dt,.hel-risk-instrument dd{{margin:0}}.hel-risk-instrument dt{{font-family:var(--hel-operator-font-numeric);font-size:.54rem;letter-spacing:.08em;text-transform:uppercase;color:var(--hel-semantic-operator-content-secondary)}}.hel-risk-instrument dd{{margin-top:var(--hel-dimension-space-1);font-size:.76rem;line-height:1.45;color:var(--hel-semantic-operator-content-primary)}}
[data-testid="stProgress"]>div>div,[data-testid="stProgress"] [role="progressbar"]>div{{background:var(--hel-semantic-operator-control-secondary)!important}}[data-testid="stSpinner"]{{font-family:var(--hel-operator-font-numeric)!important;color:var(--hel-semantic-operator-control-secondary)!important}}
[data-testid="stAlert"]{{border-left-width:4px!important;font-family:var(--hel-operator-font-numeric)!important}}[data-testid="stExpander"]{{border:1px solid color-mix(in oklch,var(--hel-semantic-operator-control-primary),transparent 76%)!important;border-radius:var(--hel-dimension-radius-architectural)!important;background:var(--hel-semantic-operator-surface-instrument)!important}}[data-testid="stExpander"] summary{{min-height:44px!important;font-family:var(--hel-operator-font-numeric)!important}}
[data-testid="stTextInput"] input,[data-testid="stNumberInput"] input,[data-testid="stDateInput"] input,[data-testid="stMultiSelect"]>div,[data-testid="stSlider"]{{font-family:var(--hel-operator-font-numeric)!important;font-variant-numeric:tabular-nums!important}}[data-testid="stTextInput"] input,[data-testid="stNumberInput"] input,[data-testid="stDateInput"] input,[data-testid="stMultiSelect"]>div{{min-height:44px!important;border-color:color-mix(in oklch,var(--hel-semantic-operator-control-primary),transparent 72%)!important;border-radius:var(--hel-semantic-operator-radius-control)!important;background:var(--hel-semantic-operator-surface-instrument)!important;color:var(--hel-semantic-operator-content-primary)!important}}
.stDownloadButton>button{{--hel-action-tone:var(--hel-semantic-operator-control-secondary)}}
.hel-analytical-instrument{{--hel-instrument-state:var(--hel-semantic-operator-control-primary);position:relative;height:100%;margin:0 0 var(--hel-dimension-space-3);padding:var(--hel-dimension-space-3);overflow:hidden;border:1px solid color-mix(in oklch,var(--hel-instrument-state),transparent 72%);border-radius:var(--hel-dimension-radius-architectural);background:linear-gradient(145deg,color-mix(in oklch,var(--hel-color-semantic-surface-optical),transparent 8%),var(--hel-semantic-operator-surface-instrument));box-shadow:inset 3px 0 color-mix(in oklch,var(--hel-instrument-state),transparent 42%)}}
.hel-analytical-instrument::before{{content:"";position:absolute;inset:0;pointer-events:none;opacity:.16;background:linear-gradient(112deg,transparent 0 34%,color-mix(in oklch,var(--hel-color-semantic-signal-primary),transparent 84%) 34.2% 34.6%,transparent 34.8% 72%,color-mix(in oklch,var(--hel-color-semantic-signal-secondary),transparent 88%) 72.2% 72.5%,transparent 72.7%)}}
.hel-analytical-instrument[data-state="stale"],.hel-analytical-instrument[data-state="warning"]{{--hel-instrument-state:var(--hel-semantic-operator-control-secondary)}}.hel-analytical-instrument[data-state="critical"],.hel-analytical-instrument[data-state="failed"]{{--hel-instrument-state:var(--hel-semantic-operator-status-critical)}}.hel-analytical-instrument[data-state="unavailable"]{{--hel-instrument-state:var(--hel-semantic-operator-content-secondary)}}
.hel-analytical-instrument>header{{position:relative;display:flex;align-items:start;justify-content:space-between;gap:var(--hel-dimension-space-3);padding-bottom:var(--hel-dimension-space-2);border-bottom:1px solid color-mix(in oklch,var(--hel-instrument-state),transparent 82%)}}.hel-analytical-instrument>header span,.hel-analytical-instrument>header strong{{display:block}}.hel-analytical-instrument>header span{{font-family:var(--hel-operator-font-numeric);font-size:.52rem;letter-spacing:var(--hel-operator-label-tracking);text-transform:uppercase;color:var(--hel-instrument-state)}}.hel-analytical-instrument>header strong{{margin-top:var(--hel-dimension-space-1);font-family:var(--hel-font-display);font-size:1.08rem;color:var(--hel-color-semantic-content-primary)}}.hel-analytical-instrument>header>b{{font-family:var(--hel-operator-font-numeric);font-size:.52rem;letter-spacing:.08em;text-transform:uppercase;color:var(--hel-instrument-state)}}
.hel-analytical-instrument>dl{{position:relative;display:grid;grid-template-columns:repeat(auto-fit,minmax(116px,1fr));gap:var(--hel-dimension-space-2);margin:var(--hel-dimension-space-2) 0 0}}.hel-analytical-readout{{min-width:0;padding:var(--hel-dimension-space-2);border-left:2px solid color-mix(in oklch,var(--hel-instrument-state),transparent 45%);background:color-mix(in oklch,var(--hel-instrument-state),transparent 96%)}}.hel-analytical-readout dt,.hel-analytical-readout dd{{margin:0}}.hel-analytical-readout dt,.hel-analytical-readout small{{font-family:var(--hel-operator-font-numeric);font-size:.52rem;line-height:1.35;color:var(--hel-semantic-operator-content-secondary)}}.hel-analytical-readout dt{{letter-spacing:.08em;text-transform:uppercase}}.hel-analytical-readout dd{{margin:.15rem 0;font-family:var(--hel-operator-font-numeric);font-size:1.08rem;line-height:1.1;color:var(--hel-semantic-operator-content-primary);font-variant-numeric:tabular-nums}}.hel-analytical-instrument>p{{position:relative;margin:var(--hel-dimension-space-2) 0 0;font-size:.76rem;line-height:1.55;color:var(--hel-semantic-operator-content-secondary)}}
.hel-analytical-list>ol{{position:relative;display:grid;gap:0;margin:var(--hel-dimension-space-2) 0 0;padding:0;list-style:none}}.hel-analytical-list li{{display:flex;align-items:start;justify-content:space-between;gap:var(--hel-dimension-space-3);padding:var(--hel-dimension-space-2) 0;border-bottom:1px solid color-mix(in oklch,var(--hel-semantic-operator-content-primary),transparent 92%)}}.hel-analytical-list li:last-child{{border-bottom:0}}.hel-analytical-list li span{{font-size:.74rem;line-height:1.42;color:var(--hel-color-semantic-content-primary)}}.hel-analytical-list li strong{{flex:0 0 auto;font-family:var(--hel-operator-font-numeric);font-size:.65rem;line-height:1.5;color:var(--hel-instrument-state);font-variant-numeric:tabular-nums}}.hel-analytical-list .hel-analytical-empty span{{color:var(--hel-semantic-operator-content-secondary)}}
.hel-chart-instrument-head{{display:flex;align-items:end;justify-content:space-between;gap:var(--hel-dimension-space-3);margin:var(--hel-dimension-space-3) 0 0;padding:var(--hel-dimension-space-2) var(--hel-dimension-space-3);border:1px solid color-mix(in oklch,var(--hel-semantic-operator-control-primary),transparent 70%);border-bottom:0;border-radius:var(--hel-dimension-radius-architectural) var(--hel-dimension-radius-architectural) 0 0;background:linear-gradient(145deg,color-mix(in oklch,var(--hel-color-semantic-surface-optical),transparent 5%),var(--hel-semantic-operator-surface-instrument))}}.hel-chart-instrument-head span,.hel-chart-instrument-head strong{{display:block}}.hel-chart-instrument-head span{{font-family:var(--hel-operator-font-numeric);font-size:.5rem;letter-spacing:var(--hel-operator-label-tracking);text-transform:uppercase;color:var(--hel-color-semantic-signal-primary)}}.hel-chart-instrument-head strong{{margin-top:var(--hel-dimension-space-1);font-family:var(--hel-font-display);font-size:1.05rem;color:var(--hel-color-semantic-content-primary)}}.hel-chart-instrument-head p{{max-width:44ch;margin:0;text-align:right;font-family:var(--hel-operator-font-numeric);font-size:.55rem;line-height:1.4;color:var(--hel-semantic-operator-content-secondary)}}.hel-chart-instrument-head+[data-testid="stPlotlyChart"]{{margin-top:0;border:1px solid color-mix(in oklch,var(--hel-semantic-operator-control-primary),transparent 76%);border-top:0;border-radius:0 0 var(--hel-dimension-radius-architectural) var(--hel-dimension-radius-architectural);overflow:hidden;background:var(--hel-semantic-operator-surface-instrument)}}
@supports(content-visibility:auto){{.hel-analytical-instrument,.hel-risk-instrument,.hel-inspection-instrument{{content-visibility:auto;contain-intrinsic-size:auto 180px}}}}
@keyframes helOperatorScan{{from{{transform:scaleX(.18);transform-origin:left}}to{{transform:scaleX(1);transform-origin:left}}}}
@media(max-width:1100px){{
  [data-testid="stHorizontalBlock"]:has(.flip-shell){{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--hel-dimension-space-3)}}
  [data-testid="stHorizontalBlock"]:has(.flip-shell)>[data-testid="stColumn"]{{width:auto!important;min-width:0!important;flex:unset!important}}
  .hel-operator-status-bank.status-strip{{grid-template-columns:repeat(2,minmax(0,1fr))}}
  .hel-operator-status-bank .status-chip:nth-child(2){{border-right:0!important}}
  .hel-operator-status-bank .status-chip:nth-child(-n+2){{border-bottom:1px solid color-mix(in oklch,var(--hel-semantic-operator-content-primary),transparent 90%)!important}}
}}
@media(max-width:980px){{
  .hel-workspace-instrument{{gap:var(--hel-dimension-space-3)}}
}}
@media(max-width:640px){{
  [data-testid="stHorizontalBlock"]:has(.flip-shell){{grid-template-columns:1fr}}
  .hel-operator-shell{{border-radius:var(--hel-dimension-radius-architectural)}}
  .hel-operator-rail.topbar{{display:grid!important;grid-template-columns:minmax(0,1fr) auto;align-items:center!important;padding:var(--hel-dimension-space-3)!important}}
  .hel-operator-identity small{{white-space:normal}}
  .hel-operator-session{{display:block;text-align:right}}
  .hel-operator-session time{{max-width:18ch;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}}
  .hel-operator-status-bank .status-chip{{padding:var(--hel-dimension-space-2)!important}}
  .hel-operator-status-bank .status-chip small,.hel-operator-status-bank .status-chip strong{{font-size:.54rem}}
  [data-testid="stSidebar"]{{width:min(92vw,340px)!important;min-width:0!important}}
  [data-testid="stSidebar"] [role="radiogroup"] label{{min-height:44px!important}}
  .hel-operator-risk-seal{{margin-top:var(--hel-dimension-space-5);padding:var(--hel-dimension-space-3);line-height:1.45}}
  .hel-workspace-instrument,.hel-data-instrument-head{{display:grid;align-items:start}}
  .hel-workspace-instrument p{{text-align:left}}
  .hel-data-instrument-head dl{{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:var(--hel-dimension-space-2)}}
  .hel-data-instrument-head dd{{max-width:22ch}}
  .hel-statline{{grid-template-columns:repeat(2,minmax(0,1fr))}}
  .hel-stat{{min-height:104px;border-bottom:1px solid color-mix(in oklch,var(--hel-semantic-operator-content-primary),transparent 90%)}}
  .hel-stat:nth-child(2n){{border-right:0}}.hel-stat:nth-last-child(-n+2){{border-bottom:0}}
  [data-testid="stDataFrame"]{{max-width:100%;overflow-x:auto!important}}
  .hel-risk-instrument dl{{grid-template-columns:1fr}}
  .hel-analytical-instrument>dl{{grid-template-columns:repeat(2,minmax(0,1fr))}}.hel-chart-instrument-head{{display:grid;align-items:start}}.hel-chart-instrument-head p{{text-align:left}}
}}
@media(prefers-reduced-motion:reduce){{
  [data-testid="stMain"]{{scroll-behavior:auto}}
  .hel-operator-status-bank [data-state="loading"]::after{{animation:none}}
  .hel-action,[data-testid="stSidebar"] [role="radiogroup"] label,[data-testid="stSelectbox"] [data-baseweb="select"]>div{{transition:none!important;transform:none!important}}
  .hel-operational-state,.hel-data-instrument-head,.hel-inspection-instrument,.hel-risk-instrument,.hel-analytical-instrument,.hel-chart-instrument-head{{scroll-behavior:auto!important}}
}}
</style>
"""


def operator_panel_heading(title: str, detail: str) -> str:
    return (
        f'<section class="hel-operator-bay-heading" {_contract_attributes(ComponentRole.OPERATOR_CONTROL)}>'
        '<span>HEL-028 · operator reach zone</span>'
        f'<strong role="heading" aria-level="2">{esc(title)}</strong><small>{esc(detail)}</small></section>'
    )


def operator_rail(
    application: str,
    as_of: str,
    statuses: Iterable[tuple[str, str, str]],
) -> str:
    allowed_states = {"passive", "loading", "success", "warning", "failure"}
    cells = []
    for label, value, state in statuses:
        safe_state = state if state in allowed_states else "passive"
        cells.append(
            f'<span class="status-chip" data-state="{safe_state}">'
            f'<small>{esc(label)}</small><strong>{esc(value)}</strong></span>'
        )
    return (
        f'<section class="hel-operator-shell" {_contract_attributes(ComponentRole.STATUS_SUMMARY)} aria-label="Operator status">'
        f'<header class="topbar hel-operator-rail" {_contract_attributes(ComponentRole.TIME_FRESHNESS_CONTROL)}>'
        '<div class="brand hel-operator-identity"><i></i><span>'
        f'<b>{esc(application)}</b><small>Cartographic dealing apparatus</small>'
        '</span></div><div class="hel-operator-session">'
        '<span>Operator status</span><strong>System online</strong>'
        f'<time>{esc(as_of or "Workbook mode")}</time></div></header>'
        f'<div class="status-strip hel-operator-status-bank" {_contract_attributes(ComponentRole.STATUS_SUMMARY)} role="status" aria-live="polite">'
        + "".join(cells)
        + "</div></section>"
    )


def operator_risk_seal(message: str) -> str:
    return f'<div class="hel-operator-risk-seal" {_contract_attributes(ComponentRole.RISK_AND_INVALIDATION)}>{esc(message)}</div>'


def operator_reduced_sensory_css() -> str:
    """Disable HEL-028 optical and motion effects without changing hierarchy."""

    return """
<style>
.hel-operator-shell,.hel-operator-rail,.hel-operator-status-bank,
.hel-operator-bay-heading,.hel-data-instrument-head,.hel-statline,
.hel-operational-state,.hel-empty-instrument,.hel-inspection-instrument,
.hel-risk-instrument,.hel-json-inspector,.hel-analytical-instrument,
.hel-chart-instrument-head,[data-testid="stSidebar"] [role="radiogroup"]{
  backdrop-filter:none!important;box-shadow:none!important;
  background:var(--hel-semantic-operator-surface-instrument)!important;
}
.hel-operator-shell::before,.hel-operator-status-bank [data-state="loading"]::after,
.hel-analytical-instrument::before{display:none!important}
.hel-action,[data-testid="stSidebar"] [role="radiogroup"] label,
[data-testid="stSelectbox"] [data-baseweb="select"]>div{transition:none!important;transform:none!important}
</style>
"""


def reduced_sensory_css() -> str:
    """Return the operator-controlled low-stimulation environment override."""
    return """
<style>
.stApp::before,.stApp::after,.hel-surface::before,.hel-map-card::after,.hero::before{display:none!important}
.hel-surface,.hero,.panel,[data-testid="stSidebar"] [role="radiogroup"]{
  backdrop-filter:none!important;
  box-shadow:none!important;
  background:var(--hel-color-semantic-surface-base)!important;
}
*,*::before,*::after{animation-duration:1ms!important;transition-duration:1ms!important;scroll-behavior:auto!important}
</style>
"""
