# HEL-035 Renderer Contract

## Single-object rule

Every renderer consumes the same frozen `SilverInterpretation`. Renderers do
not independently resolve evidence, authority, freshness, contradiction,
confidence, or action bias.

## Surfaces

### Long briefing

Provides identity, timestamps, source/freshness status, what changed, why it
matters, silver impact, what to monitor, limitations, Action Bias, Primary Risk,
Required Confirmation, and Confidence.

### Short briefing

Provides section state, silver impact, controlled operational language, and
confidence. No independent section selection or delivery is activated yet.

### Dashboard

Returns a typed view model containing headline, status, freshness, silver
impact, action bias/language, confidence, risk, confirmation, and expandable
evidence, provenance, confidence basis, limitations, and reason codes.

`silver_intelligence.py` projects these objects through an internal Streamlit
preview. `app.py` imports only the read-only consumer and exposes the preview
only when `HARMONEXUS_HEL035_INTERNAL_PREVIEW=true`. No business logic is
recomputed in Python.

### Telegram/notification

Returns one sentence only when at least one current evidence item has explicit
notification permission. Otherwise it returns null. Rendering a sentence does
not send it.

### JSON

Stable serialization validates the complete object and recursively sorts keys.

## Integrated surfaces

`src/20_SilverBriefingIntegration.gs` consumes the six completed renderer
objects once and preserves their approved order. It does not call the
underlying evidence or interpretation engines.

- Long output inserts the six renderings before every existing briefing
  section.
- Short output retains Current State, Silver Impact, and Confidence for each
  section.
- Dashboard output uses a shared operator-card contract: headline,
  interpretation, silver impact, operational conclusion, confirmation,
  confidence, freshness, then expandable evidence.
- Silver-card support remains a separate preview below the unchanged
  production card.
- Daily delivery uses the existing unified notification path and adds no alert.

`src/21_SilverOperatorExperience.gs` removes exact summary duplication from
expanded detail, normalizes evidence categories, preserves the six-section
priority, and adds no market logic. The Streamlit consumer renders every
HEL-035 section through one shared card and one shared expander.

## Consistency invariants

Tests require every surface to preserve:

- target `XAGUSD`;
- current state;
- silver impact;
- action bias;
- confidence score and label;
- source/freshness status where the surface exposes them.

Shadow fixtures produce no notification. The long output ends with the four
section-conclusion fields. Controlled-language validation runs after all
surface summaries are attached.
