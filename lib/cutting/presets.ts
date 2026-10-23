import type {
  CuttingMethod,
  CuttingOptions,
  SarikCuttingParams,
  StandardCuttingParams,
  TrackSystemId,
  TrackSystemPreset,
  WorkshopCuttingParams,
  WorkshopPreset,
  SarikPreset,
} from "./types";

export const CUTTING_METHOD_LABELS: Record<CuttingMethod, string> = {
  standard: "Standard Method",
  "workshop-confirmed": "Workshop Confirmed Method",
  sarik: "Sarik Method",
};

export const DEFAULT_STANDARD_VALUES: Omit<
  StandardCuttingParams,
  "profileSectionMm" | "divider" | "shutterQty" | "interlockQty" | "glassPanelQty"
> = {
  standardHeightMinusMm: 20,
  standardWidthMinusMm: 18,
  glassWidthDeductionMm: 0,
  glassHeightDeductionMm: 0,
  beadingAddMm: 0,
  steelDeductionMm: 0,
};

export const DEFAULT_WORKSHOP_VALUES: WorkshopCuttingParams = {
  frameAddWidthMm: 0,
  frameAddHeightMm: 0,
  sashWidthTotalDeductionMm: 0,
  sashHeightDeductionMm: 0,
  weldingAllowanceMm: 5,
  interlockHeightDeductionMm: null,
  glassWidthLessMm: 5,
  glassHeightStandardLessMm: 10,
  divider: 2,
  shutterQty: 4,
  interlockQty: 2,
  glassPanelQty: 2,
  glassWidthDeductionMm: 0,
  glassHeightDeductionMm: 0,
  beadingAddMm: 0,
  steelDeductionMm: 0,
};

export const DEFAULT_SARIK_VALUES: SarikCuttingParams = {
  profileSectionMm: 60,
  frameCuttingExtraWidthMm: 5,
  frameCuttingExtraHeightMm: 5,
  sashCuttingExtraWidthMm: 5,
  sashCuttingExtraHeightMm: 5,
  weldingLossWidthMm: 5,
  weldingLossHeightMm: 5,
  sashWidthTotalDeductionMm: 0,
  sashHeightDeductionMm: 0,
  glassWidthLessMm: 5,
  glassHeightStandardLessMm: 10,
  divider: 2,
  shutterQty: 2,
  interlockQty: 2,
  glassPanelQty: 2,
  glassWidthDeductionMm: 0,
  glassHeightDeductionMm: 0,
  beadingAddMm: 10,
  steelDeductionMm: 10,
  addWeldingAllowanceToInterlock: false,
  steelCalculationBase: "after-welding",
};

export const TRACK_SYSTEM_PRESETS: Record<TrackSystemId, TrackSystemPreset> = {
  "2-track-t60": {
    id: "2-track-t60",
    label: "2 Track T60",
    profileCode: "T60-431-1",
    defaults: {
      profileSectionMm: 60,
      divider: 2,
      shutterQty: 4,
      interlockQty: 2,
      glassPanelQty: 2,
      ...DEFAULT_STANDARD_VALUES,
    },
  },
  "2.5-track-t60": {
    id: "2.5-track-t60",
    label: "2.5 Track T60",
    profileCode: "T60-2.5T",
    defaults: {
      profileSectionMm: 60,
      divider: 2,
      shutterQty: 4,
      interlockQty: 3,
      glassPanelQty: 2,
      ...DEFAULT_STANDARD_VALUES,
    },
  },
  "3-track-t109": {
    id: "3-track-t109",
    label: "3 Track T109",
    profileCode: "T109-3T",
    defaults: {
      profileSectionMm: 109,
      divider: 3,
      shutterQty: 6,
      interlockQty: 4,
      glassPanelQty: 3,
      ...DEFAULT_STANDARD_VALUES,
    },
  },
};

