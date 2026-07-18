# HEL-032 / HEL-028 Immutable Authority Contract

Status: locked for implementation

Primary environment: `HEL/HEL-032_cartographers-chamber`

Secondary implementation layer: `HEL/HEL-028_institutional-dealing-room`

> **HEL-032 controls the world; HEL-028 controls the instruments.**

This is the governing law for every dual-layer decision. HEL-032 remains The
Cartographer's Chamber: the application is a living market map. HEL-028 mounts
precise institutional instruments inside that chamber. It does not turn the
chamber into a dealing room, add trade execution, or alter market behavior.

## Scope and invariants

- This contract governs presentation authority only.
- Business logic, market data, ingestion, calculations, scores, alerts,
  scheduling, authentication, persistence, caching, secrets, and integrations
  are outside both environments' authority.
- HEL-032 and HEL-028 source packages are immutable inputs. An implementation
  consumes them; it does not rewrite them.
- Visual values remain in package token and specification files. They must be
  exposed through the centralized environment resolver and semantic aliases,
  never copied into this contract or scattered through application code.
- Missing evidence remains unknown. Presentation must not turn absence into a
  score, status, or market conclusion.
- Observation, inference, scenario, and action remain visibly distinct.
- Decision support must never be presented as live trade execution.

## Immutable authority table

| Domain | Governing owner | Secondary participation | Non-negotiable boundary |
|---|---|---|---|
| Global world architecture | HEL-032 | HEL-028 instruments may be mounted within named zones | The map chamber cannot become a dealing-room shell |
| Spatial composition and page layout | HEL-032 | HEL-028 may organize content inside an operator surface | Operator density cannot reorder world-scale geography |
| Environmental shell and atmosphere | HEL-032 | HEL-028 may lower local visual friction | The cartographic atmosphere remains perceptible and causal |
| Market cartography | HEL-032 | HEL-028 may supply inspection controls | Terrain, routes, bridges, rivers, boundaries, and discovery zones remain world grammar |
| Global navigation metaphor | HEL-032 | HEL-028 may optimize focus order and control reach | Navigation remains a survey route, not a generic application menu |
| Macro geography and cross-asset relationships | HEL-032 | HEL-028 may add filters, selectors, and inspection readouts | Relationships remain spatially and causally legible |
| Environmental lighting and material identity | HEL-032 | HEL-028 may add local task light and instrument housings | HEL-028 cannot replace the world's stone, glass, brass, paper, fog, or their semantic equivalents |
| World motion and environmental transitions | HEL-032 | HEL-028 may govern immediate control feedback | Background and world-state motion retain HEL-032 physics |
| Global responsive model | HEL-032 | HEL-028 may reflow controls within the assigned zone | Breakpoints may not collapse the application's world model into generic cards |
| Discovery and survey language | HEL-032 | HEL-028 may use concise operational labels | Operational language may not erase discovery causality |
| Operator reach zones and execution/decision rails | HEL-028 | HEL-032 provides the zone and environmental mounting | Rails remain contextual presentation instruments, never new execution capability or replacement page architecture |
| Buttons, inputs, selectors, and action hierarchy | HEL-028 | HEL-032 supplies semantic world context | No control may imply unavailable trading or execution capability |
| Tables and dense data surfaces | HEL-028 | HEL-032 supplies surrounding material and geography | Density must preserve lineage, units, freshness, and uncertainty |
| Numeric typography and order/status mechanisms | HEL-028 | HEL-032 supplies semantic signal meaning | Order language remains representational; numbers may not lose labels, units, provenance, or calibration state |
| Risk-control clarity and acknowledgement | HEL-028 | HEL-032 retains risk geography and boundary language | Risk and invalidation must never be obscured by atmosphere |
| Focus, keyboard interaction, routine speed | HEL-028 | HEL-032 retains global route order | Faster handling cannot create hidden actions or inaccessible paths |
| Inspection instruments and scenario controls | HEL-028 | HEL-032 owns the inspected market world | Controls change views or scenarios, never live evidence or business rules |
| Source and freshness controls | HEL-028 | HEL-032 owns source terrain and survey language | Stale, missing, fallback, and live states must be explicit |
| Loading, warning, error, and success mechanisms | HEL-028 | HEL-032 supplies environmental context and tone family | System state must remain readable, actionable, and non-deceptive |
| Precision spacing inside operational surfaces | HEL-028 | HEL-032 fixes the containing zone and page rhythm | Local compression may not alter card footprints or global composition |

