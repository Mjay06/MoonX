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

  // Derive current telemetry deterministically from active location & scrubbed time
  const currentTelemetry = useMemo(() => {
    if (!selectedLocation) return null;
    return calculateSampleTelemetry(
      selectedLocation,
      MISSION_BASE_TIME_UTC,
      timeOffsetHours
    );
  }, [selectedLocation, timeOffsetHours]);

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
      {/* Full-screen map viewport */}
      <div
        id="cesium-container"
        className="fixed inset-0 z-0 bg-background"
        aria-label="Lunar surface 3D viewport"
      >
        <LunarViewport
          selectedLocation={selectedLocation}
          onSelectLocation={handleSelectLocation}
          comparedLocations={scenarios.map((s) => s.location)}
        />
      </div>

      {/* Edge-anchored HUD workspace */}
      <div
        aria-label="Mission workspace"
        className="pointer-events-none absolute inset-0 z-10"
      >
        {/* Top-left: Site search panel */}
        <SiteSearchPanel
          selectedLocation={selectedLocation}
          onSelectLocation={handleSelectLocation}
          onAddScenario={handleAddScenario}
          comparisonCount={scenarios.length}
          maxComparisons={3}
        />

        {/* Top-left: Candidate scenario comparison list */}
        <CandidateComparisonBar
          scenarios={scenarios}
          activeScenarioId={activeScenarioId}
          onSelectScenario={handleSelectScenario}
          onRemoveScenario={handleRemoveScenario}
          onResetScenarios={handleResetScenarios}
          maxScenarios={3}
        />

        {/* Right: Sun and Earth Telemetry Cards */}
        <TelemetryPanel
          telemetry={currentTelemetry}
        />

        {/* Bottom: Mission timeline scrubber */}
        <TimeScrubberPanel
          baseTimeUtc={MISSION_BASE_TIME_UTC}
          durationHours={48}
          timeOffsetHours={timeOffsetHours}
          onTimeChange={setTimeOffsetHours}
        />
      </div>
    </div>
  );
}
