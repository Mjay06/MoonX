"use client";

import React, { useEffect, useRef, useState, useCallback, useMemo } from "react";
import { LunarLocation, SiteTelemetry } from "@/types/mission";
import { SAMPLE_LUNAR_SITES } from "@/data/sample-sites";
import { Button } from "@/components/ui/button";

export type MapMode = "relief" | "lola" | "contours";

interface LunarViewportProps {
  selectedLocation: LunarLocation | null;
  onSelectLocation: (loc: LunarLocation) => void;
  comparedLocations?: LunarLocation[];
  mapMode?: MapMode;
  onMapModeChange?: (mode: MapMode) => void;
  telemetry?: SiteTelemetry | null;
}

// Major lunar south pole craters with realistic dimensions and depths (in km)
const MAJOR_CRATERS = [
  { name: "Shackleton", lat: -89.9, lon: 0.0, radiusDeg: 0.35, depthKm: 4.2, psr: true },
  { name: "de Gerlache", lat: -88.5, lon: 271.7, radiusDeg: 0.55, depthKm: 3.8, psr: true },
  { name: "Sverdrup", lat: -88.5, lon: 152.0, radiusDeg: 0.6, depthKm: 3.5, psr: true },
  { name: "Shoemaker", lat: -88.1, lon: 45.0, radiusDeg: 0.85, depthKm: 4.0, psr: true },
  { name: "Faustini", lat: -87.3, lon: 77.0, radiusDeg: 0.75, depthKm: 3.7, psr: true },
  { name: "Haworth", lat: -87.4, lon: 350.0, radiusDeg: 0.7, depthKm: 3.9, psr: true },
  { name: "Slater", lat: -88.1, lon: 249.0, radiusDeg: 0.42, depthKm: 3.1, psr: true },
  { name: "Cabeus", lat: -84.9, lon: 324.5, radiusDeg: 1.5, depthKm: 4.0, psr: true },
  { name: "Nobile", lat: -85.2, lon: 53.5, radiusDeg: 1.3, depthKm: 3.2, psr: false },
  { name: "Amundsen", lat: -84.5, lon: 82.8, radiusDeg: 1.6, depthKm: 4.5, psr: false, centralPeak: true },
  { name: "Scott", lat: -82.1, lon: 48.5, radiusDeg: 1.7, depthKm: 3.6, psr: false },
  { name: "Ashbrook", lat: -81.4, lon: 247.5, radiusDeg: 2.1, depthKm: 4.1, psr: false },
  { name: "Drygalski", lat: -79.3, lon: 275.0, radiusDeg: 2.4, depthKm: 4.8, psr: false },
];

// Prominent mountain massifs & elevated highland ridges (NOT craters!)
const MOUNTAIN_MASSIFS = [
  {
    name: "Malapert Mountain (Massif)",
    peakLat: -84.9,
    peakLon: 12.9,
    elevationMeters: 5000,
    ridgeStartLat: -85.4,
    ridgeStartLon: 10.5,
    ridgeEndLat: -84.5,
    ridgeEndLon: 15.0,
  },
  {
    name: "Connecting Ridge",
    peakLat: -89.4,
    peakLon: 222.5,
    elevationMeters: 1800,
    ridgeStartLat: -89.8,
    ridgeStartLon: 280.0,
    ridgeEndLat: -89.2,
    ridgeEndLon: 195.0,
  },
  {
    name: "Leibnitz Beta Plateau",
    peakLat: -85.8,
    peakLon: 331.0,
    elevationMeters: 6000,
    ridgeStartLat: -86.5,
    ridgeStartLon: 322.0,
    ridgeEndLat: -85.2,
    ridgeEndLon: 340.0,
  },
];