export const WORKSHOP_PRESETS: Record<string, WorkshopPreset> = {
  "workshop-confirmed-60-2track": {
    id: "workshop-confirmed-60-2track",
    name: "Workshop Confirmed 60mm 2 Track",
    trackSystemId: "2-track-t60",
    profileCode: "T60-431-1",
    defaults: {
      frameAddWidthMm: 5,
      frameAddHeightMm: 5,
      divider: 2,
      shutterQty: 2,
      interlockQty: 2,
      glassPanelQty: 2,
      sashWidthTotalDeductionMm: 236,
      sashHeightDeductionMm: 103,
      weldingAllowanceMm: 5,
      interlockHeightDeductionMm: null,
      glassWidthLessMm: 5,
      glassHeightStandardLessMm: 10,
      glassWidthDeductionMm: 0,
      glassHeightDeductionMm: 0,
      beadingAddMm: 10,
      steelDeductionMm: 10,
    },
    sample: {
      openingWidthMm: 2380,
      openingHeightMm: 2048,
      expected: {
        frameWidth: 2385,
        frameHeight: 2053,
        sashTop: 1074.5,
        sashSide: 1950,
        glassWidth: 1069.5,
        glassHeight: 1840,
      },
    },
  },
  "workshop-confirmed-60-2-5track": {
    id: "workshop-confirmed-60-2-5track",
    name: "Workshop Confirmed 60mm 2.5 Track",
    trackSystemId: "2.5-track-t60",
    profileCode: "T60-2.5T",
    defaults: {
      frameAddWidthMm: 5,
      frameAddHeightMm: 5,
      divider: 2,
      shutterQty: 2,
      interlockQty: 3,
      glassPanelQty: 2,
      /** Extra half-track interlock vs 2-track — wider total width deduction. */
      sashWidthTotalDeductionMm: 266,
      sashHeightDeductionMm: 103,
      weldingAllowanceMm: 5,
      interlockHeightDeductionMm: null,
      glassWidthLessMm: 5,
      glassHeightStandardLessMm: 10,
      glassWidthDeductionMm: 0,
      glassHeightDeductionMm: 0,
      beadingAddMm: 10,
      steelDeductionMm: 10,
    },
  },
  "workshop-confirmed-109-3track": {
    id: "workshop-confirmed-109-3track",
    name: "Workshop Confirmed 109mm 3 Track",
    trackSystemId: "3-track-t109",
    profileCode: "T109-3T",
    defaults: {
      frameAddWidthMm: 5,
      frameAddHeightMm: 5,
      divider: 3,
      shutterQty: 6,
      interlockQty: 4,
      glassPanelQty: 3,
      sashWidthTotalDeductionMm: 327,
      sashHeightDeductionMm: 152,
      weldingAllowanceMm: 5,
      interlockHeightDeductionMm: null,
      glassWidthLessMm: 5,
      glassHeightStandardLessMm: 10,
      glassWidthDeductionMm: 0,
      glassHeightDeductionMm: 0,
      beadingAddMm: 10,
      steelDeductionMm: 10,
    },
  },
};

