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
        className="relative w-full rounded-xl border border-dashed border-border/70 bg-card/60 p-3 text-center backdrop-blur-md"
      >
        <p className="text-[11px] font-semibold uppercase tracking-wider text-muted-foreground">
          Scenario Comparison (0/{maxScenarios})
        </p>
        <p className="mt-1 text-[11px] text-muted-foreground/80 leading-relaxed">
          Select a site and click <span className="text-primary font-mono">+ Compare</span> to evaluate multiple candidate landing scenarios side-by-side.
        </p>
      </div>
    );
  }

  return (
    <div
      aria-label="Candidate scenario comparison workspace"
      className="relative w-full rounded-xl border border-border/70 bg-card/85 p-3.5 shadow-xl backdrop-blur-md transition-all"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-xs font-semibold uppercase tracking-[0.14em] text-muted-foreground">
            Scenarios ({scenarios.length}/{maxScenarios})
          </h3>
          <Badge variant="outline" className="text-[10px] font-mono py-0 px-1.5 border-border/60">
            Client-Only
          </Badge>
        </div>
        <Button
          variant="ghost"
          size="sm"
          onClick={onResetScenarios}
          className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-destructive"
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
              className={`flex items-center justify-between rounded-md border p-2 transition-colors ${
                isActive
                  ? "border-primary/80 bg-primary/10 text-foreground"
                  : "border-border/60 bg-secondary/30 text-muted-foreground hover:border-border hover:bg-secondary/50"
              }`}
            >
              <button
                type="button"
                onClick={() => onSelectScenario(scenario)}
                className="flex flex-1 items-center gap-2 text-left focus-visible:outline-none"
              >
                <span
                  className="h-2.5 w-2.5 rounded-full ring-2 ring-background shrink-0"
                  style={{ backgroundColor: scenario.color }}
                />
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="font-semibold text-xs text-foreground truncate">
                      {index + 1}. {scenario.location.name}
                    </span>
                    {isActive && (
                      <Badge variant="secondary" className="text-[9px] h-4 px-1 py-0 font-mono">
                        Active
                      </Badge>
                    )}
                  </div>
                  <p className="font-mono text-[10px] text-muted-foreground truncate">
                    {scenario.location.latitude.toFixed(2)}° S, {scenario.location.longitude.toFixed(2)}° E
                  </p>
                </div>
              </button>

              <button
                type="button"
                onClick={() => onRemoveScenario(scenario.id)}
                aria-label={`Remove scenario for ${scenario.location.name}`}
                className="ml-2 h-6 w-6 rounded flex items-center justify-center text-muted-foreground hover:bg-destructive/20 hover:text-destructive text-xs"
              >
                ✕
              </button>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-[10px] text-muted-foreground/80 leading-tight">
        Comparison shows relative geometry. Sites are illustrative sample records and not recommendations.
      </p>
    </div>
  );
}
