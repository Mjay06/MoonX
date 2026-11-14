"use client";

import React, { useEffect, useRef, useState, useCallback } from "react";
import { LunarLocation } from "@/types/mission";
import { SAMPLE_LUNAR_SITES } from "@/data/sample-sites";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

interface LunarViewportProps {
  selectedLocation: LunarLocation | null;
  onSelectLocation: (loc: LunarLocation) => void;
  comparedLocations?: LunarLocation[];
}

export function LunarViewport({
  selectedLocation,
  onSelectLocation,
  comparedLocations = [],
}: LunarViewportProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(1.4);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [showGrid, setShowGrid] = useState(true);
  const [isReady, setIsReady] = useState(false);
  const [error] = useState<string | null>(null);

  useEffect(() => {
    // Simulate initial viewport preparation and client boundary mount
    const timer = setTimeout(() => {
      setIsReady(true);
    }, 150);
    return () => clearTimeout(timer);
  }, []);

  // Polar projection parameters
  // South pole is center (lat = -90). Latitudes from -90 to -80.
  // Radius R = (lat + 90) * scale.
  const latLonToCanvas = useCallback(
    (
      lat: number,
      lon: number,
      width: number,
      height: number
    ): { x: number; y: number } => {
      const centerX = width / 2 + pan.x;
      const centerY = height / 2 + pan.y;
      const baseRadius = Math.min(width, height) * 0.42 * zoom;

      // Distance from south pole (-90) in degrees (0° at -90°S, 10° at -80°S)
      const distFromPole = Math.max(0, lat + 90);
      const r = Math.max(0, (distFromPole / 10.0) * baseRadius);

      // Angle: 0° longitude points UP (towards Earth / Prime Meridian)
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
      const baseRadius = Math.min(width, height) * 0.42 * zoom;

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

  // Render lunar polar canvas
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
    const baseRadius = Math.max(10, Math.min(width, height) * 0.42 * zoom);

    // Draw deep lunar space background with soft stars
    ctx.fillStyle = "#07090e";
    ctx.fillRect(0, 0, width, height);

    // Subtle starfield
    for (let i = 0; i < 52; i++) {
      const sx = ((i * 173.3) % width);
      const sy = ((i * 289.7) % height);
      const sAlpha = 0.2 + ((i % 5) * 0.12);
      ctx.fillStyle = `rgba(220, 235, 255, ${sAlpha})`;
      ctx.beginPath();
      ctx.arc(sx, sy, i % 3 === 0 ? 1.2 : 0.8, 0, Math.PI * 2);
      ctx.fill();
    }

    // Draw Lunar disk boundary
    const grad = ctx.createRadialGradient(
      centerX - baseRadius * 0.2,
      centerY - baseRadius * 0.2,
      Math.max(1, baseRadius * 0.05),
      centerX,
      centerY,
      Math.max(2, baseRadius * 1.15)
    );
    grad.addColorStop(0, "#232832");
    grad.addColorStop(0.5, "#181c24");
    grad.addColorStop(0.85, "#11141b");
    grad.addColorStop(1, "#07090e");

    ctx.beginPath();
    ctx.arc(centerX, centerY, baseRadius * 1.1, 0, Math.PI * 2);
    ctx.fillStyle = grad;
    ctx.fill();

    // Render prominent crater structures (Shackleton, Faustini, Shoemaker, Haworth, etc.)
    const craters = [
      { name: "Shackleton", lat: -89.9, lon: 0.0, radiusDeg: 0.35, depth: 4.2 },
      { name: "de Gerlache", lat: -88.5, lon: 271.7, radiusDeg: 0.55, depth: 3.8 },
      { name: "Sverdrup", lat: -88.5, lon: 152.0, radiusDeg: 0.6, depth: 3.5 },
      { name: "Shoemaker", lat: -88.1, lon: 45.0, radiusDeg: 0.85, depth: 4.0 },
      { name: "Faustini", lat: -87.3, lon: 77.0, radiusDeg: 0.75, depth: 3.7 },
      { name: "Haworth", lat: -87.4, lon: 350.0, radiusDeg: 0.7, depth: 3.9 },
      { name: "Nobile", lat: -85.2, lon: 53.5, radiusDeg: 1.3, depth: 3.2 },
      { name: "Amundsen", lat: -84.5, lon: 82.8, radiusDeg: 1.6, depth: 4.5 },
      { name: "Malapert", lat: -84.9, lon: 12.9, radiusDeg: 1.1, depth: 3.0 },
    ];

    craters.forEach((crater) => {
      const pos = latLonToCanvas(crater.lat, crater.lon, width, height);
      const r = Math.max(1, (crater.radiusDeg / 10.0) * baseRadius);

      // Crater shadow gradient
      const cGrad = ctx.createRadialGradient(
        pos.x + r * 0.25,
        pos.y + r * 0.25,
        Math.max(0.5, r * 0.1),
        pos.x,
        pos.y,
        Math.max(1, r)
      );
      cGrad.addColorStop(0, "#080a0e");
      cGrad.addColorStop(0.65, "#0d1017");
      cGrad.addColorStop(0.88, "#1a202c");
      cGrad.addColorStop(1, "#303948");

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, 0, Math.PI * 2);
      ctx.fillStyle = cGrad;
      ctx.fill();
      ctx.lineWidth = 1;
      ctx.strokeStyle = "rgba(100, 120, 150, 0.25)";
      ctx.stroke();

      // Crater illuminated rim crescent
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, r, Math.PI * 0.8, Math.PI * 1.8);
      ctx.strokeStyle = "rgba(200, 225, 255, 0.4)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      // Subtle crater name annotation
      if (zoom >= 1.2) {
        ctx.fillStyle = "rgba(148, 163, 184, 0.55)";
        ctx.font = "9px var(--font-telemetry, monospace)";
        ctx.textAlign = "center";
        ctx.fillText(crater.name, pos.x, pos.y + r + 11);
      }
    });

    // Polar coordinate grid (Parallels and Meridians)
    if (showGrid) {
      ctx.strokeStyle = "rgba(56, 189, 248, 0.18)";
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

        ctx.fillStyle = "rgba(56, 189, 248, 0.55)";
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

        // Label outer meridians
        ctx.fillStyle = "rgba(56, 189, 248, 0.55)";
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
    ctx.strokeStyle = "rgba(56, 189, 248, 0.6)";
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(centerX - 8, centerY);
    ctx.lineTo(centerX + 8, centerY);
    ctx.moveTo(centerX, centerY - 8);
    ctx.lineTo(centerX, centerY + 8);
    ctx.stroke();

    ctx.fillStyle = "rgba(56, 189, 248, 0.85)";
    ctx.font = "10px var(--font-telemetry, monospace)";
    ctx.textAlign = "center";
    ctx.fillText("SOUTH POLE (-90°)", centerX, centerY - 12);

    // Draw compared locations
    comparedLocations.forEach((loc, idx) => {
      const pos = latLonToCanvas(loc.latitude, loc.longitude, width, height);
      ctx.fillStyle = "rgba(168, 85, 247, 0.8)";
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 4, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = "rgba(255, 255, 255, 0.9)";
      ctx.lineWidth = 1.5;
      ctx.stroke();

      ctx.fillStyle = "rgba(216, 180, 254, 0.9)";
      ctx.font = "10px var(--font-telemetry, monospace)";
      ctx.textAlign = "center";
      ctx.fillText(`Scenario ${idx + 1}`, pos.x, pos.y - 8);
    });

    // Draw active selected location marker
    if (selectedLocation) {
      const pos = latLonToCanvas(
        selectedLocation.latitude,
        selectedLocation.longitude,
        width,
        height
      );

      // Target reticle
      ctx.strokeStyle = "oklch(0.82 0.14 205)";
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 10, 0, Math.PI * 2);
      ctx.stroke();

      ctx.beginPath();
      ctx.arc(pos.x, pos.y, 3, 0, Math.PI * 2);
      ctx.fillStyle = "oklch(0.82 0.14 205)";
      ctx.fill();

      // Corner brackets
      const bLen = 5;
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(pos.x - 16, pos.y - 16 + bLen);
      ctx.lineTo(pos.x - 16, pos.y - 16);
      ctx.lineTo(pos.x - 16 + bLen, pos.y - 16);

      ctx.moveTo(pos.x + 16, pos.y - 16 + bLen);
      ctx.lineTo(pos.x + 16, pos.y - 16);
      ctx.lineTo(pos.x + 16 - bLen, pos.y - 16);

      ctx.moveTo(pos.x - 16, pos.y + 16 - bLen);
      ctx.lineTo(pos.x - 16, pos.y + 16);
      ctx.lineTo(pos.x - 16 + bLen, pos.y + 16);

      ctx.moveTo(pos.x + 16, pos.y + 16 - bLen);
      ctx.lineTo(pos.x + 16, pos.y + 16);
      ctx.lineTo(pos.x + 16 - bLen, pos.y + 16);
      ctx.stroke();

      // Label callout
      ctx.fillStyle = "rgba(255, 255, 255, 0.95)";
      ctx.font = "bold 11px var(--font-geometric, sans-serif)";
      ctx.textAlign = "left";
      ctx.fillText(selectedLocation.name, pos.x + 18, pos.y - 2);

      ctx.fillStyle = "rgba(148, 163, 184, 0.9)";
      ctx.font = "10px var(--font-telemetry, monospace)";
      ctx.fillText(
        `${selectedLocation.latitude.toFixed(2)}° S, ${selectedLocation.longitude.toFixed(2)}° E`,
        pos.x + 18,
        pos.y + 12
      );
    }

    // Compass rose in upper right corner of the canvas
    const compassX = width - 48;
    const compassY = 80;
    const cRadius = 20;

    ctx.save();
    ctx.strokeStyle = "rgba(56, 189, 248, 0.35)";
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(compassX, compassY, cRadius, 0, Math.PI * 2);
    ctx.stroke();

    // 0° Prime Meridian Arrow (Pointing Up towards Earth)
    ctx.fillStyle = "rgba(56, 189, 248, 0.85)";
    ctx.beginPath();
    ctx.moveTo(compassX, compassY - cRadius - 3);
    ctx.lineTo(compassX - 4, compassY - cRadius + 6);
    ctx.lineTo(compassX + 4, compassY - cRadius + 6);
    ctx.closePath();
    ctx.fill();

    ctx.font = "8px var(--font-telemetry, monospace)";
    ctx.textAlign = "center";
    ctx.fillStyle = "rgba(56, 189, 248, 0.85)";
    ctx.fillText("0° ME", compassX, compassY - cRadius - 5);
    ctx.fillText("EARTH", compassX, compassY + cRadius + 11);
    ctx.restore();

    ctx.restore();
  }, [
    isReady,
    zoom,
    pan,
    showGrid,
    selectedLocation,
    comparedLocations,
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

    // Check if clicked close to an existing sample site
    const matched = SAMPLE_LUNAR_SITES.find((site) => {
      const dLat = Math.abs(site.latitude - coords.lat);
      const dLon = Math.abs(site.longitude - coords.lon);
      return dLat < 0.6 && dLon < 15.0;
    });

    if (matched) {
      onSelectLocation(matched);
    } else {
      onSelectLocation({
        id: `site-${coords.lat.toFixed(2)}-${coords.lon.toFixed(2)}`,
        name: `Custom Site (${coords.lat.toFixed(2)}° S)`,
        description: "User-selected south polar location.",
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
    const zoomFactor = e.deltaY < 0 ? 1.15 : 0.88;
    setZoom((z) => Math.min(4.0, Math.max(0.6, z * zoomFactor)));
  };

  const handleResetCamera = () => {
    setZoom(1.4);
    setPan({ x: 0, y: 0 });
  };

  return (
    <div className="relative h-full w-full overflow-hidden select-none">
      {/* Loading overlay state */}
      {!isReady && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/90 backdrop-blur-sm">
          <div className="h-8 w-8 animate-spin rounded-full border-2 border-primary border-t-transparent" />
          <p className="mt-3 text-xs tracking-wider text-muted-foreground uppercase font-mono">
            Mounting lunar south pole viewport (LRO WAC projection)...
          </p>
        </div>
      )}

      {/* Error state */}
      {error && (
        <div className="absolute inset-0 z-20 flex flex-col items-center justify-center bg-background/95 p-6 text-center">
          <Badge variant="destructive" className="mb-2">
            Viewport Failure
          </Badge>
          <p className="text-sm text-muted-foreground">{error}</p>
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

      {/* Viewport Control Overlay (Bottom Left above time scrubber) */}
      <div className="pointer-events-auto absolute bottom-28 left-4 z-20 flex flex-col gap-1.5 sm:left-6">
        <div className="flex items-center gap-1.5 rounded-lg border border-border/70 bg-card/85 p-1 backdrop-blur-md shadow-xl">
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setZoom((z) => Math.min(3.5, z + 0.3))}
            aria-label="Zoom in"
            title="Zoom in"
            className="h-7 w-7 p-0 text-xs font-mono"
          >
            +
          </Button>
          <Button
            size="sm"
            variant="ghost"
            onClick={() => setZoom((z) => Math.max(0.8, z - 0.3))}
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
        </div>

        {/* Attribution & Disclaimer badge */}
        <div className="max-w-xs rounded border border-border/50 bg-card/75 p-1.5 text-[10px] leading-tight text-muted-foreground backdrop-blur-glass">
          <p className="font-semibold text-foreground/80">
            NASA Moon Trek / LRO WAC Global Mosaic
          </p>
          <p className="mt-0.5 opacity-80">
            Attribution: NASA / GSFC / ASU / JPL Trek. Contextual basemap layer only; does not represent terrain elevation.
          </p>
        </div>
      </div>
    </div>
  );
}
