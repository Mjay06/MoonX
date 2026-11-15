"use client";

import React, { useState } from "react";
import { SiteTelemetry, VisibilityStatus } from "@/types/mission";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

export type TelemetryState = "ready" | "loading" | "empty" | "unavailable" | "error";

interface TelemetryPanelProps {
  telemetry: SiteTelemetry | null;
  state?: TelemetryState;
  errorMessage?: string;
  warnings?: string[];
  onOpenHorizonPlot?: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
  isMobileCollapsed?: boolean;
  onToggleMobileCollapse?: () => void;
}

function getStatusBadge(status: VisibilityStatus) {
  switch (status) {
    case "CLEAR":
      return (
        <Badge variant="success" className="text-[11px] gap-1">
          <span aria-hidden="true">●</span>
          <span>CLEAR LOS</span>
        </Badge>
      );
    case "BLOCKED":
      return (
        <Badge variant="destructive" className="text-[11px] gap-1">
          <span aria-hidden="true">✕</span>
          <span>BLOCKED</span>
        </Badge>
      );
    case "GRAZING":
      return (
        <Badge variant="warning" className="text-[11px] gap-1">
          <span aria-hidden="true">▲</span>
          <span>GRAZING</span>
        </Badge>
      );
    case "UNKNOWN":
    default:
      return (
        <Badge variant="outline" className="text-[11px] gap-1 text-muted-foreground">
          <span aria-hidden="true">?</span>
          <span>UNKNOWN</span>
        </Badge>
      );
  }
}

