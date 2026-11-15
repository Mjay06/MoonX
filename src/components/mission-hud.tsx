"use client";

import React, { useState, useMemo, useEffect } from "react";
import dynamic from "next/dynamic";
import {
  LunarLocation,
  CandidateScenario,
  VisibilityAnalysisResult,
} from "@/types/mission";
import { SAMPLE_LUNAR_SITES } from "@/data/sample-sites";
import { createFallbackVisibilityResult } from "@/lib/sample-telemetry";
import { SiteSearchPanel } from "./site-search-panel";
import { CandidateComparisonBar } from "./candidate-comparison-bar";
import { TimeScrubberPanel } from "./time-scrubber-panel";
import { TelemetryPanel, type TelemetryState } from "./telemetry-panel";
import { HorizonPlotModal } from "./horizon-plot-modal";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import type { MapMode } from "./lunar-viewport";

// Client-only dynamic mount for the lunar map viewport
const LunarViewport = dynamic(
  () => import("./lunar-viewport").then((mod) => mod.LunarViewport),
  {
    ssr: false,
    loading: () => (
      <div className="fixed inset-0 z-0 flex items-center justify-center bg-background text-xs font-mono text-muted-foreground uppercase tracking-widest">
        Initializing Lunar Viewport...
      </div>
    ),
  }
);

const SCENARIO_COLORS = ["#38bdf8", "#c084fc", "#34d399"];
const MISSION_BASE_TIME_UTC = "2026-11-15T00:00:00Z";
const MISSION_DURATION_HOURS = 48;

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isVisibilityResult(value: unknown): value is VisibilityAnalysisResult {
  if (!isRecord(value)) return false;
  const { samples, horizonProfile, siteElevationKm, warnings, provenance } =
    value;
  return (
    Array.isArray(samples) &&
    samples.length === MISSION_DURATION_HOURS * 2 + 1 &&
    samples.every(
      (sample) =>
        isRecord(sample) &&
        typeof sample.locationId === "string" &&
        typeof sample.locationName === "string" &&
        typeof sample.timestampUtc === "string" &&
        typeof sample.isIllustrative === "boolean" &&
        isRecord(sample.sun) &&
        isRecord(sample.earth)
    ) &&
    Array.isArray(horizonProfile) &&
    horizonProfile.length >= 72 &&
    horizonProfile.every(
      (point) =>
        isRecord(point) &&
        typeof point.azimuthDeg === "number" &&
        typeof point.elevationDeg === "number"
    ) &&
    typeof siteElevationKm === "number" &&
    Array.isArray(warnings) &&
    warnings.every((warning) => typeof warning === "string") &&
    typeof value.coordinateFrameVerified === "boolean" &&
    isRecord(provenance)
  );
}

function readErrorMessage(value: unknown): string | null {
  if (!isRecord(value) || !isRecord(value.error)) return null;
  return typeof value.error.message === "string" ? value.error.message : null;
}

function readErrorCode(value: unknown): string | null {
  if (!isRecord(value) || !isRecord(value.error)) return null;
  return typeof value.error.code === "string" ? value.error.code : null;
}

interface VisibilityLoadState {
  locationId: string;
  status: "ready" | "error" | "unavailable";
  result?: VisibilityAnalysisResult;
  error?: string;
}

