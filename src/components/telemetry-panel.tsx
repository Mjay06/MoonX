"use client";

import React, { useState } from "react";
import { SiteTelemetry, VisibilityStatus } from "@/types/mission";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Button } from "@/components/ui/button";

interface TelemetryPanelProps {
  telemetry: SiteTelemetry | null;
  onOpenHorizonPlot?: () => void;
}

function getStatusBadge(status: VisibilityStatus) {
  switch (status) {
    case "CLEAR":
      return (
        <Badge variant="success" className="text-[11px] gap-1">
          <span>●</span>
          <span>CLEAR LOS</span>
        </Badge>
      );
    case "BLOCKED":
      return (
        <Badge variant="destructive" className="text-[11px] gap-1">
          <span>✕</span>
          <span>BLOCKED</span>
        </Badge>
      );
    case "GRAZING":
      return (
        <Badge variant="warning" className="text-[11px] gap-1">
          <span>▲</span>
          <span>GRAZING</span>
        </Badge>
      );
    case "UNKNOWN":
    default:
      return (
        <Badge variant="outline" className="text-[11px] gap-1 text-muted-foreground">
          <span>?</span>
          <span>UNKNOWN</span>
        </Badge>
      );
  }
}

export function TelemetryPanel({ telemetry, onOpenHorizonPlot }: TelemetryPanelProps) {
  const [showAssumptions, setShowAssumptions] = useState(false);

  if (!telemetry) {
    return (
      <section
        aria-labelledby="telemetry-heading"
        className="pointer-events-auto absolute bottom-40 right-4 top-24 z-20 w-[min(22rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-border/80 bg-card/90 p-4 shadow-2xl backdrop-blur-glass sm:bottom-40 sm:right-6 sm:top-6"
      >
        <h2
          id="telemetry-heading"
          className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
        >
          Site Telemetry
        </h2>
        <div className="mt-8 text-center text-sm text-muted-foreground">
          <p className="font-mono text-xs">AWAITING LOCATION SELECTION</p>
          <p className="mt-1 text-xs opacity-70">
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
      className="pointer-events-auto absolute bottom-40 right-4 top-24 z-20 w-[min(23rem,calc(100vw-2rem))] overflow-y-auto rounded-lg border border-border/80 bg-card/90 p-4 shadow-2xl backdrop-blur-glass sm:bottom-40 sm:right-6 sm:top-6"
    >
      {/* Header */}
      <div className="flex items-center justify-between border-b border-border/40 pb-2.5">
        <div>
          <h2
            id="telemetry-heading"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
          >
            Site Telemetry
          </h2>
          <p className="mt-0.5 text-xs font-semibold text-foreground truncate max-w-[14rem]" title={locationName}>
            {locationName}
          </p>
        </div>
        <Badge variant="illustrative">Illustrative</Badge>
      </div>

      {/* Epoch timestamp */}
      <div className="mt-2.5 flex items-center justify-between font-mono text-[11px] text-muted-foreground">
        <span>Epoch (UTC):</span>
        <span className="font-semibold text-foreground">{timestampUtc}</span>
      </div>

      {/* Joint feasibility banner */}
      <div
        className={`mt-3 flex items-center justify-between rounded-md border p-2.5 ${
          bothVisible
            ? "border-emerald-600/40 bg-emerald-950/40 text-emerald-300"
            : sun.visibility === "CLEAR" || earth.visibility === "CLEAR"
              ? "border-sky-600/40 bg-sky-950/30 text-sky-300"
              : "border-rose-700/40 bg-rose-950/30 text-rose-300"
        }`}
      >
        <div className="flex items-center gap-2">
          <span className="text-base font-bold">
            {bothVisible ? "✓" : sun.visibility === "CLEAR" || earth.visibility === "CLEAR" ? "◐" : "✕"}
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide">
              {bothVisible
                ? "Dual Line-of-Sight Feasible"
                : sun.visibility === "CLEAR"
                  ? "Solar Generation Only"
                  : earth.visibility === "CLEAR"
                    ? "DTE Communication Only"
                    : "No Line-of-Sight Available"}
            </p>
            <p className="text-[10px] opacity-80">
              {bothVisible
                ? "Concurrent solar power + Direct-To-Earth communications"
                : "Partial or obstructed visibility at current mission time"}
            </p>
          </div>
        </div>
      </div>

      {/* SUN Telemetry Card */}
      <div className="mt-3.5 rounded-md border border-amber-500/30 bg-amber-950/15 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full bg-amber-500/20 text-amber-300 text-xs"
              aria-hidden="true"
            >
              ☀
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-amber-200">
              Sun (Solar Power)
            </span>
          </div>
          {getStatusBadge(sun.visibility)}
        </div>

        <dl className="mt-2.5 grid grid-cols-2 gap-x-2 gap-y-1.5 font-mono text-xs">
          <div>
            <dt className="text-[10px] text-muted-foreground uppercase">Azimuth</dt>
            <dd className="font-semibold text-foreground">{sun.azimuthDeg}° (from N)</dd>
          </div>
          <div>
            <dt className="text-[10px] text-muted-foreground uppercase">Elevation</dt>
            <dd className="font-semibold text-foreground">
              {sun.elevationDeg > 0 ? "+" : ""}
              {sun.elevationDeg}°
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-muted-foreground uppercase">Horizon Mask</dt>
            <dd className="text-muted-foreground">{sun.horizonMaskDeg > 0 ? "+" : ""}{sun.horizonMaskDeg}°</dd>
          </div>
          <div>
            <dt className="text-[10px] text-muted-foreground uppercase">Clearance Margin</dt>
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
      </div>

      {/* EARTH Telemetry Card */}
      <div className="mt-3 rounded-md border border-sky-500/30 bg-sky-950/15 p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span
              className="flex h-5 w-5 items-center justify-center rounded-full bg-sky-500/20 text-sky-300 text-xs"
              aria-hidden="true"
            >
              ⊕
            </span>
            <span className="text-xs font-bold uppercase tracking-wider text-sky-200">
              Earth (Direct Link)
            </span>
          </div>
          {getStatusBadge(earth.visibility)}
        </div>

        <dl className="mt-2.5 grid grid-cols-2 gap-x-2 gap-y-1.5 font-mono text-xs">
          <div>
            <dt className="text-[10px] text-muted-foreground uppercase">Azimuth</dt>
            <dd className="font-semibold text-foreground">{earth.azimuthDeg}° (from N)</dd>
          </div>
          <div>
            <dt className="text-[10px] text-muted-foreground uppercase">Elevation</dt>
            <dd className="font-semibold text-foreground">
              {earth.elevationDeg > 0 ? "+" : ""}
              {earth.elevationDeg}°
            </dd>
          </div>
          <div>
            <dt className="text-[10px] text-muted-foreground uppercase">Horizon Mask</dt>
            <dd className="text-muted-foreground">{earth.horizonMaskDeg > 0 ? "+" : ""}{earth.horizonMaskDeg}°</dd>
          </div>
          <div>
            <dt className="text-[10px] text-muted-foreground uppercase">Clearance Margin</dt>
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
      </div>

      {/* Horizon profile button */}
      {onOpenHorizonPlot && (
        <div className="mt-3">
          <Button
            variant="outline"
            size="sm"
            onClick={onOpenHorizonPlot}
            className="w-full text-xs font-mono h-8 border-border/80"
          >
            Inspect 360° Horizon Profile
          </Button>
        </div>
      )}

      <Separator className="my-3 opacity-40" />

      {/* Assumptions toggle */}
      <div>
        <button
          type="button"
          onClick={() => setShowAssumptions(!showAssumptions)}
          className="flex w-full items-center justify-between text-[11px] font-mono text-muted-foreground hover:text-foreground"
        >
          <span>Model Assumptions & Limits</span>
          <span>{showAssumptions ? "▲" : "▼"}</span>
        </button>

        {showAssumptions && (
          <div className="mt-2 space-y-1.5 rounded bg-secondary/30 p-2 text-[10px] text-muted-foreground leading-relaxed">
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
              • <strong>Data source:</strong> Illustrative sample fixture. Real calculations will use JPL Horizons & NASA DEM in later phases.
            </p>
          </div>
        )}
      </div>
    </section>
  );
}
