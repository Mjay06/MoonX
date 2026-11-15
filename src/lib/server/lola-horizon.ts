import type { HorizonSamplePoint } from "@/types/mission";
import {
  LOLA_DEM,
  projectLolaCoordinate,
  readLolaHeightKm,
} from "./lola-dem.ts";

const DEG_TO_RAD = Math.PI / 180;
const RAD_TO_DEG = 180 / Math.PI;
const SEARCH_STEP_KM = LOLA_DEM.pixelScaleMeters / 1000;
const MIN_HORIZON_HEIGHT_KM = LOLA_DEM.referenceRadiusKm + LOLA_DEM.minimumHeightKm;
const MAX_HORIZON_HEIGHT_KM = LOLA_DEM.referenceRadiusKm + LOLA_DEM.maximumHeightKm;

export class InsufficientDemCoverageError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "InsufficientDemCoverageError";
  }
}

function destination(
  latitudeRad: number,
  longitudeRad: number,
  azimuthRad: number,
  angularDistanceRad: number
) {
  const sinLatitude = Math.sin(latitudeRad);
  const cosLatitude = Math.cos(latitudeRad);
  const sinDistance = Math.sin(angularDistanceRad);
  const cosDistance = Math.cos(angularDistanceRad);

  const latitude = Math.asin(
    sinLatitude * cosDistance +
      cosLatitude * sinDistance * Math.cos(azimuthRad)
  );
  const longitude =
    longitudeRad +
    Math.atan2(
      Math.sin(azimuthRad) * sinDistance * cosLatitude,
      cosDistance - sinLatitude * Math.sin(latitude)
    );

  return { latitude, longitude };
}

function localElevationDeg(
  siteLatitudeRad: number,
  siteLongitudeRad: number,
  targetLatitudeRad: number,
  targetLongitudeRad: number,
  targetRadiusKm: number,
  siteRadiusKm: number
): number {
  const siteX =
    siteRadiusKm * Math.cos(siteLatitudeRad) * Math.cos(siteLongitudeRad);
  const siteY =
    siteRadiusKm * Math.cos(siteLatitudeRad) * Math.sin(siteLongitudeRad);
  const siteZ = siteRadiusKm * Math.sin(siteLatitudeRad);
  const targetX =
    targetRadiusKm * Math.cos(targetLatitudeRad) * Math.cos(targetLongitudeRad);
  const targetY =
    targetRadiusKm * Math.cos(targetLatitudeRad) * Math.sin(targetLongitudeRad);
  const targetZ = targetRadiusKm * Math.sin(targetLatitudeRad);

  const deltaX = targetX - siteX;
  const deltaY = targetY - siteY;
  const deltaZ = targetZ - siteZ;
  const east =
    -Math.sin(siteLongitudeRad) * deltaX +
    Math.cos(siteLongitudeRad) * deltaY;
  const north =
    -Math.sin(siteLatitudeRad) * Math.cos(siteLongitudeRad) * deltaX -
    Math.sin(siteLatitudeRad) * Math.sin(siteLongitudeRad) * deltaY +
    Math.cos(siteLatitudeRad) * deltaZ;
  const up =
    Math.cos(siteLatitudeRad) * Math.cos(siteLongitudeRad) * deltaX +
    Math.cos(siteLatitudeRad) * Math.sin(siteLongitudeRad) * deltaY +
    Math.sin(siteLatitudeRad) * deltaZ;

  return Math.atan2(up, Math.hypot(east, north)) * RAD_TO_DEG;
}