export function MissionHud() {
  const [selectedLocation, setSelectedLocation] =
    useState<LunarLocation | null>(SAMPLE_LUNAR_SITES[0]); // Shackleton default
  const [scenarios, setScenarios] = useState<CandidateScenario[]>([
    {
      id: "scenario-init-1",
      label: `Candidate 1: ${SAMPLE_LUNAR_SITES[0].name}`,
      location: SAMPLE_LUNAR_SITES[0],
      color: SCENARIO_COLORS[0],
      createdTimeUtc: MISSION_BASE_TIME_UTC,
    },
    {
      id: "scenario-init-2",
      label: `Candidate 2: ${SAMPLE_LUNAR_SITES[1].name}`,
      location: SAMPLE_LUNAR_SITES[1],
      color: SCENARIO_COLORS[1],
      createdTimeUtc: MISSION_BASE_TIME_UTC,
    },
  ]);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(
    "scenario-init-1"
  );
  const [timeOffsetHours, setTimeOffsetHours] = useState<number>(14.0);
  const [mapMode, setMapMode] = useState<MapMode>("relief");
  const [isHorizonPlotOpen, setIsHorizonPlotOpen] = useState(false);
  const [isSearchCollapsed, setIsSearchCollapsed] = useState(false);
  const [isScenariosCollapsed, setIsScenariosCollapsed] = useState(false);
  const [isTelemetryCollapsed, setIsTelemetryCollapsed] = useState(false);
  const [isTimelineCollapsed, setIsTimelineCollapsed] = useState(false);
  const [visibilityLoad, setVisibilityLoad] =
    useState<VisibilityLoadState | null>(null);
  const currentLoad =
    selectedLocation && visibilityLoad?.locationId === selectedLocation.id
      ? visibilityLoad
      : null;
  const visibilityResult = currentLoad?.result ?? null;
  const telemetryState: TelemetryState = !selectedLocation
    ? "empty"
    : !currentLoad
      ? "loading"
      : currentLoad.status;
  const telemetryError = currentLoad?.error;

  const allPanelsCollapsed =
    isSearchCollapsed &&
    isScenariosCollapsed &&
    isTelemetryCollapsed &&
    isTimelineCollapsed;

  const handleToggleAllPanels = () => {
    const nextState = !allPanelsCollapsed;
    setIsSearchCollapsed(nextState);
    setIsScenariosCollapsed(nextState);
    setIsTelemetryCollapsed(nextState);
    setIsTimelineCollapsed(nextState);
  };

  useEffect(() => {
    if (!selectedLocation) {
      return;
    }

    const location = selectedLocation;
    const controller = new AbortController();

    async function loadVisibility() {
      try {
        const response = await fetch("/api/visibility", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          signal: controller.signal,
          body: JSON.stringify({
            location: {
              id: location.id,
              name: location.name,
              latitude: location.latitude,
              longitude: location.longitude,
            },
            startUtc: MISSION_BASE_TIME_UTC,
            durationHours: MISSION_DURATION_HOURS,
          }),
        });
        const payload: unknown = await response.json();
        if (!response.ok) {
          if (readErrorCode(payload) === "insufficient_dem_coverage") {
            setVisibilityLoad({
              locationId: location.id,
              status: "unavailable",
              error:
                readErrorMessage(payload) ??
                "The LOLA DEM does not provide complete coverage for this site.",
            });
            return;
          }
          throw new Error(
            readErrorMessage(payload) ??
              `Visibility service returned HTTP ${response.status}.`
          );
        }
        if (!isVisibilityResult(payload)) {
          throw new Error("Visibility service returned an invalid result.");
        }

        setVisibilityLoad({
          locationId: location.id,
          status: "ready",
          result: payload,
        });
      } catch {
        if (controller.signal.aborted) return;
        // Resilient fallback to analytical topocentric ephemeris if visibility service is offline
        const fallback = createFallbackVisibilityResult(
          location,
          MISSION_BASE_TIME_UTC,
          MISSION_DURATION_HOURS
        );
        setVisibilityLoad({
          locationId: location.id,
          status: "ready",
          result: fallback,
        });
      }
    }

    void loadVisibility();
    return () => controller.abort();
  }, [selectedLocation]);

  const currentTelemetry = useMemo(() => {
    if (!selectedLocation || !visibilityResult) return null;
    const sampleIndex = Math.min(
      visibilityResult.samples.length - 1,
      Math.round(timeOffsetHours * 2)
    );
    const sample = visibilityResult.samples[sampleIndex];
    if (!sample) return null;
    return {
      ...sample,
      horizonProfile: visibilityResult.horizonProfile,
    };
  }, [selectedLocation, visibilityResult, timeOffsetHours]);

  // Screen-reader status announcement
  const announcement = useMemo(() => {
    if (!selectedLocation) {
      return "Mission HUD loaded. Awaiting site selection.";
    }
    if (telemetryState === "loading") {
      return `Loading live geometric visibility for ${selectedLocation.name}.`;
    }
    if (telemetryState === "error" || telemetryState === "unavailable") {
      return `Geometric visibility unavailable for ${selectedLocation.name}. ${telemetryError ?? ""}`;
    }
    if (!currentTelemetry) {
      return `No visibility sample is available for ${selectedLocation.name} at this mission time.`;
    }
    return `Selected ${selectedLocation.name} at ${selectedLocation.latitude.toFixed(2)}° S, ${selectedLocation.longitude.toFixed(2)}° E. Mission time T+${timeOffsetHours.toFixed(1)} hours. Sun is ${currentTelemetry.sun.visibility}, Earth is ${currentTelemetry.earth.visibility}.`;
  }, [
    selectedLocation,
    timeOffsetHours,
    currentTelemetry,
    telemetryState,
    telemetryError,
  ]);

  const handleSelectLocation = (location: LunarLocation) => {
    setSelectedLocation(location);
    const matching = scenarios.find((s) => s.location.id === location.id);
    if (matching) {
      setActiveScenarioId(matching.id);
    }
  };

  const handleAddScenario = (location: LunarLocation) => {
    if (scenarios.length >= 3) return;
    if (scenarios.some((s) => s.location.id === location.id)) return;

    const newScenario: CandidateScenario = {
      id: `scenario-${Date.now()}`,
      label: `Candidate ${scenarios.length + 1}: ${location.name}`,
      location,
      color: SCENARIO_COLORS[scenarios.length % SCENARIO_COLORS.length],
      createdTimeUtc: new Date().toISOString(),
    };
    setScenarios([...scenarios, newScenario]);
    setActiveScenarioId(newScenario.id);
    setSelectedLocation(location);
  };

  const handleSelectScenario = (scenario: CandidateScenario) => {
    setActiveScenarioId(scenario.id);
    setSelectedLocation(scenario.location);
  };

  const handleRemoveScenario = (scenarioId: string) => {
    const updated = scenarios.filter((s) => s.id !== scenarioId);
    setScenarios(updated);
    if (activeScenarioId === scenarioId) {
      if (updated.length > 0) {
        setActiveScenarioId(updated[0].id);
        setSelectedLocation(updated[0].location);
      } else {
        setActiveScenarioId(null);
      }
    }
  };

  const handleResetScenarios = () => {
    setScenarios([]);
    setActiveScenarioId(null);
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden select-none">
      {/* Screen reader live region for status announcements */}
      <div className="sr-only" aria-live="polite" aria-atomic="true">
        {announcement}
      </div>

      {/* Top Mission HUD Navigation Bar */}
      <header className="pointer-events-auto fixed top-0 left-0 right-0 z-30 flex h-14 items-center justify-between border-b border-white/15 bg-black/90 px-4 backdrop-blur-xl sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-[#00e5ff] opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-[#00e5ff]" />
            </span>
            <span className="font-mono text-sm font-bold tracking-wider text-white sm:text-base">
              MOON<span className="text-[#00e5ff]">X</span>
            </span>
          </div>
          <span className="hidden h-4 w-[1px] bg-white/20 sm:inline-block" />
          <span className="hidden text-xs font-semibold tracking-wider text-white/70 uppercase lg:inline-block">
            Lunar Landing Site Navigator
          </span>
          <Badge variant="illustrative" className="hidden xl:inline-flex">
            Artemis South Pole
          </Badge>
        </div>

        {/* Center: illustrative map style switcher */}
        <div className="flex items-center gap-1 rounded-xs border border-white/20 bg-black/80 p-0.5 font-mono text-xs shadow-inner">
          <span className="hidden px-1.5 text-[10px] uppercase tracking-wider text-white/60 sm:inline-block">
            Style:
          </span>
          <button
            type="button"
            onClick={() => setMapMode("relief")}
            className={`rounded-xs px-2.5 py-1 text-xs font-medium transition-all ${
              mapMode === "relief"
                ? "bg-[#00e5ff] text-black font-semibold shadow-sm"
                : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            Relief
          </button>
          <button
            type="button"
            onClick={() => setMapMode("lola")}
            className={`rounded-xs px-2.5 py-1 text-xs font-medium transition-all ${
              mapMode === "lola"
                ? "bg-[#00e5ff] text-black font-semibold shadow-sm"
                : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            LOLA-style
          </button>
          <button
            type="button"
            onClick={() => setMapMode("contours")}
            className={`rounded-xs px-2.5 py-1 text-xs font-medium transition-all ${
              mapMode === "contours"
                ? "bg-[#00e5ff] text-black font-semibold shadow-sm"
                : "text-white/60 hover:text-white hover:bg-white/10"
            }`}
          >
            Contours
          </button>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2">
          <Button
            variant="outline"
            size="sm"
            onClick={handleToggleAllPanels}
            className="h-8 gap-1.5 text-xs font-mono border-white/20 text-white/80 hover:border-[#00e5ff] hover:text-[#00e5ff]"
            title={
              allPanelsCollapsed
                ? "Show all HUD panels"
                : "Hide all HUD panels for clear Moon view"
            }
          >
            <span>{allPanelsCollapsed ? "▣ Show Panels" : "▢ Full Map"}</span>
          </Button>

          {currentTelemetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsHorizonPlotOpen(true)}
              className="h-8 gap-1.5 text-xs font-mono border-white/20 text-[#00e5ff] hover:bg-[#00e5ff]/10"
            >
              <span aria-hidden="true">📈</span>
              <span className="hidden sm:inline">360° Horizon</span>
            </Button>
          )}
          <div className="hidden items-center rounded-xs border border-white/15 bg-white/5 px-2 py-1 font-mono text-[11px] text-white/60 sm:flex">
            <span>
              {visibilityResult?.coordinateFrameVerified
                ? "ME/PA DE421"
                : visibilityResult
                  ? "FRAME UNVERIFIED"
                  : telemetryState === "error" ||
                      telemetryState === "unavailable"
                    ? "DATA UNAVAILABLE"
                    : "FRAME PENDING"}
            </span>
          </div>
        </div>
      </header>

      {/* Full-screen map viewport */}
      <div
        id="cesium-container"
        className="fixed inset-0 z-0 bg-background pt-14"
        aria-label="Lunar surface 3D viewport"
      >
        <LunarViewport
          selectedLocation={selectedLocation}
          onSelectLocation={handleSelectLocation}
          comparedLocations={scenarios.map((s) => s.location)}
          mapMode={mapMode}
          telemetry={currentTelemetry}
          timeOffsetHours={timeOffsetHours}
        />
      </div>

      {/* Edge-anchored HUD workspace */}
      <div
        aria-label="Mission workspace"
        className="pointer-events-none fixed inset-0 z-10 pt-14"
      >
        {/* Left HUD Dock: Site Search & Candidate Comparisons */}
        <aside
          aria-label="Site selection and scenario workspace"
          className="pointer-events-none absolute left-4 top-16 bottom-36 sm:left-6 sm:top-16 sm:bottom-40 z-20 flex w-[min(24rem,calc(100vw-2rem))] flex-col gap-3 overflow-y-auto pr-1 pb-2"
        >
          <div className="pointer-events-auto">
            <SiteSearchPanel
              selectedLocation={selectedLocation}
              onSelectLocation={handleSelectLocation}
              onAddScenario={handleAddScenario}
              comparisonCount={scenarios.length}
              maxComparisons={3}
              isCollapsed={isSearchCollapsed}
              onToggleCollapse={() => setIsSearchCollapsed(!isSearchCollapsed)}
            />
          </div>

          <div className="pointer-events-auto">
            <CandidateComparisonBar
              scenarios={scenarios}
              activeScenarioId={activeScenarioId}
              onSelectScenario={handleSelectScenario}
              onRemoveScenario={handleRemoveScenario}
              onResetScenarios={handleResetScenarios}
              maxScenarios={3}
              isCollapsed={isScenariosCollapsed}
              onToggleCollapse={() => setIsScenariosCollapsed(!isScenariosCollapsed)}
            />
          </div>
        </aside>

        {/* Right: Sun and Earth Telemetry Cards (Collapsible) */}
        <TelemetryPanel
          telemetry={currentTelemetry}
          state={selectedLocation ? telemetryState : "empty"}
          errorMessage={telemetryError}
          warnings={visibilityResult?.warnings}
          onOpenHorizonPlot={() => setIsHorizonPlotOpen(true)}
          isCollapsed={isTelemetryCollapsed}
          onToggleCollapse={() =>
            setIsTelemetryCollapsed(!isTelemetryCollapsed)
          }
        />

        {/* Bottom: Mission timeline scrubber (Collapsible) */}
        <TimeScrubberPanel
          key={selectedLocation?.id ?? "no-site"}
          baseTimeUtc={MISSION_BASE_TIME_UTC}
          durationHours={48}
          timeOffsetHours={timeOffsetHours}
          onTimeChange={setTimeOffsetHours}
          selectedLocation={selectedLocation}
          visibilitySamples={visibilityResult?.samples ?? null}
          dataState={selectedLocation ? telemetryState : "empty"}
          isCollapsed={isTimelineCollapsed}
          onToggleCollapse={() =>
            setIsTimelineCollapsed(!isTimelineCollapsed)
          }
        />
      </div>

      {/* 360° Horizon Profile & Celestial Sightlines Modal */}
      {currentTelemetry && (
        <HorizonPlotModal
          telemetry={currentTelemetry}
          visibilitySamples={visibilityResult?.samples ?? []}
          warnings={visibilityResult?.warnings}
          isOpen={isHorizonPlotOpen}
          onClose={() => setIsHorizonPlotOpen(false)}
        />
      )}
    </div>
  );
}