export function TelemetryPanel({
  telemetry,
  state = "ready",
  errorMessage,
  warnings = [],
  onOpenHorizonPlot,
  isCollapsed,
  onToggleCollapse,
  isMobileCollapsed = false,
  onToggleMobileCollapse,
}: TelemetryPanelProps) {
  const [showAssumptions, setShowAssumptions] = useState(false);

  const collapsed = isCollapsed ?? isMobileCollapsed ?? false;
  const toggleCollapse = onToggleCollapse ?? onToggleMobileCollapse;

  // If collapsed, render a compact floating toggle pill
  if (collapsed) {
    return (
      <div className="pointer-events-auto fixed right-4 top-16 z-30 sm:right-6">
        <Button
          variant="secondary"
          size="sm"
          onClick={toggleCollapse}
          className="h-8 gap-2 border border-white/20 bg-black/90 px-3 text-xs font-mono shadow-2xl backdrop-blur-xl text-white hover:border-[#00e5ff] hover:text-[#00e5ff] rounded-xs"
          aria-expanded="false"
          aria-label="Expand site telemetry panel"
        >
          <span>🛰️ Telemetry</span>
          {telemetry && (
            <span
              className={`h-2 w-2 rounded-full ${
                telemetry.bothVisible ? "bg-[#00e5ff] shadow-[0_0_6px_#00e5ff]" : "bg-amber-400"
              }`}
            />
          )}
          <span className="text-[10px] text-white/50">▾</span>
        </Button>
      </div>
    );
  }

  // Loading state
  if (state === "loading") {
    return (
      <section
        aria-labelledby="telemetry-heading"
        className="pointer-events-auto absolute bottom-36 right-4 top-16 z-20 w-[min(23rem,calc(100vw-2rem))] rounded-md border border-white/20 bg-black/90 p-6 shadow-2xl backdrop-blur-xl sm:bottom-40 sm:right-6 sm:top-16"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <h2 id="telemetry-heading" className="text-xs font-semibold uppercase tracking-[0.16em] text-white/90">
            Site Telemetry
          </h2>
          {toggleCollapse && (
            <button
              type="button"
              onClick={toggleCollapse}
              className="h-6 w-6 rounded-xs border border-white/15 bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white text-xs transition-colors"
              title="Minimize panel"
              aria-label="Minimize telemetry panel"
            >
              ▶
            </button>
          )}
        </div>
        <div className="mt-12 flex flex-col items-center justify-center text-center">
          <div className="h-6 w-6 animate-spin rounded-full border-2 border-[#00e5ff] border-t-transparent" />
          <p className="mt-3 font-mono text-xs text-white/60">
            Calculating topocentric vectors...
          </p>
        </div>
      </section>
    );
  }

  // Unavailable / insufficient coverage state
  if (state === "unavailable") {
    return (
      <section
        aria-labelledby="telemetry-heading"
        className="pointer-events-auto absolute bottom-36 right-4 top-16 z-20 w-[min(23rem,calc(100vw-2rem))] rounded-md border border-amber-500/40 bg-black/90 p-4 shadow-2xl backdrop-blur-xl sm:bottom-40 sm:right-6 sm:top-16"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <h2 id="telemetry-heading" className="text-xs font-semibold uppercase tracking-[0.16em] text-amber-300">
            Coverage Unavailable
          </h2>
          {toggleCollapse && (
            <button
              type="button"
              onClick={toggleCollapse}
              className="h-6 w-6 rounded-xs border border-white/15 bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white text-xs transition-colors"
              title="Minimize panel"
              aria-label="Minimize telemetry panel"
            >
              ▶
            </button>
          )}
        </div>
        <div className="mt-4 rounded-xs border border-amber-500/30 bg-amber-950/20 p-3 text-xs text-amber-200/90 leading-relaxed">
          <p className="font-semibold">Insufficient Topographic Data</p>
          <p className="mt-1 text-[11px] opacity-80">
            The 240 m LOLA polar DEM cannot provide a valid horizon profile for this location. Visibility status is UNKNOWN.
          </p>
          {errorMessage && (
            <p className="mt-1 text-[10px] opacity-70">{errorMessage}</p>
          )}
        </div>
      </section>
    );
  }

  // Error state
  if (state === "error") {
    return (
      <section
        aria-labelledby="telemetry-heading"
        className="pointer-events-auto absolute bottom-36 right-4 top-16 z-20 w-[min(23rem,calc(100vw-2rem))] rounded-md border border-rose-500/40 bg-black/90 p-4 shadow-2xl backdrop-blur-xl sm:bottom-40 sm:right-6 sm:top-16"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2">
          <h2 id="telemetry-heading" className="text-xs font-semibold uppercase tracking-[0.16em] text-rose-400">
            Telemetry Error
          </h2>
          {toggleCollapse && (
            <button
              type="button"
              onClick={toggleCollapse}
              className="h-6 w-6 rounded-xs border border-white/15 bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white text-xs transition-colors"
              title="Minimize panel"
              aria-label="Minimize telemetry panel"
            >
              ▶
            </button>
          )}
        </div>
        <div className="mt-4 rounded-xs border border-rose-500/30 bg-rose-950/20 p-3 text-xs text-rose-200 leading-relaxed">
          <p className="font-semibold">Ephemeris Calculation Failed</p>
          <p className="mt-1 text-[11px] opacity-80">
            {errorMessage || "Unable to retrieve site ephemeris. Check network connectivity or time inputs."}
          </p>
        </div>
      </section>
    );
  }

  // Empty state
  if (!telemetry || state === "empty") {
    return (
      <section
        aria-labelledby="telemetry-heading"
        className="pointer-events-auto absolute bottom-36 right-4 top-16 z-20 w-[min(23rem,calc(100vw-2rem))] overflow-y-auto rounded-md border border-white/20 bg-black/90 p-4 shadow-2xl backdrop-blur-xl sm:bottom-40 sm:right-6 sm:top-16"
      >
        <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
          <h2
            id="telemetry-heading"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-white/90"
          >
            Site Telemetry
          </h2>
          {toggleCollapse && (
            <button
              type="button"
              onClick={toggleCollapse}
              className="h-6 w-6 rounded-xs border border-white/15 bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white text-xs transition-colors"
              title="Minimize panel"
              aria-label="Minimize telemetry panel"
            >
              ▶
            </button>
          )}
        </div>
        <div className="mt-8 text-center text-sm text-white/60">
          <p className="font-mono text-xs text-[#00e5ff] tracking-wider">AWAITING LOCATION SELECTION</p>
          <p className="mt-2 text-xs text-white/50">
            Select a candidate site on the map or search panel to view celestial line-of-sight.
          </p>
        </div>
      </section>
    );
  }

  const { sun, earth, bothVisible, locationName, timestampUtc } = telemetry;

  return (
    <section
      aria-labelledby="telemetry-heading"
      className="pointer-events-auto absolute bottom-36 right-4 top-16 z-20 w-[min(23rem,calc(100vw-2rem))] overflow-y-auto rounded-md border border-white/20 bg-black/90 p-4 shadow-2xl backdrop-blur-xl sm:bottom-40 sm:right-6 sm:top-16"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <div>
          <h2
            id="telemetry-heading"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-white/90"
          >
            Site Telemetry
          </h2>
          <p className="mt-0.5 text-xs font-semibold text-white truncate max-w-[14rem]" title={locationName}>
            {locationName}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {telemetry.ephemerisSource === "live-horizons" ? (
            <Badge variant="outline" className="border-emerald-500/50 bg-emerald-950/40 text-emerald-300 text-[10px]">
              ● LIVE JPL HORIZONS
            </Badge>
          ) : telemetry.ephemerisSource === "analytical-fallback" ? (
            <Badge variant="outline" className="border-amber-500/50 bg-amber-950/40 text-amber-300 text-[10px]">
              ▲ SIMULATED FALLBACK
            </Badge>
          ) : (
            <Badge variant={telemetry.isIllustrative ? "illustrative" : "outline"}>
              {telemetry.isIllustrative ? "Illustrative" : "NASA LOLA"}
            </Badge>
          )}
          {toggleCollapse && (
            <button
              type="button"
              onClick={toggleCollapse}
              className="h-6 w-6 rounded-xs border border-white/15 bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/60 hover:text-white text-xs transition-colors"
              title="Minimize panel"
              aria-label="Minimize telemetry panel"
            >
              ▶
            </button>
          )}
        </div>
      </div>

      {warnings.length > 0 && (
        <div className="mt-2 rounded-xs border border-amber-500/30 bg-amber-950/20 p-2 text-[10px] leading-relaxed text-amber-200/90">
          {warnings.map((warning) => (
            <p key={warning}>{warning}</p>
          ))}
        </div>
      )}

      {/* Epoch timestamp */}
      <div className="mt-2.5 flex items-center justify-between font-mono text-[11px] text-white/70">
        <span>Mission Time (UTC):</span>
        <span className="font-semibold text-[#00e5ff]">{timestampUtc}</span>
      </div>

      {/* Joint feasibility banner (Plain English) */}
      <div
        className={`mt-3 flex items-center justify-between rounded-xs border p-3 ${
          bothVisible
            ? "border-emerald-500/50 bg-emerald-950/40 text-emerald-300 shadow-[0_0_20px_rgba(16,185,129,0.15)]"
            : sun.visibility === "CLEAR" || earth.visibility === "CLEAR"
              ? "border-[#00e5ff]/40 bg-[#00e5ff]/10 text-[#00e5ff]"
              : "border-rose-500/40 bg-rose-950/30 text-rose-300"
        }`}
      >
        <div className="flex items-center gap-2.5">
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-xs bg-black/40 text-base font-bold" aria-hidden="true">
            {bothVisible ? "✓" : sun.visibility === "CLEAR" || earth.visibility === "CLEAR" ? "◐" : "✕"}
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wider">
              {bothVisible
                ? "Sun and Earth Above the Terrain Horizon"
                : sun.visibility === "CLEAR"
                  ? "Sun Above Horizon; Earth Below"
                  : earth.visibility === "CLEAR"
                    ? "Earth Above Horizon; Sun Below"
                    : "Sun and Earth Below the Terrain Horizon"}
            </p>
            <p className="text-[10px] text-white/70 leading-snug mt-0.5">
              {bothVisible
                ? "Both bodies are geometrically above the local terrain horizon."
                : sun.visibility === "CLEAR"
                  ? "The Sun is geometrically visible; Earth is below the local terrain horizon."
                  : earth.visibility === "CLEAR"
                    ? "Earth is geometrically visible; the Sun is below the local terrain horizon."
                    : "Neither body is geometrically above the local terrain horizon."}
            </p>
          </div>
        </div>
      </div>

      {/* SUN Telemetry Card */}
      <div className="mt-3.5 rounded-xs border border-amber-500/30 bg-black/80 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="flex h-5 w-5 items-center justify-center rounded-xs bg-amber-500/20 text-amber-300 text-xs"
              aria-hidden="true"
            >
              ☀
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-200">
              Sun (Geometric Visibility)
            </span>
          </div>
          {getStatusBadge(sun.visibility)}
        </div>

        <dl className="mt-2.5 grid grid-cols-2 gap-x-2 gap-y-1.5 font-mono text-xs">
          <div>
            <dt className="text-[10px] text-white/50 uppercase">Sun Direction</dt>
            <dd className="font-semibold text-white">{sun.azimuthDeg}° (from N)</dd>
          </div>
          <div>
            <dt className="text-[10px] text-white/50 uppercase">Height in Sky</dt>
            <dd className="font-semibold text-white">
              {sun.elevationDeg > 0 ? "+" : ""}
              {sun.elevationDeg}°
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-white/50 uppercase">Terrain Horizon</dt>
            <dd className="text-white/70">{sun.horizonMaskDeg > 0 ? "+" : ""}{sun.horizonMaskDeg}°</dd>
          </div>
          <div>
            <dt className="text-[10px] text-white/50 uppercase">Elevation Margin</dt>
            <dd
              className={
                sun.marginDeg > 0.25
                  ? "font-semibold text-emerald-400"
                  : sun.marginDeg < -0.25
                    ? "font-semibold text-rose-400"
                    : "font-semibold text-amber-400"
              }
            >
              {sun.marginDeg > 0 ? "+" : ""}
              {sun.marginDeg}°
            </dd>
          </div>
        </dl>

        {/* Visual Sun Horizon Clearance Gauge */}
        <div className="mt-2.5 pt-2 border-t border-amber-500/20">
          <div className="flex justify-between font-mono text-[9px] text-amber-200/80 mb-1">
            <span>Rim Height: {sun.horizonMaskDeg > 0 ? "+" : ""}{sun.horizonMaskDeg}°</span>
            <span className={sun.visibility === "CLEAR" ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
              {sun.visibility === "CLEAR" ? `▲ ${sun.marginDeg > 0 ? "+" : ""}${sun.marginDeg}° (Sun Above Rim)` : `▼ ${sun.marginDeg}° (Behind Rim)`}
            </span>
          </div>
          <div className="relative h-2 w-full rounded-xs bg-black/90 overflow-hidden flex border border-white/20">
            {/* Terrain obstruction zone below horizon mask */}
            <div
              className="h-full bg-slate-700/60"
              style={{ width: `${Math.min(100, Math.max(0, ((sun.horizonMaskDeg - (-2)) / 10) * 100))}%` }}
              title={`Crater rim elevation: ${sun.horizonMaskDeg}°`}
            />
          </div>
          <div className="relative mt-1 flex justify-between font-mono text-[8px] text-white/50">
            <span>-2° Horizon</span>
            <span>0° Level</span>
            <span>+4°</span>
            <span>+8° High</span>
            {/* Sun position marker */}
            <span
              className="absolute -top-3.5 -translate-x-1/2 text-xs"
              style={{ left: `${Math.min(96, Math.max(4, ((sun.elevationDeg - (-2)) / 10) * 100))}%` }}
              title={`Sun Elevation: ${sun.elevationDeg}°`}
            >
              ☀️
            </span>
          </div>
        </div>
      </div>

      {/* EARTH Telemetry Card */}
      <div className="mt-3 rounded-xs border border-sky-500/30 bg-black/80 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="flex h-5 w-5 items-center justify-center rounded-xs bg-sky-500/20 text-sky-300 text-xs"
              aria-hidden="true"
            >
              ⊕
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-200">
              Earth (Geometric Visibility)
            </span>
          </div>
          {getStatusBadge(earth.visibility)}
        </div>

        <dl className="mt-2.5 grid grid-cols-2 gap-x-2 gap-y-1.5 font-mono text-xs">
          <div>
            <dt className="text-[10px] text-white/50 uppercase">Earth Direction</dt>
            <dd className="font-semibold text-white">{earth.azimuthDeg}° (from N)</dd>
          </div>
          <div>
            <dt className="text-[10px] text-white/50 uppercase">Height in Sky</dt>
            <dd className="font-semibold text-white">
              {earth.elevationDeg > 0 ? "+" : ""}
              {earth.elevationDeg}°
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-white/50 uppercase">Terrain Horizon</dt>
            <dd className="text-white/70">{earth.horizonMaskDeg > 0 ? "+" : ""}{earth.horizonMaskDeg}°</dd>
          </div>
          <div>
            <dt className="text-[10px] text-white/50 uppercase">Elevation Margin</dt>
            <dd
              className={
                earth.marginDeg > 0.25
                  ? "font-semibold text-emerald-400"
                  : earth.marginDeg < -0.25
                    ? "font-semibold text-rose-400"
                    : "font-semibold text-amber-400"
              }
            >
              {earth.marginDeg > 0 ? "+" : ""}
              {earth.marginDeg}°
            </dd>
          </div>
        </dl>

        {/* Visual Earth Horizon Clearance Gauge */}
        <div className="mt-2.5 pt-2 border-t border-sky-500/20">
          <div className="flex justify-between font-mono text-[9px] text-sky-200/80 mb-1">
            <span>Rim Height: {earth.horizonMaskDeg > 0 ? "+" : ""}{earth.horizonMaskDeg}°</span>
            <span className={earth.visibility === "CLEAR" ? "text-emerald-400 font-semibold" : "text-rose-400 font-semibold"}>
              {earth.visibility === "CLEAR" ? `▲ ${earth.marginDeg > 0 ? "+" : ""}${earth.marginDeg}° (Earth Above Rim)` : `▼ ${earth.marginDeg}° (Behind Rim)`}
            </span>
          </div>
          <div className="relative h-2 w-full rounded-xs bg-black/90 overflow-hidden flex border border-white/20">
            {/* Terrain obstruction zone below horizon mask */}
            <div
              className="h-full bg-slate-700/60"
              style={{ width: `${Math.min(100, Math.max(0, ((earth.horizonMaskDeg - (-2)) / 10) * 100))}%` }}
              title={`Crater rim elevation: ${earth.horizonMaskDeg}°`}
            />
          </div>
          <div className="relative mt-1 flex justify-between font-mono text-[8px] text-white/50">
            <span>-2° Horizon</span>
            <span>0° Level</span>
            <span>+4°</span>
            <span>+8° High</span>
            {/* Earth position marker */}
            <span
              className="absolute -top-3.5 -translate-x-1/2 text-xs"
              style={{ left: `${Math.min(96, Math.max(4, ((earth.elevationDeg - (-2)) / 10) * 100))}%` }}
              title={`Earth Elevation: ${earth.elevationDeg}°`}
            >
              🌍
            </span>
          </div>
        </div>
      </div>

      {/* Horizon profile button */}
      {onOpenHorizonPlot && (
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenHorizonPlot}
            className="w-full text-xs font-mono h-8 border-white/20 hover:border-[#00e5ff] hover:text-[#00e5ff] flex items-center justify-center gap-2"
          >
            <span>⛰️</span>
            <span>Inspect 360° Mountain Skyline</span>
          </Button>
          <p className="mt-1 text-center text-[10px] text-white/40">
            Compare the terrain horizon with Sun and Earth apparent elevations
          </p>
        </div>
      )}

      <Separator className="my-3 opacity-20" />

      {/* Assumptions toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowAssumptions(!showAssumptions)}
          className="flex w-full items-center justify-between text-[11px] font-mono text-white/60 hover:text-white"
        >
          <span>Model Assumptions & Limits</span>
          <span aria-hidden="true">{showAssumptions ? "▲" : "▼"}</span>
        </button>

        {showAssumptions && (
          <div className="mt-2 space-y-1.5 rounded-xs border border-white/10 bg-white/[0.04] p-2.5 text-[10px] text-white/70 leading-relaxed">
            <p>
              • <strong>Geometric line-of-sight only:</strong> Does NOT evaluate antenna gain, RF link margin, solar panel efficiency, or thermal limits.
            </p>
            <p>
              • <strong>Observer frame:</strong> Surface topocentric horizontal system (Azimuth 0°=North, 90°=East; Elevation 0°=Local horizontal plane).
            </p>
            <p>
              • <strong>Mast Height:</strong> +2.0 meters above lunar reference geoid.
            </p>
            <p>
              • <strong>Data source:</strong> JPL Horizons ephemerides & NASA LOLA DEM.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
