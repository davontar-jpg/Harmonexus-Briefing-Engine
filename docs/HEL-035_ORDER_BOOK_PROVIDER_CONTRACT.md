# HEL-035 Order-Book Provider Contract

## Purpose

This contract allows a later approved institutional order-book source to supply
COMEX Silver data without binding HEL-035 to one vendor. No provider is
connected by this character.

Version: `HEL-035.order-book-provider.1.0.0`.

## Required interface

| Method | Responsibility |
|---|---|
| `health` | Connection, entitlement, delay, and last-update state |
| `capabilities` | The complete capability object |
| `instruments` | Supported exchange products |
| `contracts` | Exact contracts, expirations, and rollover metadata |
| `marketDepth` | Explicit Level 1/2 and MBP/MBO depth |
| `orderEvents` | Addition, cancellation, migration, replenishment |
| `tradeEvents` | Executed trades and aggressor classification |
| `icebergEvents` | Native or inferred events, never ambiguous |
| `absorptionEvents` | Native or inferred events, never ambiguous |
| `snapshots` | Timestamped replayable state |
| `replay` | Historical depth/event replay when licensed |
| `provenance` | Provider, feed, contract, transform, and licensing lineage |

The interface validator does not call these methods. Runtime invocation belongs
to a later provider-specific integration character.

## Capability schema

Required fields:

- `provider_name`;
- `provider_version`;
- `connection_status`;
- `exchange`;
- `instrument`;
- `contract`;
- `data_type`;
- `depth_levels`;
- `market_by_price`;
- `market_by_order`;
- `historical_depth`;
- `live_depth`;
- `iceberg_native`;
- `iceberg_inferred`;
- `absorption_native`;
- `absorption_inferred`;
- `trade_tape`;
- `latency_ms`;
- `delay_seconds`;
- `licensing_state`;
- `last_update`;
- `quality_status`.

The implementation additionally preserves Level 1, Level 2, delayed depth, and
synthetic depth explicitly.

Market-by-order and market-by-price require Level 2. Live and delayed depth
cannot both be true. Native detections require `provider_native_events`;
inferred detections require `inferred_events`.

## Capability matrix

| Data class | Resting depth | Aggressive flow | Absorption | Iceberg | Replay |
|---|---:|---:|---:|---:|---:|
| Level 1 | No | No | No | No | No |
| Level 2 MBP | Yes | Only with tape | Only with approved inference/native event | No order-level inference | If historical depth |
| Level 2 MBO | Yes | Only with tape | Capability-dependent | Capability-dependent | If historical depth |
| Delayed depth | Delayed context | Delayed if tape delayed | No current claim | No current claim | Provider-dependent |
| Synthetic depth | Must be labeled synthetic | Provider-specific | No exchange-native claim | No exchange-native claim | Provider-dependent |

## Contract identity

Every observation must identify:

- exchange `COMEX`;
- product `SI` or separately approved `SIL`;
- exact contract;
- execution contract;
- front month;
- expiration;
- rollover status;
- data depth;
- delay;
- feed.

Continuous references are analytical only. They cannot supply an execution
order book. Books across contracts remain separate.

## Future vendor compatibility

### Sierra Chart

A future adapter may map authorized Denali/SC data into the interface, but must
declare MBP/MBO availability, historical depth, executed-trade classification,
contract identity, delay, and licensing. ACSIL, DTC, file export, or local
integration details are outside this character.

### Bookmap

A future adapter may map an authorized exported snapshot or approved API/event
stream. Provider-native event labels must not be assumed; Bookmap-derived
signals must disclose native versus inferred detection, contract, depth, and
licensing.

### Quantower

A future adapter may map an authorized DOM, exported snapshot, or approved API
feed. It must disclose the upstream broker/exchange source because the
application name alone does not establish depth quality or entitlement.

### Broker DOM and exchange depth

Broker or exchange feeds must identify upstream venue, entitlement, aggregation
method, depth level, market-by-price/order status, delay, and contract.

No compatibility note constitutes a connection or vendor approval.

## Ingestion boundary

The contract permits future file import, local socket, REST, WebSocket,
database, shared-directory, provider API, exported snapshot, or event stream.
Every mode is disabled. No unsafe listener or secret is defined.

## Failure behavior

- no provider: `provider unavailable`;
- health failure: `provider unavailable`;
- Level 1 only: `insufficient evidence`;
- missing or mismatched contract: `insufficient evidence`;
- active rollover: `insufficient evidence`;
- delayed depth: delayed context only;
- stale depth: no current conclusion;
- unsupported event: ineligible with a reason code;
- unavailable field: `null`, never zero.
