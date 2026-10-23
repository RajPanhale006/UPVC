import { mmAreaToSqFt } from "@/lib/calculations/format";
import {
  buildFixedFrameOptimizationConfig,
  optimizeFixedFrameBarCuts,
  toFixedFrameBarPlans,
} from "@/lib/cutting/bar-optimization/adapters";
import { summarizeProfileBarUsage } from "@/lib/cutting/bar-optimization/summarize";

import {
  ANCHOR_FASTENERS_PER_OPENING,
  CLEANING_CONSUMABLE_PER_OPENING,
  FIXING_SCREWS_PER_OPENING,
  GASKET_METRES_PER_GLASS_PERIMETER_M,
  MODULE_JOINER_PER_GAP,
  PROTECTIVE_TAPE_METRES_PER_OPENING,
  PU_FOAM_CAN_PER_OPENING,
  SETTING_BLOCKS_PER_GLASS_PANEL,
  SILICONE_TUBE_PER_OPENING,
} from "./constants";
import {
  calculateModuleDivision,
  divisionInputFromSettings,
} from "./division";
import { getFixedFrameProfileDeductions, isBeadCompatibleWithGlass } from "./profile-deductions";
import { calculateReinforcementCuts } from "./reinforcement";
import type {
  FixedFrameCalculationResult,
  FixedFrameCutPiece,
  FixedFrameCuttingResult,
  FixedFrameGlassPanel,
  FixedFrameMaterialItem,
  FixedFrameModuleResult,
  FixedFrameProfileCostRow,
  FixedFrameSettings,
} from "./types";

export type CalculateFixedFrameInput = {
  openingWidthMm: number;
  openingHeightMm: number;
  quantity: number;
  settings: FixedFrameSettings;
  profileRatePerKg: number;
  profileWeightPerMetre?: Partial<Record<string, number>>;
};

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

function buildModuleGlass(
  mod: FixedFrameModuleResult,
  settings: FixedFrameSettings,
  quantity: number,
): FixedFrameGlassPanel {
  const areaSqFt = mmAreaToSqFt(mod.glassWidthMm, mod.glassHeightMm);
  const totalAreaSqFt = round2(areaSqFt * quantity);
  const totalCost = round2(totalAreaSqFt * settings.glassRatePerSqFt);
  return {
    moduleId: mod.id,
    moduleLabel: mod.label,
    widthMm: mod.glassWidthMm,
    heightMm: mod.glassHeightMm,
    thicknessMm: settings.glassThicknessMm,
    glassType: settings.glassType,
    quantity,
    areaSqFt,
    totalAreaSqFt,
    ratePerSqFt: settings.glassRatePerSqFt,
    totalCost,
  };
}

