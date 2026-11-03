# Authorization recovery — 2026-11-02

## Completed and independently observed

* Existing Market Engine: https://harmonexus-briefing-engine-ve6g9fnnnzsqsubtbwc5yt.streamlit.app/ . It was asleep; its existing wake control restored the application. It then reported LIVE SHEETS / V5 / CONFIGURED and freshness 27h. This does not verify current acquisition or delivery.
* The HBE repository had no custom domain, homepage configuration or existing Pages deployment. The owner's GitHub account already used GitHub Pages. No owner-controlled Streamlit custom domain was found; no claim of ownership of streamlit.app was made.
* Market Engine-specific public information/legal pages were published from the existing HBE repository's separate `hbe-legal-pages` branch. They do not replace or alter the Media Engine's separate Pages repository. Homepage: https://davontar-jpg.github.io/Harmonexus-Briefing-Engine/ ; privacy: privacy.html ; terms: terms.html. All three returned HTTP 200. The informational homepage links the existing dashboard.
* Google Search Console explicitly confirmed **Ownership verified**, method HTML tag, for the HBE URL-prefix property. This is URL-prefix verification, not a DNS domain-property ownership claim. Keep the public verification tag in place.
* Existing Cloud project Branding saved successfully with the actual pages and authorized hostname `davontar-jpg.github.io`. Existing app name, contacts, OAuth client, scopes and registered redirects were preserved.
* Google Audience explicitly changed from Testing to **In production**. Sensitive/restricted scopes are not thereby verified; Google's displayed 100-user cap and unverified-app warning still apply.
* The existing desktop client's authorization renewal is prepared using precisely the scope set in the existing local credential. A local loopback receiver validates state and PKCE and never prints callback codes or tokens. No new client or key was created. A varying loopback port is used within the existing installed desktop-client redirect behavior; no redirect registration was edited.

## Current stopping point

Google displays **Google hasn't verified this app** after the existing project owner's account is selected. Owner approval of this warning/consent is pending. No new token has been installed at this checkpoint; the previously diagnosed invalid_grant is not yet claimed repaired.

The owner must approve their own app's warning and existing requested permissions in the open Google window. No domain research or routine Branding work remains for the owner.

## Release state

The intelligence candidate remains isolated. Source synchronization, fresh market acquisition, attended delivery, exact trigger-definition audit and observation of subsequent unattended dispatch remain open gates. Existing schedules and recipients were not modified. No production notification was sent during this recovery pass.

The full 188-test JavaScript suite passed again after the legal-page additions; the new renewal helper also passed Node syntax validation. Prior Python, Apps Script and visual checks are recorded in PRODUCTION_INTELLIGENCE_V4.md. No claim of permanent unattended reliability is justified until actual scheduled executions are observed, including beyond the former Testing expiry window.

## Rollback boundaries

Application source remains at its prior release. The legal Pages history is independent and non-force updates preserve its prior commits. Existing OAuth client/keys/scopes were not replaced. Do not revert Audience to Testing as a routine rollback, since that would reintroduce the known token-lifetime risk. Do not remove the verification tag while relying on that Google ownership verification.
