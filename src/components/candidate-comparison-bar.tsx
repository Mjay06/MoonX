"use client";

import React from "react";
import { CandidateScenario } from "@/types/mission";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";

interface CandidateComparisonBarProps {
  scenarios: CandidateScenario[];
  activeScenarioId: string | null;
  onSelectScenario: (scenario: CandidateScenario) => void;
  onRemoveScenario: (scenarioId: string) => void;
  onResetScenarios: () => void;
  maxScenarios?: number;
}

export function CandidateComparisonBar({
  scenarios,
  activeScenarioId,
  onSelectScenario,
  onRemoveScenario,
  onResetScenarios,
  maxScenarios = 3,
}: CandidateComparisonBarProps) {
  if (scenarios.length === 0) {
    return (
      <div
        aria-label="Candidate scenario comparison workspace"
        className="relative w-full rounded-md border border-dashed border-white/20 bg-black/80 p-3 text-center backdrop-blur-xl"
      >
        <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-white/70">
          Scenario Comparison (0/{maxScenarios})
        </p>
        <p className="mt-1 text-[11px] text-white/50 leading-relaxed">
          Select a site and click <span className="text-[#00e5ff] font-mono">+ Compare</span> to evaluate multiple candidate landing scenarios side-by-side.
        </p>
      </div>
    );
  }

  return (
    <div
      aria-label="Candidate scenario comparison workspace"
      className="relative w-full rounded-md border border-white/20 bg-black/90 p-3.5 shadow-2xl backdrop-blur-xl transition-all"
    >
      <div className="flex items-center justify-between border-b border-white/10 pb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-white/90">
            Scenarios ({scenarios.length}/{maxScenarios})
          </h3>
          <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 border-white/20 text-white/60">
            Client-Only
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onResetScenarios}
          className="h-6 px-1.5 text-[11px] text-white/60 hover:text-red-400"
          title="Clear all compared scenarios"
        >
          Reset All
        </Button>
      </div>

      <div className="mt-2 space-y-1.5">
        {scenarios.map((scenario, index) => {
          const isActive = activeScenarioId === scenario.id;
          return (
            <div
              key={scenario.id}
              className={`flex items-center justify-between rounded-xs border p-2 transition-colors ${
                isActive
                  ? "border-[#00e5ff] bg-[#00e5ff]/10 text-white"
                  : "border-white/15 bg-white/[0.03] text-white/70 hover:border-white/30 hover:bg-white/[0.06]"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectScenario(scenario)}
                className="flex flex-1 items-center gap-2 text-left focus-visible:outline-none"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full ring-2 ring-black shrink-0"
                  style={{ backgroundColor: scenario.color }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-white truncate">
                      {index + 1}. {scenario.location.name}
                    </span>
                    {isActive && (
                      <Badge variant="secondary" className="text-[9px] h-4 px-1 py-0 font-mono bg-[#00e5ff]/20 text-[#00e5ff] border-[#00e5ff]/40">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="font-mono text-[10px] text-white/60 truncate">
                    {scenario.location.latitude.toFixed(2)}° S, {scenario.location.longitude.toFixed(2)}° E
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onRemoveScenario(scenario.id)}
                aria-label={`Remove scenario for ${scenario.location.name}`}
                className="ml-2 h-6 w-6 rounded-xs flex items-center justify-center text-white/50 hover:bg-red-500/20 hover:text-red-400 text-xs"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-[10px] text-white/50 leading-tight">
        Comparison shows relative geometry. Sites are illustrative sample records and not recommendations.
      </p>
    </div>
  );
}
