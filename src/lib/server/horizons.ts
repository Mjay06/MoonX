import { getServerDataConfig } from "./config.ts";

const MONTHS = [
  "Jan",
  "Feb",
  "Mar",
  "Apr",
  "May",
  "Jun",
  "Jul",
  "Aug",
  "Sep",
  "Oct",
  "Nov",
  "Dec",
] as const;
const DEG_TO_RAD = Math.PI / 180;
const SUN_RADIUS_KM = 695_700;
const EARTH_RADIUS_KM = 6_378.1366;
const REFERENCE_MOON_RADIUS_KM = 1_737.4;

export type HorizonsTarget = "10" | "399";

export interface HorizonsSite {
  latitudeDeg: number;
  longitudeDeg: number;
  altitudeKm: number;
}

export interface HorizonsObservation {
  timestampUtc: string;
  azimuthDeg: number;
  elevationDeg: number;
  distanceKm: number;
  apparentDiameterDeg: number;
}

export interface HorizonsEphemeris {
  target: HorizonsTarget;
  observations: HorizonsObservation[];
  centerPoleAndEquator: string | null;
  centerRadiiKm: [number, number, number] | null;
  coordinateFrameVerified: boolean;
}

interface HorizonsApiResponse {
  error?: string;
  result?: string;
}

