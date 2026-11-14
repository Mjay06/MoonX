"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LunarLocation } from "@/types/mission";
import { calculateSampleTelemetry } from "@/lib/sample-telemetry";

interface TimeScrubberPanelProps {
  baseTimeUtc: string; // ISO UTC string e.g. "2026-11-15T00:00:00Z"
  durationHours?: number;
  timeOffsetHours: number;
  onTimeChange: (offsetHours: number) => void;
  selectedLocation?: LunarLocation | null;
}

export function TimeScrubberPanel({
  baseTimeUtc,
  durationHours = 48,
  timeOffsetHours,
  onTimeChange,
  selectedLocation,
}: TimeScrubberPanelProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showTableView, setShowTableView] = useState(false);

  // Derive current UTC timestamp from base time + offset
  const baseDate = new Date(baseTimeUtc);
  const currentDate = new Date(baseDate.getTime() + timeOffsetHours * 3600 * 1000);
  const currentIsoUtc = currentDate.toISOString().replace(".000", "");

  // Auto-play timeline simulation
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      onTimeChange(
        timeOffsetHours >= durationHours ? 0 : Math.min(durationHours, timeOffsetHours + 0.5)
      );
    }, 350);
    return () => clearInterval(interval);
  }, [isPlaying, timeOffsetHours, durationHours, onTimeChange]);

  const handleStep = (delta: number) => {
    setIsPlaying(false);
    onTimeChange(Math.max(0, Math.min(durationHours, timeOffsetHours + delta)));
  };

  // Dynamically compute the 48-hour visibility profile for the active location
  const feasibilityProfile = useMemo(() => {
    const stepSize = 0.5;
    const stepsCount = Math.round(durationHours / stepSize);
    const steps = [];
    let feasibleHoursTotal = 0;
    let solarHoursTotal = 0;
    let earthHoursTotal = 0;

    for (let i = 0; i < stepsCount; i++) {
      const h = i * stepSize;
      let isSunClear = false;
      let isEarthClear = false;

      if (selectedLocation) {
        const telem = calculateSampleTelemetry(selectedLocation, baseTimeUtc, h);
        isSunClear = telem.sun.visibility === "CLEAR";
        isEarthClear = telem.earth.visibility === "CLEAR";
      } else {
        // Fallback default profile if no location is selected
        isSunClear = (h >= 0 && h <= 18) || (h >= 26 && h <= 44);
        isEarthClear = (h >= 6 && h <= 34) || (h >= 40 && h <= 48);
      }

      const isBothClear = isSunClear && isEarthClear;
      if (isBothClear) feasibleHoursTotal += stepSize;
      if (isSunClear) solarHoursTotal += stepSize;
      if (isEarthClear) earthHoursTotal += stepSize;

      steps.push({
        hour: h,
        isSunClear,
        isEarthClear,
        isBothClear,
      });
    }

    return {
      steps,
      feasibleHoursTotal: Number(feasibleHoursTotal.toFixed(1)),
      solarHoursTotal: Number(solarHoursTotal.toFixed(1)),
      earthHoursTotal: Number(earthHoursTotal.toFixed(1)),
      feasiblePct: Math.round((feasibleHoursTotal / durationHours) * 100),
    };
  }, [selectedLocation, baseTimeUtc, durationHours]);

  // Generate 8 tabular intervals for the accessible table view
  const intervals = useMemo(() => {
    const list = [];
    const intervalLen = 6;
    for (let startH = 0; startH < durationHours; startH += intervalLen) {
      const endH = startH + intervalLen;
      const midH = startH + intervalLen / 2;
      let sunStatus = "CLEAR";
      let earthStatus = "CLEAR";

      if (selectedLocation) {
        const telem = calculateSampleTelemetry(selectedLocation, baseTimeUtc, midH);
        sunStatus = telem.sun.visibility;
        earthStatus = telem.earth.visibility;
      } else {
        sunStatus = (midH <= 18 || midH >= 26) ? "CLEAR" : "BLOCKED";
        earthStatus = (midH >= 6 && midH <= 34) ? "CLEAR" : "BLOCKED";
      }

      const jointStatus =
        sunStatus === "CLEAR" && earthStatus === "CLEAR"
          ? "FEASIBLE (Solar + DTE)"
          : sunStatus === "CLEAR"
            ? "PARTIAL (Solar Only)"
            : earthStatus === "CLEAR"
              ? "PARTIAL (DTE Only)"
              : "OCCULTED / BLOCKED";

      list.push({ startH, endH, sun: sunStatus, earth: earthStatus, joint: jointStatus });
    }
    return list;
  }, [selectedLocation, baseTimeUtc, durationHours]);

  const scrubProgressPct = Math.min(100, Math.max(0, (timeOffsetHours / durationHours) * 100));

  return (
    <section
      aria-labelledby="time-scrubber-heading"
      className="pointer-events-auto absolute bottom-4 left-4 right-4 z-20 rounded-xl border border-border/70 bg-card/85 p-3.5 shadow-2xl backdrop-blur-md sm:bottom-6 sm:left-6 sm:right-6"
    >
      {/* Header bar with UTC time, Elapsed Time, and View Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
        <div className="flex items-center gap-2">
          <h2
            id="time-scrubber-heading"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
          >
            Mission Timeline (UTC)
          </h2>
          <Badge variant="illustrative">48-Hour Visibility Windows</Badge>
        </div>

        <div className="flex items-center gap-3">
          {/* Dual Feasibility Summary Pill */}
          <span className="hidden items-center gap-1.5 rounded-full border border-emerald-500/40 bg-emerald-950/50 px-2.5 py-0.5 font-mono text-[10px] text-emerald-300 md:inline-flex">
            <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>Dual Feasible: {feasibilityProfile.feasibleHoursTotal}h / {durationHours}h ({feasibilityProfile.feasiblePct}%)</span>
          </span>

          {/* Mission Elapsed Time */}
          <span className="font-mono text-xs font-semibold text-primary">
            T+{timeOffsetHours.toFixed(1).padStart(4, "0")}h / {durationHours}h
          </span>
          {/* Current UTC timestamp */}
          <span className="rounded bg-secondary/80 px-2 py-0.5 font-mono text-xs font-medium text-foreground">
            {currentIsoUtc}
          </span>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setShowTableView((v) => !v)}
            className="h-6 px-2 text-[11px] font-mono text-muted-foreground hover:text-foreground"
          >
            {showTableView ? "Hide Table" : "Table View"}
          </Button>
        </div>
      </div>

      {!showTableView ? (
        <div className="mt-3">
          {/* Multi-Track Visual Visibility Windows (Gantt-Style) */}
          <div className="relative mb-2 flex flex-col gap-1.5 text-[10px] font-mono">
            {/* Track 1: DUAL FEASIBLE WINDOW (Power + Comms Simultaneously) */}
            <div className="flex items-center gap-2">
              <span className="w-16 shrink-0 font-semibold text-emerald-400 text-right">
                Dual LOS:
              </span>
              <div className="relative h-3 w-full rounded-sm bg-secondary/70 overflow-hidden flex border border-border/40">
                {feasibilityProfile.steps.map((s, idx) => (
                  <div
                    key={`dual-${idx}`}
                    style={{ width: `${100 / feasibilityProfile.steps.length}%` }}
                    className={`h-full ${
                      s.isBothClear
                        ? "bg-emerald-400/90 shadow-[0_0_8px_rgba(52,211,153,0.5)]"
                        : "bg-slate-900/60"
                    }`}
                    title={`T+${s.hour}h: ${s.isBothClear ? "Concurrent Power & DTE Feasible" : "No Dual Coverage"}`}
                  />
                ))}
              </div>
            </div>

            {/* Track 2: SOLAR POWER WINDOW (Sun Line-of-Sight) */}
            <div className="flex items-center gap-2">
              <span className="w-16 shrink-0 font-semibold text-amber-300 text-right">
                Sun LOS:
              </span>
              <div className="relative h-3 w-full rounded-sm bg-secondary/70 overflow-hidden flex border border-border/40">
                {feasibilityProfile.steps.map((s, idx) => (
                  <div
                    key={`sun-${idx}`}
                    style={{ width: `${100 / feasibilityProfile.steps.length}%` }}
                    className={`h-full ${
                      s.isSunClear ? "bg-amber-400/85" : "bg-rose-950/70"
                    }`}
                    title={`T+${s.hour}h: ${s.isSunClear ? "Solar Clear (Power Generation)" : "Solar Blocked by Crater Wall"}`}
                  />
                ))}
              </div>
            </div>

            {/* Track 3: DIRECT-TO-EARTH LINK WINDOW (Earth Line-of-Sight) */}
            <div className="flex items-center gap-2">
              <span className="w-16 shrink-0 font-semibold text-sky-300 text-right">
                Earth DTE:
              </span>
              <div className="relative h-3 w-full rounded-sm bg-secondary/70 overflow-hidden flex border border-border/40">
                {feasibilityProfile.steps.map((s, idx) => (
                  <div
                    key={`earth-${idx}`}
                    style={{ width: `${100 / feasibilityProfile.steps.length}%` }}
                    className={`h-full ${
                      s.isEarthClear ? "bg-sky-400/85" : "bg-rose-950/70"
                    }`}
                    title={`T+${s.hour}h: ${s.isEarthClear ? "Earth DTE Clear (Telemetry Link)" : "Earth Blocked by Terrain Rim"}`}
                  />
                ))}
              </div>
            </div>

            {/* Current Scrubbed Time Marker Line spanning all 3 tracks */}
            <div
              className="pointer-events-none absolute top-0 bottom-0 w-[2px] bg-primary shadow-[0_0_6px_rgba(56,189,248,1)] z-10 transition-all duration-75"
              style={{
                left: `calc(4.5rem + (100% - 4.5rem) * ${scrubProgressPct / 100})`,
              }}
            />
          </div>

          {/* Time Scrubber Slider */}
          <div className="relative mt-1">
            <Slider
              value={timeOffsetHours}
              min={0}
              max={durationHours}
              step={0.5}
              onChange={onTimeChange}
              aria-label="Mission scrubber time in hours"
              aria-valuetext={`T plus ${timeOffsetHours} hours, ${currentIsoUtc}`}
            />
          </div>

          {/* Timeline Axis Hour Ticks */}
          <div className="flex justify-between pl-18 pr-1 font-mono text-[9px] text-muted-foreground mt-0.5">
            <span>T+0h</span>
            <span>T+6h</span>
            <span>T+12h</span>
            <span>T+18h</span>
            <span>T+24h</span>
            <span>T+30h</span>
            <span>T+36h</span>
            <span>T+42h</span>
            <span>T+48h</span>
          </div>

          {/* Time Controls Bar & Legend */}
          <div className="mt-2.5 flex flex-wrap items-center justify-between gap-2">
            {/* Step Controls */}
            <div className="flex items-center gap-1">
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStep(-6)}
                title="Step backward 6 hours"
                className="h-7 px-2 font-mono text-xs"
              >
                -6h
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStep(-1)}
                title="Step backward 1 hour"
                className="h-7 px-2 font-mono text-xs"
              >
                -1h
              </Button>
              <Button
                variant={isPlaying ? "destructive" : "accent"}
                size="sm"
                onClick={() => setIsPlaying(!isPlaying)}
                className="h-7 px-3 font-mono text-xs"
              >
                {isPlaying ? "⏸ Pause" : "▶ Play 48h"}
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStep(1)}
                title="Step forward 1 hour"
                className="h-7 px-2 font-mono text-xs"
              >
                +1h
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={() => handleStep(6)}
                title="Step forward 6 hours"
                className="h-7 px-2 font-mono text-xs"
              >
                +6h
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => {
                  setIsPlaying(false);
                  onTimeChange(0);
                }}
                title="Reset scrubber to mission start (T+0)"
                className="h-7 px-2 font-mono text-xs text-muted-foreground hover:text-foreground"
              >
                Reset T0
              </Button>
            </div>

            {/* Visual Legend */}
            <div className="hidden flex-wrap items-center gap-3 font-mono text-[10px] text-muted-foreground sm:flex">
              <span className="flex items-center gap-1">
                <span className="h-2 w-3 rounded-xs bg-emerald-400" />
                <span>Dual LOS (Landing/EVA)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-3 rounded-xs bg-amber-400" />
                <span>Sun LOS (Power)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-3 rounded-xs bg-sky-400" />
                <span>Earth DTE (Comms)</span>
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-3 rounded-xs bg-rose-950 border border-rose-800" />
                <span>Occulted</span>
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Accessible Tabular View of Intervals */
        <div className="mt-3 max-h-56 overflow-y-auto rounded border border-border/60 bg-secondary/20 p-2 font-mono text-xs">
          <table className="w-full text-left" aria-label="Tabular visibility timeline">
            <thead>
              <tr className="border-b border-border/40 text-[10px] uppercase text-muted-foreground">
                <th className="py-1">Mission Interval</th>
                <th className="py-1">Sun LOS</th>
                <th className="py-1">Earth DTE</th>
                <th className="py-1">Feasibility Classification</th>
                <th className="py-1 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {intervals.map((item, idx) => (
                <tr
                  key={idx}
                  className="border-b border-border/20 text-xs hover:bg-secondary/40 transition-colors"
                >
                  <td className="py-1.5 font-semibold text-foreground">
                    T+{item.startH.toString().padStart(2, "0")}h – T+{item.endH.toString().padStart(2, "0")}h
                  </td>
                  <td className="py-1.5">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] ${
                        item.sun === "CLEAR"
                          ? "bg-amber-950/60 text-amber-300 border border-amber-600/40"
                          : "bg-rose-950/60 text-rose-300 border border-rose-800/40"
                      }`}
                    >
                      {item.sun}
                    </span>
                  </td>
                  <td className="py-1.5">
                    <span
                      className={`rounded px-1.5 py-0.5 text-[10px] ${
                        item.earth === "CLEAR"
                          ? "bg-sky-950/60 text-sky-300 border border-sky-600/40"
                          : "bg-rose-950/60 text-rose-300 border border-rose-800/40"
                      }`}
                    >
                      {item.earth}
                    </span>
                  </td>
                  <td className="py-1.5">
                    <span
                      className={
                        item.joint.startsWith("FEASIBLE")
                          ? "font-semibold text-emerald-300"
                          : item.joint.startsWith("PARTIAL")
                            ? "text-sky-300"
                            : "text-muted-foreground"
                      }
                    >
                      {item.joint}
                    </span>
                  </td>
                  <td className="py-1.5 text-right">
                    <button
                      type="button"
                      onClick={() => {
                        onTimeChange(item.startH);
                        setShowTableView(false);
                      }}
                      className="rounded bg-secondary/80 px-2 py-0.5 text-[10px] hover:bg-primary hover:text-primary-foreground transition-colors"
                    >
                      Jump to T+{item.startH}h
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