export const SARIK_PRESETS: Record<string, SarikPreset> = {
  "sarik-60-2track": {
    id: "sarik-60-2track",
    name: "Sarik 60mm 2 Track",
    trackSystemId: "2-track-t60",
    profileCode: "T60-431-1",
    defaults: {
      profileSectionMm: 60,
      divider: 2,
      shutterQty: 2,
      interlockQty: 2,
      glassPanelQty: 2,
      frameCuttingExtraWidthMm: 5,
      frameCuttingExtraHeightMm: 5,
      sashCuttingExtraWidthMm: 5,
      sashCuttingExtraHeightMm: 5,
      weldingLossWidthMm: 5,
      weldingLossHeightMm: 5,
      sashWidthTotalDeductionMm: 236,
      sashHeightDeductionMm: 103,
      glassWidthLessMm: 5,
      glassHeightStandardLessMm: 10,
      glassWidthDeductionMm: 0,
      glassHeightDeductionMm: 0,
      beadingAddMm: 10,
      steelDeductionMm: 10,
      addWeldingAllowanceToInterlock: false,
      steelCalculationBase: "after-welding",
    },
  },
  "sarik-60-2-5track": {
    id: "sarik-60-2-5track",
    name: "Sarik 60mm 2.5 Track",
    trackSystemId: "2.5-track-t60",
    profileCode: "T60-431-1",
    screenSashProfileCode: "T60-052",
    jaaliApplicable: true,
    defaults: {
      profileSectionMm: 60,
      divider: 2,
      shutterQty: 3,
      interlockQty: 3,
      glassPanelQty: 2,
      frameCuttingExtraWidthMm: 5,
      frameCuttingExtraHeightMm: 5,
      sashCuttingExtraWidthMm: 5,
      sashCuttingExtraHeightMm: 5,
      weldingLossWidthMm: 5,
      weldingLossHeightMm: 5,
      sashWidthTotalDeductionMm: 266,
      sashHeightDeductionMm: 103,
      glassWidthLessMm: 5,
      glassHeightStandardLessMm: 10,
      glassWidthDeductionMm: 0,
      glassHeightDeductionMm: 0,
      beadingAddMm: 10,
      steelDeductionMm: 10,
      addWeldingAllowanceToInterlock: false,
      steelCalculationBase: "after-welding",
    },
  },
  "sarik-109-3track": {
    id: "sarik-109-3track",
    name: "Sarik 109mm 3 Track",
    trackSystemId: "3-track-t109",
    profileCode: "T109-600",
    screenSashProfileCode: "T60-052",
    jaaliApplicable: true,
    defaults: {
      profileSectionMm: 109,
      divider: 3,
      shutterQty: 3,
      interlockQty: 4,
      glassPanelQty: 2,
      frameCuttingExtraWidthMm: 6,
      frameCuttingExtraHeightMm: 5,
      sashCuttingExtraWidthMm: 5,
      sashCuttingExtraHeightMm: 5,
      weldingLossWidthMm: 5,
      weldingLossHeightMm: 5,
      sashWidthTotalDeductionMm: 327,
      sashHeightDeductionMm: 152,
      glassWidthLessMm: 5,
      glassHeightStandardLessMm: 10,
      glassWidthDeductionMm: 0,
      glassHeightDeductionMm: 0,
      beadingAddMm: 10,
      steelDeductionMm: 10,
      addWeldingAllowanceToInterlock: false,
      steelCalculationBase: "after-welding",
    },
    sample: {
      siteWidthMm: 1187,
      siteHeightMm: 1208,
      expected: {
        frameCutWidth: 1193,
        frameCutHeight: 1213,
      },
    },
  },
};

export const TRACK_SYSTEM_LIST = Object.values(TRACK_SYSTEM_PRESETS);
export const WORKSHOP_PRESET_LIST = Object.values(WORKSHOP_PRESETS);
export const SARIK_PRESET_LIST = Object.values(SARIK_PRESETS);

export function getStandardDefaults(systemId: TrackSystemId): StandardCuttingParams {
  return { ...TRACK_SYSTEM_PRESETS[systemId].defaults };
}

/** @deprecated use getStandardDefaults */
export function getPresetDefaults(systemId: TrackSystemId): StandardCuttingParams {
  return getStandardDefaults(systemId);
}

export function getWorkshopPresetDefaults(presetId: string): WorkshopCuttingParams | null {
  return WORKSHOP_PRESETS[presetId]?.defaults ?? null;
}

export function getProfileCode(systemId: TrackSystemId): string {
  return TRACK_SYSTEM_PRESETS[systemId].profileCode;
}

export function getWorkshopPresetForTrack(
  systemId: TrackSystemId,
): WorkshopPreset | undefined {
  return WORKSHOP_PRESET_LIST.find((preset) => preset.trackSystemId === systemId);
}

