"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { LunarLocation, VisibilitySample } from "@/types/mission";
import type { TelemetryState } from "./telemetry-panel";

interface TimeScrubberPanelProps {
  baseTimeUtc: string; // ISO UTC string e.g. "2026-11-15T00:00:00Z"
  durationHours?: number;
  timeOffsetHours: number;
  onTimeChange: (offsetHours: number) => void;
  selectedLocation?: LunarLocation | null;
  visibilitySamples: VisibilitySample[] | null;
  dataState: TelemetryState;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export function TimeScrubberPanel({
  baseTimeUtc,
  durationHours = 48,
  timeOffsetHours,
  onTimeChange,
  selectedLocation,
  visibilitySamples,
  dataState,
  isCollapsed = false,
  onToggleCollapse,
}: TimeScrubberPanelProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [showDebrief, setShowDebrief] = useState(false);
  const stepsCount = Math.round(durationHours / 0.5);
  const hasVisibilityData =
    dataState === "ready" &&
    visibilitySamples !== null &&
    visibilitySamples.length === stepsCount + 1;

  // Derive current UTC timestamp from base time + offset
  const baseDate = new Date(baseTimeUtc);
  const currentDate = new Date(baseDate.getTime() + timeOffsetHours * 3600 * 1000);
  const currentIsoUtc = currentDate.toISOString().replace(".000", "");

  // Playback only advances through the returned ephemeris samples.
  useEffect(() => {
    if (!isPlaying || !hasVisibilityData) return;
    const interval = setInterval(() => {
      if (timeOffsetHours >= durationHours) {
        setIsPlaying(false);
        setShowDebrief(true);
      } else {
        const nextTime = Math.min(durationHours, timeOffsetHours + 0.5);
        onTimeChange(nextTime);
        if (nextTime >= durationHours) {
          setIsPlaying(false);
          setShowDebrief(true);
        }
      }
    }, 350);
    return () => clearInterval(interval);
  }, [isPlaying, hasVisibilityData, timeOffsetHours, durationHours, onTimeChange]);

  const handleStep = (delta: number) => {
    setIsPlaying(false);
    onTimeChange(Math.max(0, Math.min(durationHours, timeOffsetHours + delta)));
  };

  const feasibilityProfile = useMemo(() => {
    const stepSize = 0.5;
    const steps = [];
    let dualVisibilityHours = 0;
    let sunVisibilityHours = 0;
    let earthVisibilityHours = 0;

    for (let i = 0; i < stepsCount; i++) {
      const h = i * stepSize;
      const sample = visibilitySamples?.[i];
      const isSunClear = sample?.sun.visibility === "CLEAR";
      const isEarthClear = sample?.earth.visibility === "CLEAR";
      const known =
        sample !== undefined &&
        sample.sun.visibility !== "UNKNOWN" &&
        sample.earth.visibility !== "UNKNOWN";

      const isBothClear = isSunClear && isEarthClear;
      if (known && isBothClear) dualVisibilityHours += stepSize;
      if (known && isSunClear) sunVisibilityHours += stepSize;
      if (known && isEarthClear) earthVisibilityHours += stepSize;

      steps.push({
        hour: h,
        isSunClear,
        isEarthClear,
        isBothClear,
        known,
        sunStatus: sample?.sun.visibility ?? "UNKNOWN",
        earthStatus: sample?.earth.visibility ?? "UNKNOWN",
        dualStatus: !known
          ? "UNKNOWN"
          : isBothClear
            ? "CLEAR"
            : sample?.sun.visibility === "BLOCKED" ||
                sample?.earth.visibility === "BLOCKED"
              ? "BLOCKED"
              : "GRAZING",
      });
    }

    return {
      steps,
      dataAvailable: hasVisibilityData,
      dualVisibilityHours: Number(dualVisibilityHours.toFixed(1)),
      sunVisibilityHours: Number(sunVisibilityHours.toFixed(1)),
      earthVisibilityHours: Number(earthVisibilityHours.toFixed(1)),
      dualVisibilityPct: Math.round(
        (dualVisibilityHours / durationHours) * 100
      ),
    };
  }, [durationHours, hasVisibilityData, stepsCount, visibilitySamples]);

  const missionDebrief = useMemo(() => {
    const { steps } = feasibilityProfile;
    let currentWindow: { startH: number; endH: number; len: number } | null = null;
    const dualWindows: { startH: number; endH: number; len: number }[] = [];

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      if (s.known && s.isBothClear) {
        if (!currentWindow) {
          currentWindow = { startH: s.hour, endH: s.hour + 0.5, len: 0.5 };
        } else {
          currentWindow.endH = s.hour + 0.5;
          currentWindow.len = Number((currentWindow.len + 0.5).toFixed(1));
        }
      } else {
        if (currentWindow) {
          dualWindows.push(currentWindow);
          currentWindow = null;
        }
      }
    }
    if (currentWindow) dualWindows.push(currentWindow);

    const bestWindow = [...dualWindows].sort((a, b) => b.len - a.len)[0] ?? null;

    return {
      bestWindow,
      dualWindowsCount: dualWindows.length,
    };
  }, [feasibilityProfile]);

