"use client";

import { Layers, RotateCcw } from "lucide-react";

import {
  CUTTING_METHOD_LABELS,
  getMethodLabel,
  updateTrackCuttingConfig,
  type CuttingMethod,
  type ProfileCuttingSettings,
  type TrackSystemId,
} from "@/lib/cutting";
import {
  formatInr,
  resetProfileRateSettings,
  updateMarketRatePerKg,
  updateProfileWeightPerFt,
  type ProfileRateKey,
  type ProfileRateSettings,
} from "@/lib/profiles";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { DoorHardwareRatesTab } from "@/components/door-hardware/door-hardware-rates-tab";
import { CalculationDiagnostics } from "@/components/settings/calculation-diagnostics";
import type { DoorHardwareMasterSettings } from "@/lib/door-hardware";
import type { EstimationInputs, GlassSizeOption } from "@/lib/estimation/types";
import { shouldShowProfilesBlock } from "@/lib/module-menu";
import {
  AccentCard,
  AccentCardContent,
  AccentCardDescription,
  AccentCardHeader,
  AccentCardTitle,
  DataTable,
  DataTableHead,
  PageHero,
  PageShell,
  StatCard,
} from "@/components/workshop/workshop-ui";

type ProfilesRatesTabProps = {
  profileRates: ProfileRateSettings;
  profileCuttingSettings: ProfileCuttingSettings;
  doorHardwareMaster: DoorHardwareMasterSettings;
  onChange: (settings: ProfileRateSettings) => void;
  onCuttingSettingsChange: (settings: ProfileCuttingSettings) => void;
  onDoorHardwareMasterChange: (settings: DoorHardwareMasterSettings) => void;
  onReset: () => void;
  onOpenDoorHardwareRates?: () => void;
  estimationInputs: EstimationInputs;
  onEstimationInputsChange: (inputs: EstimationInputs) => void;
  activeSection?: string;
};

