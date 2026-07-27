# HEL-035 Liquidity Environment

## Scope

`Liquidity Environment` is the permanent COMEX Silver order-book context for
XAGUSD analysis. The implementation is
`src/16_SilverLiquidityEnvironment.gs`.

Production currently has no order-book provider, depth feed, DOM, trade tape,
or detected-event source. The authoritative current state is therefore:

- provider status: `Not connected.`;
- current state: `Institutional order-book data unavailable.`;
- silver impact: `No liquidity interpretation is authorized.`;
- action bias: `No operational conclusion.`;
- confidence: `Unavailable.`;
- every unsupported analytical field: `null`, never zero or neutral.

Calendar/session liquidity scores remain calendar context. They are not
order-book evidence and cannot populate this section.

## Current rendering

Long output states that institutional order-book data is not connected and
that no resting-liquidity, absorption, iceberg, or execution-flow
interpretation is authorized.

Short output is:

`Liquidity: Order-book provider not connected.`

Dashboard primary display is:

`Waiting for institutional order-book provider.`

Expandable detail contains supported future source classes, COMEX Silver
target, provider status, capability object, contract model, limitations,
provenance, and explicit no-false-neutrality state. The placeholder remains
brief and is not connected to the live dashboard.

## Provider-neutral architecture

The required interface includes:

- health;
- capabilities;
- instruments;
- contracts;
- market depth;
- order events;
- trade events;
- iceberg events;
- absorption events;
- snapshots;
- replay;
- provenance.

Interface validation checks method presence without invoking an adapter.
Vendor connection and acquisition are not implemented.

The capability model keeps these distinct:

- Level 1 and Level 2;
- market-by-price and market-by-order;
- historical, live, delayed, and synthetic depth;
- executed trades;
- inferred events;
- provider-native events.

The interpretation engine checks capability before making any statement.

## Capability outcomes

| Capability | Permitted use |
|---|---|
| Level 1 only | Quote context only; no resting-depth interpretation |
| Level 2 + market-by-price | Resting concentration and depth imbalance |
| Level 2 + market-by-order | Order addition, cancellation, migration, and order-level detection eligibility |
| Executed trade tape | Aggressive buy/sell and execution-imbalance eligibility |
| Native event capability | Provider-native absorption or iceberg event language |
| Inferred event capability | Explicitly qualified inferred language |
| Delayed depth | Delayed context only |
| Stale depth | No current interpretation |
| Synthetic depth | Never treated as equivalent to exchange depth |

Institutional-participation claims remain disabled even when technical
capabilities are present. A later methodology and approval gate is required.

## COMEX Silver and XAGUSD

The order-book target is the exact COMEX Silver execution contract:

- `SI` Silver futures;
- `SIL` Micro Silver when separately approved;
- explicit front month;
- explicit execution contract;
- optional continuous analytical reference;
- expiration;
- rollover status;
- volume and open-interest migration status.

Order books across contracts cannot be combined without an approved,
documented methodology. The current contract is unavailable because no
provider is connected.

COMEX liquidity is an institutional futures reference supporting XAGUSD
analysis. It is not the complete global silver market. Spot providers, spreads,
futures basis, session structure, rollover, and contract-specific behavior can
differ.

## Interpretation states

The controlled future taxonomy is:

- bid-side liquidity dominant;
- offer-side liquidity dominant;
- balanced liquidity;
- liquidity building above;
- liquidity building below;
- liquidity being withdrawn;
- auction migrating higher;
- auction migrating lower;
- absorption detected;
- execution pressure increasing;
- liquidity void nearby;
- mixed;
- insufficient evidence;
- provider unavailable.

No data-dependent state is activated without current eligible evidence and the
required capability.

## Ingestion and retention

Future ingestion modes are declared but disabled:

- file import;
- local socket;
- REST;
- WebSocket;
- database;
- shared directory;
- provider API;
- exported snapshot;
- event stream.

No listener, credentials, network connection, secret, or vendor configuration
is created.

Future retention separates:

- ephemeral live state;
- bounded short-term cache;
- immutable historical research/replay;
- production interpretations and provenance;
- raw events;
- normalized events;
- derived features;
- snapshots.

No empty or fabricated event file is created.

## Internal preview

Apps Script preview fails closed while HEL-035 preview is disabled. Python
`liquidity_environment_preview` requires
`HARMONEXUS_HEL035_INTERNAL_PREVIEW=true` and exposes:

- capability;
- provider status;
- complete structured interpretation;
- long and short renderings;
- dashboard view model;
- provenance;
- limitations;
- reason codes.

`app.py` does not import it.

## Validation

Tests cover unavailable provider, health failure, Level 1, Level 2,
market-by-price, market-by-order, inferred and native iceberg capability,
staleness, contract mismatch, rollover, missing contract, provider delay,
false-neutrality prevention, claim safety, renderer consistency, disabled
ingestion/retention, and preview isolation.