function buildFrameCutPieces(
  modules: FixedFrameModuleResult[],
  settings: FixedFrameSettings,
  quantity: number,
  includeOuterOnly: boolean,
): FixedFrameCutPiece[] {
  const pieces: FixedFrameCutPiece[] = [];
  let pieceId = 0;

  if (includeOuterOnly && settings.constructionMode === "INTERNAL_PARTITIONS") {
    const outerW = modules.reduce((s, m) => s + m.widthMm, 0) +
      Math.max(0, modules.length - 1) * settings.jointGapMm;
    const outerH = modules[0]?.heightMm ?? 0;
    const profile = settings.profiles.frameProfileKey;
    const code = settings.profiles.frameProfileCode;
    const base = {
      profileCode: code,
      profileKey: profile,
      moduleId: "outer",
      moduleLabel: "Outer Frame",
      angle: "45°",
    };
    pieces.push(
      { ...base, id: `ff-${pieceId++}`, component: "Frame Top", lengthMm: outerW, quantity: 2 * quantity },
      { ...base, id: `ff-${pieceId++}`, component: "Frame Bottom", lengthMm: outerW, quantity: 2 * quantity },
      { ...base, id: `ff-${pieceId++}`, component: "Frame Left", lengthMm: outerH, quantity: 2 * quantity },
      { ...base, id: `ff-${pieceId++}`, component: "Frame Right", lengthMm: outerH, quantity: 2 * quantity },
    );

    const partitionCount = Math.max(0, modules.length - 1);
    if (partitionCount > 0) {
      const mullionKey = settings.profiles.mullionProfileKey ?? profile;
      const mullionCode = settings.profiles.mullionProfileCode ?? code;
      pieces.push({
        id: `ff-${pieceId++}`,
        moduleId: "outer",
        moduleLabel: "Outer Frame",
        profileCode: mullionCode,
        profileKey: mullionKey,
        component: "Internal Mullion",
        lengthMm: outerH,
        quantity: partitionCount * quantity,
        angle: "90°",
      });
    }

    for (const mod of modules) {
      const bead = settings.profiles.beadProfileKey;
      const beadCode = settings.profiles.beadProfileCode;
      pieces.push(
        {
          id: `ff-${pieceId++}`,
          moduleId: mod.id,
          moduleLabel: mod.label,
          profileCode: beadCode,
          profileKey: bead,
          component: "Bead Horizontal",
          lengthMm: mod.glassWidthMm,
          quantity: 2 * quantity,
          angle: "90°",
        },
        {
          id: `ff-${pieceId++}`,
          moduleId: mod.id,
          moduleLabel: mod.label,
          profileCode: beadCode,
          profileKey: bead,
          component: "Bead Vertical",
          lengthMm: mod.glassHeightMm,
          quantity: 2 * quantity,
          angle: "90°",
        },
      );
    }
    return pieces;
  }

  for (const mod of modules) {
    const profile = settings.profiles.frameProfileKey;
    const code = settings.profiles.frameProfileCode;
    const bead = settings.profiles.beadProfileKey;
    const beadCode = settings.profiles.beadProfileCode;
    const base = {
      moduleId: mod.id,
      moduleLabel: mod.label,
      angle: "45°",
    };
    pieces.push(
      {
        ...base,
        id: `ff-${pieceId++}`,
        profileCode: code,
        profileKey: profile,
        component: "Frame Top",
        lengthMm: mod.widthMm,
        quantity: 1 * quantity,
      },
      {
        ...base,
        id: `ff-${pieceId++}`,
        profileCode: code,
        profileKey: profile,
        component: "Frame Bottom",
        lengthMm: mod.widthMm,
        quantity: 1 * quantity,
      },
      {
        ...base,
        id: `ff-${pieceId++}`,
        profileCode: code,
        profileKey: profile,
        component: "Frame Left",
        lengthMm: mod.heightMm,
        quantity: 1 * quantity,
      },
      {
        ...base,
        id: `ff-${pieceId++}`,
        profileCode: code,
        profileKey: profile,
        component: "Frame Right",
        lengthMm: mod.heightMm,
        quantity: 1 * quantity,
      },
      {
        ...base,
        id: `ff-${pieceId++}`,
        profileCode: beadCode,
        profileKey: bead,
        component: "Bead Horizontal",
        lengthMm: mod.glassWidthMm,
        quantity: 2 * quantity,
        angle: "90°",
      },
      {
        ...base,
        id: `ff-${pieceId++}`,
        profileCode: beadCode,
        profileKey: bead,
        component: "Bead Vertical",
        lengthMm: mod.glassHeightMm,
        quantity: 2 * quantity,
        angle: "90°",
      },
    );
  }

  return pieces;
}

