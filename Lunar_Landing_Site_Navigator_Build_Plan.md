# Lunar Landing Site Navigator
## UI-first build plan

**Status:** Planning only. No implementation work is included in this document.

This plan breaks the reviewed architecture into small, reviewable commits. It starts with the user interface and uses clearly labeled fixture data until the real data sources and calculation model are ready. See the [architecture review](./Lunar_Landing_Site_Navigator_Architecture_Review.md) for the intended scope and technical assumptions.

## Current starting point

The workspace already has a blank Next.js App Router project with React, TypeScript, Tailwind CSS, ESLint, and build/type-check scripts. The route intentionally renders no UI. The selected product scope is geometric visibility for comparing lunar south-pole sites and dates; a video is the chosen demo format.

## Working agreements

- Make one commit per numbered step; keep each commit focused on the listed outcome.
- For code commits, run `npm run check`; run `npm run build` before merging milestones that change routing, dependencies, or application behavior.
- Keep fixtures visibly identified as sample data. Do not present fixture results as NASA-derived or calculated results.
- Keep solar and Earth line-of-sight distinct. Do not imply that visibility calculates power, guarantees communications, or certifies landing safety.
- Do not begin real terrain calculations until a specific NASA elevation product and its metadata/coverage are verified.

## Commit sequence

### Phase 1 — Build the user experience first

#### 01. `feat(ui): add responsive application shell`

Create the page frame and responsive layout regions for the project name, site comparison workspace, and results area. Use placeholder headings only; no map, calculations, or interaction.

**Done when:** the empty application has a usable mobile/desktop structure, semantic landmarks, and no fabricated results.

#### 02. `feat(ui): establish visual tokens and base components`

Add a small set of colors, spacing, typography, focus, and button/input styles consistent with a science-planning tool. Keep components generic and avoid designing an elaborate dashboard.

**Done when:** base controls are keyboard-focusable, readable at common viewport sizes, and the empty app still passes checks.

#### 03. `feat(map): display a south-pole lunar map`

Integrate Cesium/Resium and configure the initial south-pole camera. Verify the proposed NASA Moon Trek/LRO WAC imagery endpoint and its attribution before using it. Imagery is visual context only, not terrain elevation.

**Done when:** the map loads reliably, has a useful loading/error state, and its image source is identified in project documentation.

#### 04. `feat(map): select and label candidate locations`

Allow a user to select map locations and show coordinates with the stated coordinate convention. Keep the selection in client state; do not make an ephemeris or terrain request.

**Done when:** selecting a location updates the displayed coordinates, and invalid or unavailable selections are not silently accepted.

#### 05. `feat(ui): add mission dates and comparison controls`

Add date/interval controls and a small, bounded set of candidate site/date scenarios for comparison. Validate required values and present dates in UTC.

**Done when:** users can add, edit, and remove comparison scenarios; invalid dates and empty scenarios receive clear feedback.

#### 06. `feat(ui): render horizon and timeline fixture views`

Build the Sun/Earth horizon visualization and visibility timeline against a small, deterministic fixture. Label every fixture result as sample data and show the assumptions needed to interpret it.

**Done when:** both bodies are visually distinct, the horizon and time axis are legible, and a text/table alternative communicates the same sample values.

#### 07. `feat(ui): complete accessible comparison states`

Add empty, loading, unavailable, and error presentations; keyboard and screen-reader labels; responsive comparison behavior; and a clear geometric-visibility limitation.

**Done when:** the main workflow is usable without a mouse and no state confuses “not visible” with “unable to determine.”

### Phase 2 — Lock the data contract and sources

#### 08. `docs(data): select and document the NASA elevation product`

Choose a specific official NASA elevation product before implementation. Record its exact product/version, URL, resolution, coordinate systems, units, no-data encoding, coverage, access method, attribution, and license. Confirm whether it is actually a COG before planning range reads.

**Done when:** another developer can identify and retrieve the same product and understand its limitations. This is a gate for Commit 10.

#### 09. `feat(core): define feasibility contracts`

Add typed request/result models for bounded site/date scenarios, time conventions, separate Sun/Earth visibility, data provenance, uncertainty/coverage flags, and explicit failure states. Add schema validation at the external-input boundary.

**Done when:** contract tests cover malformed coordinates, unsupported ranges, oversized comparisons, and valid requests without depending on external services.