export function LunarViewport({
  selectedLocation,
  onSelectLocation,
  comparedLocations = [],
  mapMode: controlledMode,
  onMapModeChange,
  telemetry,
}: LunarViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [internalMode, setInternalMode] = useState<MapMode>("relief");
  const mapMode = controlledMode ?? internalMode;
  const setMapMode = (m: MapMode) => {
    setInternalMode(m);
    onMapModeChange?.(m);
  };
  const [zoom, setZoom] = useState(1.5);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [showLabels, setShowLabels] = useState(true);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setIsReady(true), 120);
    return () => clearTimeout(timer);
  }, []);

  // Generate 56 deterministic secondary impact craters across the polar highlands
  const secondaryCraters = useMemo(() => {
    const list = [];
    for (let i = 0; i < 56; i++) {
      const lat = -89.7 + ((i * 19.37) % 9.4);
      const lon = ((i * 57.31 + 23.4) % 360);
      const radiusDeg = 0.08 + ((i * 7) % 18) * 0.018;
      const depthKm = 0.5 + ((i * 3) % 10) * 0.25;
      list.push({ lat, lon, radiusDeg, depthKm });
    }
    return list;
  }, []);

  // Polar stereographic projection: South pole is center (lat = -90).
  // Distance from pole in degrees = (lat + 90). Radius R = (dist / 10.0) * baseRadius.
  // 0° longitude points UP (towards Earth / Prime Meridian).
  const latLonToCanvas = useCallback(
    (
      lat: number,
      lon: number,
      width: number,
      height: number
    ): { x: number; y: number } => {
      const centerX = width / 2 + pan.x;
      const centerY = height / 2 + pan.y;
      const baseRadius = Math.min(width, height) * 0.44 * zoom;

      const distFromPole = Math.max(0, lat + 90);
      const r = Math.max(0, (distFromPole / 10.0) * baseRadius);

      const rad = ((lon - 90) * Math.PI) / 180;
      const x = centerX + r * Math.cos(rad);
      const y = centerY + r * Math.sin(rad);

      return { x, y };
    },
    [pan, zoom]
  );

  const canvasToLatLon = useCallback(
    (
      clientX: number,
      clientY: number,
      width: number,
      height: number
    ): { lat: number; lon: number } => {
      const centerX = width / 2 + pan.x;
      const centerY = height / 2 + pan.y;
      const baseRadius = Math.min(width, height) * 0.44 * zoom;

      const dx = clientX - centerX;
      const dy = clientY - centerY;
      const r = Math.sqrt(dx * dx + dy * dy);

      const distFromPole = (r / baseRadius) * 10.0;
      const lat = Math.max(-90, Math.min(-80, -90 + distFromPole));

      let angleDeg = (Math.atan2(dy, dx) * 180) / Math.PI + 90;
      if (angleDeg < 0) angleDeg += 360;
      if (angleDeg >= 360) angleDeg -= 360;

      return {
        lat: Number(lat.toFixed(4)),
        lon: Number(angleDeg.toFixed(4)),
      };
    },
    [pan, zoom]
  );

  // Main Canvas Rendering Engine
  useEffect(() => {
    if (!isReady) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const dpr = window.devicePixelRatio || 1;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;

    if (canvas.width !== width * dpr || canvas.height !== height * dpr) {
      canvas.width = width * dpr;
      canvas.height = height * dpr;
    }

    ctx.save();
    ctx.scale(dpr, dpr);
    ctx.clearRect(0, 0, width, height);

    const centerX = width / 2 + pan.x;
    const centerY = height / 2 + pan.y;
    const baseRadius = Math.max(10, Math.min(width, height) * 0.44 * zoom);

    // Dynamic Sun and Earth positions derived from telemetry
    const sunAzimuth = telemetry?.sun?.azimuthDeg ?? 45;
    const sunElevation = telemetry?.sun?.elevationDeg ?? 1.5;
    const isSunClear = telemetry?.sun?.visibility === "CLEAR";
    const earthAzimuth = telemetry?.earth?.azimuthDeg ?? 40;
    const earthElevation = telemetry?.earth?.elevationDeg ?? 5.2;
    const isEarthClear = telemetry?.earth?.visibility === "CLEAR";

    // Canvas angle in radians (0° azimuth is UP)
    const sunRad = ((sunAzimuth - 90) * Math.PI) / 180;
    const sunOppositeRad = sunRad + Math.PI;

    // Deep space background
    ctx.fillStyle = "#05070b";
    ctx.fillRect(0, 0, width, height);

    // Starfield in deep space beyond the limb
    for (let i = 0; i < 48; i++) {
      const sx = (i * 179.3) % width;
      const sy = (i * 293.7) % height;
      const dx = sx - centerX;
      const dy = sy - centerY;
      if (Math.sqrt(dx * dx + dy * dy) > baseRadius * 1.08) {
        const sAlpha = 0.2 + ((i % 4) * 0.15);
        ctx.fillStyle = `rgba(220, 235, 255, ${sAlpha})`;
        ctx.beginPath();
        ctx.arc(sx, sy, i % 3 === 0 ? 1.2 : 0.7, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // -------------------------------------------------------------
    // LAYER 1: BASE LUNAR SURFACE REGOLITH (CONTINUOUS CRUST)
    // -------------------------------------------------------------
    ctx.save();
    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius * 1.15, 0, Math.PI * 2);
    ctx.clip();

    if (mapMode === "lola") {
      // NASA LOLA FALSE-COLOR ELEVATION TOPOGRAPHY
      const lolaGrad = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        baseRadius * 1.15
      );
      lolaGrad.addColorStop(0, "#1e1b4b"); // Deep polar basin (-4000m)
      lolaGrad.addColorStop(0.35, "#0f766e"); // Mid plains (0m datum)
      lolaGrad.addColorStop(0.7, "#ca8a04"); // Highland ridges (+2000m)
      lolaGrad.addColorStop(0.92, "#dc2626"); // Mountain crests (+4000m)
      lolaGrad.addColorStop(1, "#1e293b"); // Outer margin
      ctx.fillStyle = lolaGrad;
      ctx.fillRect(centerX - baseRadius * 1.2, centerY - baseRadius * 1.2, baseRadius * 2.4, baseRadius * 2.4);
    } else {
      // PHOTOREALISTIC SHADED REGOLITH RELIEF (Dynamic illumination from current Sun angle)
      const surfGrad = ctx.createRadialGradient(
        centerX + Math.cos(sunRad) * baseRadius * 0.35,
        centerY + Math.sin(sunRad) * baseRadius * 0.35,
        baseRadius * 0.05,
        centerX,
        centerY,
        baseRadius * 1.15
      );
      surfGrad.addColorStop(0, "#333d4b"); // Sun-illuminated high regolith
      surfGrad.addColorStop(0.35, "#252c37"); // Highland mid-albedo
      surfGrad.addColorStop(0.7, "#1c212a"); // Low plain regolith
      surfGrad.addColorStop(0.95, "#141820"); // Deep terrain
      surfGrad.addColorStop(1, "#0a0c10"); // Limb falloff
      ctx.fillStyle = surfGrad;
      ctx.fillRect(centerX - baseRadius * 1.2, centerY - baseRadius * 1.2, baseRadius * 2.4, baseRadius * 2.4);

      // Micro-texture regolith grain
      ctx.fillStyle = "rgba(180, 200, 225, 0.035)";
      for (let rx = -baseRadius; rx <= baseRadius; rx += 28) {
        for (let ry = -baseRadius; ry <= baseRadius; ry += 28) {
          if (rx * rx + ry * ry < baseRadius * baseRadius) {
            ctx.beginPath();
            ctx.arc(centerX + rx + (Math.sin(ry) * 6), centerY + ry + (Math.cos(rx) * 6), 14, 0, Math.PI * 2);
            ctx.fill();
          }
        }
      }
    }

    // -------------------------------------------------------------
    // LAYER 2: SECONDARY CRATER FIELD (56 Impact Structures)
    // -------------------------------------------------------------
    secondaryCraters.forEach((c) => {
      const pos = latLonToCanvas(c.lat, c.lon, width, height);
      const r = Math.max(1.5, (c.radiusDeg / 10.0) * baseRadius);

      if (mapMode === "lola") {
        ctx.fillStyle = "rgba(15, 23, 42, 0.45)";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        ctx.fill();
      } else {
        // Shadowed bowl
        ctx.fillStyle = "rgba(8, 10, 14, 0.65)";
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
        ctx.fill();

        // Illuminated rim crescent dynamically facing current Sun direction
        ctx.beginPath();
        ctx.arc(pos.x, pos.y, r, sunRad - Math.PI * 0.5, sunRad + Math.PI * 0.5);
        ctx.strokeStyle = "rgba(220, 235, 255, 0.35)";
        ctx.lineWidth = 1;
        ctx.stroke();
      }
    });

    // -------------------------------------------------------------
    // LAYER 3: MAJOR LUNAR SOUTH POLE IMPACT CRATERS
    // -------------------------------------------------------------
    MAJOR_CRATERS.forEach((crater) => {
      const pos = latLonToCanvas(crater.lat, crater.lon, width, height);
      const r = Math.max(2, (crater.radiusDeg / 10.0) * baseRadius);

      // 1. Raised Outer Ejecta Blanket
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r * 1.45, 0, Math.PI * 2);
      ctx.fillStyle =
        mapMode === "lola"
          ? "rgba(217, 119, 6, 0.25)"
          : "rgba(160, 185, 215, 0.08)";
      ctx.fill();

      // 2. Terraced Crater Wall Gradient oriented to dynamic Sun
      const craterGrad = ctx.createRadialGradient(
        pos.x + Math.cos(sunOppositeRad) * r * 0.3,
        pos.y + Math.sin(sunOppositeRad) * r * 0.3,
        Math.max(0.5, r * 0.08),
        pos.x,
        pos.y,
        r
      );

      if (mapMode === "lola") {
        craterGrad.addColorStop(0, "#090d16"); // Deepest floor
        craterGrad.addColorStop(0.6, "#1e1b4b");
        craterGrad.addColorStop(0.85, "#0d9488");
        craterGrad.addColorStop(1, "#f59e0b"); // Rim crest
      } else {
        craterGrad.addColorStop(0, crater.psr ? "#020305" : "#0a0d13"); // Pitch black if PSR
        craterGrad.addColorStop(0.55, "#0b0e14");
        craterGrad.addColorStop(0.85, "#181f2a");
        craterGrad.addColorStop(1, "#364152"); // Bright rim wall
      }

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fillStyle = craterGrad;
      ctx.fill();

      // 3. Central Peak (for Amundsen)
      if (crater.centralPeak) {
        ctx.beginPath();
        ctx.arc(pos.x + Math.cos(sunRad) * r * 0.1, pos.y + Math.sin(sunRad) * r * 0.1, r * 0.22, 0, Math.PI * 2);
        ctx.fillStyle = mapMode === "lola" ? "#f59e0b" : "rgba(200, 225, 255, 0.55)";
        ctx.fill();
      }

      // 4. Sunlit Rim Crest Crescent (Dynamically oriented to current Sun angle)
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, sunRad - Math.PI * 0.55, sunRad + Math.PI * 0.55);
      ctx.strokeStyle =
        mapMode === "lola"
          ? "rgba(254, 240, 138, 0.9)"
          : "rgba(235, 245, 255, 0.75)";
      ctx.lineWidth = Math.max(1.2, r * 0.07);
      ctx.stroke();

      // 5. Shadowed Rim Wall
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, sunOppositeRad - Math.PI * 0.55, sunOppositeRad + Math.PI * 0.55);
      ctx.strokeStyle = "rgba(4, 6, 9, 0.9)";
      ctx.lineWidth = Math.max(1.2, r * 0.07);
      ctx.stroke();

      // 6. Name Tag & PSR Indicator
      if (showLabels && zoom >= 1.1) {
        ctx.fillStyle = crater.psr ? "rgba(147, 197, 253, 0.85)" : "rgba(226, 232, 240, 0.75)";
        ctx.font = "bold 9px var(--font-telemetry, monospace)";
        ctx.textAlign = "center";
        ctx.fillText(crater.name, pos.x, pos.y + r + 11);

        if (crater.psr && zoom >= 1.6) {
          ctx.fillStyle = "rgba(56, 189, 248, 0.65)";
          ctx.font = "8px var(--font-telemetry, monospace)";
          ctx.fillText("[PSR Floor]", pos.x, pos.y + r + 20);
        }
      }
    });

    // -------------------------------------------------------------
    // LAYER 4: MOUNTAIN MASSIFS & HIGHLAND RIDGES (NOT CRATERS!)
    // -------------------------------------------------------------
    MOUNTAIN_MASSIFS.forEach((massif) => {
      const pStart = latLonToCanvas(massif.ridgeStartLat, massif.ridgeStartLon, width, height);
      const pPeak = latLonToCanvas(massif.peakLat, massif.peakLon, width, height);
      const pEnd = latLonToCanvas(massif.ridgeEndLat, massif.ridgeEndLon, width, height);

      // Elevated Ridge Backbone
      ctx.beginPath();
      ctx.moveTo(pStart.x, pStart.y);
      ctx.quadraticCurveTo(pPeak.x - 8, pPeak.y - 8, pEnd.x, pEnd.y);
      ctx.strokeStyle =
        mapMode === "lola"
          ? "rgba(239, 68, 68, 0.85)"
          : "rgba(240, 248, 255, 0.8)";
      ctx.lineWidth = Math.max(3, 4 * zoom);
      ctx.lineCap = "round";
      ctx.stroke();

      // Dynamic Mountain Shadow Cast in direction of sunOppositeRad
      ctx.beginPath();
      ctx.moveTo(pPeak.x, pPeak.y);
      ctx.lineTo(
        pPeak.x + Math.cos(sunOppositeRad) * 22 * zoom,
        pPeak.y + Math.sin(sunOppositeRad) * 22 * zoom
      );
      ctx.strokeStyle = "rgba(3, 5, 8, 0.8)";
      ctx.lineWidth = Math.max(2, 3 * zoom);
      ctx.stroke();

      // Mountain Summit Peak Marker
      ctx.beginPath();
      ctx.arc(pPeak.x, pPeak.y, Math.max(3, 4 * zoom), 0, Math.PI * 2);
      ctx.fillStyle = mapMode === "lola" ? "#ffffff" : "#f8fafc";
      ctx.fill();
      ctx.strokeStyle = mapMode === "lola" ? "#ef4444" : "#38bdf8";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Mountain Massif Label
      if (showLabels && zoom >= 1.1) {
        ctx.fillStyle = mapMode === "lola" ? "#fca5a5" : "#f1f5f9";
        ctx.font = "bold 9.5px var(--font-geometric, sans-serif)";
        ctx.textAlign = "left";
        ctx.fillText(`▲ ${massif.name}`, pPeak.x + 10, pPeak.y - 2);

        ctx.fillStyle = "rgba(56, 189, 248, 0.9)";
        ctx.font = "8.5px var(--font-telemetry, monospace)";
        ctx.fillText(`+${massif.elevationMeters}m Peak`, pPeak.x + 10, pPeak.y + 10);
      }
    });

    // -------------------------------------------------------------
    // LAYER 5: TOPOGRAPHIC CONTOURS (If in Contours Mode)
    // -------------------------------------------------------------
    if (mapMode === "contours") {
      ctx.strokeStyle = "rgba(56, 189, 248, 0.28)";
      ctx.lineWidth = 1;
      for (let cRing = 1; cRing <= 9; cRing++) {
        const cRadius = (cRing / 10.0) * baseRadius;
        ctx.beginPath();
        ctx.arc(centerX, centerY, cRadius, 0, Math.PI * 2);
        ctx.stroke();
      }
    }

    ctx.restore(); // Restore clip

    // -------------------------------------------------------------
    // LAYER 6: POLAR COORDINATE GRID (Parallels & Meridians)
    // -------------------------------------------------------------
    if (showGrid) {
      ctx.strokeStyle = "rgba(56, 189, 248, 0.22)";
      ctx.lineWidth = 1;
      ctx.setLineDash([3, 4]);

      // Parallels: -89°, -88°, -86°, -84°, -82°, -80°
      const latGrid = [-89, -88, -86, -84, -82, -80];
      latGrid.forEach((gLat) => {
        const distFromPole = Math.max(0.1, gLat + 90);
        const r = Math.max(1, (distFromPole / 10.0) * baseRadius);
        ctx.beginPath();
        ctx.arc(centerX, centerY, r, 0, Math.PI * 2);
        ctx.stroke();

        ctx.fillStyle = "rgba(56, 189, 248, 0.65)";
        ctx.font = "9px var(--font-telemetry, monospace)";
        ctx.textAlign = "left";
        ctx.fillText(`${gLat}°S`, centerX + 4, centerY - r + 10);
      });

      // Meridians: every 45°
      for (let m = 0; m < 360; m += 45) {
        const rad = ((m - 90) * Math.PI) / 180;
        const outerR = baseRadius * 1.05;
        ctx.beginPath();
        ctx.moveTo(centerX, centerY);
        ctx.lineTo(
          centerX + outerR * Math.cos(rad),
          centerY + outerR * Math.sin(rad)
        );
        ctx.stroke();

        ctx.fillStyle = "rgba(56, 189, 248, 0.65)";
        ctx.font = "9px var(--font-telemetry, monospace)";
        ctx.textAlign = "center";
        ctx.fillText(
          `${m}°`,
          centerX + (outerR + 12) * Math.cos(rad),
          centerY + (outerR + 12) * Math.sin(rad) + 3
        );
      }
      ctx.setLineDash([]);
    }

    // South Pole center crosshair
    ctx.strokeStyle = "rgba(56, 189, 248, 0.75)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX - 8, centerY);
    ctx.lineTo(centerX + 8, centerY);
    ctx.moveTo(centerX, centerY - 8);
    ctx.lineTo(centerX, centerY + 8);
    ctx.stroke();

    ctx.fillStyle = "rgba(56, 189, 248, 0.9)";
    ctx.font = "10px var(--font-telemetry, monospace)";
    ctx.textAlign = "center";
    ctx.fillText("SOUTH POLE (-90°)", centerX, centerY - 12);

    // -------------------------------------------------------------
    // LAYER 7: COMPARED SCENARIO MARKERS
    // -------------------------------------------------------------
    comparedLocations.forEach((loc, idx) => {
      const pos = latLonToCanvas(loc.latitude, loc.longitude, width, height);
      ctx.fillStyle = "rgba(192, 132, 252, 0.85)";
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4.5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.95)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "rgba(233, 213, 255, 0.95)";
      ctx.font = "10px var(--font-telemetry, monospace)";
      ctx.textAlign = "center";
      ctx.fillText(`Candidate ${idx + 1}`, pos.x, pos.y - 9);
    });

    // -------------------------------------------------------------
    // LAYER 8: SELECTED LOCATION TACTICAL RETICLE & SUN/EARTH VECTORS
    // -------------------------------------------------------------
    if (selectedLocation) {
      const pos = latLonToCanvas(
        selectedLocation.latitude,
        selectedLocation.longitude,
        width,
        height
      );

      // Target reticle rings
      ctx.strokeStyle = "oklch(0.82 0.14 205)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 11, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 3.5, 0, Math.PI * 2);
      ctx.fillStyle = "oklch(0.82 0.14 205)";
      ctx.fill();

      // Tactical corner brackets
      const bLen = 6;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pos.x - 17, pos.y - 17 + bLen);
      ctx.lineTo(pos.x - 17, pos.y - 17);
      ctx.lineTo(pos.x - 17 + bLen, pos.y - 17);

      ctx.moveTo(pos.x + 17, pos.y - 17 + bLen);
      ctx.lineTo(pos.x + 17, pos.y - 17);
      ctx.lineTo(pos.x + 17 - bLen, pos.y - 17);

      ctx.moveTo(pos.x - 17, pos.y + 17 - bLen);
      ctx.lineTo(pos.x - 17, pos.y + 17);
      ctx.lineTo(pos.x - 17 + bLen, pos.y + 17);

      ctx.moveTo(pos.x + 17, pos.y + 17 - bLen);
      ctx.lineTo(pos.x + 17, pos.y + 17);
      ctx.lineTo(pos.x + 17 - bLen, pos.y + 17);
      ctx.stroke();

      // High-contrast callout box
      ctx.fillStyle = "rgba(255, 255, 255, 0.98)";
      ctx.font = "bold 11px var(--font-geometric, sans-serif)";
      ctx.textAlign = "left";
      ctx.fillText(selectedLocation.name, pos.x + 20, pos.y - 3);

      ctx.fillStyle = "rgba(148, 163, 184, 0.95)";
      ctx.font = "10px var(--font-telemetry, monospace)";
      ctx.fillText(
        `${selectedLocation.latitude.toFixed(2)}° S, ${selectedLocation.longitude.toFixed(2)}° E • ${selectedLocation.elevationMeters > 0 ? "+" : ""}${selectedLocation.elevationMeters}m`,
        pos.x + 20,
        pos.y + 12
      );

      // -------------------------------------------------------------
      // LAYER 8.5: DYNAMIC VISUAL SUN & EARTH SIGHTLINE VECTORS ON MAP
      // -------------------------------------------------------------
      // 1. SOLAR ILLUMINATION BEAM (Warm Gold Ray arriving from Sun Azimuth)
      const sunBeamLen = Math.min(width, height) * 0.32;
      const sunSourceX = pos.x + Math.cos(sunRad) * sunBeamLen;
      const sunSourceY = pos.y + Math.sin(sunRad) * sunBeamLen;

      const sunBeamGrad = ctx.createLinearGradient(sunSourceX, sunSourceY, pos.x, pos.y);
      if (isSunClear) {
        sunBeamGrad.addColorStop(0, "rgba(251, 191, 36, 0.9)");
        sunBeamGrad.addColorStop(0.65, "rgba(251, 191, 36, 0.35)");
        sunBeamGrad.addColorStop(1, "rgba(251, 191, 36, 0.0)");
      } else {
        sunBeamGrad.addColorStop(0, "rgba(244, 63, 94, 0.7)");
        sunBeamGrad.addColorStop(0.65, "rgba(244, 63, 94, 0.2)");
        sunBeamGrad.addColorStop(1, "rgba(244, 63, 94, 0.0)");
      }

      ctx.beginPath();
      ctx.moveTo(sunSourceX, sunSourceY);
      ctx.lineTo(pos.x, pos.y);
      ctx.strokeStyle = sunBeamGrad;
      ctx.lineWidth = 2.5;
      ctx.stroke();

      // Glowing Sun Fixture Icon on map perimeter
      ctx.beginPath();
      ctx.arc(sunSourceX, sunSourceY, 7, 0, Math.PI * 2);
      ctx.fillStyle = isSunClear ? "#fbbf24" : "#f43f5e";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Sun Vector Label
      ctx.fillStyle = isSunClear ? "#fef08a" : "#fecdd3";
      ctx.font = "bold 9.5px var(--font-telemetry, monospace)";
      ctx.textAlign = "center";
      ctx.fillText(
        `☀️ SUN (${sunAzimuth.toFixed(0)}°, ${sunElevation > 0 ? "+" : ""}${sunElevation.toFixed(1)}°)`,
        sunSourceX,
        sunSourceY - 11
      );
      ctx.font = "8px var(--font-telemetry, monospace)";
      ctx.fillText(
        isSunClear ? "CLEAR LOS" : "OCCULTED",
        sunSourceX,
        sunSourceY + 16
      );

      // 2. DIRECT-TO-EARTH LINK VECTOR (Cyan Laser Beam)
      const earthRad = ((earthAzimuth - 90) * Math.PI) / 180;
      const earthBeamLen = Math.min(width, height) * 0.28;
      const earthTargetX = pos.x + Math.cos(earthRad) * earthBeamLen;
      const earthTargetY = pos.y + Math.sin(earthRad) * earthBeamLen;

      const earthBeamGrad = ctx.createLinearGradient(pos.x, pos.y, earthTargetX, earthTargetY);
      if (isEarthClear) {
        earthBeamGrad.addColorStop(0, "rgba(56, 189, 248, 0.0)");
        earthBeamGrad.addColorStop(0.35, "rgba(56, 189, 248, 0.3)");
        earthBeamGrad.addColorStop(1, "rgba(56, 189, 248, 0.9)");
      } else {
        earthBeamGrad.addColorStop(0, "rgba(244, 63, 94, 0.0)");
        earthBeamGrad.addColorStop(0.35, "rgba(244, 63, 94, 0.15)");
        earthBeamGrad.addColorStop(1, "rgba(244, 63, 94, 0.7)");
      }

      ctx.beginPath();
      ctx.moveTo(pos.x, pos.y);
      ctx.lineTo(earthTargetX, earthTargetY);
      ctx.strokeStyle = earthBeamGrad;
      ctx.lineWidth = 2;
      ctx.stroke();

      // Glowing Earth Icon
      ctx.beginPath();
      ctx.arc(earthTargetX, earthTargetY, 6, 0, Math.PI * 2);
      ctx.fillStyle = isEarthClear ? "#38bdf8" : "#f43f5e";
      ctx.fill();
      ctx.strokeStyle = "#ffffff";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Earth Vector Label
      ctx.fillStyle = isEarthClear ? "#bae6fd" : "#fecdd3";
      ctx.font = "bold 9.5px var(--font-telemetry, monospace)";
      ctx.textAlign = "center";
      ctx.fillText(
        `🌍 EARTH (${earthAzimuth.toFixed(0)}°, ${earthElevation > 0 ? "+" : ""}${earthElevation.toFixed(1)}°)`,
        earthTargetX,
        earthTargetY - 10
      );
    }

    // -------------------------------------------------------------
    // LAYER 9: ORIENTATION COMPASS (Prime Meridian to Earth + Sun Needle)
    // -------------------------------------------------------------
    const compassX = width - 48;
    const compassY = 82;
    const cRadius = 22;

    ctx.save();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(compassX, compassY, cRadius, 0, Math.PI * 2);
    ctx.stroke();

    // 0° Prime Meridian Indicator (Up)
    ctx.fillStyle = "rgba(56, 189, 248, 0.85)";
    ctx.beginPath();
    ctx.moveTo(compassX, compassY - cRadius - 3);
    ctx.lineTo(compassX - 4, compassY - cRadius + 6);
    ctx.lineTo(compassX + 4, compassY - cRadius + 6);
    ctx.closePath();
    ctx.fill();

    // Sun Pointer Needle in Compass
    ctx.strokeStyle = isSunClear ? "#fbbf24" : "#f43f5e";
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(compassX, compassY);
    ctx.lineTo(compassX + Math.cos(sunRad) * (cRadius - 2), compassY + Math.sin(sunRad) * (cRadius - 2));
    ctx.stroke();

    ctx.font = "8px var(--font-telemetry, monospace)";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(56, 189, 248, 0.85)";
    ctx.fillText("0° ME", compassX, compassY - cRadius - 5);
    ctx.fillText("EARTH", compassX, compassY + cRadius + 11);

    // Sun badge in compass
    ctx.fillStyle = isSunClear ? "#fbbf24" : "#f43f5e";
    ctx.fillText("☀️", compassX + Math.cos(sunRad) * (cRadius + 10), compassY + Math.sin(sunRad) * (cRadius + 10) + 3);

    ctx.restore();

    ctx.restore();
  }, [
    isReady,
    mapMode,
    zoom,
    pan,
    showGrid,
    showLabels,
    selectedLocation,
    comparedLocations,
    secondaryCraters,
    telemetry,
    latLonToCanvas,
  ]);

  // Click handler to select site on the map
  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (isDragging) return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const clientX = e.clientX - rect.left;
    const clientY = e.clientY - rect.top;

    const coords = canvasToLatLon(
      clientX,
      clientY,
      canvas.clientWidth,
      canvas.clientHeight
    );

    // Check if clicked close to an existing sample site or crater
    const matched = SAMPLE_LUNAR_SITES.find((site) => {
      const dLat = Math.abs(site.latitude - coords.lat);
      const dLon = Math.abs(site.longitude - coords.lon);
      return dLat < 0.7 && dLon < 18.0;
    });

    if (matched) {
      onSelectLocation(matched);
    } else {
      onSelectLocation({
        id: `site-${coords.lat.toFixed(2)}-${coords.lon.toFixed(2)}`,
        name: `South Pole Site (${coords.lat.toFixed(2)}° S)`,
        description: "User-selected south polar plateau coordinate.",
        latitude: coords.lat,
        longitude: coords.lon,
        elevationMeters: 500,
        isSample: true,
      });
    }
  };

  const handleMouseDown = (e: React.MouseEvent) => {
    setIsDragging(false);
    setDragStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (e.buttons === 1) {
      setIsDragging(true);
      setPan({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      });
    }
  };

  const handleWheel = (e: React.WheelEvent<HTMLCanvasElement>) => {
    e.preventDefault();
    const factor = e.deltaY < 0 ? 1.15 : 0.88;
    setZoom((z) => Math.min(4.5, Math.max(0.6, z * factor)));
  };

  const handleResetCamera = () => {
    setZoom(1.5);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="relative h-full w-full overflow-hidden select-none">
      {/* Loading overlay */}
      {!isReady && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-3 text-xs tracking-wider text-muted-foreground uppercase font-mono">
            Mounting lunar south pole terrain surface (LOLA / LRO WAC)...
          </p>
        </div>
      )}

      {/* Interactive Lunar Map Canvas */}
      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onWheel={handleWheel}
        className="h-full w-full cursor-crosshair"
        aria-label="Interactive lunar south pole map. Click to inspect coordinates."
      />

      {/* LOLA Elevation Scale Legend (Visible in LOLA mode) */}
      {mapMode === "lola" && (
        <div className="pointer-events-none absolute right-4 top-28 z-20 hidden flex-col items-end gap-1 rounded-lg border border-border/70 bg-card/85 p-2 backdrop-blur-md sm:flex">
          <p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            LOLA Topo (m)
          </p>
          <div className="flex h-28 items-center gap-1.5 font-mono text-[9px]">
            <div className="flex h-full flex-col justify-between text-right text-muted-foreground">
              <span className="text-red-400 font-semibold">+6000m</span>
              <span className="text-amber-400">+2000m</span>
              <span className="text-teal-400">0m Datum</span>
              <span className="text-indigo-400">-2000m</span>
              <span className="text-slate-400 font-semibold">-4000m</span>
            </div>
            <div className="h-full w-2.5 rounded-full bg-gradient-to-b from-red-500 via-amber-500 via-teal-500 to-indigo-950 border border-border/40" />
          </div>
        </div>
      )}

      {/* Viewport Control Overlay (Bottom Left, placed to the right of the sidebar on desktop) */}
      <div className="pointer-events-auto absolute bottom-32 left-4 z-20 flex flex-col gap-1.5 sm:left-[25.5rem]">
        {/* Layer Mode Switcher & Camera Tools */}
        <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card/85 p-1 backdrop-blur-md shadow-xl">
          <Button
            size="sm"
            variant={mapMode === "relief" ? "accent" : "ghost"}
            onClick={() => setMapMode("relief")}
            aria-label="Photorealistic Shaded Relief Surface"
            title="Photorealistic Shaded Relief"
            className="h-7 px-2 text-[11px] font-mono"
          >
            Relief
          </Button>
          <Button
            size="sm"
            variant={mapMode === "lola" ? "accent" : "ghost"}
            onClick={() => setMapMode("lola")}
            aria-label="NASA LOLA Topographic Elevation Heatmap"
            title="NASA LOLA Topography"
            className="h-7 px-2 text-[11px] font-mono"
          >
            LOLA Topo
          </Button>
          <Button
            size="sm"
            variant={mapMode === "contours" ? "accent" : "ghost"}
            onClick={() => setMapMode("contours")}
            aria-label="Topographic elevation contours"
            title="Elevation Contours"
            className="h-7 px-2 text-[11px] font-mono"
          >
            Contours
          </Button>
          <div className="h-4 w-[1px] bg-border/80" />
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setZoom((z) => Math.min(4.5, z + 0.3))}
            aria-label="Zoom in"
            title="Zoom in"
            className="h-7 w-7 p-0 text-xs font-mono"
          >
            +
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setZoom((z) => Math.max(0.6, z - 0.3))}
            aria-label="Zoom out"
            title="Zoom out"
            className="h-7 w-7 p-0 text-xs font-mono"
          >
            −
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={handleResetCamera}
            aria-label="Reset top-down south pole camera"
            title="Reset south pole camera"
            className="h-7 px-2 text-[11px] font-mono"
          >
            Reset
          </Button>
          <Button
            size="sm"
            variant={showGrid ? "accent" : "ghost"}
            onClick={() => setShowGrid((g) => !g)}
            aria-label="Toggle polar coordinate grid"
            title="Toggle polar grid"
            className="h-7 px-2 text-[11px] font-mono"
          >
            Grid
          </Button>
          <Button
            size="sm"
            variant={showLabels ? "accent" : "ghost"}
            onClick={() => setShowLabels((l) => !l)}
            aria-label="Toggle crater and massif labels"
            title="Toggle labels"
            className="h-7 px-2 text-[11px] font-mono"
          >
            Labels
          </Button>
        </div>

        {/* Attribution & Layer Info Badge */}
        <div className="max-w-xs rounded border border-border/50 bg-card/75 p-1.5 text-[10px] leading-tight text-muted-foreground backdrop-blur-md">
          <p className="font-semibold text-foreground/80">
            {mapMode === "lola"
              ? "NASA LOLA South Polar Digital Elevation Model (DEM)"
              : mapMode === "contours"
                ? "Topographic Elevation Contours (500m Intervals)"
                : "NASA LRO / LOLA Shaded Relief Topography"}
          </p>
          <p className="mt-0.5 opacity-80">
            Attribution: NASA / GSFC / ASU / JPL Trek. IAU Mean Earth frame (80°S-90°S). Contextual basemap layer.
          </p>
        </div>
      </div>
    </div>
  );
}
