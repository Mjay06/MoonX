"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { LunarLocation, CandidateScenario } from "@/types/mission";
import { SAMPLE_LUNAR_SITES } from "@/data/sample-sites";
import { SiteSearchPanel } from "./site-search-panel";
import { CandidateComparisonBar } from "./candidate-comparison-bar";

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

export function MissionHud() {
  const [selectedLocation, setSelectedLocation] =
    useState<LunarLocation | null>(SAMPLE_LUNAR_SITES[0]); // Shackleton default
  const [scenarios, setScenarios] = useState<CandidateScenario[]>([
    {
      id: "scenario-init-1",
      label: `Candidate 1: ${SAMPLE_LUNAR_SITES[0].name}`,
      location: SAMPLE_LUNAR_SITES[0],
      color: SCENARIO_COLORS[0],
      createdTimeUtc: "2026-11-15T00:00:00Z",
    },
    {
      id: "scenario-init-2",
      label: `Candidate 2: ${SAMPLE_LUNAR_SITES[1].name}`,
      location: SAMPLE_LUNAR_SITES[1],
      color: SCENARIO_COLORS[1],
      createdTimeUtc: "2026-11-15T00:00:00Z",
    },
  ]);
  const [activeScenarioId, setActiveScenarioId] = useState<string | null>(
    "scenario-init-1"
  );

  const handleSelectLocation = (location: LunarLocation) => {
    setSelectedLocation(location);
    // If location belongs to a scenario, make it active
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

        {/* Right: Telemetry region */}
        <section
          aria-labelledby="telemetry-heading"
          className="pointer-events-auto absolute bottom-28 right-4 top-24 w-[min(22rem,calc(100vw-2rem))] overflow-auto rounded-lg border border-border/80 bg-card/85 p-4 shadow-xl backdrop-blur-glass-strong sm:bottom-28 sm:right-6 sm:top-6"
        >
          <h2
            id="telemetry-heading"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
          >
            Telemetry
          </h2>
          <p className="mt-4 font-mono text-sm text-muted-foreground">
            Awaiting site selection
          </p>
        </section>

        {/* Bottom: Time scrubber region */}
        <section
          aria-labelledby="time-scrubber-heading"
          className="pointer-events-auto absolute bottom-4 left-4 right-4 rounded-lg border border-border/80 bg-card/85 p-4 shadow-xl backdrop-blur-glass sm:bottom-6 sm:left-6 sm:right-6"
        >
          <h2
            id="time-scrubber-heading"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
          >
            Time scrubber
          </h2>
          <p className="mt-2 text-sm text-muted-foreground">
            Time controls will appear here.
          </p>
        </section>
      </div>
    </div>
  );
}
