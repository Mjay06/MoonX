export type VisibilityStatus = "CLEAR" | "BLOCKED" | "UNKNOWN" | "GRAZING";

export interface LunarLocation {
  id: string;
  name: string;
  description: string;
  latitude: number; // Decimal degrees, [-90, +90], ME frame
  longitude: number; // Decimal degrees, [-180, +180] or [0, 360]
  elevationMeters: number; // Approximate surface elevation relative to lunar reference sphere (1737.4 km)
  isSample: true;
}

export interface CandidateScenario {
  id: string;
  label: string;
  location: LunarLocation;
  color: string;
  createdTimeUtc: string;
}

export interface HorizonSamplePoint {
  azimuthDeg: number; // 0° to 360°, North = 0°, East = 90°
  elevationDeg: number; // Local horizon elevation angle above horizontal
}

export interface CelestialBodyTelemetry {
  name: "Sun" | "Earth";
  azimuthDeg: number;
  elevationDeg: number;
  distanceKm: number;
  apparentDiameterDeg: number;
  horizonMaskDeg: number;
  visibility: VisibilityStatus;
  marginDeg: number; // elevation - horizonMask
}

export interface SiteTelemetry {
  locationId: string;
  locationName: string;
  timestampUtc: string;
  sun: CelestialBodyTelemetry;
  earth: CelestialBodyTelemetry;
  bothVisible: boolean;
  horizonProfile: HorizonSamplePoint[];
  coordinateSystem: "IAU/IAG Moon Mean Earth / Polar Axis (ME)";
  isIllustrative: true;
}
