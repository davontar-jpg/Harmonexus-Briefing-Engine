# HEL-035 Controlled Language

## Vocabulary

State:

`strengthening`, `weakening`, `expanding`, `compressing`, `stable`, `mixed`,
`diverging`, `blocked`, `stale`, `unavailable`.

Silver relationship:

`strongly supportive`, `supportive`, `mildly supportive`, `neutral`, `mixed`,
`mildly challenging`, `challenging`, `strongly challenging`,
`observation only`.

Operational language:

- Continuation favored
- Continuation possible but unconfirmed
- Confirmation required
- Caution
- Reversal risk elevated
- Monetary headwind
- Volatility headwind
- Orderly continuation favored
- Continuation possible with normal confirmation
- Stronger confirmation required
- Range expansion risk
- Liquidation risk elevated
- Volatility signal unconfirmed
- No operational conclusion
- Data unavailable

Approved limitation phrases include shadow observation only, provider agreement
unresolved, daily history unavailable, source timing differs, data coverage
limited, order-book provider not connected, and publication lag applies.

## Guardrails

`hxSilverAssertLanguageSafe_` rejects hype, unsupported certainty, retail-signal
language, and unsupported order-flow or institutional claims. Forbidden
patterns include guaranteed/can't-miss language, iceberg claims, smart-money
claims, institutional buying or selling, accumulation, and institutional
distribution.

The deterministic templates never use a generic bullish/bearish label as a
substitute for interpretation. They state the evidence state, market impact,
silver relationship, operational bias, risk, required confirmation, and
confidence.

An LLM may later refine presentation only after this object exists. It may not
change state, confidence, limitations, facts, reason codes, or conclusions.
