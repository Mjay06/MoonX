# Lunar Landing Site Navigator

A Next.js App Router mission HUD for comparing lunar south-pole sites. The telemetry engine requests ephemeris from JPL Horizons and terrain from the NASA LOLA DEM.

The calculation pipeline derives a 360° terrain-horizon profile from the NASA PDS LOLA `LDEM_75S_240M` topographic grid and requests 30-minute Sun and Earth observer ephemerides from JPL Horizons. It does not substitute synthetic ephemerides or a flat terrain horizon when required upstream data is unavailable. The Horizons site-coordinate datum has not been independently verified against the LOLA planetocentric ME/PA of DE421 grid, so visibility classifications remain provisional.

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

The development server runs at `http://localhost:3000`. `npm run check` runs linting, type-checking, and the smoke tests. The Horizons response parser smoke test can be run with `node src/smoke/horizons-smoke.ts`.

Cesium's runtime assets are copied from `node_modules` into the ignored `public/cesium/` directory automatically before development, build, and start commands. The current viewport is still a synthetic Canvas illustration; it does not yet render Cesium terrain or the LOLA DEM.

Server-side source settings are in `.env.example`. To create the local file, run `Copy-Item .env.example .env.local` in PowerShell; `.env.local` is ignored by Git. JPL Horizons and the selected NASA PDS files are public endpoints, so no API key is configured. The local LOLA cache directory is ignored by Git.
