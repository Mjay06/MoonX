"use client";

import React, { useState, useEffect } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface TimeScrubberPanelProps {
  baseTimeUtc: string; // ISO UTC string e.g. "2026-11-15T00:00:00Z"
  durationHours?: number;
  timeOffsetHours: number;
  onTimeChange: (offsetHours: number) => void;
}

export function TimeScrubberPanel({
  baseTimeUtc,
  durationHours = 48,
  timeOffsetHours,
  onTimeChange,
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
    }, 400);
    return () => clearInterval(interval);
  }, [isPlaying, timeOffsetHours, durationHours, onTimeChange]);

  const handleStep = (delta: number) => {
    setIsPlaying(false);
    onTimeChange(Math.max(0, Math.min(durationHours, timeOffsetHours + delta)));
  };

  // Sample visibility windows across the 48-hour timeline for the illustrative track
  // Solar: clear during [0-18h], [26-44h]
  // Earth: clear during [6-34h], [40-48h]
  const intervals = [
    { startH: 0, endH: 6, sun: "CLEAR", earth: "BLOCKED", joint: "PARTIAL (Solar Only)" },
    { startH: 6, endH: 12, sun: "CLEAR", earth: "CLEAR", joint: "FEASIBLE (Solar + DTE)" },
    { startH: 12, endH: 18, sun: "CLEAR", earth: "CLEAR", joint: "FEASIBLE (Solar + DTE)" },
    { startH: 18, endH: 24, sun: "BLOCKED", earth: "CLEAR", joint: "PARTIAL (DTE Only)" },
    { startH: 24, endH: 30, sun: "GRAZING", earth: "CLEAR", joint: "MARGINAL" },
    { startH: 30, endH: 36, sun: "CLEAR", earth: "BLOCKED", joint: "PARTIAL (Solar Only)" },
    { startH: 36, endH: 42, sun: "CLEAR", earth: "CLEAR", joint: "FEASIBLE (Solar + DTE)" },
    { startH: 42, endH: 48, sun: "BLOCKED", earth: "CLEAR", joint: "PARTIAL (DTE Only)" },
  ];

  return (
    <section
      aria-labelledby="time-scrubber-heading"
      className="pointer-events-auto absolute bottom-4 left-4 right-4 z-20 rounded-xl border border-border/70 bg-card/85 p-3 shadow-2xl backdrop-blur-md sm:bottom-6 sm:left-6 sm:right-6"
    >
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/40 pb-2">
        <div className="flex items-center gap-2">
          <h2
            id="time-scrubber-heading"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
          >
            Mission Timeline (UTC)
          </h2>
          <Badge variant="illustrative">Illustrative Ephemeris</Badge>
        </div>

        <div className="flex items-center gap-3">
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
          {/* Multi-track visibility guide */}
          <div className="relative mb-1.5 flex flex-col gap-1 text-[10px] font-mono">
            {/* Solar track bar */}
            <div className="flex items-center gap-2">
              <span className="w-14 text-amber-300 font-semibold text-right">Sun LOS:</span>
              <div className="relative h-2 w-full rounded bg-secondary/60 overflow-hidden flex">
                <div className="h-full bg-amber-500/70" style={{ width: "37.5%" }} title="Solar Clear: T+0h to T+18h" />
                <div className="h-full bg-rose-950/70" style={{ width: "16.7%" }} title="Solar Blocked: T+18h to T+26h" />
                <div className="h-full bg-amber-500/70" style={{ width: "37.5%" }} title="Solar Clear: T+26h to T+44h" />
                <div className="h-full bg-rose-950/70" style={{ width: "8.3%" }} title="Solar Blocked: T+44h to T+48h" />
              </div>
            </div>

            {/* Earth track bar */}
            <div className="flex items-center gap-2">
              <span className="w-14 text-sky-300 font-semibold text-right">Earth DTE:</span>
              <div className="relative h-2 w-full rounded bg-secondary/60 overflow-hidden flex">
                <div className="h-full bg-rose-950/70" style={{ width: "12.5%" }} title="Earth Blocked: T+0h to T+6h" />
                <div className="h-full bg-sky-500/70" style={{ width: "58.3%" }} title="Earth Clear: T+6h to T+34h" />
                <div className="h-full bg-rose-950/70" style={{ width: "12.5%" }} title="Earth Blocked: T+34h to T+40h" />
                <div className="h-full bg-sky-500/70" style={{ width: "16.7%" }} title="Earth Clear: T+40h to T+48h" />
              </div>
            </div>
          </div>

          {/* Time Scrubber Slider */}
          <div className="relative mt-2">
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

          {/* Time Controls Bar */}
          <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
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
                {isPlaying ? "Pause" : "Play"}
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
                className="h-7 px-2 font-mono text-xs text-muted-foreground"
              >
                Reset
              </Button>
            </div>

            <div className="flex items-center gap-3 text-[10px] font-mono text-muted-foreground">
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-amber-400 inline-block" /> Sun Clear
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-sky-400 inline-block" /> Earth Clear
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-2 rounded-full bg-rose-500 inline-block" /> Horizon Masked
              </span>
            </div>
          </div>
        </div>
      ) : (
        /* Accessible Tabular Alternative */
        <div className="mt-3 max-h-44 overflow-y-auto rounded border border-border/60">
          <table className="w-full text-left font-mono text-xs" aria-label="Timeline visibility windows table">
            <thead className="bg-secondary/70 text-[10px] text-muted-foreground uppercase sticky top-0">
              <tr>
                <th className="p-1.5 pl-2.5">Interval</th>
                <th className="p-1.5">Sun Visibility</th>
                <th className="p-1.5">Earth DTE</th>
                <th className="p-1.5">Joint State</th>
                <th className="p-1.5 pr-2.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 bg-card/60">
              {intervals.map((row) => (
                <tr
                  key={row.startH}
                  className={
                    timeOffsetHours >= row.startH && timeOffsetHours < row.endH
                      ? "bg-primary/15 font-semibold text-foreground"
                      : "text-muted-foreground hover:bg-secondary/30"
                  }
                >
                  <td className="p-1.5 pl-2.5">
                    T+{row.startH}h to T+{row.endH}h
                  </td>
                  <td className="p-1.5">
                    <span className={row.sun === "CLEAR" ? "text-amber-400" : "text-rose-400"}>
                      {row.sun}
                    </span>
                  </td>
                  <td className="p-1.5">
                    <span className={row.earth === "CLEAR" ? "text-sky-400" : "text-rose-400"}>
                      {row.earth}
                    </span>
                  </td>
                  <td className="p-1.5">
                    <span
                      className={
                        row.joint.startsWith("FEASIBLE")
                          ? "text-emerald-400"
                          : row.joint.startsWith("PARTIAL")
                            ? "text-sky-400"
                            : "text-amber-400"
                      }
                    >
                      {row.joint}
                    </span>
                  </td>
                  <td className="p-1.5 pr-2.5 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onTimeChange(row.startH)}
                      className="h-5 px-1.5 text-[10px]"
                    >
                      Jump
                    </Button>
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