export function getActiveWorkshopPreset(
  options: CuttingOptions,
  systemId?: TrackSystemId,
): WorkshopPreset | undefined {
  if (options.workshopPresetId) {
    const preset = WORKSHOP_PRESETS[options.workshopPresetId];
    if (preset) return preset;
  }
  if (systemId) {
    return getWorkshopPresetForTrack(systemId);
  }
  return WORKSHOP_PRESET_LIST.find((preset) => preset.id === "workshop-confirmed-60-2track");
}

export function getSarikPresetForTrack(
  systemId: TrackSystemId,
): SarikPreset | undefined {
  return SARIK_PRESET_LIST.find((preset) => preset.trackSystemId === systemId);
}

export function getActiveSarikPreset(
  options: CuttingOptions,
  systemId?: TrackSystemId,
): SarikPreset | undefined {
  if (options.sarikPresetId) {
    const preset = SARIK_PRESETS[options.sarikPresetId];
    if (preset) return preset;
  }
  if (systemId) {
    return getSarikPresetForTrack(systemId);
  }
  return SARIK_PRESET_LIST.find((preset) => preset.id === "sarik-109-3track");
}

export function ensureSarikPresetApplied(
  options: CuttingOptions,
  _systemId: TrackSystemId,
): CuttingOptions {
  if (options.cuttingMethod !== "sarik") {
    return options;
  }
  return { ...options, cuttingMethod: "sarik" };
}

export function sarikPresetValuesMissing(_options: CuttingOptions): boolean {
  return false;
}

export function getProfileCodeForOptions(
  systemId: TrackSystemId,
  options: CuttingOptions,
): string {
  if (options.cuttingMethod === "sarik") {
    const preset = getActiveSarikPreset(options, systemId);
    if (preset) return preset.profileCode;
  }
  return getProfileCode(systemId);
}

const GLASS_SASH_PROFILE_CODE = "T60-051";

export function getGlassSashProfileCode(): string {
  return GLASS_SASH_PROFILE_CODE;
}

export function getScreenSashProfileCode(
  systemId: TrackSystemId,
  options: CuttingOptions,
): string {
  if (options.cuttingMethod === "sarik") {
    const preset = getActiveSarikPreset(options, systemId);
    if (preset?.screenSashProfileCode) return preset.screenSashProfileCode;
  }
  return "T60-052";
}

/** True when workshop mode is on but preset deductions were never loaded (still 0). */
export function workshopPresetValuesMissing(options: CuttingOptions): boolean {
  return (
    options.cuttingMethod === "workshop-confirmed" &&
    (options.sashWidthTotalDeductionMm === 0 || options.sashHeightDeductionMm === 0)
  );
}

/** Apply the track workshop preset when ids or deduction fields are missing. */
export function ensureWorkshopPresetApplied(
  options: CuttingOptions,
  systemId: TrackSystemId,
): CuttingOptions {
  if (options.cuttingMethod !== "workshop-confirmed") {
    return options;
  }

  const preset =
    (options.workshopPresetId && WORKSHOP_PRESETS[options.workshopPresetId]) ||
    getWorkshopPresetForTrack(systemId);

  if (!preset) {
    return options;
  }

  const presetMismatch =
    !options.workshopPresetId || options.workshopPresetId !== preset.id;
  const missingValues = workshopPresetValuesMissing(options);

  if (!presetMismatch && !missingValues) {
    return options;
  }

  return {
    ...createDefaultCuttingOptions(systemId, "standard"),
    ...options,
    ...preset.defaults,
    cuttingMethod: "workshop-confirmed",
    workshopPresetId: preset.id,
    sizeType: options.sizeType ?? "opening",
    customInterlockDeductionEnabled: options.customInterlockDeductionEnabled,
    customInterlockDeductionMm: options.customInterlockDeductionMm,
    glassWidthLessMm: options.glassWidthLessMm ?? preset.defaults.glassWidthLessMm,
    glassHeightStandardLessMm:
      options.glassHeightStandardLessMm ?? preset.defaults.glassHeightStandardLessMm,
  };
}