  const getTrackColor = (status: string) => {
    if (status === "CLEAR") return "bg-emerald-500";
    if (status === "BLOCKED") return "bg-slate-600";
    if (status === "GRAZING") return "bg-amber-400";
    return "bg-white/10";
  };

  if (isCollapsed) {
    return (
      <section
        aria-label="Mission playback mini-bar"
        className="pointer-events-auto fixed bottom-4 left-1/2 -translate-x-1/2 z-20"
      >
        <div className="flex items-center gap-2.5 rounded-md border border-white/20 bg-black/90 px-3 py-1.5 shadow-2xl backdrop-blur-xl">
          <Button
            variant={isPlaying ? "destructive" : "default"}
            size="sm"
            onClick={() => setIsPlaying(!isPlaying)}
            disabled={!feasibilityProfile.dataAvailable}
            className="h-7 px-3 font-mono text-xs font-semibold rounded-xs"
            aria-label={isPlaying ? "Pause ephemeris playback" : "Play 48-hour ephemeris"}
          >
            {isPlaying ? "⏸ Pause" : "▶ Play"}
          </Button>
          <div className="flex items-center gap-2 border-x border-white/10 px-2.5">
            <span className="font-mono text-xs font-semibold text-[#00e5ff]">
              T+{timeOffsetHours.toFixed(1).padStart(4, "0")}h
            </span>
            <span className="font-mono text-[11px] text-white/80">
              {currentIsoUtc.slice(11, 16)} UTC
            </span>
          </div>
          <span className="hidden font-mono text-[11px] text-white/60 md:inline">
            {feasibilityProfile.dataAvailable
              ? `${feasibilityProfile.dualVisibilityPct}% dual-visible`
              : dataState === "loading"
                ? "Loading ephemeris"
                : "Visibility unavailable"}
          </span>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="h-7 px-2 font-mono text-xs text-white/70 hover:text-white rounded-xs border border-white/10 hover:border-white/25"
              aria-label="Expand full 48-hour timeline and visibility tracks"
              title="Expand timeline"
            >
              Timeline ⌃
            </Button>
          )}
        </div>
      </section>
    );
  }

  return (
    <section
      aria-labelledby="time-scrubber-heading"
      className="pointer-events-auto absolute bottom-4 left-4 right-4 z-20 rounded-md border border-white/20 bg-black/90 p-3.5 shadow-2xl backdrop-blur-xl sm:bottom-6 sm:left-6 sm:right-6"
    >
      {/* Header bar with UTC time, Elapsed Time, and View Toggle */}
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <h2
            id="time-scrubber-heading"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-white/90"
          >
            Mission Timeline (UTC)
          </h2>
          <Badge variant={feasibilityProfile.dataAvailable ? "outline" : "illustrative"}>
            {feasibilityProfile.dataAvailable
              ? "30-min geometric visibility"
              : dataState === "loading"
                ? "Loading visibility data"
                : "No live visibility data"}
          </Badge>
        </div>

        <div className="flex items-center gap-3">
          {/* Dual Feasibility Summary Pill */}
          <span className="hidden items-center gap-1.5 rounded-xs border border-[#00e5ff]/40 bg-[#00e5ff]/10 px-2.5 py-0.5 font-mono text-[10px] text-[#00e5ff] md:inline-flex">
          <span className="h-1.5 w-1.5 rounded-full bg-[#00e5ff] animate-pulse" />
          <span>
            {feasibilityProfile.dataAvailable
              ? `Dual visible: ${feasibilityProfile.dualVisibilityHours}h / ${durationHours}h (${feasibilityProfile.dualVisibilityPct}%)`
              : dataState === "loading"
                ? "Calculating geometric visibility…"
                : "No visibility summary available"}
          </span>
          </span>

          {/* Mission Elapsed Time */}
          <span className="font-mono text-xs font-semibold text-[#00e5ff]">
            T+{timeOffsetHours.toFixed(1).padStart(4, "0")}h / {durationHours}h
          </span>
          {/* Current UTC timestamp */}
          <span className="rounded-xs border border-white/15 bg-white/10 px-2 py-0.5 font-mono text-xs font-medium text-white">
            {currentIsoUtc}
          </span>
          <Button
            variant={showDebrief ? "default" : "outline"}
            size="sm"
            onClick={() => setShowDebrief((v) => !v)}
            disabled={!feasibilityProfile.dataAvailable}
            className={`h-6 px-2.5 text-[11px] font-mono rounded-xs border flex items-center gap-1.5 ${
              showDebrief
                ? "border-[#00e5ff] bg-[#00e5ff]/20 text-[#00e5ff]"
                : "border-white/20 text-white hover:border-[#00e5ff] hover:text-[#00e5ff]"
            }`}
            title="Inspect the geometric visibility summary"
          >
            <span>📋</span>
            <span>{showDebrief ? "Hide Debrief" : "Mission Debrief"}</span>
          </Button>
          {onToggleCollapse && (
            <Button
              variant="ghost"
              size="sm"
              onClick={onToggleCollapse}
              className="h-6 px-1.5 text-[11px] font-mono text-white/60 hover:text-white border border-white/10 hover:border-white/25 rounded-xs"
              title="Minimize timeline to floating bar"
              aria-label="Minimize timeline"
            >
              Minimize ⌄
            </Button>
          )}
        </div>
      </div>

      {/* Geometric visibility summary */}
      {showDebrief && (
        <div className="mt-3 rounded-xs border border-[#00e5ff]/30 bg-black/95 p-3 shadow-2xl">
          <div className="flex items-center justify-between border-b border-white/10 pb-2 mb-2.5">
            <div className="flex items-center gap-2">
              <span className="text-sm select-none">📋</span>
              <h3 className="font-mono text-xs font-bold uppercase tracking-wider text-white">
                Geometric Visibility • {selectedLocation?.name ?? "Target Site"}
              </h3>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowDebrief(false)}
              className="h-5 px-1.5 text-[10px] font-mono text-white/60 hover:text-white rounded-xs"
            >
              ✕ Close
            </Button>
          </div>

          {!feasibilityProfile.dataAvailable ? (
            <p className="text-xs text-white/60">
              {dataState === "loading"
                ? "Waiting for live ephemeris and terrain data."
                : "Visibility summary unavailable; no sample values are substituted."}
            </p>
          ) : (
            <div className="grid grid-cols-1 gap-2.5 md:grid-cols-3">
              <div className="rounded-xs border border-white/15 bg-white/5 p-2.5">
                <p className="text-[10px] uppercase font-mono text-white/50">
                  Longest dual-visibility interval
                </p>
                {missionDebrief.bestWindow ? (
                  <>
                    <p className="mt-1 font-mono text-sm font-bold text-[#00e5ff]">
                      T+{missionDebrief.bestWindow.startH.toFixed(1)}h – T+
                      {missionDebrief.bestWindow.endH.toFixed(1)}h
                    </p>
                    <p className="mt-0.5 text-[11px] text-white/70">
                      {missionDebrief.bestWindow.len} hours with Sun and Earth both
                      geometrically visible.
                    </p>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => {
                        onTimeChange(missionDebrief.bestWindow!.startH);
                        setShowDebrief(false);
                      }}
                      className="mt-2 h-6 w-full text-[10px] font-mono"
                    >
                      Jump to interval start
                    </Button>
                  </>
                ) : (
                  <p className="mt-1 text-[11px] text-white/70">
                    No sampled interval had both bodies clearly above the terrain horizon.
                  </p>
                )}
              </div>
              <div className="rounded-xs border border-white/15 bg-white/5 p-2.5">
                <p className="text-[10px] uppercase font-mono text-white/50">
                  Sun geometric visibility
                </p>
                <p className="mt-1 font-mono text-sm font-bold text-amber-300">
                  {feasibilityProfile.sunVisibilityHours}h / {durationHours}h
                </p>
                <p className="mt-0.5 text-[11px] text-white/70">
                  Does not estimate panel power or energy.
                </p>
              </div>
              <div className="rounded-xs border border-white/15 bg-white/5 p-2.5">
                <p className="text-[10px] uppercase font-mono text-white/50">
                  Earth geometric visibility
                </p>
                <p className="mt-1 font-mono text-sm font-bold text-sky-300">
                  {feasibilityProfile.earthVisibilityHours}h / {durationHours}h
                </p>
                <p className="mt-0.5 text-[11px] text-white/70">
                  Does not establish a communications link.
                </p>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="mt-2.5">
        {/* Time Scrubber Slider (Full Width) */}
        <div className="relative">
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

        <div className="mt-2 space-y-1.5" aria-label="Geometric visibility tracks">
          {[
            { label: "SUN", statusKey: "sunStatus" },
            { label: "EARTH", statusKey: "earthStatus" },
            { label: "BOTH", statusKey: "dualStatus" },
          ].map((track) => (
            <div key={track.label} className="flex items-center gap-2">
              <span className="w-10 shrink-0 font-mono text-[9px] text-white/50">
                {track.label}
              </span>
              <div
                className="flex h-2 flex-1 gap-px"
                role="img"
                aria-label={`${track.label} geometric visibility by time`}
              >
                {feasibilityProfile.steps.map((step) => {
                  const status =
                    track.statusKey === "sunStatus"
                      ? step.sunStatus
                      : track.statusKey === "earthStatus"
                        ? step.earthStatus
                        : step.dualStatus;
                  return (
                    <span
                      key={step.hour}
                      className={`flex-1 rounded-[1px] ${getTrackColor(status)}`}
                      title={`T+${step.hour.toFixed(1)}h: ${status}`}
                    />
                  );
                })}
              </div>
            </div>
          ))}
        </div>

        {/* Timeline Axis Hour Ticks */}
        <div className="flex justify-between px-1 font-mono text-[9px] text-white/50 mt-1">
          <span>T+0h (Start)</span>
          <span>T+6h</span>
          <span>T+12h</span>
          <span>T+18h</span>
          <span>T+24h (Day 1)</span>
          <span>T+30h</span>
          <span>T+36h</span>
          <span>T+42h</span>
          <span>T+48h (End)</span>
        </div>

        {/* Time Controls Bar */}
        <div className="mt-2 flex flex-wrap items-center justify-between gap-2">
          {/* Step Controls */}
          <div className="flex items-center gap-1">
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStep(-6)}
              title="Step backward 6 hours"
              className="h-7 px-2 font-mono text-xs border-white/20 hover:border-[#00e5ff]"
            >
              -6h
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStep(-1)}
              title="Step backward 1 hour"
              className="h-7 px-2 font-mono text-xs border-white/20 hover:border-[#00e5ff]"
            >
              -1h
            </Button>
            <Button
              variant={isPlaying ? "destructive" : "default"}
              size="sm"
              onClick={() => setIsPlaying(!isPlaying)}
              disabled={!feasibilityProfile.dataAvailable}
              className="h-7 px-3 font-mono text-xs font-semibold"
            >
              {isPlaying ? "⏸ Pause" : "▶ Play 48h"}
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStep(1)}
              title="Step forward 1 hour"
              className="h-7 px-2 font-mono text-xs border-white/20 hover:border-[#00e5ff]"
            >
              +1h
            </Button>
            <Button
              variant="outline"
              size="sm"
              onClick={() => handleStep(6)}
              title="Step forward 6 hours"
              className="h-7 px-2 font-mono text-xs border-white/20 hover:border-[#00e5ff]"
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
              className="h-7 px-2 font-mono text-xs text-white/60 hover:text-white"
            >
              Reset T0
            </Button>
          </div>

          <div className="font-mono text-[10px] text-white/50">
            Scrub returned 30-minute samples; visibility is geometric, not a power or link estimate.
          </div>
        </div>
      </div>
    </section>
  );
}
