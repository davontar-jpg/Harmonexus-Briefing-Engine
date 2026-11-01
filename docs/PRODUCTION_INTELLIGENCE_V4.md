# Production Intelligence V4 — forensic checkpoint

Audit date: 2026-11-01, America/New_York. **Local candidate; not deployed or approved as reliable production.**

## Baseline and rollback

Notification release baseline: `3891f5d2c5d0b41c861e08725c949e0173911b74` on remote `codex/production-readiness`.
Remote main: `f42120ca07e0d042ecf78830de3457002911d800`. These are different release trees; merging/redeploying main without reconciling the notification release would regress production.

Isolated branch: `codex/production-intelligence-v4`. No original dirty checkout edits are included. Rollback is the unchanged release above; only after an eventual publication should its built Apps Script source be restored if needed. Do not overwrite Script Properties, recreate the workbook, or reinstall triggers for a code-only rollback.

## Evidence and limits

* Gmail: scheduled daily email received October 26 and October 27 at approximately 07:04 ET. A manual Editor execution on November 1 at 15:55 ET also completed. These establish delivery at those times, not continuous reliability.
* Apps Script Executions: last displayed time-driven run was `calculateAllScores`, October 27 at 18:45:06 ET, completed. No subsequent scheduled executions appear before the November 1 Editor send.
* Triggers: four owner-held time-based records remain: refreshFRED, sendDailyBriefing, calculateAllScores, refreshCFTC. Existing last-run error rates display 0%; the outage therefore cannot be diagnosed as a transport failure from that display.
* Existing local OAuth refresh returns `invalid_grant`. Google Cloud Audience is **External / Testing**. Google documents seven-day test-user/refresh-token expiration for this configuration with nonidentity scopes. This proves a lifecycle defect for that client, but does not by itself prove the precise cause of trigger dispatch stopping. No credentials were changed.
* Cloud Audience initially displayed Publish app disabled and requested completion of Branding. Branding contains the existing app name and contact addresses; no invented homepage/privacy policy was supplied. Recheck publication eligibility after the page finishes loading and complete only genuinely required owner-controlled fields.
* Canonical workbook metadata reports America/Los_Angeles; Apps Script manifest reports America/New_York. Formatted sheet dates are not execution time evidence. No workbook timezone was changed.
* FRED_Raw October 1–23 observations exist, but the October 27 runtime selected September 30. String comparison of Date objects in VIX, FRED candidates and CFTC candidates is a proven chronological selection defect.
* FRED_Raw US10Y includes a 1900 date/time formatted cell. Score_History contains a corresponding numeric yield delta of 70,848,000. Date objects must not be coerced to yields.
* Independent public endpoint checks returned HTTP 200 for VIXCLS and DFII10, latest observation October 29, respectively 17.20 index points and 2.63 percent. Retrieval time does not turn these delayed closes into live quotes.
* Structure currently contains manual/pending records with no usable observation timestamp, provenance or validation. Auction phases, acceptance, liquidity destinations and invalidation must remain UNKNOWN until real validated records exist.
* Lead_Lag contains same-hour aggregate SI/spot and gold/spot statistics; the active engine consumes Score_History dated directional observations, not that aggregate table or stored research candles. The 5,000-row history retention and hourly 19-instrument updates can leave fewer than 30 synchronized daily observations. No unavailable relationship was fabricated or promoted.
* Existing HEL-034 handoff contains a failed USDCNH acquisition and `Daily offshore CNH validation incomplete`. The blocked result is authentic; it was not changed to neutral. Refreshing research requires the existing research acquisition/validation pipeline, not relabeling the July handoff as current.

