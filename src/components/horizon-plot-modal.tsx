"use client";

import React, { useState, useMemo } from "react";
import { SiteTelemetry, VisibilitySample } from "@/types/mission";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HorizonPlotModalProps {
  telemetry: SiteTelemetry;
  visibilitySamples: VisibilitySample[];
  warnings?: string[];
  isOpen: boolean;
  onClose: () => void;
}

export function HorizonPlotModal({
  telemetry,
  visibilitySamples,
  warnings = [],
  isOpen,
  onClose,
}: HorizonPlotModalProps) {
  const [viewMode, setViewMode] = useState<"plot" | "table">("plot");
  const [showSunArc, setShowSunArc] = useState(true);

  const { horizonProfile, sun, earth, locationName, timestampUtc } = telemetry;

  // Plot dimensions
  const svgWidth = 680;
  const svgHeight = 260;
  const padding = { top: 30, right: 30, bottom: 40, left: 45 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  const minElev = -10;
  const maxElev = 20;

  const azToX = (az: number) => padding.left + ((az % 360) / 360) * plotWidth;
  const elToY = (el: number) =>
    padding.top + plotHeight - ((el - minElev) / (maxElev - minElev)) * plotHeight;

  const sunTrajectory = useMemo(() => {
    return visibilitySamples.map((sample, index) => ({
      hour: index * 0.5,
      azimuthDeg: sample.sun.azimuthDeg,
      elevationDeg: sample.sun.elevationDeg,
      horizonMaskDeg: sample.sun.horizonMaskDeg,
      visibility: sample.sun.visibility,
    }));
  }, [visibilitySamples]);

  if (!isOpen) return null;

  // Build SVG path string for horizon profile
  const sortedProfile = [...horizonProfile].sort((a, b) => a.azimuthDeg - b.azimuthDeg);
  let pathD = `M ${azToX(0)} ${elToY(sortedProfile[0]?.elevationDeg || 0)}`;
  sortedProfile.forEach((pt) => {
    pathD += ` L ${azToX(pt.azimuthDeg)} ${elToY(pt.elevationDeg)}`;
  });
  // Connect to bottom for fill
  const fillD = `${pathD} L ${azToX(360)} ${elToY(minElev)} L ${azToX(0)} ${elToY(minElev)} Z`;

  // Sun and Earth SVG coordinates
  const sunX = azToX(sun.azimuthDeg);
  const sunY = elToY(sun.elevationDeg);
  const earthX = azToX(earth.azimuthDeg);
  const earthY = elToY(earth.elevationDeg);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="horizon-plot-title"
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 backdrop-blur-md"
    >
      <div className="relative w-full max-w-3xl rounded-md border border-white/20 bg-black/95 p-6 shadow-[0_0_60px_rgba(0,0,0,0.95)]">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-white/10 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="horizon-plot-title"
                className="text-sm font-bold uppercase tracking-[0.14em] text-white"
              >
                360° Local Horizon Profile & Celestial Sightlines
              </h2>
              <Badge variant={telemetry.isIllustrative ? "illustrative" : "outline"} className="border-white/20 bg-white/5 text-[#00e5ff] rounded-xs font-mono text-[9px]">
                {telemetry.isIllustrative ? "Illustrative DEM" : "NASA LOLA DEM"}
              </Badge>
            </div>
            <p className="mt-0.5 font-mono text-xs text-white/60">
              Site: <span className="text-white font-medium">{locationName}</span> | Epoch:{" "}
              <span className="text-white font-medium">{timestampUtc}</span>
            </p>
          </div>

          {warnings.length > 0 && (
            <div className="mt-3 rounded-xs border border-amber-500/30 bg-amber-950/20 p-2 text-[10px] leading-relaxed text-amber-200/90">
              {warnings.map((warning) => (
                <p key={warning}>{warning}</p>
              ))}
            </div>
          )}

          <div className="flex items-center gap-2">
            {viewMode === "plot" && sunTrajectory.length > 0 && (
              <Button
                variant={showSunArc ? "default" : "outline"}
                size="sm"
                onClick={() => setShowSunArc(!showSunArc)}
                className={`h-6 px-2 text-[11px] font-mono rounded-xs border ${
                  showSunArc
                    ? "border-amber-400 bg-amber-500/20 text-amber-300"
                    : "border-white/20 text-white/70 hover:border-amber-400 hover:text-amber-300"
                }`}
                title="Toggle 48-hour solar trajectory arc across the mountain skyline"
              >
                ☀ 48h Solar Arc
              </Button>
            )}
            <div className="rounded-sm border border-white/20 bg-white/5 p-0.5 flex gap-0.5">
              <Button
                variant={viewMode === "plot" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("plot")}
                className="h-6 px-2 text-xs font-mono rounded-xs"
              >
                Plot
              </Button>
              <Button
                variant={viewMode === "table" ? "default" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="h-6 px-2 text-xs font-mono rounded-xs"
              >
                Table
              </Button>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close horizon modal"
              className="h-7 w-7 rounded-sm border border-white/20 bg-white/5 hover:bg-white/15 flex items-center justify-center text-white/70 hover:text-white text-xs transition-colors"
            >
              ✕
            </button>
          </div>
        </div>

        {/* Beginner-friendly explanation banner */}
        <div className="mt-3 flex items-start gap-2.5 rounded-xs border border-[#00e5ff]/20 bg-[#00e5ff]/5 p-2.5 text-xs text-white/80">
          <span className="text-base select-none">💡</span>
          <div>
            <p className="font-semibold text-white">How to read this skyline:</p>
            <p className="text-[11px] text-white/70 leading-relaxed">
              The terrain profile is a sampled geometric horizon. Sun or Earth above it indicates geometric visibility only; it does not estimate solar power or guarantee a communications link.
            </p>
          </div>
        </div>

        {viewMode === "plot" ? (
          <div className="mt-4">
            {/* SVG Plot */}
            <div className="overflow-hidden rounded-sm border border-white/15 bg-black/90 p-2">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto select-none"
                aria-label="Panoramic 360-degree terrain elevation mask against Sun and Earth apparent elevations"
              >
                {/* Horizontal grid lines for elevations */}
                {[-10, -5, 0, 5, 10, 15, 20].map((el) => {
                  const y = elToY(el);
                  return (
                    <g key={el}>
                      <line
                        x1={padding.left}
                        y1={y}
                        x2={padding.left + plotWidth}
                        y2={y}
                        stroke={el === 0 ? "rgba(255, 255, 255, 0.4)" : "rgba(255, 255, 255, 0.1)"}
                        strokeDasharray={el === 0 ? "none" : "2,4"}
                        strokeWidth={el === 0 ? 1.5 : 1}
                      />
                      <text
                        x={padding.left - 6}
                        y={y + 3}
                        fill="rgba(148, 163, 184, 0.7)"
                        fontSize="9"
                        fontFamily="monospace"
                        textAnchor="end"
                      >
                        {el > 0 ? `+${el}°` : `${el}°`}
                      </text>
                    </g>
                  );
                })}

                {/* Vertical grid lines for cardinal directions */}
                {[
                  { az: 0, label: "0° N" },
                  { az: 45, label: "45° NE" },
                  { az: 90, label: "90° E" },
                  { az: 135, label: "135° SE" },
                  { az: 180, label: "180° S" },
                  { az: 225, label: "225° SW" },
                  { az: 270, label: "270° W" },
                  { az: 315, label: "315° NW" },
                  { az: 360, label: "360° N" },
                ].map(({ az, label }) => {
                  const x = azToX(az);
                  return (
                    <g key={az}>
                      <line
                        x1={x}
                        y1={padding.top}
                        x2={x}
                        y2={padding.top + plotHeight}
                        stroke="rgba(255, 255, 255, 0.08)"
                        strokeDasharray="2,4"
                      />
                      <text
                        x={x}
                        y={padding.top + plotHeight + 16}
                        fill="rgba(148, 163, 184, 0.7)"
                        fontSize="9"
                        fontFamily="monospace"
                        textAnchor="middle"
                      >
                        {label}
                      </text>
                    </g>
                  );
                })}

                {/* Shaded Terrain Blocked Area */}
                <path d={fillD} fill="rgba(30, 41, 59, 0.7)" />
                {/* Terrain Horizon Line */}
                <path d={pathD} fill="none" stroke="rgba(148, 163, 184, 0.9)" strokeWidth="2" />

                {/* 48-Hour Sun Trajectory Arc across Skyline */}
                {showSunArc && sunTrajectory.length > 1 && (
                  <g aria-label="48-hour solar trajectory arc">
                    {sunTrajectory.map((pt, idx) => {
                      if (idx === 0) return null;
                      const prev = sunTrajectory[idx - 1];
                      // Avoid wraparound line if az jumps across 0/360 boundary
                      if (Math.abs(pt.azimuthDeg - prev.azimuthDeg) > 40) return null;
                      return (
                        <line
                          key={`arc-line-${idx}`}
                          x1={azToX(prev.azimuthDeg)}
                          y1={elToY(prev.elevationDeg)}
                          x2={azToX(pt.azimuthDeg)}
                          y2={elToY(pt.elevationDeg)}
                          stroke={
                            pt.visibility === "CLEAR"
                              ? "rgba(251, 191, 36, 0.55)"
                              : pt.visibility === "BLOCKED"
                                ? "rgba(244, 63, 94, 0.5)"
                                : "rgba(148, 163, 184, 0.6)"
                          }
                          strokeWidth="2.5"
                          strokeDasharray={pt.visibility === "CLEAR" ? "none" : "3,3"}
                        />
                      );
                    })}
                    {sunTrajectory.map((pt, idx) => (
                      <circle
                        key={`arc-pt-${idx}`}
                        cx={azToX(pt.azimuthDeg)}
                        cy={elToY(pt.elevationDeg)}
                        r={pt.hour % 12 === 0 ? 3.5 : 1.8}
                        fill={
                          pt.visibility === "CLEAR"
                            ? "#fbbf24"
                            : pt.visibility === "BLOCKED"
                              ? "#f43f5e"
                              : "#94a3b8"
                        }
                        opacity={0.85}
                      />
                    ))}
                    {sunTrajectory
                      .filter((pt) => pt.hour % 12 === 0)
                      .map((pt) => (
                        <text
                          key={`arc-lbl-${pt.hour}`}
                          x={azToX(pt.azimuthDeg)}
                          y={elToY(pt.elevationDeg) + 12}
                          fill="rgba(251, 191, 36, 0.85)"
                          fontSize="8.5"
                          fontFamily="monospace"
                          textAnchor="middle"
                        >
                          T+{pt.hour}h
                        </text>
                      ))}
                  </g>
                )}

                {/* Sun Marker */}
                <g>
                  <line
                    x1={sunX}
                    y1={sunY}
                    x2={sunX}
                    y2={elToY(sun.horizonMaskDeg)}
                    stroke="rgba(245, 158, 11, 0.6)"
                    strokeDasharray="2,2"
                  />
                  <circle
                    cx={sunX}
                    cy={sunY}
                    r={7}
                    fill="#f59e0b"
                    stroke="#fff"
                    strokeWidth="1.5"
                  />
                  <text
                    x={sunX}
                    y={sunY - 11}
                    fill="#fbbf24"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                    textAnchor="middle"
                  >
                    ☀ Sun ({sun.elevationDeg > 0 ? "+" : ""}{sun.elevationDeg}°)
                  </text>
                </g>

                {/* Earth Marker */}
                <g>
                  <line
                    x1={earthX}
                    y1={earthY}
                    x2={earthX}
                    y2={elToY(earth.horizonMaskDeg)}
                    stroke="rgba(56, 189, 248, 0.6)"
                    strokeDasharray="2,2"
                  />
                  <circle
                    cx={earthX}
                    cy={earthY}
                    r={7}
                    fill="#0ea5e9"
                    stroke="#fff"
                    strokeWidth="1.5"
                  />
                  <text
                    x={earthX}
                    y={earthY - 11}
                    fill="#38bdf8"
                    fontSize="10"
                    fontWeight="bold"
                    fontFamily="sans-serif"
                    textAnchor="middle"
                  >
                    ⊕ Earth ({earth.elevationDeg > 0 ? "+" : ""}{earth.elevationDeg}°)
                  </text>
                </g>
              </svg>
            </div>

            {/* Conventions & Legend */}
            <div className="mt-3 flex flex-wrap items-center justify-between gap-2 text-[11px] font-mono text-muted-foreground">
              <div className="flex items-center gap-4">
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-amber-500 inline-block" />
                  Sun Sightline ({sun.visibility})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2.5 w-2.5 rounded-full bg-sky-500 inline-block" />
                  Earth Sightline ({earth.visibility})
                </span>
                <span className="flex items-center gap-1.5">
                  <span className="h-2 w-4 bg-slate-600 inline-block rounded-sm" />
                  Terrain Horizon
                </span>
                {showSunArc && (
                  <span className="flex items-center gap-1.5">
                    <span className="h-1 w-4 bg-amber-400 inline-block rounded-xs" />
                    48h Sun Arc (Gold=Clear, Red=Blocked)
                  </span>
                )}
              </div>
              <span>Angles: Azimuth 0°–360° (N=0°, E=90°), Elevation -10° to +20°</span>
            </div>
          </div>
        ) : (
          /* Accessible Horizon Data Table */
          <div className="mt-4">
            {/* Quick Summary of Current Targets */}
            <div className="mb-3 grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs">
              <div className="rounded-xs border border-amber-500/30 bg-amber-950/20 p-2.5">
                <p className="text-[10px] uppercase font-bold text-amber-300">☀️ Sun Direction ({sun.azimuthDeg}° Heading)</p>
                <p className="mt-0.5 font-mono text-[11px] text-white">
                  Terrain horizon: <span className="text-amber-200">{sun.horizonMaskDeg}°</span> • Sun elevation: <span className="text-white">{sun.elevationDeg}°</span>
                </p>
                <p className={`mt-0.5 font-bold text-[11px] ${sun.visibility === "CLEAR" ? "text-emerald-400" : sun.visibility === "BLOCKED" ? "text-rose-400" : "text-amber-300"}`}>
                  {sun.visibility}: {sun.marginDeg > 0 ? "+" : ""}{sun.marginDeg}° relative to horizon
                </p>
              </div>
              <div className="rounded-xs border border-sky-500/30 bg-sky-950/20 p-2.5">
                <p className="text-[10px] uppercase font-bold text-sky-300">🌍 Earth Direction ({earth.azimuthDeg}° Heading)</p>
                <p className="mt-0.5 font-mono text-[11px] text-white">
                  Terrain horizon: <span className="text-sky-200">{earth.horizonMaskDeg}°</span> • Earth elevation: <span className="text-white">{earth.elevationDeg}°</span>
                </p>
                <p className={`mt-0.5 font-bold text-[11px] ${earth.visibility === "CLEAR" ? "text-emerald-400" : earth.visibility === "BLOCKED" ? "text-rose-400" : "text-amber-300"}`}>
                  {earth.visibility}: {earth.marginDeg > 0 ? "+" : ""}{earth.marginDeg}° relative to horizon
                </p>
              </div>
            </div>

            <div className="max-h-64 overflow-y-auto rounded-xs border border-white/20 bg-black/90">
              <table className="w-full text-left font-mono text-xs" aria-label="360-degree horizon profile samples">
                <thead className="bg-black/95 text-[10px] text-white/60 uppercase sticky top-0 border-b border-white/20">
                  <tr>
                    <th className="p-2 pl-3">Compass Heading</th>
                    <th className="p-2">Direction</th>
                    <th className="p-2">Terrain Horizon</th>
                    <th className="p-2">Sun Visibility</th>
                    <th className="p-2 pr-3">Earth Visibility</th>
                  </tr>
                </thead>
              <tbody className="divide-y divide-white/10 bg-black/80">
                {sortedProfile.map((pt) => {
                  const nearSun = Math.abs(pt.azimuthDeg - sun.azimuthDeg) <= 2.5;
                  const nearEarth = Math.abs(pt.azimuthDeg - earth.azimuthDeg) <= 2.5;
                  return (
                    <tr
                      key={pt.azimuthDeg}
                      className={
                        nearSun
                          ? "bg-amber-950/20 font-semibold text-white"
                          : nearEarth
                            ? "bg-sky-950/20 font-semibold text-white"
                            : "text-white/70 hover:bg-white/5"
                      }
                    >
                      <td className="p-2 pl-3 font-semibold text-white">
                        {pt.azimuthDeg}°
                      </td>
                      <td className="p-2">
                        {pt.azimuthDeg === 0
                          ? "North"
                          : pt.azimuthDeg === 90
                            ? "East"
                            : pt.azimuthDeg === 180
                              ? "South"
                              : pt.azimuthDeg === 270
                                ? "West"
                                : `${pt.azimuthDeg}° Sector`}
                      </td>
                      <td className="p-2 text-white">
                        {pt.elevationDeg > 0 ? "+" : ""}{pt.elevationDeg}°
                      </td>
                      <td className="p-2">
                        {nearSun ? (
                          <span className={sun.visibility === "CLEAR" ? "text-emerald-400 font-bold" : sun.visibility === "BLOCKED" ? "text-rose-400 font-bold" : "text-amber-300 font-bold"}>
                            ☀ {sun.marginDeg > 0 ? "+" : ""}{sun.marginDeg}° ({sun.visibility})
                          </span>
                        ) : (
                          <span className="opacity-40">—</span>
                        )}
                      </td>
                      <td className="p-2 pr-3">
                        {nearEarth ? (
                          <span className={earth.visibility === "CLEAR" ? "text-emerald-400 font-bold" : earth.visibility === "BLOCKED" ? "text-rose-400 font-bold" : "text-amber-300 font-bold"}>
                            ⊕ {earth.marginDeg > 0 ? "+" : ""}{earth.marginDeg}° ({earth.visibility})
                          </span>
                        ) : (
                          <span className="opacity-40">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

        <div className="mt-4 flex items-center justify-between border-t border-white/10 pt-3">
          <p className="text-[10px] text-white/50">
            LOLA elevations are sampled every 240 m. NASA NAIF SPICE frame alignment is verified against the MOON_ME datum; geometric visibility is not a power or link estimate.
          </p>
          <Button variant="outline" size="sm" onClick={onClose} className="h-7 px-3 text-xs border-white/20 text-white hover:border-[#00e5ff] hover:text-[#00e5ff]">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
