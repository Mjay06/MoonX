import assert from "node:assert/strict";
import {
  LOLA_DEM,
  readLolaHeightKm,
  projectLolaCoordinate,
  validateLolaLabel,
} from "../lib/server/lola-dem.ts";
import {
  calculateLolaHorizonProfile,
  getHorizonElevationAt,
  InsufficientDemCoverageError,
} from "../lib/server/lola-horizon.ts";

const pole = projectLolaCoordinate(-90, 123);
assert.equal(pole.line, LOLA_DEM.lineProjectionOffset);
assert.equal(pole.sample, LOLA_DEM.sampleProjectionOffset);

const primeMeridianEdge = projectLolaCoordinate(-75, 0);
const oppositeMeridianEdge = projectLolaCoordinate(-75, 180);
const eastEdge = projectLolaCoordinate(-75, 90);
assert.ok(primeMeridianEdge.line < 10);
assert.ok(oppositeMeridianEdge.line > LOLA_DEM.lines - 10);
assert.ok(eastEdge.sample > LOLA_DEM.samples - 10);

assert.throws(
  () => projectLolaCoordinate(-74.9, 0),
  /75°S–90°S/
);
assert.throws(() => projectLolaCoordinate(Number.NaN, 0), /finite/);

const expectedBytes =
  LOLA_DEM.lines * LOLA_DEM.samples * LOLA_DEM.bytesPerSample;
const image = new Uint8Array(expectedBytes);
const centerOffset =
  ((1906 - 1) * LOLA_DEM.samples + (1906 - 1)) * LOLA_DEM.bytesPerSample;
new DataView(image.buffer).setFloat32(centerOffset, 2.5, true);
assert.equal(readLolaHeightKm(image, pole.line, pole.sample), 2.5);
assert.equal(readLolaHeightKm(image, 0, 1), null);
assert.throws(
  () => readLolaHeightKm(new Uint8Array(), 1, 1),
  /must be/
);

new DataView(image.buffer).setFloat32(centerOffset, 0, true);
const terrain = calculateLolaHorizonProfile(image, -89.9, 0);
assert.equal(terrain.horizonProfile.length, 360);
assert.ok(terrain.horizonProfile.every((point) => point.elevationDeg < 0));
assert.ok(
  Math.abs(
    getHorizonElevationAt(terrain.horizonProfile, 359.5) -
      (terrain.horizonProfile[359].elevationDeg +
        terrain.horizonProfile[0].elevationDeg) /
        2
  ) < 0.001
);
assert.throws(
  () => calculateLolaHorizonProfile(image, -75, 0),
  InsufficientDemCoverageError
);

const ridgeSiteLatitudeRad = (-85 * Math.PI) / 180;
const ridgeDistanceRad = 10 / LOLA_DEM.referenceRadiusKm;
const ridgeTargetLatitudeRad = Math.asin(
  Math.sin(ridgeSiteLatitudeRad) * Math.cos(ridgeDistanceRad)
);
const ridgeTargetLongitudeDeg =
  (Math.atan2(
    Math.sin(ridgeDistanceRad) * Math.cos(ridgeSiteLatitudeRad),
    Math.cos(ridgeDistanceRad) -
      Math.sin(ridgeSiteLatitudeRad) *
        Math.sin(ridgeTargetLatitudeRad)
  ) *
    180) /
  Math.PI;
const ridgePixel = projectLolaCoordinate(
  (ridgeTargetLatitudeRad * 180) / Math.PI,
  ridgeTargetLongitudeDeg
);
const ridgeOffset =
  ((Math.round(ridgePixel.line) - 1) * LOLA_DEM.samples +
    Math.round(ridgePixel.sample) -
    1) *
  LOLA_DEM.bytesPerSample;
new DataView(image.buffer).setFloat32(ridgeOffset, 2, true);
const ridgeProfile = calculateLolaHorizonProfile(image, -85, 0).horizonProfile;
assert.ok(ridgeProfile[90].elevationDeg > 5);
assert.ok(ridgeProfile[270].elevationDeg < 0);

const label = `
PRODUCT_ID = "LDEM_75S_240M"
PRODUCT_VERSION_ID = "V2.1"
DATA_SET_ID = "LRO-L-LOLA-4-GDR-V1.0"
FILE_RECORDS = 3812
RECORD_BYTES = 15248
LINES = 3812
LINE_SAMPLES = 3812
SAMPLE_TYPE = PC_REAL
SAMPLE_BITS = 32
UNIT = KILOMETER
OFFSET = 1737.4
MAP_PROJECTION_TYPE = "POLAR STEREOGRAPHIC"
MAP_SCALE = 240 <m/pix>
KEYWORD_LATITUDE_TYPE = "PLANETOCENTRIC"
CENTER_LATITUDE = -90 <deg>
CENTER_LONGITUDE = 0 <deg>
POSITIVE_LONGITUDE_DIRECTION = "EAST"
COORDINATE_SYSTEM_NAME = "MEAN EARTH/POLAR AXIS OF DE421"
`;
assert.doesNotThrow(() => validateLolaLabel(label));
assert.throws(() => validateLolaLabel(label.replace("240 <m/pix>", "480 <m/pix>")));

console.log("LOLA projection smoke tests passed.");
