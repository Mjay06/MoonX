import type {
  CelestialBodyTelemetry,
  HorizonSamplePoint,
  LunarLocation,
  VisibilityAnalysisResult,
  VisibilitySample,
  VisibilityStatus,
} from "@/types/mission";
import { loadLolaImage } from "./lola-dem.ts";
import {
  calculateLolaHorizonProfile,
  getHorizonElevationAt,
} from "./lola-horizon.ts";
import { fetchHorizonsEphemeris } from "./horizons.ts";

const SUN_TARGET = "10";
const EARTH_TARGET = "399";

function normalizeLongitude(longitudeDeg: number): number {
  return ((longitudeDeg % 360) + 360) % 360;
}

function determineVisibility(
  marginDeg: number,
  apparentDiameterDeg: number
): VisibilityStatus {
  const apparentRadiusDeg = apparentDiameterDeg / 2;
  if (marginDeg > apparentRadiusDeg) {
    return "CLEAR";
  }
  if (marginDeg < -apparentRadiusDeg) {
    return "BLOCKED";
  }
  return "GRAZING";
}

function toBodyTelemetry(
  name: "Sun" | "Earth",
  observation: {
    azimuthDeg: number;
    elevationDeg: number;
    distanceKm: number;
    apparentDiameterDeg: number;
  },
  horizonProfile: HorizonSamplePoint[]
): CelestialBodyTelemetry {
  const horizonMaskDeg = getHorizonElevationAt(
    horizonProfile,
    observation.azimuthDeg
  );
  const marginDeg = observation.elevationDeg - horizonMaskDeg;

  return {
    name,
    azimuthDeg: Number(observation.azimuthDeg.toFixed(3)),
    elevationDeg: Number(observation.elevationDeg.toFixed(3)),
    distanceKm: Number(observation.distanceKm.toFixed(3)),
    apparentDiameterDeg: Number(observation.apparentDiameterDeg.toFixed(4)),
    horizonMaskDeg: Number(horizonMaskDeg.toFixed(3)),
    visibility: determineVisibility(
      marginDeg,
      observation.apparentDiameterDeg
    ),
    marginDeg: Number(marginDeg.toFixed(3)),
  };
}

export async function calculateGeometricVisibility(
  location: Pick<LunarLocation, "id" | "name" | "latitude" | "longitude">,
  startUtc: Date,
  durationHours: number
): Promise<VisibilityAnalysisResult> {
  const image = await loadLolaImage();
  const longitudeDeg = normalizeLongitude(location.longitude);
  if (!image) {
    throw new Error(
      "NASA LOLA terrain data is unavailable; visibility cannot be calculated without it."
    );
  }
  const terrain = calculateLolaHorizonProfile(
    image,
    location.latitude,
    longitudeDeg
  );
  const warnings: string[] = [
    "Horizons GEODETIC site coordinates and altitude datum have not been independently validated against the LOLA planetocentric ME/PA of DE421 grid; visibility classifications are provisional.",
  ];

  const site = {
    latitudeDeg: location.latitude,
    longitudeDeg,
    altitudeKm: terrain.siteElevationKm,
  };
  const [sunEphemeris, earthEphemeris] = await Promise.all([
    fetchHorizonsEphemeris(SUN_TARGET, site, startUtc, durationHours),
    fetchHorizonsEphemeris(EARTH_TARGET, site, startUtc, durationHours),
  ]);
  if (
    sunEphemeris.observations.length !== earthEphemeris.observations.length
  ) {
    throw new Error("JPL Horizons returned different sample counts for Sun and Earth.");
  }

  const coordinateFrameVerified =
    sunEphemeris.coordinateFrameVerified &&
    earthEphemeris.coordinateFrameVerified;
  if (!coordinateFrameVerified) {
    warnings.push(
      "JPL Horizons did not return frame metadata matching the LOLA ME/PA of DE421 grid."
    );
  }

  const samples: VisibilitySample[] = sunEphemeris.observations.map(
    (sunObservation, index) => {
      const earthObservation = earthEphemeris.observations[index];
      if (sunObservation.timestampUtc !== earthObservation.timestampUtc) {
        throw new Error("JPL Horizons returned misaligned Sun and Earth timestamps.");
      }

      const sun = toBodyTelemetry("Sun", sunObservation, terrain.horizonProfile);
      const earth = toBodyTelemetry(
        "Earth",
        earthObservation,
        terrain.horizonProfile
      );
      return {
        locationId: location.id,
        locationName: location.name,
        timestampUtc: sunObservation.timestampUtc,
        sun,
        earth,
        bothVisible:
          sun.visibility === "CLEAR" && earth.visibility === "CLEAR",
        coordinateSystem: coordinateFrameVerified
          ? "JPL Horizons MEAN EARTH/DE421 frame; site datum alignment provisional"
          : "JPL Horizons frame unverified",
        isIllustrative: false,
        ephemerisSource: "live-horizons",
      };
    }
  );

  return {
    samples,
    horizonProfile: terrain.horizonProfile,
    siteElevationKm: terrain.siteElevationKm,
    coordinateFrameVerified,
    warnings,
    provenance: {
      terrainProduct: "NASA LRO LOLA LDEM_75S_240M",
      terrainProductVersion: "V2.1",
      ephemeris: "JPL Horizons observer ephemerides (Sun 10, Earth 399)",
      timeScale: "JPL Horizons Earth UT represented as UTC ISO timestamps; not lunar local time",
      terrainSamplingMeters: 240,
      horizonAzimuthStepDeg: 1,
    },
  };
}
