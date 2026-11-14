import React from "react";

export function MissionHud() {
  return (
    <div className="relative h-screen w-screen overflow-hidden select-none">
      {/* Full-screen map layer */}
      <div
        id="cesium-container"
        className="fixed inset-0 z-0 bg-background"
        aria-label="Lunar surface 3D viewport"
      />

      {/* Edge-anchored HUD workspace */}
      <div
        aria-label="Mission workspace"
        className="pointer-events-none absolute inset-0 z-10"
      >
        {/* Top-left: Site search and comparison region */}
        <section
          aria-labelledby="site-search-heading"
          className="pointer-events-auto absolute left-4 top-4 w-[min(24rem,calc(100vw-2rem))] rounded-lg border border-border/80 bg-card/85 p-4 shadow-xl backdrop-blur-glass sm:left-6 sm:top-6"
        >
          <h2
            id="site-search-heading"
            className="text-xs font-semibold uppercase tracking-[0.16em] text-muted-foreground"
          >
            Site search
          </h2>
          <p className="mt-3 text-sm text-muted-foreground">
            Search controls will appear here.
          </p>
        </section>

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