## Conflict-resolution rules

1. HEL-032 wins for world architecture, materials, atmosphere, and page
   composition.
2. HEL-028 wins for operator controls, dense data presentation, ergonomics,
   and action behavior.
3. HEL-028 may refine a HEL-032 surface but may not replace its environmental
   identity.
4. HEL-028 may reduce decorative friction but may not remove cartographic
   causality.
5. HEL-028 may increase legibility and density but may not convert the
   interface into a generic dealing dashboard.
6. Neither environment may alter business logic, market data, scoring,
   scheduling, alerts, integrations, or persistence.
7. No raw visual value may be duplicated outside the centralized environment
   resolver.
8. Every dual-layer implementation decision must cite its owning domain and
   record any refinement applied by the non-owning layer.
9. Accessibility is cumulative: the stricter usable outcome wins, while the
   underlying component and world ownership remain unchanged.
10. When ownership cannot be determined from this contract, implementation
    stops until the contract is amended in a focused review.

## Component ownership matrix

| Component or surface | Structure owner | Interaction owner | Presentation law |
|---|---|---|---|
| Application shell, top bar, hero, environmental field | HEL-032 | HEL-032 | Remain cartographic and world-scale |
| Global navigation and workspace route | HEL-032 | HEL-028 for keyboard/focus mechanics | Route metaphor remains survey and discovery |
| Overview market grid and briefing-card placement | HEL-032 | HEL-028 for card controls | Existing world composition and card footprint remain intact |
| Instrument card front | HEL-032 | HEL-028 for focus/tap affordance | Front identity is part of the map and cannot be reskinned as a terminal tile |
| Instrument card back / Context Alignment | HEL-032 container | HEL-028 | Dense instrument readout inherits the same-size HEL-032 surface |
| Instrument Lab | HEL-032 zone | HEL-028 | Inspection controls sit inside a mapped discovery site |
| Signal Audit | HEL-032 zone and lineage context | HEL-028 | Tables, trace selection, status, and focus prioritize forensic speed |
| Operations workspace | HEL-032 zone | HEL-028 | Operational mechanisms remain visibly subordinate to the chamber |
| Data Explorer | HEL-032 zone | HEL-028 | Dense data preserves source, freshness, units, and unknown states |
| Filters, radios, selects, upload controls | HEL-032 placement | HEL-028 | No default-framework identity; no implied execution action |
| Tables and data grids | HEL-032 mounting surface | HEL-028 | Scannability and numeric alignment win locally |
| Charts, gauges, cross-asset maps | HEL-032 | HEL-028 may add controls and precise readouts | Visualization remains cartographic, not a generic terminal chart |
| Risk and invalidation surfaces | HEL-032 boundary context | HEL-028 | Risk clarity, acknowledgement, and keyboard access are dominant locally |
| Source freshness and connection status | HEL-032 survey context | HEL-028 | Live, stale, fallback, missing, and credential states are explicit |
| Loading, empty, warning, success, and error states | HEL-032 environmental context | HEL-028 | State has a concise message, severity, next action, and accessible focus behavior |

## Token-precedence matrix

No token value is declared here. “Alias” means a semantic reference resolved
centrally from the authoritative package, not a copied color, dimension, font,
duration, or effect.

| Token family | Precedence | Permitted HEL-028 use | Prohibited use |
|---|---|---|---|
| World background, terrain, route, river, boundary, fog | HEL-032 | None beyond semantic inheritance | Replacing them with HEL-028 dealing-room background tokens |
| Global material, border, elevation, and atmospheric tokens | HEL-032 | Local instrument aliases inside an operator surface | Applying HEL-028 material values to the page shell |
| Global type families and narrative hierarchy | HEL-032 | Numeric and control-role aliases | Replacing discovery headings or world labels globally |
| Numeric alignment, tabular figures, input labels | HEL-028 | Full control within operational surfaces | Changing score values, units, or semantic meaning |
| Control dimensions, reach, focus, and operational density | HEL-028 | Full control within the HEL-032 containing zone | Changing the zone footprint or global spatial rhythm |
| Market signal semantics and risk meaning | HEL-032 | HEL-028 may render clearer operational states through aliases | Creating a second competing bullish/bearish/risk palette |
| Alert, acknowledgement, loading, warning, error, success roles | HEL-028 | Operational role aliases sourced through the resolver | Raw status values or status meaning duplicated in app code |
| Responsive world spacing and page breakpoints | HEL-032 | Local component reflow aliases | Defining a competing global breakpoint system |
| Reduced-motion and reduced-sensory roles | Strictest accessible outcome | Either layer may disable its own effects | Reintroducing an effect disabled by the other layer or user preference |

