import type { LunarLocation, SiteTelemetry, HorizonSamplePoint, VisibilityStatus } from "../types/mission.ts";

// Deterministic generator for sample horizon profiles based on site coordinates
export function getSampleHorizonProfile(location: LunarLocation): HorizonSamplePoint[] {
  const points: HorizonSamplePoint[] = [];
  const baseLat = Math.abs(location.latitude);
  const baseLon = location.longitude;

  // Generate 72 sample points around 360° horizon (every 5 degrees)
  for (let az = 0; az < 360; az += 5) {
    const rad = (az * Math.PI) / 180;
    const lonRad = (baseLon * Math.PI) / 180;

    // Harmonic terrain elevation variation simulating crater rims and mountain ridges
    const wave1 = Math.sin(rad * 3 + lonRad) * 1.8;
    const wave2 = Math.cos(rad * 7 - lonRad * 0.5) * 0.9;
    const wave3 = Math.sin(rad * 13) * 0.4;
    
    // Sites closer to pole have narrower terrain variation
    const poleFactor = Math.max(0.2, (90 - baseLat) * 0.35);
    const elev = Number(Math.max(-0.5, (wave1 + wave2 + wave3) * poleFactor + 0.6).toFixed(2));

    points.push({
      azimuthDeg: az,
      elevationDeg: elev,
    });
  }

  return points;
}

// Deterministic topocentric Sun & Earth telemetry based on site and mission elapsed hours
export function calculateSampleTelemetry(
  location: LunarLocation,
  baseTimeUtc: string,
  timeOffsetHours: number
): SiteTelemetry {
  const baseDate = new Date(baseTimeUtc);
  const currentDate = new Date(baseDate.getTime() + timeOffsetHours * 3600 * 1000);
  const timestampUtc = currentDate.toISOString().replace(".000", "");

  const horizonProfile = getSampleHorizonProfile(location);

  // In the lunar south polar region:
  // Sun completes a 360° apparent circuit around the horizon every ~29.53 days (synodic period, ~708.7 hours)
  // Angular rate ~ 0.508 degrees per hour.
  const sunAzimuthInitial = (location.longitude + 180) % 360;
  const sunAzimuthDeg = Number(((sunAzimuthInitial + timeOffsetHours * 0.508) % 360).toFixed(2));

  // Sun elevation oscillates around the horizon between approximately -1.5° and +1.5°
  // depending on the 1.54° lunar obliquity to the ecliptic.
  const obliquityWave = Math.sin(((timeOffsetHours + location.longitude * 2) * Math.PI) / 354);
  const sunElevationDeg = Number((obliquityWave * 1.45 + (Math.abs(location.latitude) - 89.0) * 0.2).toFixed(2));

  // Earth oscillates in a small libration ellipse around an average elevation of ~4° to ~8°
  // with an azimuth roughly pointing toward the 0° meridian (Prime / Earth-facing).
  const librationT = (timeOffsetHours * Math.PI) / 160;
  const earthAzimuthDeg = Number(((location.longitude * 0.15 + 40 + Math.sin(librationT) * 4.2) % 360).toFixed(2));
  const earthElevationDeg = Number((5.2 + Math.cos(librationT) * 2.1 + (location.elevationMeters / 1000) * 0.15).toFixed(2));

  // Interpolate local horizon mask at Sun and Earth azimuths
  const getHorizonMaskAt = (azimuth: number): number => {
    const idx = Math.floor((azimuth % 360) / 5);
    const p1 = horizonProfile[idx % horizonProfile.length];
    const p2 = horizonProfile[(idx + 1) % horizonProfile.length];
    const fraction = ((azimuth % 360) % 5) / 5.0;
    return Number((p1.elevationDeg + (p2.elevationDeg - p1.elevationDeg) * fraction).toFixed(2));
  };

  const sunHorizonMask = getHorizonMaskAt(sunAzimuthDeg);
  const earthHorizonMask = getHorizonMaskAt(earthAzimuthDeg);

  const determineStatus = (elevation: number, horizonMask: number): VisibilityStatus => {
    const margin = elevation - horizonMask;
    if (margin > 0.25) return "CLEAR";
    if (margin < -0.25) return "BLOCKED";
    return "GRAZING";
  };

  const sunVisibility = determineStatus(sunElevationDeg, sunHorizonMask);
  const earthVisibility = determineStatus(earthElevationDeg, earthHorizonMask);

  return {
    locationId: location.id,
    locationName: location.name,
    timestampUtc,
    sun: {
      name: "Sun",
      azimuthDeg: sunAzimuthDeg,
      elevationDeg: sunElevationDeg,
      distanceKm: 149597870,
      apparentDiameterDeg: 0.53,
      horizonMaskDeg: sunHorizonMask,
      visibility: sunVisibility,
      marginDeg: Number((sunElevationDeg - sunHorizonMask).toFixed(2)),
    },
    earth: {
      name: "Earth",
      azimuthDeg: earthAzimuthDeg,
      elevationDeg: earthElevationDeg,
      distanceKm: 384400,
      apparentDiameterDeg: 1.9,
      horizonMaskDeg: earthHorizonMask,
      visibility: earthVisibility,
      marginDeg: Number((earthElevationDeg - earthHorizonMask).toFixed(2)),
    },
    bothVisible: sunVisibility === "CLEAR" && earthVisibility === "CLEAR",
    horizonProfile,
    coordinateSystem: "IAU/IAG Moon Mean Earth / Polar Axis (ME)",
    isIllustrative: true,
  };
}
