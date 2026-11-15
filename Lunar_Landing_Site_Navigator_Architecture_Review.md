# Lunar Landing Site Navigator
## Architecture refinement — review draft

**Status:** Proposed; for team review, not a record of features already implemented.

This draft reflects the team's confirmed scope: an intuitive tool for mission planners, educators, and the public to compare lunar south-pole sites and dates by showing when the Sun and Earth are geometrically visible relative to the local horizon. It supports initial assessment of power and direct-to-Earth communication opportunities; it does not calculate generated power, link performance, or certify a site.

**Current implementation status:** The viewport is a synthetic Canvas illustration; Cesium assets are configured but are not yet used to render terrain. A server-side visibility route now reads the selected LOLA product, calculates a 1° geometric horizon, and requests 30-minute Sun/Earth samples from JPL Horizons. The HUD has no sample-data fallback. This environment could not complete a live Horizons request, so the end-to-end upstream result remains unverified; any returned result whose Horizons frame/datum cannot be matched to LOLA is explicitly marked provisional.

## 1. Product and judging goal

The project responds to the challenge brief the team provided: make Sun and Earth positions relative to the horizon easier to compare across candidate sites and dates. The UI should serve mission planners who need quick comparisons as well as educators and the public who need plain-language explanations. Its value is an explainable, location-specific geometric screening tool—not an autonomous landing-site certification system.

The summary and demo should state how the tool addresses this challenge. Use the official challenge title on the submission page once confirmed from the event listing.

## 2. Proposed architecture

```text
Next.js / React UI
  ├─ Cesium/Resium lunar map and candidate-site selection
  ├─ Date/interval controls and site/date comparison
  └─ Accessible horizon view, timeline, results table, and assumptions
                │ validated request
                ▼
Next.js API route
  ├─ Input validation, comparison limits, and request IDs
  ├─ Ephemeris adapter ── JPL Horizons
  ├─ Terrain adapter ──── selected NASA lunar elevation product
  └─ Feasibility service
       ├─ Coordinate/frame conversion
       ├─ Local terrain horizon and lunar-curvature checks
       └─ Results with provenance and limitations
```

Keep data-source access and coordinate transformations behind adapters so their assumptions can be tested independently of the UI. The browser should display results and user-selected inputs; it should not be responsible for authoritative geometry.

### Frontend

- Keep the Cesium/Resium south-pole view and site selection. Treat the LRO WAC map layer as **visual context**, not as elevation or proof of visibility.
- Let users compare candidate sites and dates in one view. Show Sun and Earth angular positions against the local horizon and summarize the corresponding visibility windows.
- Show selected coordinates, coordinate convention, mission dates, time zone (UTC), and data-source status alongside results.
- Present solar and Earth visibility as separate series. Label the result as *geometric line-of-sight*: it informs power and direct-to-Earth communication planning but does not calculate power generation or guarantee a communications link.
- Provide an accessible chart alternative (table or text summary), keyboard-operable controls, and clear loading, no-data, and error states.

### API and data services

