import { resolve } from "node:path";

const DEFAULTS = {
  webgeocalcUrl: "https://wgc2.jpl.nasa.gov:8443/webgeocalc/api",
  webgeocalcTimeoutMs: 20_000,
  horizonsUrl: "https://ssd.jpl.nasa.gov/api/horizons.api",
  horizonsTimeoutMs: 20_000,
  lolaLabelUrl:
    "https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/float_img/ldem_75s_240m_float.lbl",
  lolaImageUrl:
    "https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/float_img/ldem_75s_240m_float.img",
  lolaTimeoutMs: 120_000,
  lolaCacheDir: ".cache/lunar-dem",
} as const;

export interface ServerDataConfig {
  webgeocalcUrl: URL;
  webgeocalcTimeoutMs: number;
  horizonsUrl: URL;
  horizonsTimeoutMs: number;
  lolaLabelUrl: URL;
  lolaImageUrl: URL;
  lolaTimeoutMs: number;
  lolaCacheDir: string;
}

function readHttpsUrl(name: string, fallback: string): URL {
  const value = process.env[name] ?? fallback;
  let url: URL;

  try {
    url = new URL(value);
  } catch {
    throw new Error(`${name} must be a valid HTTPS URL.`);
  }

  if (url.protocol !== "https:" || url.username || url.password) {
    throw new Error(`${name} must be an HTTPS URL without embedded credentials.`);
  }

  return url;
}

function readTimeout(name: string, fallback: number): number {
  const rawValue = process.env[name];
  if (rawValue === undefined) {
    return fallback;
  }

  const value = Number(rawValue);
  if (!Number.isSafeInteger(value) || value < 500 || value > 120_000) {
    throw new Error(`${name} must be an integer between 500 and 120000.`);
  }

  return value;
}

function readCacheDir(): string {
  const value = process.env.NASA_LOLA_CACHE_DIR ?? DEFAULTS.lolaCacheDir;
  if (value.trim() === "") {
    throw new Error("NASA_LOLA_CACHE_DIR must not be empty.");
  }

  return resolve(process.cwd(), value);
}

export function getServerDataConfig(): ServerDataConfig {
  return {
    webgeocalcUrl: readHttpsUrl(
      "NASA_WEBGEOCALC_API_URL",
      DEFAULTS.webgeocalcUrl
    ),
    webgeocalcTimeoutMs: readTimeout(
      "NASA_WEBGEOCALC_TIMEOUT_MS",
      DEFAULTS.webgeocalcTimeoutMs
    ),
    horizonsUrl: readHttpsUrl("JPL_HORIZONS_API_URL", DEFAULTS.horizonsUrl),
    horizonsTimeoutMs: readTimeout(
      "JPL_HORIZONS_TIMEOUT_MS",
      DEFAULTS.horizonsTimeoutMs
    ),
    lolaLabelUrl: readHttpsUrl("NASA_LOLA_LABEL_URL", DEFAULTS.lolaLabelUrl),
    lolaImageUrl: readHttpsUrl("NASA_LOLA_IMAGE_URL", DEFAULTS.lolaImageUrl),
    lolaTimeoutMs: readTimeout("NASA_LOLA_TIMEOUT_MS", DEFAULTS.lolaTimeoutMs),
    lolaCacheDir: readCacheDir(),
  };
}
