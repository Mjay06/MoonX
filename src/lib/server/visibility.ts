import type {
  CelestialBodyTelemetry,
  HorizonSamplePoint,
  LunarLocation,
  VisibilityAnalysisResult,
  VisibilitySample,
  VisibilityStatus,
} from "@/types/mission";
import { getServerDataConfig } from "./config.ts";
import { loadLolaImage } from "./lola-dem.ts";
import {
  calculateLolaHorizonProfile,
  getHorizonElevationAt,
} from "./lola-horizon.ts";
import { fetchWebGeocalcEphemeris } from "./webgeocalc.ts";

const SUN_TARGET = "SUN";
const EARTH_TARGET = "EARTH";

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
  const terrain = calculateLolaHorizonProfile(
    image,
    location.latitude,
    longitudeDeg
  );
  const site = {
    latitudeDeg: location.latitude,
    longitudeDeg,
    altitudeKm: terrain.siteElevationKm,
  };
  const [sunEphemeris, earthEphemeris] = await Promise.all([
    fetchWebGeocalcEphemeris(SUN_TARGET, site, startUtc, durationHours),
    fetchWebGeocalcEphemeris(EARTH_TARGET, site, startUtc, durationHours),
  ]);
  if (
    sunEphemeris.observations.length !== earthEphemeris.observations.length
  ) {
    throw new Error("NASA WebGeocalc returned different sample counts for Sun and Earth.");
  }

  const config = getServerDataConfig();
  const warnings: string[] = [];
  const coordinateFrameVerified =
    sunEphemeris.coordinateFrameVerified &&
    earthEphemeris.coordinateFrameVerified;
  if (!coordinateFrameVerified) {
    warnings.push(
      "NASA WebGeocalc lunar observer frame and altitude datum are not verified against the LOLA ME/PA of DE421 grid; visibility classifications are provisional."
    );
  }

  const isFallback =
    sunEphemeris.source === "analytical-fallback" ||
    earthEphemeris.source === "analytical-fallback";
  if (isFallback) {
    warnings.push(
      "NASA WebGeocalc API offline / unreachable. Celestial positions are generated via topocentric analytical simulation. Not certified for flight-critical trajectory decisions without verified SPICE kernels."
    );
  }

  const samples: VisibilitySample[] = sunEphemeris.observations.map(
    (sunObservation, index) => {
      const earthObservation = earthEphemeris.observations[index];
      if (sunObservation.timestampUtc !== earthObservation.timestampUtc) {
        throw new Error("NASA WebGeocalc returned misaligned Sun and Earth timestamps.");
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
          ? "NASA NAIF SPICE MOON_ME frame; aligned with LOLA DEM grid"
          : "NASA NAIF SPICE frame unverified",
        isIllustrative: isFallback,
        ephemerisSource: isFallback ? "analytical-fallback" : "live-spice",
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
      ephemeris:
        sunEphemeris.source === "live-spice"
          ? `${config.webgeocalcUrl.origin} (NASA NAIF WebGeocalc SPICE Kernel Set 1)`
          : "NASA NAIF SPICE Topocentric Model (Analytical High-Fidelity Fallback)",
      timeScale: "NASA NAIF UTC calendar output; not lunar local time",
      terrainSamplingMeters: 240,
      horizonAzimuthStepDeg: 1,
    },
  };
}
