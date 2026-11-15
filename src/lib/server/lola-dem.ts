import { randomUUID } from "node:crypto";
import { mkdir, readFile, rename, stat, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { getServerDataConfig } from "./config.ts";

export const LOLA_DEM = {
  productId: "LDEM_75S_240M",
  productVersion: "V2.1",
  lines: 3812,
  samples: 3812,
  bytesPerSample: 4,
  pixelScaleMeters: 240,
  referenceRadiusKm: 1737.4,
  minimumHeightKm: -7.765,
  maximumHeightKm: 7.025,
  centerLatitudeDeg: -90,
  centerLongitudeDeg: 0,
  lineProjectionOffset: 1905.5,
  sampleProjectionOffset: 1905.5,
} as const;

const EXPECTED_IMAGE_BYTES =
  LOLA_DEM.lines * LOLA_DEM.samples * LOLA_DEM.bytesPerSample;
const CACHE_FILE_NAME = "ldem_75s_240m_v2_1_float.img";
let imagePromise: Promise<Buffer | null> | null = null;

export interface RasterCoordinate {
  line: number;
  sample: number;
}

export function validateLolaLabel(label: string): void {
  const requiredFields = [
    /PRODUCT_ID\s*=\s*"LDEM_75S_240M"/,
    /PRODUCT_VERSION_ID\s*=\s*"V2\.1"/,
    /DATA_SET_ID\s*=\s*"LRO-L-LOLA-4-GDR-V1\.0"/,
    /FILE_RECORDS\s*=\s*3812/,
    /RECORD_BYTES\s*=\s*15248/,
    /LINES\s*=\s*3812/,
    /LINE_SAMPLES\s*=\s*3812/,
    /SAMPLE_TYPE\s*=\s*PC_REAL/,
    /SAMPLE_BITS\s*=\s*32/,
    /UNIT\s*=\s*KILOMETER/,
    /OFFSET\s*=\s*1737\.4/,
    /MAP_PROJECTION_TYPE\s*=\s*"POLAR STEREOGRAPHIC"/,
    /MAP_SCALE\s*=\s*240\s*<m\/pix>/,
    /KEYWORD_LATITUDE_TYPE\s*=\s*"PLANETOCENTRIC"/,
    /CENTER_LATITUDE\s*=\s*-90\s*<deg>/,
    /CENTER_LONGITUDE\s*=\s*0\s*<deg>/,
    /POSITIVE_LONGITUDE_DIRECTION\s*=\s*"EAST"/,
    /COORDINATE_SYSTEM_NAME\s*=\s*"MEAN EARTH\/POLAR AXIS OF DE421"/,
  ];

  if (!requiredFields.every((field) => field.test(label))) {
    throw new Error(
      `The NASA PDS label does not match the expected ${LOLA_DEM.productId} ${LOLA_DEM.productVersion} product.`
    );
  }
}

async function fetchText(url: URL, timeoutMs: number): Promise<string> {
  const response = await fetch(url, {
    cache: "no-store",
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`NASA PDS label request failed with HTTP ${response.status}.`);
  }

  return response.text();
}

async function fetchImage(url: URL, timeoutMs: number): Promise<Buffer> {
  const response = await fetch(url, {
    cache: "no-store",
    headers: { Accept: "application/octet-stream" },
    signal: AbortSignal.timeout(timeoutMs),
  });
  if (!response.ok) {
    throw new Error(`NASA PDS image request failed with HTTP ${response.status}.`);
  }

  const contentLength = response.headers.get("content-length");
  if (contentLength !== null && Number(contentLength) !== EXPECTED_IMAGE_BYTES) {
    throw new Error(
      `NASA PDS image size mismatch: expected ${EXPECTED_IMAGE_BYTES} bytes, received ${contentLength}.`
    );
  }

  if (!response.body) {
    throw new Error("NASA PDS image response did not contain a body.");
  }

  const reader = response.body.getReader();
  const chunks: Buffer[] = [];
  let totalBytes = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    totalBytes += value.byteLength;
    if (totalBytes > EXPECTED_IMAGE_BYTES) {
      await reader.cancel();
      throw new Error("NASA PDS image exceeded its expected size.");
    }
    chunks.push(Buffer.from(value));
  }

  if (totalBytes !== EXPECTED_IMAGE_BYTES) {
    throw new Error(
      `NASA PDS image size mismatch: expected ${EXPECTED_IMAGE_BYTES} bytes, received ${totalBytes}.`
    );
  }

  return Buffer.concat(chunks, totalBytes);
}

