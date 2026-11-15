import assert from "node:assert/strict";
import { resolve } from "node:path";
import { getServerDataConfig } from "../lib/server/config.ts";

const names = [
  "NASA_WEBGEOCALC_API_URL",
  "NASA_WEBGEOCALC_TIMEOUT_MS",
  "JPL_HORIZONS_API_URL",
  "JPL_HORIZONS_TIMEOUT_MS",
  "NASA_LOLA_LABEL_URL",
  "NASA_LOLA_IMAGE_URL",
  "NASA_LOLA_TIMEOUT_MS",
  "NASA_LOLA_CACHE_DIR",
] as const;
const previous = new Map(
  names.map((name) => [name, process.env[name]] as const)
);

function restoreEnvironment() {
  for (const name of names) {
    const value = previous.get(name);
    if (value === undefined) {
      delete process.env[name];
    } else {
      process.env[name] = value;
    }
  }
}

try {
  for (const name of names) {
    delete process.env[name];
  }

  const defaults = getServerDataConfig();
  assert.equal(defaults.webgeocalcUrl.hostname, "wgc2.jpl.nasa.gov");
  assert.equal(defaults.webgeocalcTimeoutMs, 20_000);
  assert.equal(defaults.horizonsUrl.hostname, "ssd.jpl.nasa.gov");
  assert.equal(defaults.horizonsTimeoutMs, 20_000);
  assert.equal(defaults.lolaLabelUrl.hostname, "pds-geosciences.wustl.edu");
  assert.equal(defaults.lolaImageUrl.pathname.endsWith(".img"), true);
  assert.equal(defaults.lolaTimeoutMs, 120_000);
  assert.equal(
    defaults.lolaCacheDir,
    resolve(process.cwd(), ".cache/lunar-dem")
  );

  process.env.NASA_WEBGEOCALC_TIMEOUT_MS = "0";
  assert.throws(() => getServerDataConfig(), /NASA_WEBGEOCALC_TIMEOUT_MS/);
  delete process.env.NASA_WEBGEOCALC_TIMEOUT_MS;

  process.env.NASA_WEBGEOCALC_API_URL = "http://example.test";
  assert.throws(() => getServerDataConfig(), /HTTPS URL/);
  delete process.env.NASA_WEBGEOCALC_API_URL;

  process.env.JPL_HORIZONS_TIMEOUT_MS = "0";
  assert.throws(() => getServerDataConfig(), /JPL_HORIZONS_TIMEOUT_MS/);
  delete process.env.JPL_HORIZONS_TIMEOUT_MS;

  process.env.JPL_HORIZONS_API_URL = "http://example.test";
  assert.throws(() => getServerDataConfig(), /HTTPS URL/);
  delete process.env.JPL_HORIZONS_API_URL;

  process.env.NASA_LOLA_CACHE_DIR = " ";
  assert.throws(() => getServerDataConfig(), /NASA_LOLA_CACHE_DIR/);

  console.log("Server environment configuration smoke tests passed.");
} finally {
  restoreEnvironment();
}
