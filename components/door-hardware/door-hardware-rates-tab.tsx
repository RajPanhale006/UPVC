"use client";

import { useMemo, useState } from "react";
import { Plus, RotateCcw, Search, Wrench } from "lucide-react";

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
import { shouldShowProfilesBlock } from "@/lib/module-menu";
import {
  canEditDoorHardwareMaster,
  HARDWARE_UNIT_LABELS,
  resetDoorHardwareMasterSettings,
  type DoorHardwareMasterSettings,
  type DoorTypeFilter,
  type HardwareMasterItem,
  type HardwareUnit,
} from "@/lib/door-hardware";
import { formatInr } from "@/lib/profiles";
import { getCurrentUserName } from "@/lib/jobs";
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

type DoorHardwareRatesTabProps = {
  settings: DoorHardwareMasterSettings;
  onChange: (settings: DoorHardwareMasterSettings) => void;
  activeSection?: string;
};

type DoorFilter = "all" | DoorTypeFilter;

function parseNumber(value: string, fallback: number): number {
  const parsed = Number.parseFloat(value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function unitShort(unit: HardwareUnit): string {
  return HARDWARE_UNIT_LABELS[unit];
}

export function DoorHardwareRatesTab({
  settings,
  onChange,
  activeSection,
}: DoorHardwareRatesTabProps) {
  const canEdit = canEditDoorHardwareMaster();
  const show = (block: string) => shouldShowProfilesBlock(activeSection, block);
  const sectionMode = Boolean(activeSection);
  const [search, setSearch] = useState("");
  const [doorFilter, setDoorFilter] = useState<DoorFilter>("all");
  const [editingId, setEditingId] = useState<string | null>(null);

  const filteredItems = useMemo(() => {
    return settings.items.filter((item) => {
      if (item.isDraft && !canEdit) return false;
      const haystack = `${item.name} ${item.code} ${item.specification ?? ""}`.toLowerCase();
      if (search.trim() && !haystack.includes(search.trim().toLowerCase())) return false;
      if (doorFilter === "all") return true;
      return item.applicableDoorTypes.includes(doorFilter);
    });
  }, [settings.items, search, doorFilter, canEdit]);

  const activeCount = settings.items.filter((i) => i.isActive && !i.isDraft).length;
  const missingRateCount = settings.items.filter(
    (i) => i.isActive && !i.isDraft && i.rate == null && !i.allowZeroCost,
  ).length;

  function updateItem(id: string, patch: Partial<HardwareMasterItem>) {
    onChange({
      ...settings,
      items: settings.items.map((item) =>
        item.id === id
          ? {
              ...item,
              ...patch,
              updatedAt: new Date().toISOString(),
              updatedBy: getCurrentUserName(),
            }
          : item,
      ),
      updatedAt: new Date().toISOString(),
      updatedBy: getCurrentUserName(),
    });
  }

  function handleReset() {
    onChange(resetDoorHardwareMasterSettings());
  }

  function handleAddItem() {
    const id = `custom-${Date.now()}`;
    onChange({
      ...settings,
      items: [
        ...settings.items,
        {
          id,
          code: "NEW",
          name: "New Door Hardware",
          category: "accessory",
          applicableProduct: "door",
          applicableDoorTypes: ["single-door", "double-door"],
          unit: "piece",
          isActive: false,
          isDraft: true,
          updatedAt: new Date().toISOString(),
          updatedBy: getCurrentUserName(),
        },
      ],
    });
    setEditingId(id);
  }

  function handleDeleteDraft(id: string) {
    onChange({
      ...settings,
      items: settings.items.filter((item) => item.id !== id || !item.isDraft),
    });
    if (editingId === id) setEditingId(null);
  }

  return (
    <PageShell className="flex flex-col gap-6">
      {!sectionMode ? (
        <PageHero
          icon={Wrench}
          accent="indigo"
          title="Door Hardware Rates"
          description="Central master rates for espag, keeps, handles, hinges and shoot bolts. Used automatically in door workshop cost and customer pricing."
          actions={
            canEdit ? (
              <Button type="button" variant="outline" className="hero-action-light" onClick={handleReset}>
                <RotateCcw />
                Reset defaults
              </Button>
            ) : null
          }
        />
      ) : null}

      {show("door-hardware-rates") ? (
        <>
          <div className="grid gap-3 sm:grid-cols-3">
            <StatCard accent="indigo" label="Active items" value={String(activeCount)} />
            <StatCard
              accent="amber"
              label="Missing rates"
              value={String(missingRateCount)}
              sublabel={missingRateCount > 0 ? "Configure before final costing" : "All configured"}
            />
            <StatCard accent="violet" label="Catalog items" value={String(settings.items.length)} />
          </div>

          <AccentCard accent="indigo">
            <AccentCardHeader>
              <AccentCardTitle>Door Hardware Rates</AccentCardTitle>
              <AccentCardDescription>
                Material and hardware costs — edit master rates here. Job-specific overrides stay on
                the active product.
              </AccentCardDescription>
            </AccentCardHeader>
            <AccentCardContent className="space-y-4">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
                <div className="flex-1">
                  <Label htmlFor="hardware-search">Search</Label>
                  <div className="relative mt-1">
                    <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
                    <Input
                      id="hardware-search"
                      className="pl-9"
                      placeholder="Search hardware name or code"
                      value={search}
                      onChange={(e) => setSearch(e.target.value)}
                    />
                  </div>
                </div>
                <div className="w-full sm:w-48">
                  <Label>Door type</Label>
                  <Select
                    value={doorFilter}
                    onValueChange={(value) => setDoorFilter(value as DoorFilter)}
                  >
                    <SelectTrigger className="mt-1">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="all">All doors</SelectItem>
                      <SelectItem value="single-door">Single Door</SelectItem>
                      <SelectItem value="double-door">Double Door</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                {canEdit ? (
                  <Button type="button" onClick={handleAddItem}>
                    <Plus className="size-4" />
                    Add item
                  </Button>
                ) : null}
              </div>

              <div className="hidden md:block">
                <DataTable>
                  <table className="w-full min-w-[960px] text-sm">
                    <DataTableHead>
                      <tr>
                        <th className="px-3 py-2 text-left">Hardware Item</th>
                        <th className="px-3 py-2 text-left">Specification</th>
                        <th className="px-3 py-2 text-left">Unit</th>
                        <th className="px-3 py-2 text-right">Single Qty</th>
                        <th className="px-3 py-2 text-right">Double Qty</th>
                        <th className="px-3 py-2 text-right">Rate</th>
                        <th className="px-3 py-2 text-center">Status</th>
                        {canEdit ? <th className="px-3 py-2 text-right">Actions</th> : null}
                      </tr>
                    </DataTableHead>
                    <tbody>
                      {filteredItems.map((item) => (
                        <tr key={item.id} className="border-t border-slate-100">
                          <td className="px-3 py-2 font-semibold text-slate-900">
                            {item.name}
                            <p className="text-xs font-normal text-slate-500">{item.code}</p>
                          </td>
                          <td className="px-3 py-2 text-slate-600">{item.specification ?? "—"}</td>
                          <td className="px-3 py-2">{unitShort(item.unit)}</td>
                          <td className="px-3 py-2 text-right">{item.defaultSingleDoorQty ?? 0}</td>
                          <td className="px-3 py-2 text-right">{item.defaultDoubleDoorQty ?? 0}</td>
                          <td className="px-3 py-2 text-right font-semibold">
                            {item.allowZeroCost && item.rate === 0
                              ? "No Cost"
                              : item.rate != null
                                ? formatInr(item.rate)
                                : "—"}
                          </td>
                          <td className="px-3 py-2 text-center">
                            <span
                              className={
                                item.isActive
                                  ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800"
                                  : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600"
                              }
                            >
                              {item.isActive ? "Active" : "Inactive"}
                            </span>
                          </td>
                          {canEdit ? (
                            <td className="px-3 py-2 text-right">
                              <Button
                                type="button"
                                size="sm"
                                variant="outline"
                                onClick={() =>
                                  setEditingId((current) => (current === item.id ? null : item.id))
                                }
                              >
                                Edit
                              </Button>
                            </td>
                          ) : null}
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </DataTable>
              </div>

              <div className="grid gap-3 md:hidden">
                {filteredItems.map((item) => (
                  <article
                    key={item.id}
                    className="rounded-xl border border-slate-200 bg-white p-4 shadow-sm"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-slate-900">{item.name}</h3>
                        <p className="text-xs text-slate-500">{item.code}</p>
                      </div>
                      <span
                        className={
                          item.isActive
                            ? "rounded-full bg-emerald-100 px-2 py-0.5 text-xs font-semibold text-emerald-800"
                            : "rounded-full bg-slate-100 px-2 py-0.5 text-xs font-semibold text-slate-600"
                        }
                      >
                        {item.isActive ? "Active" : "Inactive"}
                      </span>
                    </div>
                    {item.specification ? (
                      <p className="mt-2 text-sm text-slate-600">{item.specification}</p>
                    ) : null}
                    <div className="mt-3 grid grid-cols-2 gap-2 text-sm">
                      <p>
                        <span className="text-slate-500">Unit:</span> {unitShort(item.unit)}
                      </p>
                      <p>
                        <span className="text-slate-500">Rate:</span>{" "}
                        {item.rate != null ? formatInr(item.rate) : "—"}
                      </p>
                      <p>
                        <span className="text-slate-500">Single qty:</span>{" "}
                        {item.defaultSingleDoorQty ?? 0}
                      </p>
                      <p>
                        <span className="text-slate-500">Double qty:</span>{" "}
                        {item.defaultDoubleDoorQty ?? 0}
                      </p>
                    </div>
                    {canEdit ? (
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="mt-3 w-full"
                        onClick={() =>
                          setEditingId((current) => (current === item.id ? null : item.id))
                        }
                      >
                        Edit
                      </Button>
                    ) : null}
                  </article>
                ))}
              </div>

              {editingId && canEdit ? (
                <HardwareEditPanel
                  item={settings.items.find((i) => i.id === editingId)!}
                  onSave={(patch) => updateItem(editingId, patch)}
                  onDelete={() => handleDeleteDraft(editingId)}
                  onClose={() => setEditingId(null)}
                />
              ) : null}
            </AccentCardContent>
          </AccentCard>
        </>
      ) : null}
    </PageShell>
  );
}

function HardwareEditPanel({
  item,
  onSave,
  onDelete,
  onClose,
}: {
  item: HardwareMasterItem;
  onSave: (patch: Partial<HardwareMasterItem>) => void;
  onDelete: () => void;
  onClose: () => void;
}) {
  const [name, setName] = useState(item.name);
  const [code, setCode] = useState(item.code);
  const [specification, setSpecification] = useState(item.specification ?? "");
  const [unit, setUnit] = useState<HardwareUnit>(item.unit);
  const [singleQty, setSingleQty] = useState(String(item.defaultSingleDoorQty ?? 0));
  const [doubleQty, setDoubleQty] = useState(String(item.defaultDoubleDoorQty ?? 0));
  const [rate, setRate] = useState(item.rate != null ? String(item.rate) : "");
  const [notes, setNotes] = useState(item.notes ?? "");
  const [isActive, setIsActive] = useState(item.isActive);
  const [allowZeroCost, setAllowZeroCost] = useState(Boolean(item.allowZeroCost));

  return (
    <div className="rounded-xl border border-indigo-200 bg-indigo-50/40 p-4">
      <h3 className="text-base font-bold text-slate-900">Edit hardware — {item.name}</h3>
      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <div>
          <Label>Hardware name</Label>
          <Input className="mt-1" value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <Label>Hardware code</Label>
          <Input className="mt-1" value={code} onChange={(e) => setCode(e.target.value)} />
        </div>
        <div className="sm:col-span-2">
          <Label>Specification</Label>
          <Input
            className="mt-1"
            value={specification}
            onChange={(e) => setSpecification(e.target.value)}
          />
        </div>
        <div>
          <Label>Unit</Label>
          <Select value={unit} onValueChange={(v) => setUnit(v as HardwareUnit)}>
            <SelectTrigger className="mt-1">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="piece">Per Piece</SelectItem>
              <SelectItem value="set">Per Set</SelectItem>
              <SelectItem value="pair">Per Pair</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label>Rate (₹)</Label>
          <Input
            className="mt-1"
            inputMode="decimal"
            value={rate}
            onChange={(e) => setRate(e.target.value)}
            disabled={allowZeroCost}
          />
        </div>
        <div>
          <Label>Default single door qty</Label>
          <Input
            className="mt-1"
            inputMode="numeric"
            value={singleQty}
            onChange={(e) => setSingleQty(e.target.value)}
          />
        </div>
        <div>
          <Label>Default double door qty</Label>
          <Input
            className="mt-1"
            inputMode="numeric"
            value={doubleQty}
            onChange={(e) => setDoubleQty(e.target.value)}
          />
        </div>
        <div className="sm:col-span-2">
          <Label>Notes</Label>
          <Input className="mt-1" value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input type="checkbox" checked={isActive} onChange={(e) => setIsActive(e.target.checked)} />
          Active
        </label>
        <label className="flex items-center gap-2 text-sm font-medium">
          <input
            type="checkbox"
            checked={allowZeroCost}
            onChange={(e) => setAllowZeroCost(e.target.checked)}
          />
          No Cost (explicit zero)
        </label>
      </div>
      <div className="mt-4 flex flex-wrap gap-2">
        <Button
          type="button"
          onClick={() =>
            onSave({
              name: name.trim() || item.name,
              code: code.trim() || item.code,
              specification: specification.trim() || undefined,
              unit,
              defaultSingleDoorQty: Math.max(0, parseNumber(singleQty, 0)),
              defaultDoubleDoorQty: Math.max(0, parseNumber(doubleQty, 0)),
              rate: allowZeroCost ? 0 : rate.trim() === "" ? undefined : Math.max(0, parseNumber(rate, 0)),
              allowZeroCost,
              isActive,
              notes: notes.trim() || undefined,
              isDraft: false,
            })
          }
        >
          Save
        </Button>
        <Button type="button" variant="outline" onClick={onClose}>
          Close
        </Button>
        {item.isDraft ? (
          <Button type="button" variant="destructive" onClick={onDelete}>
            Delete draft
          </Button>
        ) : null}
      </div>
    </div>
  );
}