## Motion-precedence matrix

| Motion context | Owner | Required composition |
|---|---|---|
| Background drift, atmospheric behavior, world lighting changes | HEL-032 | Use HEL-032 environmental physics only |
| Route discovery, terrain reveal, cross-asset bridge transitions | HEL-032 | Motion explains market geography and causality |
| Page and environmental state transitions | HEL-032 | Preserve continuity of the chamber |
| Button press, input response, focus movement, acknowledgement | HEL-028 | Fast, restrained, and immediately legible |
| Table sorting, inspection selection, dense-state changes | HEL-028 | Feedback stays local to the instrument surface |
| Card flip control | HEL-032 owns card/world continuity; HEL-028 owns input behavior | Same-size spatial object, stable focus, no alternate modal or drawer |
| Concurrent world and operator motion | Split by domain | Local control feedback completes without being masked by environmental motion |
| Reduced motion | Strictest accessible outcome | Remove non-essential movement from both layers; preserve state clarity without animation |

HEL-028 motion must never propagate to the background or redefine world-scale
transitions. HEL-032 motion must never delay routine input feedback, status
acknowledgement, or risk-control access.

## Material-precedence matrix

| Material context | Owner | Composition rule |
|---|---|---|
| Page background and chamber envelope | HEL-032 | The Cartographer's Chamber remains the governing material world |
| Terrain, routes, rivers, bridges, boundaries, discovery sites | HEL-032 | Materials communicate market relationships, not decoration |
| Page-level panels and map surfaces | HEL-032 | HEL-028 cannot substitute a dealing-room wall or desk system |
| Embedded input housing and control face | HEL-028 | Must read as an instrument mounted into the HEL-032 surface |
| Dense table and inspection glass | HEL-028 locally | Surrounding frame, lighting, and world context remain HEL-032 |
| Local task/status emission | HEL-028 locally | Cannot recolor or relight the chamber |
| Print/archive or reduced-sensory surface | Accessibility rule | Remove translucency and texture without changing information hierarchy |

HEL-028 titanium, dealing glass, aluminum, graphite, and conditioned-air
language may inform local operational semantics only. It may not replace
HEL-032 green stone, cartographic glass, brass, mineral paper, fog, or their
resolved application equivalents at world scale.

## Responsive-precedence matrix

| Responsive concern | Owner | Required behavior |
|---|---|---|
| Global zones, route order, macro geography | HEL-032 | Reflow preserves the same reasoning sequence |
| Page margins, world-scale density, environmental continuity | HEL-032 | Narrow view remains a chamber, not a stacked SaaS dashboard |
| Operator reach and control grouping | HEL-028 | Primary controls remain reachable and logically ordered |
| Table density and inspection layout | HEL-028 | May scroll or reflow locally with headings and context retained |
| Card internal spacing | HEL-028 locally | Same external footprint and HEL-032 front identity are preserved |
| Mobile focus and keyboard order | HEL-028 | Matches the HEL-032 route order and never strands content |
| Content removal | Neither by default | Functional content is not deleted to satisfy a breakpoint; it is reflowed or explicitly deferred |

## Accessibility-precedence matrix

| Requirement | Authority | Rule |
|---|---|---|
| Semantic landmarks and reading order | Shared, rooted in HEL-032 composition | DOM order follows the market-reasoning route |
| Keyboard handling and focus visibility | HEL-028 | Every interactive instrument is reachable, operable, and visibly focused |
| Contrast and legibility | Strictest accessible outcome | Atmosphere yields locally when needed for reliable reading |
| Reduced motion | Strictest accessible outcome | Disable non-essential world and control animation |
| Reduced sensory | Strictest accessible outcome | Remove optical texture, translucency, depth, and ambient effects while retaining hierarchy |
| Alerts and errors | HEL-028 | Severity, message, next action, and acknowledgement are available without color alone |
| Charts and maps | HEL-032 visualization, HEL-028 inspection | Provide textual values, labels, lineage, and keyboard-accessible controls |
| Numeric information | HEL-028 | Preserve units, sign, scale, freshness, and uncertainty |
| Touch targets and reach | HEL-028 | Operational controls remain usable without changing world composition |