function buildMaterialItems(
  settings: FixedFrameSettings,
  modules: FixedFrameModuleResult[],
  glassPanels: FixedFrameGlassPanel[],
  quantity: number,
  workshopProfileCost: number,
  reinforcementCost: number,
  labourCost: number,
): FixedFrameMaterialItem[] {
  const items: FixedFrameMaterialItem[] = [];
  let id = 0;

  const totalGlassCost = glassPanels.reduce((s, g) => s + g.totalCost, 0);
  const totalGlassPanels = modules.length * quantity;
  const gaps =
    settings.constructionMode === "SEPARATE_MODULES"
      ? Math.max(0, modules.length - 1) * quantity
      : 0;

  items.push(
    {
      id: `mat-${id++}`,
      category: "upvc-frame",
      itemName: "UPVC Outer Frame",
      profileCode: settings.profiles.frameProfileCode,
      unit: "₹",
      quantity: 1,
      rate: workshopProfileCost,
      amount: workshopProfileCost,
    },
    {
      id: `mat-${id++}`,
      category: "glass",
      itemName: `${settings.glassThicknessMm} mm ${settings.glassType}`,
      unit: "sq.ft",
      quantity: round2(glassPanels.reduce((s, g) => s + g.totalAreaSqFt, 0)),
      rate: settings.glassRatePerSqFt,
      amount: totalGlassCost,
    },
    {
      id: `mat-${id++}`,
      category: "reinforcement",
      itemName: "Steel Reinforcement",
      unit: "₹",
      quantity: 1,
      rate: reinforcementCost,
      amount: reinforcementCost,
    },
    {
      id: `mat-${id++}`,
      category: "anchor-fasteners",
      itemName: "Anchor Fasteners",
      unit: "nos",
      quantity: ANCHOR_FASTENERS_PER_OPENING * quantity,
      rate: 15,
      amount: ANCHOR_FASTENERS_PER_OPENING * quantity * 15,
    },
    {
      id: `mat-${id++}`,
      category: "fixing-screws",
      itemName: "Fixing Screws",
      unit: "nos",
      quantity: FIXING_SCREWS_PER_OPENING * quantity,
      rate: 2,
      amount: FIXING_SCREWS_PER_OPENING * quantity * 2,
    },
    {
      id: `mat-${id++}`,
      category: "setting-blocks",
      itemName: "Glass Setting Blocks",
      unit: "nos",
      quantity: SETTING_BLOCKS_PER_GLASS_PANEL * totalGlassPanels,
      rate: 5,
      amount: SETTING_BLOCKS_PER_GLASS_PANEL * totalGlassPanels * 5,
    },
    {
      id: `mat-${id++}`,
      category: "gasket",
      itemName: "Gasket",
      unit: "m",
      quantity: round2(
        modules.reduce(
          (s, m) =>
            s +
            (2 * (m.glassWidthMm + m.glassHeightMm)) / 1000 *
              GASKET_METRES_PER_GLASS_PERIMETER_M,
          0,
        ) * quantity,
      ),
      rate: 35,
      amount: 0,
    },
    {
      id: `mat-${id++}`,
      category: "silicone",
      itemName: "Silicone Sealant",
      unit: "tube",
      quantity: round2(SILICONE_TUBE_PER_OPENING * quantity),
      rate: 180,
      amount: round2(SILICONE_TUBE_PER_OPENING * quantity * 180),
    },
    {
      id: `mat-${id++}`,
      category: "pu-foam",
      itemName: "PU Foam",
      unit: "can",
      quantity: round2(PU_FOAM_CAN_PER_OPENING * quantity),
      rate: 350,
      amount: round2(PU_FOAM_CAN_PER_OPENING * quantity * 350),
    },
    {
      id: `mat-${id++}`,
      category: "protective-tape",
      itemName: "Protective Tape",
      unit: "m",
      quantity: PROTECTIVE_TAPE_METRES_PER_OPENING * quantity,
      rate: 12,
      amount: PROTECTIVE_TAPE_METRES_PER_OPENING * quantity * 12,
    },
    {
      id: `mat-${id++}`,
      category: "cleaning",
      itemName: "Cleaning Consumables",
      unit: "₹",
      quantity: 1,
      rate: CLEANING_CONSUMABLE_PER_OPENING * quantity,
      amount: CLEANING_CONSUMABLE_PER_OPENING * quantity,
    },
    {
      id: `mat-${id++}`,
      category: "labour",
      itemName: "Fabrication Labour",
      unit: "₹",
      quantity: 1,
      rate: labourCost,
      amount: labourCost,
    },
    {
      id: `mat-${id++}`,
      category: "transportation",
      itemName: "Transportation",
      unit: "₹",
      quantity: 1,
      rate: settings.transportation,
      amount: settings.transportation,
    },
  );

  if (gaps > 0) {
    items.push({
      id: `mat-${id++}`,
      category: "module-joiner",
      itemName: "Module Joiner / Connector",
      unit: "nos",
      quantity: gaps * MODULE_JOINER_PER_GAP,
      rate: 120,
      amount: gaps * MODULE_JOINER_PER_GAP * 120,
    });
  }

  for (const item of items) {
    if (item.category === "gasket" && item.amount === 0) {
      item.amount = round2(item.quantity * item.rate);
    }
  }

  return items;
}

