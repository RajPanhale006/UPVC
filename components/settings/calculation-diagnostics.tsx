"use client";

import { useMemo, useState } from "react";
import { FlaskConical, Play } from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  runAcceptanceSampleTest,
  runSarikAcceptanceTest,
  runSarikThreeGlassAcceptanceTest,
  runSarikTwoGlassOneNetRegressionTest,
  runStandardAcceptanceTests,
} from "@/lib/cutting";
import {
  runAllDoorAcceptanceTests,
  runDoorOpeningDirectionInvariantTest,
} from "@/lib/cutting/door";
import {
  AccentCard,
  AccentCardContent,
  AccentCardDescription,
  AccentCardHeader,
  AccentCardTitle,
  DataTable,
  DataTableHead,
  SectionLabel,
} from "@/components/workshop/workshop-ui";

type TestRun = {
  label: string;
  allOk: boolean;
  rows: { item: string; expected: number; calculated: number; status: string }[];
};

export function CalculationDiagnostics() {
  const [runs, setRuns] = useState<TestRun[] | null>(null);

  const summary = useMemo(() => {
    if (!runs) return null;
    const passed = runs.filter((r) => r.allOk).length;
    return { passed, total: runs.length };
  }, [runs]);

  function runAllTests() {
    const next: TestRun[] = [];

    for (const test of runStandardAcceptanceTests()) {
      next.push({
        label: test.label,
        allOk: test.allOk,
        rows: test.rows.map((r) => ({
          item: r.item,
          expected: r.expected,
          calculated: r.calculated,
          status: r.status,
        })),
      });
    }

    const workshop = runAcceptanceSampleTest();
    next.push({
      label: "Workshop 2385 × 2053",
      allOk: workshop.allOk,
      rows: workshop.rows.map((r) => ({
        item: r.item,
        expected: r.expected,
        calculated: r.calculated,
        status: r.status,
      })),
    });

    for (const [label, fn] of [
      ["Sarik 1187 × 1208", runSarikAcceptanceTest],
      ["Sarik 3-glass no net", runSarikThreeGlassAcceptanceTest],
      ["Sarik 2-glass 1-net", runSarikTwoGlassOneNetRegressionTest],
    ] as const) {
      const test = fn();
      next.push({
        label,
        allOk: test.allOk,
        rows: test.rows.map((r) => ({
          item: r.item,
          expected: r.expected,
          calculated: r.calculated,
          status: r.status,
        })),
      });
    }

    for (const test of runAllDoorAcceptanceTests()) {
      next.push({
        label: test.label,
        allOk: test.allOk,
        rows: test.rows.map((r) => ({
          item: r.item,
          expected: r.expected,
          calculated: r.calculated,
          status: r.status,
        })),
      });
    }

    const opening = runDoorOpeningDirectionInvariantTest();
    next.push({
      label: "Door opening direction invariant",
      allOk: opening.allOk,
      rows: [
        {
          item: "Inward vs outward",
          expected: 1,
          calculated: opening.allOk ? 1 : 0,
          status: opening.allOk ? "ok" : "fail",
        },
      ],
    });

    setRuns(next);
  }

  return (
    <div className="space-y-6 border-t border-slate-200 pt-8">
      <AccentCard accent="indigo">
        <AccentCardHeader>
          <AccentCardTitle className="flex items-center gap-2">
            <FlaskConical className="size-5" />
            Calculation Methods — Diagnostics
          </AccentCardTitle>
          <AccentCardDescription>
            Sarik sample tests and reference dimensions. For workshop verification only — not shown on the production Cutting tab.
          </AccentCardDescription>
        </AccentCardHeader>
        <AccentCardContent className="space-y-4">
          <Button type="button" onClick={runAllTests}>
            <Play />
            Run all reference tests
          </Button>
          {summary ? (
            <p className="text-sm font-medium text-slate-700">
              {summary.passed} / {summary.total} test suites passed
            </p>
          ) : null}
        </AccentCardContent>
      </AccentCard>

      {runs?.map((run) => (
        <AccentCard key={run.label} accent={run.allOk ? "emerald" : "amber"}>
          <AccentCardHeader>
            <AccentCardTitle>{run.label}</AccentCardTitle>
            <AccentCardDescription>{run.allOk ? "PASS" : "FAIL"}</AccentCardDescription>
          </AccentCardHeader>
          <AccentCardContent className="overflow-x-auto">
            <DataTable>
              <DataTableHead>
                <tr>
                  <th>Item</th>
                  <th>Expected</th>
                  <th>Calculated</th>
                  <th>Status</th>
                </tr>
              </DataTableHead>
              <tbody>
                {run.rows.map((row) => (
                  <tr key={row.item}>
                    <td>{row.item}</td>
                    <td>{row.expected}</td>
                    <td>{row.calculated}</td>
                    <td>{row.status}</td>
                  </tr>
                ))}
              </tbody>
            </DataTable>
          </AccentCardContent>
        </AccentCard>
      ))}

      <SectionLabel>Reference samples</SectionLabel>
      <p className="text-sm text-slate-600">
        Sarik window: 1187 × 1208 mm → Frame cut 1192 × 1213 · Sash cut 593 × 1131 · Glass 477 × 1014
      </p>
      <p className="text-sm text-slate-600">
        Sarik single door (official v2): 862 × 2141 mm → Frame 868 × 2144 · Sash 804 × 2110 · Beading 626 × 1932 · Glass 621 × 1927
      </p>
    </div>
  );
}
