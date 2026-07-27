# HEL-035 Liquidity Claim Safety

## Principle

No order-book claim is generated before capability, contract, freshness, event
type, detection status, and confidence are validated.

Version: `HEL-035.liquidity-claims.1.0.0`.

## Event eligibility

Each event preserves:

- timestamp;
- price;
- size;
- side;
- source;
- exact contract;
- confidence;
- native, inferred, or observed status;
- detection method;
- freshness;
- reason codes;
- provenance.

Capability controls eligibility:

- resting depth requires current Level 2 MBP or MBO;
- order additions/cancellations/migration require MBO;
- aggressive flow requires executed trades;
- native absorption requires native capability plus trade tape;
- inferred absorption requires inferred-event capability plus trade tape;
- native iceberg detection requires MBO and native capability;
- inferred iceberg detection requires MBO and inferred-event capability;
- spoofing-risk assessment requires MBO;
- stale events cannot be interpreted.

## Forbidden certainty

The safety layer rejects:

- institutional buyers are accumulating;
- institutional sellers are distributing;
- iceberg buying is present;
- iceberg selling is present;
- large liquidity is defending price;
- spoofing is occurring;
- absorption is confirmed.

Institutional-participation claims remain disabled in the current capability
policy.

## Permitted qualified language

When evidence and capability permit:

- native absorption: `Provider-native absorption detected.`;
- inferred absorption: `Inferred absorption observed.`;
- native iceberg event: `Provider-native iceberg event detected.`;
- inferred iceberg event: `Suspected iceberg behavior.`;
- replenishment: `Possible replenishment observed.`;
- resting size: `Liquidity concentration observed.`;
- spoofing analysis: `Spoofing risk detected.`;
- executed flow: `Aggressive buy volume observed.` or
  `Aggressive sell volume observed.`

Native and inferred status, confidence, method, timestamp, contract, and source
remain available in structured evidence.

## Unavailable state

The current placeholder may state that no resting-liquidity, absorption,
iceberg, or execution-flow interpretation is authorized. This is a denial of a
claim, not a claim that such behavior is absent.

Unavailable fields are `null`. They are not balanced, neutral, zero, false, or
evidence that no activity exists.

## COMEX limitation

Even valid COMEX evidence describes one futures contract and feed. It cannot
claim complete global silver liquidity or automatically determine XAGUSD
direction.

## Validation

Tests prove:

- unsupported events cannot produce claims;
- native and inferred events use different language;
- prohibited institutional certainty throws;
- safe qualified phrases remain permitted;
- provider absence renders no interpretation;
- no provider, listener, credential, score, scheduler, alert, or notification
  path is activated.
