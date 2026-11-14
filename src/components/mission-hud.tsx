"use client";

import React, { useState, useMemo } from "react";
import dynamic from "next/dynamic";
import { LunarLocation, CandidateScenario } from "@/types/mission";
import { SAMPLE_LUNAR_SITES } from "@/data/sample-sites";
import { calculateSampleTelemetry } from "@/lib/sample-telemetry";
import { SiteSearchPanel } from "./site-search-panel";
import { CandidateComparisonBar } from "./candidate-comparison-bar";
import { TimeScrubberPanel } from "./time-scrubber-panel";
import { TelemetryPanel } from "./telemetry-panel";
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
  const [isMobileTelemetryCollapsed, setIsMobileTelemetryCollapsed] =
    useState(false);

  // Derive current telemetry deterministically from active location & scrubbed time
  const currentTelemetry = useMemo(() => {
    if (!selectedLocation) return null;
    return calculateSampleTelemetry(
      selectedLocation,
      MISSION_BASE_TIME_UTC,
      timeOffsetHours
    );
  }, [selectedLocation, timeOffsetHours]);

  // Screen-reader status announcement
  const announcement = useMemo(() => {
    if (!selectedLocation || !currentTelemetry) {
      return "Mission HUD loaded. Awaiting site selection.";
    }
    return `Selected ${selectedLocation.name} at ${selectedLocation.latitude.toFixed(2)}° S, ${selectedLocation.longitude.toFixed(2)}° E. Mission time T+${timeOffsetHours.toFixed(1)} hours. Sun is ${currentTelemetry.sun.visibility}, Earth is ${currentTelemetry.earth.visibility}.`;
  }, [selectedLocation, timeOffsetHours, currentTelemetry]);

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
      <header className="pointer-events-auto fixed top-0 left-0 right-0 z-30 flex h-14 items-center justify-between border-b border-border/70 bg-card/85 px-4 backdrop-blur-md sm:px-6">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="relative flex h-2.5 w-2.5">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-primary opacity-75" />
              <span className="relative inline-flex h-2.5 w-2.5 rounded-full bg-primary" />
            </span>
            <span className="font-mono text-sm font-bold tracking-wider text-foreground sm:text-base">
              MOON<span className="text-primary">X</span>
            </span>
          </div>
          <span className="hidden h-4 w-[1px] bg-border/80 sm:inline-block" />
          <span className="hidden text-xs font-semibold tracking-wider text-muted-foreground uppercase lg:inline-block">
            Lunar Landing Site Navigator
          </span>
          <Badge variant="illustrative" className="hidden xl:inline-flex">
            Artemis South Pole
          </Badge>
        </div>

        {/* Center: Layer View Switcher (Relief | LOLA Topo | Contours) */}
        <div className="flex items-center gap-1 rounded-lg border border-border/70 bg-secondary/60 p-1 font-mono text-xs shadow-inner">
          <span className="hidden px-1.5 text-[10px] uppercase tracking-wider text-muted-foreground sm:inline-block">
            Layer:
          </span>
          <button
            type="button"
            onClick={() => setMapMode("relief")}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
              mapMode === "relief"
                ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
            }`}
          >
            Relief
          </button>
          <button
            type="button"
            onClick={() => setMapMode("lola")}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
              mapMode === "lola"
                ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
            }`}
          >
            LOLA Topo
          </button>
          <button
            type="button"
            onClick={() => setMapMode("contours")}
            className={`rounded px-2.5 py-1 text-xs font-medium transition-all ${
              mapMode === "contours"
                ? "bg-primary text-primary-foreground shadow-sm font-semibold"
                : "text-muted-foreground hover:text-foreground hover:bg-secondary/70"
            }`}
          >
            Contours
          </button>
        </div>

        {/* Right: Quick Action Controls */}
        <div className="flex items-center gap-2">
          {currentTelemetry && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setIsHorizonPlotOpen(true)}
              className="h-8 gap-1.5 text-xs font-mono border-primary/40 text-primary hover:bg-primary/10"
            >
              <span aria-hidden="true">📈</span>
              <span className="hidden sm:inline">360° Horizon</span>
            </Button>
          )}
          <div className="hidden items-center rounded-md border border-border/60 bg-secondary/40 px-2 py-1 font-mono text-[11px] text-muted-foreground sm:flex">
            <span>IAU ME 2000</span>
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
          onMapModeChange={setMapMode}
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
            />
          </div>
        </aside>

        {/* Right: Sun and Earth Telemetry Cards (Collapsible on mobile) */}
        <TelemetryPanel
          telemetry={currentTelemetry}
          state={currentTelemetry ? "ready" : "empty"}
          onOpenHorizonPlot={() => setIsHorizonPlotOpen(true)}
          isMobileCollapsed={isMobileTelemetryCollapsed}
          onToggleMobileCollapse={() =>
            setIsMobileTelemetryCollapsed(!isMobileTelemetryCollapsed)
          }
        />

        {/* Bottom: Mission timeline scrubber */}
        <TimeScrubberPanel
          baseTimeUtc={MISSION_BASE_TIME_UTC}
          durationHours={48}
          timeOffsetHours={timeOffsetHours}
          onTimeChange={setTimeOffsetHours}
          selectedLocation={selectedLocation}
        />
      </div>

      {/* 360° Horizon Profile & Celestial Sightlines Modal */}
      {currentTelemetry && (
        <HorizonPlotModal
          telemetry={currentTelemetry}
          isOpen={isHorizonPlotOpen}
          onClose={() => setIsHorizonPlotOpen(false)}
        />
      )}
    </div>
  );
}
