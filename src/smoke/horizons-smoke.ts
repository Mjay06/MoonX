import assert from "node:assert/strict";
import { parseHorizonsResponse } from "../lib/server/horizons.ts";

const response = `
Target body name: Sun (10)
Center body name: Moon (301)
Center pole/equ : MEAN EARTH/DE421
Center radii    : 1737.4, 1737.4, 1737.4 km
$$SOE
 2026-Nov-15 00:00  123.000  4.500  149597870.0  0.1
 2026-Nov-15 01:00  123.500  4.750  149597870.0  0.1
$$EOE
`;

const sun = parseHorizonsResponse("10", response);
assert.equal(sun.observations.length, 2);
assert.equal(sun.observations[0].timestampUtc, "2026-11-15T00:00:00Z");
assert.equal(sun.observations[0].azimuthDeg, 123);
assert.equal(sun.observations[0].elevationDeg, 4.5);
assert.ok(Math.abs(sun.observations[0].apparentDiameterDeg - 0.533) < 0.01);
assert.equal(sun.coordinateFrameVerified, true);

// Test real NASA JPL Horizons output line with solar presence flag (*)
const realNasaLine = response.replace(
  " 2026-Nov-15 00:00  123.000  4.500  149597870.0  0.1",
  " 2026-Nov-15 00:00 * 114.433749 1.514991 1.4781418163E+08 0.3960979"
);
const realSun = parseHorizonsResponse("10", realNasaLine);
assert.equal(realSun.observations[0].azimuthDeg, 114.433749);
assert.equal(realSun.observations[0].elevationDeg, 1.514991);
assert.equal(realSun.observations[0].distanceKm, 147814181.63);

const earth = parseHorizonsResponse(
  "399",
  response
    .replace("Sun (10)", "Earth (399)")
    .replace(/149597870\.0/g, "384400.0")
);
assert.ok(Math.abs(earth.observations[0].apparentDiameterDeg - 1.9) < 0.1);

const unverifiedFrame = parseHorizonsResponse(
  "10",
  response.replace("MEAN EARTH/DE421", "IAU_MOON")
);
assert.equal(unverifiedFrame.coordinateFrameVerified, false);

assert.throws(
  () => parseHorizonsResponse("10", response.replace("$$EOE", "")),
  /complete ephemeris table/
);
assert.throws(
  () => parseHorizonsResponse("10", response.replace("123.000", "invalid")),
  /invalid observer values/
);

console.log("Horizons parser smoke tests passed.");