### Phase 3 — Implement and verify the analysis services

#### 10. `feat(data): add NASA terrain adapter`

Implement retrieval for the selected elevation product and validate response metadata, projection, units, no-data values, extent, and coverage before exposing pixels to the analysis layer.

**Done when:** tests cover successful metadata validation, no-data, missing coverage, malformed responses, and upstream failure; the product/version accompanies each result.

#### 11. `feat(data): add JPL Horizons adapter`

Implement the ephemeris request behind an adapter. Record and test targets, observer/site representation, time scale, reference frame, units, and lunar orientation. Do not treat geocentric angles as site-relative without verification.

**Done when:** a representative response is parsed into documented, normalized values; malformed, timeout, and upstream-error cases remain explicit.

#### 12. `feat(core): derive site-relative celestial directions`

Add tested transformations from the selected ephemeris representation to the site's local horizontal frame, with explicit coordinate and lunar-orientation conventions.

**Done when:** tests use known vectors and representative south-pole locations, and document numerical tolerances.

#### 13. `feat(core): calculate terrain horizon profiles`

Calculate terrain elevation by azimuth from the selected DEM, accounting for distance and lunar curvature. Define interpolation, nodata, boundary, and maximum-coverage behavior.

**Done when:** synthetic flat terrain and ridge fixtures produce expected horizons; insufficient coverage is reported rather than classified as clear.

#### 14. `feat(core): calculate geometric visibility windows`

Compare Sun/Earth apparent elevation to the terrain horizon at a defined time sampling interval. Summarize separate visibility windows and document how sampling handles window boundaries.

**Done when:** deterministic unit tests cover clear, blocked, boundary, nodata, and short-window cases. Results are labeled geometric visibility only.

#### 15. `feat(api): expose validated feasibility endpoint`

Add the Next.js API route to validate requests, call the adapters and calculation service, and return the agreed contract. Apply bounded timeouts, resource limits, upstream error mapping, and documented cache keys/expiry.

**Done when:** route tests verify valid results and explicit client, upstream, and insufficient-data errors without success-shaped fallbacks.

### Phase 4 — Connect, validate, and prepare the submission

#### 16. `feat(ui): connect comparisons to feasibility results`

Replace fixture results with API responses while retaining fixtures for UI tests. Show provenance, sampling interval, coverage/uncertainty, loading, and error status for each scenario.

**Done when:** the UI clearly differentiates sample data, computed visibility, and unknown/unavailable results.

#### 17. `test: add end-to-end comparison scenarios`

Add a small end-to-end set covering site/date comparison, UTC handling, data-source failures, and repeatability. Compare selected cases with independently checked references and state tolerances.

**Done when:** the release path is reproducible and tests catch regressions in the critical geometry and response shape.

#### 18. `docs: publish data, methods, and limitations`

Complete the project resource register for NASA and partner-agency data, packages, tools, text, and media. Document coordinate/frame assumptions, accessibility, cost/energy considerations, model limitations, and AI use/watermarking if applicable.

**Done when:** credits describe sources actually used—not merely planned—and project claims match implemented behavior.

#### 19. `chore(deploy): publish a public demo`

Choose a hosting target, configure only necessary environment settings, deploy the app, and test the public URL on desktop/mobile without a team login.

**Done when:** the public build loads, critical comparison paths work, and upstream failures are visible and safe.

#### 20. `docs(submission): finalize summary and 30-second video`

Update the 50–200-word summary to match the final build. Record a video no longer than 30 seconds showing a site/date comparison, the horizon visualization, data source, and geometric-visibility limitation. Add English subtitles if non-English speech is used; disclose AI assistance and watermark AI-generated media when required.

**Done when:** the public demo and submission page agree, the video meets the time limit, resource credits are complete, and team registration/required fields/deadline are checked.

## Decision gates before the relevant commits

- **Before Commit 03:** verify the map imagery endpoint and attribution.
- **Before Commit 08 is complete / Commit 10 begins:** select and validate the exact NASA elevation product and its coverage.
- **Before Commit 11:** confirm the Horizons observer, frame, time, and lunar-orientation approach for surface-site directions.
- **Before Commit 19:** choose the hosting provider and confirm required environment configuration.
- **Before Commit 20:** confirm the official challenge title and make sure the summary/video describe only shipped functionality.