References: [Google OAuth token expiration](https://developers.google.com/identity/protocols/oauth2#expiration), [FRED VIXCLS](https://fred.stlouisfed.org/series/VIXCLS).

## Candidate changes

1. Shared calibrated signed display: sign comes from published Direction and magnitude from calibrated Strength. Raw Directional Score remains an audit input; no scoring weight, formula, cap or threshold changed. Neutral displays 0.0; missing displays UNKNOWN. Signed transitions are computed from prior/current calibrated signed readings, not the old magnitude-only change field.
2. Structure-first adapter: STRUCTURE → LIQUIDITY → PARTICIPATION → POSITIONING → CONFIRMATION → DIRECTIONAL BIAS → INVALIDATION. It accepts current (24-hour maximum), validated, attributed explicit records only. No phase inference from percentage performance or conventional indicators. Optional observed behavior and previous-structure changes are retained in the full email. Inferred destinations never become verified orders. No new workbook columns are written.
3. Telegram and email retain their canonical identity, sections and calendar. Priority instruments gain the evidence sequence. Existing HEL-035 injection remains in place. Email receives escaped responsive HTML plus the full plain-text alternative. Telegram retains its plain-text transport and 3,900-character guard; advanced Telegram markup/segmentation remains pending.
4. Notification daily workflow gets a ScriptLock and recipient-level date/provider idempotency state. SENT recipients are skipped. Ambiguous IN_FLIGHT attempts require ledger reconciliation; they are not blindly replayed. Other alerts retain existing behavior. The dry-run return occurs before any guard mutation or transport.
5. Telegram POST uses one attempt because an ambiguous network failure may already have delivered. Safe acquisition requests retain existing bounded retries. Successful email and Telegram are guarded independently. State keys use hashed destination identifiers under HX_DELIVERY_; they do not change secrets. Old SENT markers expire after 35 days; ambiguous markers remain for audit.
6. Macro alignment retains its conditional alignment arithmetic but evidence-confidence classification is limited by input confidence. Its scope and coverage are explicit; it is not global conviction and overlapping relationships are not independent confirmations. Nominal Treasury yields are no longer labeled real yields.
7. FRED and CFTC Date objects sort chronologically. FRED yield-number formats are set before refresh writes; Date-valued yield candidates are rejected. VIX skips blank/nonpositive rows and no longer asserts all weekday sessions closed. The next daily update skips weekends; exact Cboe holiday/publication handling remains pending.
8. A read-only local authorization/source-inventory helper logs only authorization health and source hashes. Run with HARMONEXUS_SCRIPT_ID set to the existing verified bound project. It never dumps Script Properties or rewrites credentials.

## Structure record contract

Read-only optional fields in the existing Structure source: Instrument/Asset; As Of/Last Updated/Timestamp; Source; Quality (`valid`, `validated` or `verified`); Auction Phase; Structural Condition; Inferred Auction Destination; Participation Quality; Positioning Alignment; Continuation Condition; Invalidation Condition; Observed Acceptance/Rejection; Structure Change. Unknown or unsupported fields stay UNKNOWN. No structure collection or depth feed is created by this patch. The existing manual legacy layout remains readable by its original adapters.

## Before/after examples (synthetic formatting fixtures)

Before: `XAGUSD — Bearish 4.8/10`.

After: `XAGUSD — Bearish −4.8/10`. Structure: UNKNOWN when no current validated record exists. No liquidity target is invented.

Before: previous Bullish 3.5, current Bearish 4.5, magnitude change +1.0.

After: `Previous: +3.5/10 → Current: −4.5/10; net bias change: −8.0 points; direction reversal.` This says nothing about realized price return.

Before: `Consensus Score: 100/100 (Very High)` despite approximately 35% source confidence.

After: `Consensus Score: 100/100 (relationship alignment only); evidence confidence: Low`, followed by coverage and the explicit limited evidence universe. Global contradiction and conviction sections remain separate.

## Validation and gates

Run Node's full test glob, not just the original npm test list, to include the refinement tests. CI now explicitly runs test:refinement. Fixtures cover all 19 instrument displays, no mutation of source rows, signed reversal math, future/stale/unchanged observations, unsupported structure, source attribution, liquidity claim boundaries, VIX chronology, Date-valued yield rejection, confidence scope, HTML escaping and daily duplicate/ambiguous transport guards.

Existing scoring/webhook/HEL-035 fixtures and Python contracts remain regression gates. The original HEL-033/034 handoff and research artifacts remain unchanged. Generated dependency directories, logs, caches and temporary screenshots are excluded from commits.

Production gates remain OPEN: restore OAuth; retrieve and hash the actual remote source; audit exact scopes/owner and trigger definitions; deploy only after canary review and parity; refresh through approved production functions; render both channels against the same fresh runtime; inspect HTML on actual mail clients; run a controlled canary; observe actual unattended scheduled delivery on successive days including beyond seven days. Do not infer reliability from a manual send.

Completed checkpoint validation: 188 JavaScript tests, 41 Python tests, 15 Python files compiled, 25-module Apps Script syntax/build, and whitespace diff check passed. Streamlit AppTest passed Overview, Instrument Lab, Signal Audit, Operations and Data Explorer without exceptions using bundled data. Desktop card faces measured 289×218 pixels; 390px mobile faces measured 356×206 pixels, with no back clipping or document overflow. These are local demo-layout checks, not proof of fresh live production intelligence. Existing service-account read independently confirmed all 19 instruments; their published As Of was October 27. Review screenshots are outside the production repository in the workspace outputs/intelligence-v4 directory.

The first sandboxed Streamlit startup stalled in Windows socket-pair initialization, before app startup. An elevated local smoke test passed; this was an environment permission issue, not an application repair. The original protected notification and production-test file SHA-256 hashes remain respectively 67A40EBD909B8EC0FA61BFA4B18C10553C2A8948D9A4E2A17A8B59A14A2A8A3F and 114C6AF3BBF2C1C9420ED8B9A03D0707BE9796C5503896F22C541FB9DA2A158C. Their uncommitted original state and HEL-025–031 packages remain untouched.

## Remaining work — not operational claims

* Durable OAuth publication/verification and reauthorization; precise trigger-dispatch root cause; independent missed-delivery monitor and escalation. No new paid infrastructure was provisioned. A stopped Apps Script project cannot independently prove its own health; an external heartbeat reader is required for that claim.
* Exact holiday/session/publication-aware source registry for all feeds; frozen-cache lineage across every provider; pre-07:00 cutoff coordination.
* Fresh HEL-034 CNH validation via its existing research pipeline; synchronize a sufficient historical observation series for statistically defensible lead/lag analysis. Aggregated correlation tables alone cannot establish lead/lag or causation.
* WTI registry assessment: current directional registry has 19 instruments and no independent WTI instrument. Energy-regime context is separate; adding WTI requires validated source/contract/session mapping and calibration. No 20th instrument was silently added.
* Optional genuine CME depth licensing, exchange entitlement, historical retention and cost assessment. No depth subscription, Bookmap integration or inferred hidden-order detector was activated.
* Full sector evidence-matrix compression, Telegram markup/segmentation and final HTML email visual acceptance remain pending.
* Existing GPT Responses integration, configured model and deterministic fallback remain intact. This patch makes no model calls, adds zero recurring model cost, and does not claim budget/caching/numerical-output validation is implemented. Exact dollar costs require inspecting the configured model and recorded usage after authorization is restored.

## Operator next action

The signed-in Cloud Audience page is the relevant owner control. Complete genuine Branding requirements, publish the existing OAuth app if eligible, and approve the existing scopes once. Do not create another client or key. Publication does not restore an already invalid token: reauthorization is still required. If Google requires a real privacy policy or verification, provide the owner's actual policy/domain rather than fabricating one.

After access recovery, use tools/audit-production-auth.mjs for a read-only inventory before any push. Compare remote code with the baseline. Reconcile divergent source first. Keep the current four schedules and their timezone; no trigger was changed in this candidate pass. Never clear IN_FLIGHT markers without checking provider/notification logs, because the message may already have delivered.
