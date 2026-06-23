# Calibration Guide

## Published fields

- **Directional Score:** signed pressure from -10 to +10.
- **Raw Strength:** magnitude implied by aligned factor contributions before confidence control.
- **Strength:** publishable 1–10 reading after the confidence cap.
- **Confidence:** factor-quality-weighted evidence coverage, 0–100%.
- **Reliability / Evidence Status:** operator-facing assessment of whether the reading is usable.

## Thresholds

| Confidence / coverage | Evidence status | Strength cap |
|---|---|---:|
| Below 25% or below 25% coverage | Insufficient evidence | 3.9 |
| 25–49% or below 50% coverage | Provisional | 6.9 |
| 50–74% or below 75% coverage | Weak / Developing | 8.4 |
| At least 75% with at least 75% coverage | Strong / Reliable | 10.0 |

This prevents a narrow 10%-confidence observation from appearing as a publishable 10/10 conviction signal.

## History and review

Every scoring run appends `Calibration_History`: raw strength, calibrated strength, confidence, reliability, coverage, score change, and material-change state. Review monthly by instrument and source. Adjust thresholds only from observed false-positive, false-negative, stability, and timeliness evidence—not to force agreement with a desired market view.

## Change control

Threshold or weight changes require a Git commit, tests, a v4.7 comparison run, and at least five parallel sessions before acceptance.