export function calculateFixedFrame(
  input: CalculateFixedFrameInput,
): FixedFrameCalculationResult | { error: string; warnings: string[] } {
  const { openingWidthMm, openingHeightMm, quantity, settings } = input;
  const warnings: string[] = [];

  if (!isBeadCompatibleWithGlass(settings.profiles.beadProfileKey, settings.glassThicknessMm)) {
    return {
      error: `Selected bead profile does not support ${settings.glassThicknessMm} mm glass.`,
      warnings,
    };
  }

  const deductions = getFixedFrameProfileDeductions(
    settings.profiles.frameProfileKey,
    settings.profiles.beadProfileKey,
    settings.glassThicknessMm,
  );

  const division = calculateModuleDivision(
    divisionInputFromSettings(openingWidthMm, openingHeightMm, settings),
  );

  if (!division.ok) {
    return { error: division.error, warnings: division.warnings };
  }
  warnings.push(...division.warnings);

  const modules: FixedFrameModuleResult[] = division.moduleWidthsMm.map(
    (widthMm, index) => {
      const label =
        settings.constructionMode === "INTERNAL_PARTITIONS"
          ? `S${index + 1}`
          : `M${index + 1}`;
      const weldedWidthMm = widthMm - 2 * deductions.frameSideDeductionMm;
      const weldedHeightMm =
        division.moduleHeightMm - 2 * deductions.frameTopBottomDeductionMm;
      const glassWidthMm = weldedWidthMm - deductions.glassWidthDeductionMm;
      const glassHeightMm = weldedHeightMm - deductions.glassHeightDeductionMm;

      if (glassWidthMm <= 0 || glassHeightMm <= 0) {
        warnings.push(`${label}: glass size is zero or negative.`);
      }

      return {
        id: `mod-${index + 1}`,
        moduleIndex: index + 1,
        label,
        widthMm,
        heightMm: division.moduleHeightMm,
        weldedWidthMm,
        weldedHeightMm,
        glassWidthMm: Math.max(0, glassWidthMm),
        glassHeightMm: Math.max(0, glassHeightMm),
        glassAreaSqFt: mmAreaToSqFt(
          Math.max(0, glassWidthMm),
          Math.max(0, glassHeightMm),
        ),
        isPartitionSection: settings.constructionMode === "INTERNAL_PARTITIONS",
      };
    },
  );

  const glassPanels = modules.map((mod) => buildModuleGlass(mod, settings, quantity));
  const totalGlassAreaSqFt = round2(
    glassPanels.reduce((s, g) => s + g.totalAreaSqFt, 0),
  );
  const totalGlassCost = round2(glassPanels.reduce((s, g) => s + g.totalCost, 0));

  const cutPieces = buildFrameCutPieces(
    modules,
    settings,
    quantity,
    settings.constructionMode === "INTERNAL_PARTITIONS",
  );

  const reinforcementCuts = calculateReinforcementCuts(
    modules,
    settings.reinforcementRule,
    settings.reinforcementSides,
    settings.constructionMode,
  );

  for (const rc of reinforcementCuts) {
    cutPieces.push({
      id: `ff-r-${rc.moduleId}-${rc.component}`,
      moduleId: rc.moduleId,
      moduleLabel: rc.moduleLabel,
      profileCode: settings.profiles.reinforcementProfileCode ?? "Steel",
      profileKey: settings.profiles.reinforcementProfileKey ?? "casement-frame",
      component: rc.component,
      lengthMm: rc.lengthMm,
      quantity: rc.quantity,
      angle: "90°",
    });
  }

  const upvcCutPieces = cutPieces.filter(
    (p) => !p.component.startsWith("Reinforcement"),
  );

  const optimizationConfig = buildFixedFrameOptimizationConfig({
    standardBarLengthMm: settings.standardBarLengthMm,
    kerfMm: settings.kerfMm,
    minimumReusableLengthMm: settings.minimumReusableLengthMm,
    savedLeftoverInventoryMm: settings.savedLeftoverInventoryMm,
    frameProfileCode: settings.profiles.frameProfileCode,
    profileStockLengthMm: {
      [settings.profiles.frameProfileCode]: settings.standardBarLengthMm,
      [settings.profiles.beadProfileCode]: settings.standardBarLengthMm,
      ...(settings.profiles.mullionProfileCode
        ? { [settings.profiles.mullionProfileCode]: settings.standardBarLengthMm }
        : {}),
    },
  });

  const weightPerMetre = input.profileWeightPerMetre?.default ?? 0.85;

  const jobOptimization = optimizeFixedFrameBarCuts(
    upvcCutPieces,
    optimizationConfig,
    {
      defaultWeightKgPerMetre: weightPerMetre,
      defaultRatePerKg: input.profileRatePerKg,
    },
  );

  const barPlans = toFixedFrameBarPlans(jobOptimization);
  const barSummary = summarizeProfileBarUsage(
    jobOptimization.barPlans,
    weightPerMetre,
    input.profileRatePerKg,
  );

  const consumedMmByProfile = upvcCutPieces.reduce<Map<string, number>>(
    (map, piece) => {
      const runMm = piece.lengthMm * piece.quantity;
      map.set(piece.profileCode, (map.get(piece.profileCode) ?? 0) + runMm);
      return map;
    },
    new Map(),
  );

  const profileCostRows: FixedFrameProfileCostRow[] = cutPieces.reduce<
    FixedFrameProfileCostRow[]
  >((rows, piece) => {
    const existing = rows.find(
      (r) => r.profileCode === piece.profileCode && r.component === piece.component,
    );
    const runMm = piece.lengthMm * piece.quantity;
    if (existing) {
      existing.quantity += piece.quantity;
      existing.totalRunningMm += runMm;
      return rows;
    }
    const barRow = barSummary.find((b) => b.profileCode === piece.profileCode);
    const profileConsumedMm = consumedMmByProfile.get(piece.profileCode) ?? runMm;
    const costShare =
      barRow && profileConsumedMm > 0 ? runMm / profileConsumedMm : 0;
    rows.push({
      profileCode: piece.profileCode,
      profileKey: piece.profileKey,
      component: piece.component,
      cutLengthMm: piece.lengthMm,
      quantity: piece.quantity,
      totalRunningMm: runMm,
      standardBarLengthMm: settings.standardBarLengthMm,
      requiredBars: barRow?.newBarsRequired ?? 0,
      purchasedLengthMm: barRow?.purchasedLengthMm ?? 0,
      consumedLengthMm: barRow?.consumedLengthMm ?? runMm,
      reusableLeftoverMm: barRow?.reusableLeftoverMm ?? 0,
      scrapMm: barRow?.scrapMm ?? 0,
      weightPerMetreKg: weightPerMetre,
      totalWeightKg: round2((barRow?.totalWeightKg ?? 0) * costShare),
      ratePerKg: input.profileRatePerKg,
      totalCost: round2((barRow?.totalCost ?? 0) * costShare),
    });
    return rows;
  }, []);

  const profileCost = round2(
    jobOptimization.profileSummaries.reduce((sum, row) => sum + row.profileCost, 0),
  );
  const totalReinforcementLengthMm = reinforcementCuts.reduce(
    (s, c) => s + c.lengthMm * c.quantity,
    0,
  );
  const reinforcementCost = round2(
    (totalReinforcementLengthMm / 1000) *
      weightPerMetre *
      settings.reinforcementRatePerKg,
  );

  const totalFrameLengthMm = cutPieces
    .filter((p) => p.component.startsWith("Frame"))
    .reduce((s, p) => s + p.lengthMm * p.quantity, 0);
  const totalBeadLengthMm = cutPieces
    .filter((p) => p.component.startsWith("Bead"))
    .reduce((s, p) => s + p.lengthMm * p.quantity, 0);
  const totalMullionLengthMm = cutPieces
    .filter((p) => p.component.includes("Mullion"))
    .reduce((s, p) => s + p.lengthMm * p.quantity, 0);

  const grossAreaSqFt = mmAreaToSqFt(openingWidthMm, openingHeightMm);
  const totalGrossAreaSqFt = round2(grossAreaSqFt * quantity);
  const labourCost = round2(totalGrossAreaSqFt * settings.labourRatePerSqFt);

  const materials = buildMaterialItems(
    settings,
    modules,
    glassPanels,
    quantity,
    profileCost,
    reinforcementCost,
    labourCost,
  );

  const hardwareCost = round2(
    materials
      .filter((m) =>
        [
          "anchor-fasteners",
          "fixing-screws",
          "setting-blocks",
          "gasket",
          "silicone",
          "pu-foam",
          "module-joiner",
          "protective-tape",
          "cleaning",
        ].includes(m.category),
      )
      .reduce((s, m) => s + m.amount, 0),
  );

  const beadCost = round2(
    (totalBeadLengthMm / 1000) * weightPerMetre * input.profileRatePerKg * 0.6,
  );
  const mullionCost =
    totalMullionLengthMm > 0
      ? round2((totalMullionLengthMm / 1000) * weightPerMetre * input.profileRatePerKg)
      : 0;

  const totalWorkshopCost = round2(
    profileCost +
      reinforcementCost +
      totalGlassCost +
      beadCost +
      mullionCost +
      hardwareCost +
      labourCost +
      settings.transportation,
  );

  return {
    openingWidthMm,
    openingHeightMm,
    quantity,
    grossAreaSqFt,
    totalGrossAreaSqFt,
    constructionMode: settings.constructionMode,
    divisionMode: settings.divisionMode,
    moduleCount: division.moduleCount,
    sectionCount: division.sectionCount,
    modules,
    cutPieces,
    glassPanels,
    totalGlassAreaSqFt,
    totalGlassCost,
    totalBeadLengthMm,
    totalFrameLengthMm,
    totalMullionLengthMm,
    totalReinforcementLengthMm,
    barPlans,
    profileCostRows,
    materials,
    workshopCost: {
      profileCost,
      reinforcementCost,
      glassCost: totalGlassCost,
      beadCost,
      mullionCost,
      hardwareCost,
      labourCost,
      transportation: settings.transportation,
      totalWorkshopCost,
      workshopCostPerSqFt:
        totalGrossAreaSqFt > 0
          ? round2(totalWorkshopCost / totalGrossAreaSqFt)
          : 0,
    },
    warnings,
  };
}

export function calculateFixedFrameCutting(
  input: CalculateFixedFrameInput,
): FixedFrameCuttingResult | null {
  const result = calculateFixedFrame(input);
  if ("error" in result) return null;
  return {
    components: result.modules,
    tableRows: result.cutPieces,
    glassPanels: result.glassPanels,
    barPlans: result.barPlans,
    profileCostRows: result.profileCostRows,
    materials: result.materials,
    summary: result,
  };
}
