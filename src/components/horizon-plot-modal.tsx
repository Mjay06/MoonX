"use client";

import React, { useState } from "react";
import { SiteTelemetry } from "@/types/mission";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface HorizonPlotModalProps {
  telemetry: SiteTelemetry;
  isOpen: boolean;
  onClose: () => void;
}

export function HorizonPlotModal({
  telemetry,
  isOpen,
  onClose,
}: HorizonPlotModalProps) {
  const [viewMode, setViewMode] = useState<"plot" | "table">("plot");

  if (!isOpen) return null;

  const { horizonProfile, sun, earth, locationName, timestampUtc } = telemetry;

  // Plot dimensions
  const svgWidth = 680;
  const svgHeight = 260;
  const padding = { top: 30, right: 30, bottom: 40, left: 45 };
  const plotWidth = svgWidth - padding.left - padding.right;
  const plotHeight = svgHeight - padding.top - padding.bottom;

  // Elevation range: -2° to +10°
  const minElev = -2;
  const maxElev = 10;

  const azToX = (az: number) => padding.left + ((az % 360) / 360) * plotWidth;
  const elToY = (el: number) =>
    padding.top + plotHeight - ((el - minElev) / (maxElev - minElev)) * plotHeight;

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
      className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 p-4 backdrop-blur-sm"
    >
      <div className="relative w-full max-w-3xl rounded-xl border border-border/80 bg-card/95 p-5 shadow-2xl backdrop-blur-glass">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-border/40 pb-3">
          <div>
            <div className="flex items-center gap-2">
              <h2
                id="horizon-plot-title"
                className="text-sm font-bold uppercase tracking-wider text-foreground"
              >
                360° Local Horizon Profile & Celestial Sightlines
              </h2>
              <Badge variant="illustrative">Illustrative DEM</Badge>
            </div>
            <p className="mt-0.5 font-mono text-xs text-muted-foreground">
              Site: <span className="text-foreground">{locationName}</span> | Epoch:{" "}
              <span className="text-foreground">{timestampUtc}</span>
            </p>
          </div>

          <div className="flex items-center gap-2">
            <div className="rounded-md border border-border/60 bg-secondary/50 p-0.5">
              <Button
                variant={viewMode === "plot" ? "accent" : "ghost"}
                size="sm"
                onClick={() => setViewMode("plot")}
                className="h-6 px-2 text-xs font-mono"
              >
                Plot
              </Button>
              <Button
                variant={viewMode === "table" ? "accent" : "ghost"}
                size="sm"
                onClick={() => setViewMode("table")}
                className="h-6 px-2 text-xs font-mono"
              >
                Table
              </Button>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Close horizon modal"
              className="h-7 w-7 rounded-md border border-border/60 flex items-center justify-center text-muted-foreground hover:bg-secondary/80 hover:text-foreground text-sm"
            >
              ✕
            </button>
          </div>
        </div>

        {viewMode === "plot" ? (
          <div className="mt-4">
            {/* SVG Plot */}
            <div className="overflow-hidden rounded-lg border border-border/60 bg-black/40 p-2">
              <svg
                viewBox={`0 0 ${svgWidth} ${svgHeight}`}
                className="w-full h-auto select-none"
                aria-label="Panoramic 360-degree terrain elevation mask against Sun and Earth apparent elevations"
              >
                {/* Horizontal grid lines for elevations */}
                {[-2, 0, 2, 4, 6, 8, 10].map((el) => {
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
                  Topographic Horizon Mask
                </span>
              </div>
              <span>Angles: Azimuth 0°–360° (N=0°, E=90°), Elevation -2° to +10°</span>
            </div>
          </div>
        ) : (
          /* Accessible Horizon Data Table */
          <div className="mt-4 max-h-72 overflow-y-auto rounded-lg border border-border/60">
            <table className="w-full text-left font-mono text-xs" aria-label="360-degree horizon profile samples">
              <thead className="bg-secondary/80 text-[10px] text-muted-foreground uppercase sticky top-0">
                <tr>
                  <th className="p-2 pl-3">Azimuth (Deg)</th>
                  <th className="p-2">Cardinal Sector</th>
                  <th className="p-2">Horizon Mask (Deg)</th>
                  <th className="p-2">Sun Clearance</th>
                  <th className="p-2 pr-3">Earth Clearance</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/30 bg-card/60">
                {sortedProfile.map((pt) => {
                  const nearSun = Math.abs(pt.azimuthDeg - sun.azimuthDeg) <= 2.5;
                  const nearEarth = Math.abs(pt.azimuthDeg - earth.azimuthDeg) <= 2.5;
                  return (
                    <tr
                      key={pt.azimuthDeg}
                      className={
                        nearSun
                          ? "bg-amber-950/20 font-semibold"
                          : nearEarth
                            ? "bg-sky-950/20 font-semibold"
                            : "text-muted-foreground hover:bg-secondary/30"
                      }
                    >
                      <td className="p-2 pl-3 font-semibold text-foreground">
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
                      <td className="p-2 text-foreground">
                        {pt.elevationDeg > 0 ? "+" : ""}{pt.elevationDeg}°
                      </td>
                      <td className="p-2">
                        {nearSun ? (
                          <span className={sun.marginDeg > 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
                            ☀ {sun.marginDeg > 0 ? "+" : ""}{sun.marginDeg}° ({sun.visibility})
                          </span>
                        ) : (
                          <span className="opacity-40">—</span>
                        )}
                      </td>
                      <td className="p-2 pr-3">
                        {nearEarth ? (
                          <span className={earth.marginDeg > 0 ? "text-emerald-400 font-bold" : "text-rose-400 font-bold"}>
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
        )}

        <div className="mt-4 flex items-center justify-between border-t border-border/40 pt-3">
          <p className="text-[10px] text-muted-foreground">
            Calculations assume topocentric surface observer (+2m mast) on Moon Mean Earth / Polar Axis sphere.
          </p>
          <Button variant="secondary" size="sm" onClick={onClose} className="h-7 px-3 text-xs">
            Close
          </Button>
        </div>
      </div>
    </div>
  );
}
