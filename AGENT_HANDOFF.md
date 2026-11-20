# AGENT_HANDOFF — Obscura07-Site

## 2026-11-06 · production-a · NG-REForge #35
- Source-backed fix: `assets/embed-bridge.js` now synchronizes same-document History API `pushState` and `replaceState` routes with the trusted parent origin, preserving existing hashchange/popstate behavior and no-op top-level behavior.
- Regression: `tests/embed-bridge.test.mjs` covers initial/hash route, SPA history navigation, unrelated paths and top-level pages.
- Executed locally: Node v22.16.0, `node --test tests/embed-bridge.test.mjs`: 3 pass, 0 fail.
- Scope: site embedding only. No browser or GitHub Pages live deployment test; do not claim the overall site is complete.
- Next: run the full site test suite and verify actual iframe integration on nullgod.tech, then review PR and merge only if CI and acceptance permit.
