import { cp, mkdir } from "node:fs/promises";
import { dirname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const cesiumBuild = join(projectRoot, "node_modules", "cesium", "Build", "Cesium");
const publicCesium = join(projectRoot, "public", "cesium");
const runtimeDirectories = ["Assets", "ThirdParty", "Widgets", "Workers"];

await mkdir(publicCesium, { recursive: true });

for (const directory of runtimeDirectories) {
  await cp(
    join(cesiumBuild, directory),
    join(publicCesium, directory),
    { recursive: true, force: true }
  );
}

console.log(`Copied Cesium runtime assets to ${publicCesium}`);
