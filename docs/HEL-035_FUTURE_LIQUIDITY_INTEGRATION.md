# HEL-035 Future Liquidity Integration

Status: adapter-ready; no provider connected

## Provider-neutral rule

Sierra Chart, Bookmap, Quantower, a broker DOM, or an exchange feed may be
integrated only through an adapter implementing the existing
`HX_LIQUIDITY_PROVIDER_METHODS` contract. Core interpretation and rendering
must remain vendor-neutral.

The application name is never proof of entitlement, depth quality, exchange
origin, event classification, or historical availability.

## Required adapter mapping

Every adapter must map:

- health and connection state;
- exact exchange, product, and execution contract;
- Level 1 versus Level 2;
- market-by-price versus market-by-order;
- live, delayed, historical, or synthetic depth;
- depth levels and delay;
- executed trade tape;
- native versus inferred absorption and iceberg events;
- licensing and quality state;
- source timestamps and provenance.

Unsupported capabilities must be false or unavailable. They may not be
inferred from the vendor name.

## Vendor compatibility

- **Sierra Chart**: adapter may consume an approved local export, DTC/ACSIL
  bridge, or other authorized feed. It must expose the upstream service and
  contract.
- **Bookmap**: adapter may consume an approved export or API/event stream. It
  must distinguish provider-native labels from HEL-035 inference.
- **Quantower**: adapter may consume an approved DOM export or API. It must
  disclose the upstream broker/exchange source.
- **Other provider**: eligibility is based on capability and provenance, not
  brand.

## Contract and rollover

Use the exact COMEX SI or separately approved Micro Silver execution contract.
Continuous futures are analytical references only. Never combine books across
contracts. Active rollover, contract mismatch, missing contract identity, or
stale depth produces insufficient evidence.

## Security and operations

Provider credentials must use the repository's approved secret mechanism and
must never enter fixtures, logs, provenance, or dashboard output. Network
listeners, retention, and replay require separate security, licensing,
capacity, and rollback review.

## Activation gates

Before a provider can affect production:

1. implement and unit-test one isolated adapter;
2. prove capability mapping and exact contract identity;
3. validate freshness, delay, rollover, and failure behavior;
4. test native and inferred claim language separately;
5. approve retention and licensing;
6. run shadow observation without alerts or bias changes;
7. obtain explicit operator approval for production authority.

Until then, the correct state remains:

`Waiting for institutional order-book provider.`