async function readOrDownloadImage(): Promise<Buffer | null> {
  const config = getServerDataConfig();
  const cachePath = join(config.lolaCacheDir, CACHE_FILE_NAME);

  try {
    const cachedStat = await stat(cachePath);
    if (cachedStat.size === EXPECTED_IMAGE_BYTES) {
      return await readFile(cachePath);
    }
  } catch (error) {
    if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) {
      // Ignore cache stat error and try downloading
    }
  }

  try {
    const label = await fetchText(config.lolaLabelUrl, Math.min(config.lolaTimeoutMs, 10_000));
    validateLolaLabel(label);
    const image = await fetchImage(config.lolaImageUrl, Math.min(config.lolaTimeoutMs, 25_000));

    try {
      await mkdir(config.lolaCacheDir, { recursive: true });
      const temporaryPath = `${cachePath}.${process.pid}.${randomUUID()}.tmp`;
      await writeFile(temporaryPath, image, { flag: "wx" });
      await rename(temporaryPath, cachePath);
    } catch {
      // Ignore cache write errors on serverless read-only environments
    }

    return image;
  } catch {
    // If DEM fetch or caching failed (e.g. serverless timeout), return null so visibility continues
    return null;
  }
}

export function loadLolaImage(): Promise<Buffer | null> {
  if (!imagePromise) {
    imagePromise = readOrDownloadImage().catch(() => null);
  }
  return imagePromise;
}

export function projectLolaCoordinate(
  latitudeDeg: number,
  longitudeDeg: number
): RasterCoordinate {
  if (
    !Number.isFinite(latitudeDeg) ||
    latitudeDeg < -90 ||
    latitudeDeg > -75 ||
    !Number.isFinite(longitudeDeg)
  ) {
    throw new RangeError("LOLA coordinates must be finite and within 75°S–90°S.");
  }

  const angularDistanceFromPoleRad =
    ((latitudeDeg - LOLA_DEM.centerLatitudeDeg) * Math.PI) / 180;
  const longitudeRad = (longitudeDeg * Math.PI) / 180;
  const radiusKm =
    2 *
    LOLA_DEM.referenceRadiusKm *
    Math.tan(angularDistanceFromPoleRad / 2);
  const xMeters = radiusKm * 1000 * Math.sin(longitudeRad);
  const yMeters = radiusKm * 1000 * Math.cos(longitudeRad);

  return {
    line:
      LOLA_DEM.lineProjectionOffset -
      yMeters / LOLA_DEM.pixelScaleMeters,
    sample:
      LOLA_DEM.sampleProjectionOffset +
      xMeters / LOLA_DEM.pixelScaleMeters,
  };
}

export function readLolaHeightKm(
  image: Uint8Array,
  line: number,
  sample: number
): number | null {
  const nearestLine = Math.round(line);
  const nearestSample = Math.round(sample);
  if (
    nearestLine < 1 ||
    nearestLine > LOLA_DEM.lines ||
    nearestSample < 1 ||
    nearestSample > LOLA_DEM.samples
  ) {
    return null;
  }

  if (image.byteLength !== EXPECTED_IMAGE_BYTES) {
    throw new Error(
      `LOLA image must be ${EXPECTED_IMAGE_BYTES} bytes; received ${image.byteLength}.`
    );
  }

  const offset =
    ((nearestLine - 1) * LOLA_DEM.samples + (nearestSample - 1)) *
    LOLA_DEM.bytesPerSample;
  const view = new DataView(
    image.buffer,
    image.byteOffset + offset,
    LOLA_DEM.bytesPerSample
  );
  const heightKm = view.getFloat32(0, true);

  if (
    !Number.isFinite(heightKm) ||
    heightKm < LOLA_DEM.minimumHeightKm ||
    heightKm > LOLA_DEM.maximumHeightKm
  ) {
    return null;
  }

  return heightKm;
}