Accessibility never transfers ownership from one environment to the other. It
overrides an effect or density choice only as far as needed to produce the
strictest usable outcome.

## Forbidden combinations

- A HEL-028 global shell with HEL-032 reduced to map-themed decoration.
- A generic dealing dashboard, terminal grid, SaaS sidebar, or framework-default
  page with cartographic labels attached.
- HEL-028 materials, ambient lighting, typography, or background motion applied
  globally.
- HEL-032 atmospheric effects inside a dense table when they reduce scan speed,
  contrast, focus visibility, or error recognition.
- Operator controls that remove terrain, route, bridge, river, boundary, or
  discovery causality.
- World decoration that obscures source freshness, risk, invalidation,
  contradiction, confidence, system state, or acknowledgement.
- A second set of raw color, spacing, motion, material, breakpoint, or type
  values outside the centralized environment resolver.
- A visual state that implies order placement, trade execution, or an action the
  engine does not perform.
- Duplicated layout or formatter logic created solely to give each HEL package
  its own version of the same feature.
- Any presentation change that modifies market values, scoring, source data,
  alert delivery, scheduler behavior, authentication, or secrets.

## Correct composition examples

### Signal Audit

The Signal Audit remains a discovery site in the HEL-032 market map. HEL-032
defines its place in the survey route, surrounding surface, lineage metaphor,
and transition into the site. HEL-028 governs the instrument selector, table
density, numeric alignment, trace controls, focus behavior, and warning states.
The result is a cartographic forensic instrument, not a detached terminal page.

### Instrument card

HEL-032 defines the card's map position, footprint, material identity, front
face, directional atmosphere, and relationship to neighboring instruments.
HEL-028 governs the tap/keyboard mechanism, internal numeric spacing, focus
ring, status clarity, and compact alignment readout on the back. The flip
remains one same-size object in the map.

### Source freshness warning

HEL-032 places the warning in the survey context and preserves the relationship
between the affected source and mapped evidence. HEL-028 makes the state
concise, readable, keyboard reachable, severity explicit, and actionable. The
warning does not become a generic toast detached from its source geography.

### Mobile operations

HEL-032 preserves the market-reasoning route and world hierarchy. HEL-028
reflows controls into reachable groups, tightens local data spacing, and makes
focus and acknowledgement obvious. No functionality is removed and the page
does not collapse into an unrelated mobile dashboard pattern.

## Incorrect replacement examples

### Dealing-room takeover

Replacing the global stone-and-cartography shell with HEL-028 dealing walls,
blue-gray ambient materials, and execution-desk navigation is prohibited. That
would make HEL-028 the world and flatten HEL-032 into ornament.

### Generic dense dashboard

Rebuilding Overview as a uniform grid of terminal tiles because HEL-028 favors
operational density is prohibited. Density belongs inside instruments; the
world-scale composition remains HEL-032.

### Decorative map without causality

Keeping a map texture while removing routes, bridges, boundaries, lineage, and
discovery transitions is prohibited. HEL-032 cartography is explanatory, not a
background motif.

### Atmospheric control friction

Applying slow terrain reveal, fog, or magnetic drift to an acknowledgement
button, data selector, error recovery action, or keyboard focus transition is
prohibited. HEL-028 owns routine operator response.

## Decision record requirements

Every dual-layer implementation decision must record:

1. the component or surface;
2. its HEL-032 world responsibility;
3. its HEL-028 operator responsibility;
4. the authority domain selected from `hel_environment_contract.py`;
5. the semantic token aliases consumed from the centralized resolver;
6. responsive, reduced-motion, reduced-sensory, keyboard, and focus behavior;
7. confirmation that business logic and source values are unchanged;
8. any deviation from either package and the approval that permits it.

Undocumented ambiguity is not permission. If the decision cannot be expressed
under this authority model, implementation pauses and this contract is reviewed
before application code changes.

## Current implementation boundary

`hel_cartographer.py` remains the current HEL-032 presentation resolver and
`app.py` remains the application entry point. This phase does not connect
HEL-028 to runtime code and introduces no visual values. Existing documented
HEL-032 deviations—retained Streamlit widget semantics, Plotly fallbacks,
unimplemented audio, and legacy rollback CSS—remain unchanged. No repository
screenshot artifacts were present to amend; textual visual-acceptance evidence
remains in `docs/HEL_032_IMPLEMENTATION.md` and the HEL-032 acceptance gate.
