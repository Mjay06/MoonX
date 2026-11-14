"use client";

import React, { useState, useMemo, useRef } from "react";
import { LunarLocation } from "@/types/mission";
import { SAMPLE_LUNAR_SITES } from "@/data/sample-sites";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";

interface SiteSearchPanelProps {
  selectedLocation: LunarLocation | null;
  onSelectLocation: (location: LunarLocation) => void;
  onAddScenario?: (location: LunarLocation) => void;
  comparisonCount?: number;
  maxComparisons?: number;
}

export function SiteSearchPanel({
  selectedLocation,
  onSelectLocation,
  onAddScenario,
  comparisonCount = 0,
  maxComparisons = 3,
}: SiteSearchPanelProps) {
  const [query, setQuery] = useState("");
  const [highlightedIndex, setHighlightedIndex] = useState(0);
  const [isListExpanded, setIsListExpanded] = useState(false);
  const listRef = useRef<HTMLUListElement | null>(null);

  const filteredSites = useMemo(() => {
    if (!query.trim()) return SAMPLE_LUNAR_SITES;
    const lower = query.toLowerCase();
    return SAMPLE_LUNAR_SITES.filter(
      (site) =>
        site.name.toLowerCase().includes(lower) ||
        site.description.toLowerCase().includes(lower) ||
        `${site.latitude}`.includes(lower) ||
        `${site.longitude}`.includes(lower)
    );
  }, [query]);

  const safeHighlightedIndex = Math.min(
    highlightedIndex,
    Math.max(0, filteredSites.length - 1)
  );

  const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setIsListExpanded(true);
      setHighlightedIndex((prev) =>
        prev < filteredSites.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setIsListExpanded(true);
      setHighlightedIndex((prev) =>
        prev > 0 ? prev - 1 : filteredSites.length - 1
      );
    } else if (e.key === "Enter") {
      e.preventDefault();
      if (filteredSites[safeHighlightedIndex]) {
        onSelectLocation(filteredSites[safeHighlightedIndex]);
        setIsListExpanded(false);
      }
    } else if (e.key === "Escape") {
      setIsListExpanded(false);
    }
  };

  return (
    <section
      aria-labelledby="site-search-heading"
      className="relative w-full rounded-md border border-white/20 bg-black/90 p-4 shadow-2xl backdrop-blur-xl transition-all"
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
        <h2
          id="site-search-heading"
          className="text-xs font-semibold uppercase tracking-[0.16em] text-white/90"
        >
          Site Search & Candidates
        </h2>
        <Badge variant="illustrative">Sample Data</Badge>
      </div>

      {/* Search Input */}
      <div className="mt-3 relative">
        <label htmlFor="site-search-input" className="sr-only">
          Search candidate landing sites
        </label>
        <Input
          id="site-search-input"
          value={query}
          onChange={(e) => {
            setQuery(e.target.value);
            setIsListExpanded(true);
          }}
          onFocus={() => setIsListExpanded(true)}
          onKeyDown={handleKeyDown}
          placeholder="Search crater or coordinates..."
          className="pr-8 text-xs font-mono bg-black/70 border-white/20 focus-visible:border-[#00e5ff]"
          aria-autocomplete="list"
          aria-controls="candidate-sites-list"
          aria-expanded={isListExpanded}
        />
        {query && (
          <button
            type="button"
            onClick={() => {
              setQuery("");
              setIsListExpanded(false);
            }}
            aria-label="Clear search text"
            className="absolute right-2.5 top-1/2 -translate-y-1/2 text-white/50 hover:text-white text-xs"
          >
            ✕
          </button>
        )}
      </div>

      {/* Quick selection chips for prominent candidate locations */}
      <div className="mt-2.5 flex flex-wrap gap-1">
        {SAMPLE_LUNAR_SITES.slice(0, 5).map((s) => {
          const isSelected = selectedLocation?.id === s.id;
          return (
            <button
              key={s.id}
              type="button"
              onClick={() => onSelectLocation(s)}
              className={`rounded-xs px-2 py-0.5 text-[10px] font-mono transition-colors border ${
                isSelected
                  ? "bg-[#00e5ff]/20 border-[#00e5ff] text-[#00e5ff] font-semibold"
                  : "bg-white/5 border-white/15 text-white/70 hover:text-white hover:bg-white/15"
              }`}
            >
              {s.name.replace(" Crater Rim", "").replace(" Rim 1", "")}
            </button>
          );
        })}
      </div>

      {/* Candidate Sites Dropdown / List */}
      {isListExpanded && (
        <div className="mt-2 max-h-52 overflow-y-auto rounded-md border border-white/20 bg-black/95 p-1 shadow-2xl">
          {filteredSites.length === 0 ? (
            <div className="p-3 text-center text-xs text-white/60">
              <p>No sample locations match &ldquo;{query}&rdquo;.</p>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => setQuery("")}
                className="mt-2 text-xs"
              >
                Reset Filter
              </Button>
            </div>
          ) : (
            <ul
              id="candidate-sites-list"
              ref={listRef}
              role="listbox"
              aria-label="Candidate sample locations"
            >
              {filteredSites.map((site, index) => {
                const isSelected = selectedLocation?.id === site.id;
                const isHighlighted = safeHighlightedIndex === index;
                return (
                  <li
                    key={site.id}
                    role="option"
                    aria-selected={isSelected}
                    onClick={() => {
                      onSelectLocation(site);
                      setIsListExpanded(false);
                    }}
                    onMouseEnter={() => setHighlightedIndex(index)}
                    className={`cursor-pointer rounded-xs px-2.5 py-1.5 text-xs transition-colors ${
                      isHighlighted
                        ? "bg-[#00e5ff]/20 text-[#00e5ff] border border-[#00e5ff]/30"
                        : isSelected
                          ? "bg-white/10 text-white font-semibold"
                          : "text-white/70 hover:text-white hover:bg-white/5"
                    }`}
                  >
                    <div className="flex items-center justify-between font-medium">
                      <span className="text-white">{site.name}</span>
                      <span className="font-mono text-[10px] text-white/60">
                        {site.latitude.toFixed(2)}° S, {site.longitude.toFixed(2)}° E
                      </span>
                    </div>
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-white/60">
                      {site.description}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      )}

      {/* Selected Location Card */}
      {selectedLocation && (
        <div className="mt-3.5 rounded-md border border-white/15 bg-white/[0.04] p-3">
          <div className="flex items-start justify-between gap-2">
            <div>
              <p className="text-[10px] font-mono uppercase tracking-wider text-[#00e5ff]">
                Selected Site
              </p>
              <h3 className="text-sm font-semibold text-white">
                {selectedLocation.name}
              </h3>
            </div>
            {onAddScenario && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => onAddScenario(selectedLocation)}
                disabled={comparisonCount >= maxComparisons}
                title={
                  comparisonCount >= maxComparisons
                    ? "Maximum 3 scenarios compared"
                    : "Add scenario to comparison workspace"
                }
                className="h-7 text-xs"
              >
                + Compare
              </Button>
            )}
          </div>

          <p className="mt-1 text-xs text-muted-foreground leading-snug">
            {selectedLocation.description}
          </p>

          <Separator className="my-2.5 opacity-40" />

          <dl className="grid grid-cols-2 gap-x-2 gap-y-1.5 font-mono text-[11px]">
            <div>
              <dt className="text-muted-foreground text-[10px]">Latitude</dt>
              <dd className="font-semibold text-foreground">
                {selectedLocation.latitude.toFixed(4)}° S
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-[10px]">Longitude</dt>
              <dd className="font-semibold text-foreground">
                {selectedLocation.longitude.toFixed(4)}° E
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-[10px]">Est. Elevation</dt>
              <dd className="text-foreground">
                {selectedLocation.elevationMeters > 0 ? "+" : ""}
                {selectedLocation.elevationMeters} m
              </dd>
            </div>
            <div>
              <dt className="text-muted-foreground text-[10px]">Frame</dt>
              <dd className="text-foreground truncate" title="Moon Mean Earth / Polar Axis">
                IAU ME Frame
              </dd>
            </div>
          </dl>

          <div className="mt-2.5 flex items-center justify-between text-[10px] text-muted-foreground">
            <span>Coord: Mean Earth / Polar Axis</span>
            <span className="font-mono text-emerald-400/90">● Active</span>
          </div>
        </div>
      )}
    </section>
  );
}
