# HEL-035 Preview Guide

## Purpose

The preview verifies the complete HEL-035 interpretation and operator
experience without activating production briefing, notification, scheduling,
scoring, or research mutation.

## Enable the internal dashboard preview

Set:

`HARMONEXUS_HEL035_INTERNAL_PREVIEW=true`

Start the existing Streamlit application using the repository's normal
command. The preview remains absent when the variable is missing or false.

## Supply a preview bundle

Use an `.xlsx` workbook containing a worksheet named `HEL_035_Preview`.

The worksheet must contain one of these column names:

- `Payload`;
- `Integration JSON`;
- `JSON`.

The last row in that column must contain the serialized, complete HEL-035
integration object. The object must retain target `XAGUSD`, all six sections,
authority labels, freshness, provenance, reason codes, renderer output, and
`production_effect: none`.

The isolated validation workbook is:

`artifacts/hel_035/visual/HEL_035_Operator_Desk_Preview.xlsx`

## Acceptance checks

Confirm:

- the six cards appear in the approved order;
- the Executive Market Assessment appears first;
- interpretation precedes statistics;
- Silver Intelligence says `Shadow Observation`;
- Liquidity Environment says unavailable;
- confidence is absent when unsupported;
- timestamps and freshness are visible;
- raw metrics appear only after expansion;
- the existing production silver card remains unchanged.

## Failure behavior

Missing or invalid payloads produce a visible unavailable notice. They do not
fall back to a prior interpretation and do not alter the existing dashboard.

## Disable

Remove the environment variable or set it to false. No data migration or
cleanup is required because preview rendering does not persist state.
