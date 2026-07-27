# HEL-035 Deployment Checklist

Do not deploy until every required item is checked by the operator.

## Repository and preservation

- [ ] Reconcile pre-existing production modifications without resetting,
  stashing, cleaning, or overwriting them.
- [ ] Review the feature-branch file-impact map.
- [ ] Re-run the production preservation manifest.
- [ ] Re-run HEL-033/034 and OOS-ledger hash verification.
- [ ] Confirm the deployment commit and rollback commit.

## Tests

- [ ] Full JavaScript suite passes.
- [ ] Full Python suite passes.
- [ ] Apps Script syntax check passes.
- [ ] Apps Script package build passes.
- [ ] Streamlit smoke returns HTTP 200.
- [ ] `git diff --check` passes.

## Interpretation and shadow controls

- [ ] Blocked remains blocked.
- [ ] Unavailable remains unavailable.
- [ ] Stale remains stale.
- [ ] Shadow remains visibly `Shadow Observation`.
- [ ] HEL-034 cannot alter production bias, score, alert, or confidence.
- [ ] No unsupported order-book or institutional claims appear.

## Bundle and preview

- [ ] Define the production owner and cadence for the complete HEL-035 bundle.
- [ ] Validate current source timestamps and freshness.
- [ ] Load the exact release candidate in internal preview.
- [ ] Approve Executive, Monetary, VIX, Liquidity, Silver Intelligence, and
  Market Structure cards.
- [ ] Confirm drill-down provenance and reason codes.

## Briefings and dashboard

- [ ] Approve the long briefing section order and retained legacy body.
- [ ] Approve the short briefing state, silver impact, and confidence.
- [ ] Verify Telegram/email rendering through dry-run or approved test
  recipients.
- [ ] Verify the existing production silver card is unchanged.
- [ ] Verify the dashboard at desktop and narrow viewport.

## Activation

- [ ] Deploy code with `HEL_035_BRIEFING_INTEGRATION_ENABLED` false.
- [ ] Verify legacy briefing, notification, scheduler, scoring, and dashboard.
- [ ] Supply one complete validated bundle.
- [ ] Enable HEL-035 during an attended change window.
- [ ] Verify one generated briefing and dashboard before delivery.

## Rollback

- [ ] Disable `HEL_035_BRIEFING_INTEGRATION_ENABLED`.
- [ ] Remove the caller-supplied HEL-035 bundle.
- [ ] Confirm exact legacy briefing fallback.
- [ ] If required, redeploy the recorded rollback commit.
- [ ] Verify notification, scheduler, score, and dashboard parity.
- [ ] Record the rollback reason and evidence; do not mutate HEL-033/034.
