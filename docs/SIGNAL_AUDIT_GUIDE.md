# Signal Audit Guide

## Purpose

Signal Audit answers: “Why does this instrument have this reading right now?” Select an instrument in Streamlit’s **Signal Audit** workspace.

## Trace sequence

1. **Source inputs:** raw value, source, timestamp, quality, and source confidence.
2. **Normalization:** factor signal constrained to -1…+1.
3. **Weights:** signed instrument-specific weight from the registry.
4. **Contribution:** normalized signal multiplied by signed weight.
5. **Contradictions:** factors opposing the final normalized direction.
6. **Calibration:** weighted confidence, coverage, raw strength, cap, published strength, reliability, and evidence status.
7. **History:** prior direction/strength, score delta, material-change flag, and calibration history.

## Interpretation rules

- A strong score with `PROVISIONAL` or `INSUFFICIENT EVIDENCE` is deliberately capped.
- A contradiction is not an error; it is opposing evidence that must remain visible.
- Stale sources reduce source confidence and should be resolved before production decisions.
- Missing factor rows mean unavailable evidence, not neutral evidence.
- The explanation trace must reproduce the published calculation without relying on AI text.

## Escalation

Escalate when source timestamps disagree materially, a factor weight is absent, explanation trace does not reconcile, a low-confidence score bypasses its cap, or repeated material-change alerts reverse within two scoring cycles.

