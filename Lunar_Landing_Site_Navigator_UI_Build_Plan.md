# Lunar Landing Site Navigator
## UI build plan — for review

**Status:** Proposal only. No UI implementation is included in this plan.

This plan expands the UI portion of the [overall build plan](./Lunar_Landing_Site_Navigator_Build_Plan.md). It starts from the existing dark HUD shell and design tokens, then builds an interactive frontend using sample data. It does not implement JPL Horizons, DEM/COG retrieval, visibility calculations, or a backend API.

## Current UI foundation

- Next.js App Router, React, TypeScript, and Tailwind CSS v4.
- Dark-only shadcn-compatible design tokens and glass blur utilities.
- Full-screen `#cesium-container` placeholder with search, telemetry, and time-scrubber regions.
- The home page is otherwise blank; no map or controls are functional.

## Proposed experience

Keep the lunar map as the unobstructed center of the experience. Overlay three edge-anchored regions:

1. **Top-left — Site search and comparison:** find/select a candidate location, display coordinates, and manage compared sites.
2. **Right — Telemetry:** show the selected scenario's Sun/Earth azimuth and elevation, local-horizon comparison, and concise assumptions.
3. **Bottom — Time scrubber:** show the selected date/time and move through an illustrative visibility timeline.

The UI interaction flow is: choose a site → add or compare another scenario → choose a date/interval → scrub time → inspect Sun/Earth horizon telemetry. Until real services are implemented, all calculated-looking values must be clearly marked **Illustrative sample data**.

### Responsive and interaction proposal

- Desktop: keep the map full-bleed and all three panels visible; panels should not cover the central selection area.
- Small screens: keep the map visible, compact the search region, and make telemetry collapsible. Keep the time control reachable without scrolling the page.
- Use keyboard-operable controls and visible focus. Use labels and text/icons as well as color for Sun/Earth and visibility states.
- Do not imply that geometric visibility equals power generation, a communications link, or landing-site safety.

## Small commit sequence

### 01. `refactor(ui): extract mission HUD shell`

Move the overlay shell out of the root document layout into a focused workspace component. Keep the root layout responsible for metadata, global CSS, and the document. Preserve the full-screen map layer and the three overlay regions.

**Review check:** shell remains full-screen and has no page scrolling; the search, telemetry, and time regions remain independently addressable.

### 02. `feat(ui): add shadcn component foundation`

Add the shadcn/ui project configuration and only the primitives required by the first UI workflow (proposed: Button, Input, Card, Badge, Separator, and Slider). Add the shared class-name helper only if generated components require it. Keep the existing dark palette as the single theme.

**Review check:** primitives use the existing semantic tokens, have visible focus states, and do not introduce a light theme or unrelated component library.

### 03. `feat(map): mount the Cesium viewport`

Install Cesium/Resium and mount the viewer inside `#cesium-container` using a client-only boundary appropriate for Next.js. Set the initial south-pole camera. Verify the proposed NASA Moon Trek/LRO WAC imagery endpoint and attribution before enabling the imagery layer; do not represent imagery as elevation.

**Review check:** the globe loads without blocking the overlay controls, and loading/error states are visible if the viewer or imagery cannot load. No site-analysis output is shown.

### 04. `feat(ui): build the site search panel`

Replace the search placeholder with a labeled search input and a small set of clearly identified sample locations. Support keyboard navigation and selection; show the selected latitude/longitude and coordinate convention.

**Review check:** search, empty-result, and selected-location states work from local sample records only; no network search is implied.

### 05. `feat(ui): add candidate comparison controls`

Add/remove candidate scenarios and show their names/coordinates in the search panel or a compact comparison list. Keep the active scenario visually distinct and provide a clear way to change it.

**Review check:** comparison state is client-only, can be reset, and does not present sample locations as recommendations.

### 06. `feat(ui): add UTC date and time controls`

Replace the time-scrubber placeholder with date/interval inputs, a labeled timeline, a current-time marker, and keyboard-accessible time-step controls. Connect controls to local UI state and sample scenarios only.

**Review check:** displayed values are UTC, invalid ranges are explained, and the timeline has a usable text/table alternative.

### 07. `feat(ui): add Sun and Earth telemetry cards`

Replace the telemetry placeholder with separate Sun and Earth sections showing fixture azimuth/elevation, the selected site's horizon comparison, and the visibility state at the current scrubber time. Include source/status and model-assumption labels.

**Review check:** every value is marked illustrative; Sun and Earth are distinguishable without relying only on color; unknown is distinct from blocked.

### 08. `feat(ui): add horizon visualization`

Add a compact horizon plot that places Sun/Earth directions against the local horizon, plus an accessible tabular equivalent. Keep its rendering separate from data retrieval and calculations.

**Review check:** fixture inputs render deterministically; the plot explains angle units and direction convention and remains legible at the target desktop size.

### 09. `feat(ui): add HUD responsive and status states`

Polish the panel layout at desktop and mobile sizes; add empty, sample, loading, unavailable, and error presentation states that can later be driven by the API. Add status announcements for important selection/time changes and respect reduced-motion preferences.

**Review check:** no panel blocks essential map use on supported viewports; keyboard/focus order is sensible; color is not the only status cue.

### 10. `test(ui): add workflow and visual smoke coverage`

Add focused browser checks for the sample workflow: select a location, compare scenarios, change time, and confirm the telemetry/plot updates. Capture the agreed desktop and mobile viewports for review.

**Review check:** tests use deterministic fixtures, assert the visible states rather than implementation details, and run alongside the existing lint/type-check/build commands.

## Fixture boundary

Use a small, version-controlled UI fixture with an explicit `illustrative` marker and documented units/conventions. Keep the UI components driven by typed props/state so the fixture source can later be replaced by an API client without changing presentation components. Do not fetch ephemeris or terrain data in this UI phase.

## Review checkpoints

- **After Commit 02:** approve the component primitives and whether font loading should remain system-fallback based.
- **After Commit 04:** approve location-search density and coordinate presentation.
- **After Commit 08:** approve the Sun/Earth visualization and telemetry hierarchy.
- **After Commit 10:** approve responsive behavior and browser smoke coverage before connecting real data.

## Decisions for review

1. Should comparison default to two scenarios, with a proposed maximum of three visible at once?
2. On mobile, should telemetry collapse into a bottom sheet or a toggleable side panel?
3. Should sample locations be shown on first load, or should the initial screen remain empty until the user selects one?

After review, implement only the approved UI commits. Keep real data integration and feasibility calculations in the later phases of the overall build plan.