function formatHorizonsDate(date: Date): string {
  const month = MONTHS[date.getUTCMonth()];
  const day = String(date.getUTCDate()).padStart(2, "0");
  const year = date.getUTCFullYear();
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute}`;
}

function parseUtcTimestamp(dateText: string, timeText: string): string {
  const dateMatch = /^(\d{4})-([A-Za-z]{3})-(\d{2})$/.exec(dateText);
  const timeMatch = /^(\d{2}):(\d{2})(?::(\d{2})(?:\.\d+)?)?$/.exec(timeText);
  if (!dateMatch || !timeMatch) {
    throw new Error(`JPL Horizons returned an unrecognized timestamp: ${dateText} ${timeText}.`);
  }

  const month = MONTHS.findIndex(
    (value) => value.toLowerCase() === dateMatch[2].toLowerCase()
  );
  if (month < 0) {
    throw new Error(`JPL Horizons returned an unrecognized month: ${dateMatch[2]}.`);
  }

  const timestamp = Date.UTC(
    Number(dateMatch[1]),
    month,
    Number(dateMatch[3]),
    Number(timeMatch[1]),
    Number(timeMatch[2]),
    Number(timeMatch[3] ?? 0)
  );
  return new Date(timestamp).toISOString().replace(".000Z", "Z");
}

function parseCenterRadii(header: string): [number, number, number] | null {
  const match = /Center radii\s*:\s*([\d.+-]+),\s*([\d.+-]+),\s*([\d.+-]+)/i.exec(
    header
  );
  if (!match) {
    return null;
  }

  const radii = [Number(match[1]), Number(match[2]), Number(match[3])] as const;
  if (!radii.every(Number.isFinite)) {
    return null;
  }
  return [radii[0], radii[1], radii[2]];
}

function parseCenterPoleAndEquator(header: string): string | null {
  const match = /Center pole\/equ\s*:\s*([^\r\n]+)/i.exec(header);
  return match?.[1].trim() ?? null;
}

export function parseHorizonsResponse(
  target: HorizonsTarget,
  result: string
): HorizonsEphemeris {
  const startMarker = result.indexOf("$$SOE");
  const endMarker = result.indexOf("$$EOE");
  if (startMarker < 0 || endMarker < startMarker) {
    throw new Error("JPL Horizons response did not contain a complete ephemeris table.");
  }

  const header = result.slice(0, startMarker);
  const table = result.slice(startMarker + "$$SOE".length, endMarker);
  const targetRadiusKm = target === "10" ? SUN_RADIUS_KM : EARTH_RADIUS_KM;
  const observations: HorizonsObservation[] = [];

  for (const line of table.split(/\r?\n/)) {
    if (!line.trim()) {
      continue;
    }

    const columns = line.trim().split(/\s+/);
    if (columns.length < 5) {
      throw new Error(`JPL Horizons returned a malformed ephemeris row: ${line.trim()}`);
    }
    const timestampUtc = parseUtcTimestamp(columns[0], columns[1]);
    const [azimuthDeg, elevationDeg, distanceKm] = columns
      .slice(2, 5)
      .map(Number);
    if (
      ![azimuthDeg, elevationDeg, distanceKm].every(Number.isFinite) ||
      distanceKm <= 0 ||
      azimuthDeg < 0 ||
      azimuthDeg >= 360 ||
      elevationDeg < -90 ||
      elevationDeg > 90
    ) {
      throw new Error(`JPL Horizons returned invalid observer values: ${line.trim()}`);
    }

    observations.push({
      timestampUtc,
      azimuthDeg,
      elevationDeg,
      distanceKm,
      apparentDiameterDeg:
        (2 * Math.asin(Math.min(1, targetRadiusKm / distanceKm))) / DEG_TO_RAD,
    });
  }

  if (observations.length === 0) {
    throw new Error("JPL Horizons returned no observer samples.");
  }

  const centerPoleAndEquator = parseCenterPoleAndEquator(header);
  const centerRadiiKm = parseCenterRadii(header);
  const coordinateFrameVerified =
    centerPoleAndEquator !== null &&
    /MEAN EARTH|MOON_ME/i.test(centerPoleAndEquator) &&
    /DE421/i.test(centerPoleAndEquator) &&
    centerRadiiKm !== null &&
    centerRadiiKm.every(
      (radius) => Math.abs(radius - REFERENCE_MOON_RADIUS_KM) < 0.001
    );

  return {
    target,
    observations,
    centerPoleAndEquator,
    centerRadiiKm,
    coordinateFrameVerified,
  };
}

export async function fetchHorizonsEphemeris(
  target: HorizonsTarget,
  site: HorizonsSite,
  startUtc: Date,
  durationHours: number
): Promise<HorizonsEphemeris> {
  const stopUtc = new Date(startUtc.getTime() + durationHours * 60 * 60 * 1000);
  const config = getServerDataConfig();
  const url = new URL(config.horizonsUrl);
  const parameters = {
    format: "json",
    COMMAND: `'${target}'`,
    OBJ_DATA: "'NO'",
    MAKE_EPHEM: "'YES'",
    EPHEM_TYPE: "'OBSERVER'",
    CENTER: "'coord@301'",
    COORD_TYPE: "'GEODETIC'",
    SITE_COORD: `'${site.longitudeDeg},${site.latitudeDeg},${site.altitudeKm}'`,
    START_TIME: `'${formatHorizonsDate(startUtc)}'`,
    STOP_TIME: `'${formatHorizonsDate(stopUtc)}'`,
    STEP_SIZE: "'30m'",
    QUANTITIES: "'4,20'",
    ANG_FORMAT: "'DEG'",
    RANGE_UNITS: "'KM'",
    TIME_TYPE: "'UT'",
    APPARENT: "'AIRLESS'",
    ELEV_CUT: "'-90'",
  };
  url.search = new URLSearchParams(parameters).toString();

  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(config.horizonsTimeoutMs),
    headers: { Accept: "application/json" },
  });
  if (!response.ok) {
    throw new Error(`JPL Horizons request failed with HTTP ${response.status}.`);
  }

  let payload: HorizonsApiResponse;
  try {
    payload = (await response.json()) as HorizonsApiResponse;
  } catch (error) {
    throw new Error("JPL Horizons returned invalid JSON.", { cause: error });
  }
  if (payload.error) {
    throw new Error(`JPL Horizons rejected the ephemeris request: ${payload.error}`);
  }
  if (typeof payload.result !== "string") {
    throw new Error("JPL Horizons response did not include an ephemeris result.");
  }

  const ephemeris = parseHorizonsResponse(target, payload.result);
  const expectedSamples = durationHours * 2 + 1;
  if (ephemeris.observations.length !== expectedSamples) {
    throw new Error(
      `JPL Horizons returned ${ephemeris.observations.length} samples; expected ${expectedSamples}.`
    );
  }

  return ephemeris;
}