/** Keep divider, profile section, glass qty, and workshop preset aligned with track type. */
/** Apply workshop or sarik track preset when the active method needs it. */
export function ensureCuttingPresetApplied(
  options: CuttingOptions,
  systemId: TrackSystemId,
): CuttingOptions {
  if (options.cuttingMethod === "sarik") {
    return ensureSarikPresetApplied(options, systemId);
  }
  if (options.cuttingMethod === "workshop-confirmed") {
    return ensureWorkshopPresetApplied(options, systemId);
  }
  return options;
}

export function syncCuttingOptionsForTrack(
  options: CuttingOptions,
  systemId: TrackSystemId,
): CuttingOptions {
  const track = TRACK_SYSTEM_PRESETS[systemId].defaults;
  const trackWorkshopPreset = getWorkshopPresetForTrack(systemId);
  const trackSarikPreset = getSarikPresetForTrack(systemId);
  const activePreset = options.workshopPresetId
    ? WORKSHOP_PRESETS[options.workshopPresetId]
    : undefined;
  const activeSarikPreset = options.sarikPresetId
    ? SARIK_PRESETS[options.sarikPresetId]
    : undefined;

  const next: CuttingOptions = {
    ...options,
    profileSectionMm: track.profileSectionMm,
    divider: track.divider,
    shutterQty: track.shutterQty,
    interlockQty: track.interlockQty,
    glassPanelQty: track.glassPanelQty,
  };

  if (options.cuttingMethod === "sarik") {
    return { ...options, cuttingMethod: "sarik" };
  }

  if (options.cuttingMethod !== "workshop-confirmed") {
    if (activePreset && activePreset.trackSystemId !== systemId) {
      return { ...next, workshopPresetId: undefined, sarikPresetId: undefined };
    }
    return { ...next, sarikPresetId: undefined };
  }

  if (workshopPresetValuesMissing(options) || !options.workshopPresetId) {
    return ensureWorkshopPresetApplied(next, systemId);
  }

  if (!trackWorkshopPreset) {
    if (activePreset && activePreset.trackSystemId !== systemId) {
      return {
        ...next,
        ...DEFAULT_WORKSHOP_VALUES,
        cuttingMethod: "workshop-confirmed",
        workshopPresetId: undefined,
        sizeType: options.sizeType,
        customInterlockDeductionEnabled: options.customInterlockDeductionEnabled,
        customInterlockDeductionMm: options.customInterlockDeductionMm,
        glassWidthLessMm: options.glassWidthLessMm ?? DEFAULT_WORKSHOP_VALUES.glassWidthLessMm,
        glassHeightStandardLessMm:
          options.glassHeightStandardLessMm ??
          DEFAULT_WORKSHOP_VALUES.glassHeightStandardLessMm,
      };
    }
    return { ...next, workshopPresetId: undefined };
  }

  if (!activePreset || activePreset.trackSystemId !== systemId) {
    return {
      ...next,
      ...trackWorkshopPreset.defaults,
      cuttingMethod: "workshop-confirmed",
      workshopPresetId: trackWorkshopPreset.id,
      sizeType: options.sizeType,
      customInterlockDeductionEnabled: options.customInterlockDeductionEnabled,
      customInterlockDeductionMm: options.customInterlockDeductionMm,
      glassWidthLessMm: options.glassWidthLessMm ?? trackWorkshopPreset.defaults.glassWidthLessMm,
      glassHeightStandardLessMm:
        options.glassHeightStandardLessMm ??
        trackWorkshopPreset.defaults.glassHeightStandardLessMm,
    };
  }

  return {
    ...next,
    ...activePreset.defaults,
    cuttingMethod: "workshop-confirmed",
    workshopPresetId: activePreset.id,
    sizeType: options.sizeType,
    customInterlockDeductionEnabled: options.customInterlockDeductionEnabled,
    customInterlockDeductionMm: options.customInterlockDeductionMm,
    glassWidthLessMm: options.glassWidthLessMm ?? activePreset.defaults.glassWidthLessMm,
    glassHeightStandardLessMm:
      options.glassHeightStandardLessMm ??
      activePreset.defaults.glassHeightStandardLessMm,
  };
}