function parseNumber(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

export function ProfilesRatesTab({
  profileRates,
  profileCuttingSettings,
  doorHardwareMaster,
  onChange,
  onCuttingSettingsChange,
  onDoorHardwareMasterChange,
  onReset,
  onOpenDoorHardwareRates,
  estimationInputs,
  onEstimationInputsChange,
  activeSection,
}: ProfilesRatesTabProps) {
  const show = (block: string) => shouldShowProfilesBlock(activeSection, block);
  const sectionMode = Boolean(activeSection);

  if (activeSection === "hardware" && show("door-hardware-rates")) {
    return (
      <DoorHardwareRatesTab
        settings={doorHardwareMaster}
        onChange={onDoorHardwareMasterChange}
        activeSection={activeSection}
      />
    );
  }
  function handleMarketRateChange(value: string) {
    onChange(
      updateMarketRatePerKg(
        profileRates,
        parseNumber(value, profileRates.marketRatePerKg),
      ),
    );
  }

  function updateGlassRate(size: GlassSizeOption, value: string) {
    onEstimationInputsChange({
      ...estimationInputs,
      glassRates: {
        ...estimationInputs.glassRates,
        [size]: parseNumber(value, estimationInputs.glassRates[size]),
      },
    });
  }

  function handleWeightChange(key: ProfileRateKey, value: string) {
    const current = profileRates.profiles.find((profile) => profile.key === key);
    if (!current) {
      return;
    }

    onChange(
      updateProfileWeightPerFt(
        profileRates,
        key,
        parseNumber(value, current.weightPerFt),
      ),
    );
  }

  const avgRatePerFt =
    profileRates.profiles.reduce((sum, p) => sum + p.ratePerFt, 0) /
    profileRates.profiles.length;

  return (
    <PageShell className="flex flex-col gap-6">
      {!sectionMode ? (
      <PageHero
        icon={Layers}
        accent="amber"
        title="Profile Settings"
        description="Profile rates for estimation and default cutting method per track system. Override method in Cutting Calculator when needed."
        actions={
          <Button
            type="button"
            variant="outline"
            className="hero-action-light"
            onClick={onReset}
          >
            <RotateCcw />
            Reset to Excel defaults
          </Button>
        }
      />
      ) : null}

      {show("stats") ? (
      <div className="grid gap-3 sm:grid-cols-3">
        <StatCard
          accent="amber"
          label="Market rate"
          value={formatInr(profileRates.marketRatePerKg)}
          sublabel="per kg"
        />
        <StatCard
          accent="violet"
          label="Profiles"
          value={String(profileRates.profiles.length)}
          sublabel="in catalog"
        />
        <StatCard
          accent="cyan"
          label="Avg rate / ft"
          value={formatInr(Math.round(avgRatePerFt * 100) / 100)}
          sublabel="across all profiles"
        />
      </div>
      ) : null}

      {show("cutting-methods") ? (
      <AccentCard accent="violet">
        <AccentCardHeader>
          <AccentCardTitle>Cutting method mapping</AccentCardTitle>
          <AccentCardDescription>
            Default method per track when opening Cutting Calculator. User can override per job.
          </AccentCardDescription>
        </AccentCardHeader>
        <AccentCardContent className="space-y-4">
          {(Object.values(profileCuttingSettings.tracks)).map((track) => (
            <div
              key={track.trackSystemId}
              className="grid gap-3 rounded-xl border bg-muted/20 p-4 sm:grid-cols-2 lg:grid-cols-4"
            >
              <div>
                <p className="font-semibold">{track.label}</p>
                <p className="text-xs text-muted-foreground">Code: {track.profileCode}</p>
              </div>
              <div className="space-y-2">
                <Label>Default method</Label>
                <Select
                  value={track.defaultCuttingMethod}
                  onValueChange={(v) =>
                    onCuttingSettingsChange(
                      updateTrackCuttingConfig(profileCuttingSettings, track.trackSystemId, {
                        defaultCuttingMethod: v as CuttingMethod,
                      }),
                    )
                  }
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CUTTING_METHOD_LABELS) as CuttingMethod[]).map((m) => (
                      <SelectItem key={m} value={m}>{CUTTING_METHOD_LABELS[m]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fallback method</Label>
                <Select
                  value={track.fallbackCuttingMethod}
                  onValueChange={(v) =>
                    onCuttingSettingsChange(
                      updateTrackCuttingConfig(profileCuttingSettings, track.trackSystemId, {
                        fallbackCuttingMethod: v as CuttingMethod,
                      }),
                    )
                  }
                >
                  <SelectTrigger className="w-full"><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {(Object.keys(CUTTING_METHOD_LABELS) as CuttingMethod[]).map((m) => (
                      <SelectItem key={m} value={m}>{CUTTING_METHOD_LABELS[m]}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex items-end text-sm text-muted-foreground">
                Active default: {getMethodLabel(track.defaultCuttingMethod)}
              </div>
            </div>
          ))}
        </AccentCardContent>
      </AccentCard>
      ) : null}

      {show("door-note") ? (
        <AccentCard accent="violet">
          <AccentCardHeader>
            <AccentCardTitle>Door profiles</AccentCardTitle>
            <AccentCardDescription>
              Door frame, sash and beading profiles use the Sarik Door Method in the Cutting
              Calculator. Rates are shared with the profile sheet below.
            </AccentCardDescription>
          </AccentCardHeader>
        </AccentCard>
      ) : null}

      {show("market-rate") ? (
      <AccentCard accent="amber">
        <AccentCardHeader>
          <AccentCardTitle>Market rate</AccentCardTitle>
          <AccentCardDescription>
            Linked to Excel Inputs B50 — Profile Rate / kg (Market). Default
            ₹150/kg.
          </AccentCardDescription>
        </AccentCardHeader>
        <AccentCardContent className="max-w-xs space-y-2">
          <Label htmlFor="market-rate">Profile rate / kg (₹)</Label>
          <Input
            id="market-rate"
            inputMode="decimal"
            className="border-amber-200 bg-amber-50/50 font-semibold"
            value={String(profileRates.marketRatePerKg)}
            onChange={(event) => handleMarketRateChange(event.target.value)}
          />
        </AccentCardContent>
      </AccentCard>
      ) : null}

      {show("profile-table") ? (
      <AccentCard accent="indigo">
        <AccentCardHeader>
          <AccentCardTitle>Profile rate sheet</AccentCardTitle>
          <AccentCardDescription>
            Rate/ft = Weight/ft × Rate/kg. Weight/ft is editable if your bar
            weight differs.
          </AccentCardDescription>
        </AccentCardHeader>
        <AccentCardContent>
          <DataTable className="min-w-[56rem]">
            <DataTableHead>
              <th className="px-3 py-3">S No</th>
              <th className="px-3 py-3">Profile key</th>
              <th className="px-3 py-3">Description</th>
              <th className="px-3 py-3">Weight/ft</th>
              <th className="px-3 py-3">Rate/kg</th>
              <th className="px-3 py-3">Rate/ft</th>
            </DataTableHead>
            <tbody>
              {profileRates.profiles.map((profile, index) => (
                <tr
                  key={profile.key}
                  className={
                    index % 2 === 0
                      ? "border-b border-indigo-50 bg-white"
                      : "border-b border-indigo-50 bg-indigo-50/30"
                  }
                >
                  <td className="px-3 py-2.5 font-medium">{profile.serialNo}</td>
                  <td className="px-3 py-2.5 font-mono text-xs text-indigo-700">
                    {profile.key}
                  </td>
                  <td className="px-3 py-2.5">{profile.description}</td>
                  <td className="px-3 py-2.5">
                    <Input
                      inputMode="decimal"
                      className="h-8 w-24 border-indigo-200 bg-white font-mono"
                      value={String(profile.weightPerFt)}
                      onChange={(event) =>
                        handleWeightChange(profile.key, event.target.value)
                      }
                    />
                  </td>
                  <td className="px-3 py-2.5 font-mono text-muted-foreground">
                    {formatInr(profile.ratePerKg)}
                  </td>
                  <td className="px-3 py-2.5 font-mono font-bold text-indigo-800">
                    {formatInr(profile.ratePerFt)}
                  </td>
                </tr>
              ))}
            </tbody>
          </DataTable>
        </AccentCardContent>
      </AccentCard>
      ) : null}

      {show("glass-rates") ? (
        <AccentCard accent="cyan">
          <AccentCardHeader>
            <AccentCardTitle>Glass and mesh rates</AccentCardTitle>
            <AccentCardDescription>
              Glass and jaali rates used in material costing and workshop estimates. Saved on this
              device automatically.
            </AccentCardDescription>
          </AccentCardHeader>
          <AccentCardContent className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Jaali / net per sq.ft (₹)</Label>
              <Input
                inputMode="decimal"
                className="border-cyan-200 bg-white font-mono"
                value={String(estimationInputs.jaaliRatePerSqft)}
                onChange={(event) =>
                  onEstimationInputsChange({
                    ...estimationInputs,
                    jaaliRatePerSqft: parseNumber(
                      event.target.value,
                      estimationInputs.jaaliRatePerSqft,
                    ),
                  })
                }
              />
            </div>
            {(["3mm", "3.5mm", "5mm"] as const).map((size) => (
              <div key={size} className="space-y-2">
                <Label>Glass {size} per sq.ft (₹)</Label>
                <Input
                  inputMode="decimal"
                  className="border-cyan-200 bg-white font-mono"
                  value={String(estimationInputs.glassRates[size])}
                  onChange={(event) => updateGlassRate(size, event.target.value)}
                />
              </div>
            ))}
          </AccentCardContent>
        </AccentCard>
      ) : null}

      {show("hardware-note") ? (
        <AccentCard accent="emerald">
          <AccentCardHeader>
            <AccentCardTitle>Door Hardware Rates</AccentCardTitle>
            <AccentCardDescription>
              Espag, keeps, handles, hinges and shoot bolt master rates open in the dedicated
              editor.
            </AccentCardDescription>
          </AccentCardHeader>
          <AccentCardContent>
            {onOpenDoorHardwareRates ? (
              <Button type="button" onClick={onOpenDoorHardwareRates}>
                Open Door Hardware Rates
              </Button>
            ) : null}
          </AccentCardContent>
        </AccentCard>
      ) : null}

      {show("wastage-note") ? (
        <AccentCard accent="amber">
          <AccentCardHeader>
            <AccentCardTitle>Wastage settings</AccentCardTitle>
            <AccentCardDescription>
              Profile wastage % is configured in Workshop Cost → Profile Cost and Workshop
              Estimation rates.
            </AccentCardDescription>
          </AccentCardHeader>
        </AccentCard>
      ) : null}

      {!sectionMode ? <CalculationDiagnostics /> : null}
    </PageShell>
  );
}
