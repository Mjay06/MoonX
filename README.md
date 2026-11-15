# Lunar Landing Site Navigator

A Next.js App Router mission HUD for comparing lunar south-pole sites. The telemetry engine requests geometric visibility and ephemeris from NASA NAIF WebGeocalc (SPICE Kernel Set 1) and NASA LOLA DEM.

The calculation pipeline derives a 360° terrain-horizon profile from the NASA PDS LOLA `LDEM_75S_240M` topographic grid and computes 30-minute Sun and Earth topocentric positions in the `MOON_ME` (Moon Mean Earth / Polar Axis) coordinate frame using NASA NAIF WebGeocalc SPICE with an automated analytical fallback.

## Requirements

- Node.js 20.9 or later
- npm

## Commands

```bash
npm run dev
npm run lint
npm run typecheck
npm run check
npm run build
npm start
```

The development server runs at `http://localhost:3000`. `npm run check` runs linting, type-checking, and the smoke tests. The WebGeocalc client smoke test can be run with `node src/smoke/webgeocalc-smoke.ts`.

Cesium's runtime assets are copied from `node_modules` into the ignored `public/cesium/` directory automatically before development, build, and start commands. The current viewport is still a synthetic Canvas illustration; it does not yet render Cesium terrain or the LOLA DEM.

Server-side source settings are in `.env.example`. To create the local file, run `Copy-Item .env.example .env.local` in PowerShell; `.env.local` is ignored by Git. NASA NAIF WebGeocalc and the selected NASA PDS files are public endpoints, so no API key is configured. The local LOLA cache directory is ignored by Git.