export function createDefaultCuttingOptions(
  systemId: TrackSystemId,
  method: CuttingMethod = "sarik",
): CuttingOptions {
  const standard = getStandardDefaults(systemId);
  const workshop = { ...DEFAULT_WORKSHOP_VALUES, ...standard };

  if (method === "workshop-confirmed") {
    const preset = getWorkshopPresetForTrack(systemId);
    if (preset) {
      return {
        cuttingMethod: method,
        sizeType: "opening",
        workshopPresetId: preset.id,
        ...standard,
        ...preset.defaults,
        ...DEFAULT_SARIK_VALUES,
        customInterlockDeductionEnabled: false,
        customInterlockDeductionMm: 0,
      };
    }
  }

  if (method === "sarik") {
    return {
      cuttingMethod: method,
      sizeType: "opening",
      ...standard,
      ...DEFAULT_WORKSHOP_VALUES,
      ...DEFAULT_SARIK_VALUES,
      customInterlockDeductionEnabled: false,
      customInterlockDeductionMm: 0,
    };
  }

  return {
    cuttingMethod: method,
    sizeType: "opening",
    ...DEFAULT_WORKSHOP_VALUES,
    ...DEFAULT_SARIK_VALUES,
    ...workshop,
    ...standard,
    customInterlockDeductionEnabled: false,
    customInterlockDeductionMm: 0,
  };
}

export function migrateCuttingOptions(
  raw: Partial<CuttingOptions> & StandardCuttingParams,
  systemId: TrackSystemId = "2-track-t60",
): CuttingOptions {
  const base = createDefaultCuttingOptions(systemId, raw.cuttingMethod ?? "standard");

  return {
    ...base,
    ...raw,
    cuttingMethod: raw.cuttingMethod ?? "standard",
    sizeType: raw.sizeType ?? "opening",
    interlockHeightDeductionMm:
      raw.interlockHeightDeductionMm === undefined
        ? base.interlockHeightDeductionMm
        : raw.interlockHeightDeductionMm,
    glassPanelQty: raw.glassPanelQty ?? raw.divider ?? base.glassPanelQty,
    glassWidthLessMm: raw.glassWidthLessMm ?? base.glassWidthLessMm ?? 5,
    glassHeightStandardLessMm:
      raw.glassHeightStandardLessMm ?? base.glassHeightStandardLessMm ?? 10,
    frameCuttingExtraWidthMm:
      raw.frameCuttingExtraWidthMm ?? base.frameCuttingExtraWidthMm ?? 5,
    frameCuttingExtraHeightMm:
      raw.frameCuttingExtraHeightMm ?? base.frameCuttingExtraHeightMm ?? 5,
    sashCuttingExtraWidthMm:
      raw.sashCuttingExtraWidthMm ?? base.sashCuttingExtraWidthMm ?? 5,
    sashCuttingExtraHeightMm:
      raw.sashCuttingExtraHeightMm ?? base.sashCuttingExtraHeightMm ?? 5,
    weldingLossWidthMm: raw.weldingLossWidthMm ?? base.weldingLossWidthMm ?? 5,
    weldingLossHeightMm: raw.weldingLossHeightMm ?? base.weldingLossHeightMm ?? 5,
    addWeldingAllowanceToInterlock:
      raw.addWeldingAllowanceToInterlock ?? base.addWeldingAllowanceToInterlock ?? false,
    steelCalculationBase:
      raw.steelCalculationBase ?? base.steelCalculationBase ?? "after-welding",
    customInterlockDeductionEnabled: raw.customInterlockDeductionEnabled ?? false,
    customInterlockDeductionMm: raw.customInterlockDeductionMm ?? 0,
    threeTrackSashConfiguration:
      raw.threeTrackSashConfiguration ?? "two-glass-one-net",
  };
}