- Validate coordinates, date range, mission duration, number of compared site/date scenarios, and request size; apply bounded timeouts and resource limits. Return explicit validation, upstream-service, and insufficient-data errors rather than plausible-looking fallback results.
- In the JPL Horizons adapter, document and test the target, observer, time scale, reference frame, units, and lunar orientation assumptions. Verify that the returned quantities represent the selected surface site. If the service query cannot represent that observer correctly, obtain consistently framed body-relative vectors and calculate the site-relative directions with a validated transform; do not assume geocentric azimuth/elevation is topocentric.
- The [Horizons API documentation](https://ssd-api.jpl.nasa.gov/doc/horizons.html#center) documents `CENTER=coord@301`, `COORD_TYPE=GEODETIC`, and `SITE_COORD=east longitude, latitude, altitude in km` for observer ephemerides. This documents the query syntax, but does **not** establish that the Horizons lunar geodetic datum/orientation matches LOLA's planetocentric ME/PA of DE421 coordinates or the DEM height datum. Verify the returned center frame and convert/validate the input coordinates before claiming a frame-aligned result. Use Earth UT as an explicit time-tag convention, not a lunar local time.
- **Selected terrain source:** NASA PDS Geosciences Node, LRO LOLA polar DEM product `LDEM_75S_240M`, product version `V2.1`, dataset `LRO-L-LOLA-4-GDR-V1.0`. Its PDS3 label identifies a 3812 × 3812 `PC_REAL` (little-endian 32-bit float) image at 240 m/pixel, in a spherical polar-stereographic projection covering 75°S–90°S. Heights are in kilometers relative to a 1737.4 km reference radius; the coordinate system is planetocentric, positive-east, body-fixed Mean Earth/Polar Axis of DE421. The data are a raw PDS image, **not a COG**. The official PDS server returned HTTP 206 for a byte-range request. The label does not define a null sentinel, so the adapter must validate finite values and the documented product range and report invalid samples as unknown.
- Use the official PDS label and image URLs in `.env.example`; record the exact product metadata and attribution in the resource register. Do not treat the DEM as current or high-resolution landing-safety data. Its 240 m pixels support coarse geometric screening only.
- Derive the terrain query extent from the analysis requirements and product coverage, rather than assuming a fixed 15 km box is always sufficient. Account for lunar curvature and distant terrain near the horizon. If the required horizon is outside valid data coverage, report insufficient coverage and do not classify the interval as clear.
- Check dataset metadata and every fetch result before calculation. Cache only with a documented key that includes coordinates/extent, product version, time interval, and relevant model version; set bounded cache lifetimes and respect upstream service limits.

### Feasibility calculation

For each sampled time:

1. Convert Sun and Earth directions to the site's local horizontal frame using documented, tested transformations.
2. Derive a terrain horizon in each relevant azimuth from the elevation grid, accounting for distance and lunar curvature.
3. Compare each body's apparent elevation with that horizon, with defined nodata, interpolation, and boundary behavior.
4. Return separate solar and Earth line-of-sight results, timestamps, sampling interval, input/data provenance, and any uncertainty or coverage flags.

Define time sampling and boundary handling so short visibility windows are not silently skipped. Validate the computation against synthetic flat terrain and known obstructing ridges. A “Sun visible” result is not a power estimate; estimating power would additionally require panel orientation, incidence, efficiency, and other mission assumptions. “Earth visible” is not a communications link budget; that would require antenna and link assumptions.

## 3. Response and failure behavior

The API response should include:

- The normalized request and coordinate/time conventions for each compared scenario.
- A time series with timestamps and distinct `sunVisible` / `earthVisible` states.
- Visibility-window summaries, plus sampling resolution.
- Terrain product and version, ephemeris source/query details, model version, and limitations.
- Coverage or uncertainty flags and explicit errors when a reliable result cannot be computed.

Do not silently substitute a different dataset, frame, or default location. The UI should distinguish “not visible” from “could not determine.”

## 4. Validation and evidence

Before presenting the model as functional, provide evidence for:

- Coordinate conversion and time/frame handling at representative polar locations.
- A flat-terrain case and synthetic ridge cases that block the expected azimuths.
- Terrain no-data, dataset-edge, missing-coverage, and upstream-timeout behavior.
- Stable results for repeat requests with identical inputs and data versions.
- A small set of independently checked reference cases, with the method and tolerance stated.

Document what the prototype does not model (for example, hazards, slope suitability, lighting uncertainty, power generation, or communications link performance). Report measured limitations rather than implying precision the inputs cannot support.

## 5. NASA resources, attribution, and AI disclosure

Maintain a resource register in the project documentation and submission page. For each NASA or partner-agency dataset/service, open-source package, external tool, and reused text or media, list its name, provider, exact URL or version, role in the project, and required attribution/license. Identify at least one specific official NASA resource used by the implemented project; a planned source is not evidence of use.

If AI tools contribute to code, text, images, or video, disclose the tool and its role in the submission text/metadata. Apply the event-required visible watermark to AI-generated images or video. Do not claim AI was used—or add a watermark—unless it was; keep original human-created work distinguishable.

## 6. Submission and demo architecture

Treat the submission as a release deliverable, not an afterthought:

- Publish a stable, publicly accessible demo URL and test it without a logged-in team account.
- Use the team's chosen format: a video of no more than 30 seconds. Include English subtitles if non-English speech is used.
- Show a quick site/date comparison, the Sun and Earth positions relative to the horizon, the NASA terrain source, and the geometric-visibility limitation.
- Use this **candidate project summary** (within the 50–200-word limit); revise it to describe only behavior present in the final demo:

  > Lunar Landing Site Navigator is an interactive prototype for comparing lunar south-pole landing sites and mission dates. It visualizes when the Sun and Earth are geometrically above the local terrain horizon, helping mission planners, educators, and the public quickly explore potential solar-illumination and direct-to-Earth communication windows. Users can select candidate locations and dates, compare the resulting visibility timelines, and inspect the assumptions and data sources behind each result. The project responds to the NASA Space Apps challenge to make these critical constraints easier to evaluate through an intuitive tool. It is a planning and learning aid: geometric visibility alone does not estimate electrical power, establish a communications link, or determine whether a landing site is safe.

- Suggested 30-second narration/storyboard: **0–5s:** introduce the south-pole planning problem; **5–14s:** compare two sites or dates on the map; **14–23s:** show Sun/Earth positions and visibility windows; **23–30s:** identify the NASA data and clarify that results are geometric visibility, not power or link guarantees. Keep the final cut at or under 30 seconds.
- Put technical/design details, data/resource credits, AI disclosure when applicable, and relevant cost, energy, and accessibility considerations on the project page.
- Verify registration and required fields for all 1–6 team members, use English for required submission content, and submit before the event deadline.

## 7. Requirement-to-evidence checklist

| Judging requirement | Proposed evidence |
|---|---|
| Impact | Faster site/date comparison for planners, educators, and the public; explain that visibility is not power or link performance. |
| Creativity | Interactive, site-specific comparison of Sun and Earth positions relative to the horizon. |
| Validity | Reproducible sources, explicit geometry assumptions, reference cases, and failure handling. |
| Relevance | Show how site/date comparison and horizon visualization answer the provided south-pole planning challenge. |
| Presentation | Clear comparison UI, accessible public demo, compliant 30-second video, and complete project page. |
| NASA/resource use | Specific implemented NASA dataset/service plus a complete, attributed resource register. |
| AI/originality | Accurate disclosure and required watermarking if AI-generated media is present. |
| Eligibility | Team size/registration, completed fields, English content, and on-time submission. |

## 8. Decisions to confirm before implementation

1. The NASA elevation product is selected as LRO LOLA `LDEM_75S_240M` (PDS product version V2.1). Confirm supported-site coverage and frame alignment in tests before presenting visibility results.
2. Which public hosting target will serve the demo? The team has selected video as the format, but no host was specified.
3. Confirm the official challenge title from the event listing for the submission page; the challenge description and audience are now reflected above.

The team has confirmed geometric visibility as the current scope and video as the demo format. Keep power and communications performance as clearly labeled future extensions unless their models and inputs are separately implemented and validated.