export function calculateLolaHorizonProfile(
  image: Uint8Array,
  latitudeDeg: number,
  longitudeDeg: number
): { siteElevationKm: number; horizonProfile: HorizonSamplePoint[] } {
  const sitePixel = projectLolaCoordinate(latitudeDeg, longitudeDeg);
  const siteElevationKm = readLolaHeightKm(
    image,
    sitePixel.line,
    sitePixel.sample
  );
  if (siteElevationKm === null) {
    throw new InsufficientDemCoverageError(
      "The LOLA DEM has no valid height sample at the selected site."
    );
  }

  const siteLatitudeRad = latitudeDeg * DEG_TO_RAD;
  const siteLongitudeRad = longitudeDeg * DEG_TO_RAD;
  const siteRadiusKm = LOLA_DEM.referenceRadiusKm + siteElevationKm;
  const limitingRadiusKm =
    siteRadiusKm < MAX_HORIZON_HEIGHT_KM
      ? MAX_HORIZON_HEIGHT_KM
      : MIN_HORIZON_HEIGHT_KM;
  const maximumDistanceKm = Math.sqrt(
    Math.abs(limitingRadiusKm ** 2 - siteRadiusKm ** 2)
  );
  const horizonProfile: HorizonSamplePoint[] = [];

  for (let azimuthDeg = 0; azimuthDeg < 360; azimuthDeg += 1) {
    let maximumElevationDeg = -90;
    const azimuthRad = azimuthDeg * DEG_TO_RAD;
    const sampleCount = Math.ceil(maximumDistanceKm / SEARCH_STEP_KM);

    for (let step = 1; step <= sampleCount; step += 1) {
      const distanceKm = Math.min(step * SEARCH_STEP_KM, maximumDistanceKm);
      const target = destination(
        siteLatitudeRad,
        siteLongitudeRad,
        azimuthRad,
        distanceKm / LOLA_DEM.referenceRadiusKm
      );
      const targetLatitudeDeg = target.latitude * RAD_TO_DEG;
      const targetLongitudeDeg = target.longitude * RAD_TO_DEG;
      let targetPixel;
      try {
        targetPixel = projectLolaCoordinate(
          targetLatitudeDeg,
          targetLongitudeDeg
        );
      } catch (error) {
        if (!(error instanceof RangeError)) {
          throw error;
        }
        throw new InsufficientDemCoverageError(
          `LOLA DEM coverage ends before the ${azimuthDeg}° horizon is resolved.`
        );
      }

      const targetElevationKm = readLolaHeightKm(
        image,
        targetPixel.line,
        targetPixel.sample
      );
      if (targetElevationKm === null) {
        throw new InsufficientDemCoverageError(
          `LOLA DEM contains an invalid or uncovered sample along the ${azimuthDeg}° horizon.`
        );
      }

      maximumElevationDeg = Math.max(
        maximumElevationDeg,
        localElevationDeg(
          siteLatitudeRad,
          siteLongitudeRad,
          target.latitude,
          target.longitude,
          LOLA_DEM.referenceRadiusKm + targetElevationKm,
          siteRadiusKm
        )
      );
    }

    horizonProfile.push({
      azimuthDeg,
      elevationDeg: Number(maximumElevationDeg.toFixed(3)),
    });
  }

  return { siteElevationKm, horizonProfile };
}

export function getHorizonElevationAt(
  horizonProfile: HorizonSamplePoint[],
  azimuthDeg: number
): number {
  if (horizonProfile.length !== 360) {
    throw new Error("The LOLA horizon profile must contain 360 one-degree samples.");
  }
  if (!Number.isFinite(azimuthDeg)) {
    throw new RangeError("Azimuth must be finite.");
  }

  const normalizedAzimuth = ((azimuthDeg % 360) + 360) % 360;
  const lowerIndex = Math.floor(normalizedAzimuth);
  const upperIndex = (lowerIndex + 1) % 360;
  const fraction = normalizedAzimuth - lowerIndex;
  const lowerPoint = horizonProfile[lowerIndex];
  const upperPoint = horizonProfile[upperIndex];

  if (
    lowerPoint.azimuthDeg !== lowerIndex ||
    upperPoint.azimuthDeg !== upperIndex
  ) {
    throw new Error("The LOLA horizon profile must be ordered by azimuth.");
  }

  return (
    lowerPoint.elevationDeg +
    (upperPoint.elevationDeg - lowerPoint.elevationDeg) * fraction
  );
}
