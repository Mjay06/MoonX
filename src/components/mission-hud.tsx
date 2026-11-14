"use client";

import React, { useState } from "react";
import dynamic from "next/dynamic";
import { LunarLocation, CandidateScenario } from "@/types/mission";
import { SAMPLE_LUNAR_SITES } from "@/data/sample-sites";
import { SiteSearchPanel } from "./site-search-panel";

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

export function MissionHud() {
  const [selectedLocation, setSelectedLocation] =
    useState<LunarLocation | null>(SAMPLE_LUNAR_SITES[0]); // Shackleton Crater Rim default
  const [scenarios, setScenarios] = useState<CandidateScenario[]>([]);

  const handleAddScenario = (location: LunarLocation) => {
    if (scenarios.length >= 3) return;
    const newScenario: CandidateScenario = {
      id: `scenario-${Date.now()}`,
      label: `Candidate ${scenarios.length + 1}: ${location.name}`,
      location,
      color: scenarios.length === 0 ? "#38bdf8" : scenarios.length === 1 ? "#a855f7" : "#34d399",
      createdTimeUtc: new Date().toISOString(),
    };
    setScenarios([...scenarios, newScenario]);
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
          onSelectLocation={setSelectedLocation}
          comparedLocations={scenarios.map((s) => s.location)}
        />
      </div>

      {/* Edge-anchored HUD workspace */}
      <div
        aria-label="Mission workspace"
        className="pointer-events-none absolute inset-0 z-10"
      >
        {/* Top-left: Site search and candidate selection */}
        <SiteSearchPanel
          selectedLocation={selectedLocation}
          onSelectLocation={setSelectedLocation}
          onAddScenario={handleAddScenario}
          comparisonCount={scenarios.length}
          maxComparisons={3}
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
