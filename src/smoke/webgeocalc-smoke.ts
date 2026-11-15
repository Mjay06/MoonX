import assert from "node:assert/strict";
import {
  buildWebGeocalcPayload,
  generateAnalyticalEphemeris,
  parseWebGeocalcResults,
  vectorToTopocentric,
} from "../lib/server/webgeocalc.ts";

const site = {
  latitudeDeg: -89.9,
  longitudeDeg: 0.0,
  altitudeKm: 2.1,
};

// 1. Test topocentric math with known body position
// Sun at ~1 AU along X in MOON_ME frame
const sunPosKm: [number, number, number] = [149597870.0, 0.0, 1000000.0];
const sunTopo = vectorToTopocentric(sunPosKm, site, 695700);

assert.ok(sunTopo.distanceKm > 149000000);
assert.ok(sunTopo.azimuthDeg >= 0 && sunTopo.azimuthDeg < 360);
assert.ok(sunTopo.elevationDeg > -5 && sunTopo.elevationDeg < 5);
assert.ok(Math.abs(sunTopo.apparentDiameterDeg - 0.533) < 0.05);

// 2. Test payload generator
const now = new Date("2026-11-15T00:00:00Z");
const payload = buildWebGeocalcPayload("SUN", now, 48);

assert.equal(payload.calculationType, "STATE_VECTOR");
assert.equal(payload.target, "SUN");
assert.equal(payload.observer, "MOON");
assert.equal(payload.referenceFrame, "MOON_ME");
assert.equal(payload.kernels[0].id, 1);
assert.equal(payload.times.length, 97); // 48 hours * 2 + 1
assert.equal(payload.times[0], "2026-11-15T00:00:00.000");

// 3. Test mock WebGeocalc results parser
const mockResults = {
  status: "OK",
  calculationId: "mock-wgc-uuid-1234",
  columns: [
    { name: "UTC calendar date", type: "TIME", units: "UTC" },
    { name: "X", type: "DOUBLE", units: "km" },
    { name: "Y", type: "DOUBLE", units: "km" },
    { name: "Z", type: "DOUBLE", units: "km" },
  ],
  rows: [
    ["2026-11-15T00:00:00.000", 149597870.0, 0.0, 500000.0],
    ["2026-11-15T00:30:00.000", 149590000.0, 100000.0, 500000.0],
  ],
};

const parsed = parseWebGeocalcResults(mockResults, "SUN", site);
assert.equal(parsed.observations.length, 2);
assert.equal(parsed.coordinateFrameVerified, true);
assert.equal(parsed.source, "live-spice");
assert.equal(parsed.observations[0].timestampUtc, "2026-11-15T00:00:00.000Z");
assert.ok(parsed.observations[0].azimuthDeg >= 0 && parsed.observations[0].azimuthDeg < 360);

// 4. Test error handling on missing columns
assert.throws(
  () =>
    parseWebGeocalcResults(
      {
        status: "OK",
        columns: [{ name: "Time", type: "TIME" }],
        rows: [],
      },
      "SUN",
      site
    ),
  /missing required components/
);

// 5. Test analytical fallback ephemeris
const fallback = generateAnalyticalEphemeris("EARTH", site, now, 48);
assert.equal(fallback.observations.length, 97);
assert.equal(fallback.coordinateFrameVerified, true);
assert.equal(fallback.source, "analytical-fallback");
assert.ok(fallback.observations[0].elevationDeg > 0);
assert.ok(fallback.observations[0].distanceKm > 300000);

console.log("WebGeocalc client smoke tests passed cleanly.");
