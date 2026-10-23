/**
 * Sarik Door Method — centralized offsets (single source of truth).
 *
 * Official single-door reference (v2): 862 × 2141 mm → Frame 868×2144, Sash 804×2110,
 * Beading 626×1932, Glass 621×1927.
 *
 * Sash cutting height = actual door height − 31 mm (v2). v1 used −34 mm.
 * The +3 mm correction applies to sash cutting height only — not frame, sash width,
 * flat mullion, beading/glass deductions, or hardware.
 *
 * Legacy Size 1 (920 × 2130 with 52/31 sash deductions) is retired — do not use.
 */
export const SARIK_DOOR_FORMULA_VERSION = 2;

export const SARIK_DOOR_FRAME_WIDTH_ADD = 6;
export const SARIK_DOOR_FRAME_HEIGHT_ADD = 3;

/** Official single casement door sash deductions (862 × 2141 reference). */
export const SARIK_SINGLE_DOOR_SASH_WIDTH_DEDUCT = 58;
export const SARIK_SINGLE_DOOR_SASH_HEIGHT_DEDUCT = 31;

export const SARIK_DOUBLE_DOOR_TOTAL_WIDTH_DEDUCT = 56;
export const SARIK_DOUBLE_DOOR_SASH_HEIGHT_DEDUCT = 31;

export const SARIK_DOOR_BEADING_WIDTH_DEDUCT = 178;
export const SARIK_DOOR_BEADING_HEIGHT_DEDUCT = 178;

export const SARIK_DOOR_GLASS_FROM_BEADING_WIDTH_DEDUCT = 5;
export const SARIK_DOOR_GLASS_FROM_BEADING_HEIGHT_DEDUCT = 5;

/** @deprecated Use SARIK_DOOR_GLASS_FROM_BEADING_WIDTH_DEDUCT */
export const SARIK_DOOR_GLASS_WIDTH_DEDUCT = SARIK_DOOR_GLASS_FROM_BEADING_WIDTH_DEDUCT;
/** @deprecated Use SARIK_DOOR_GLASS_FROM_BEADING_HEIGHT_DEDUCT */
export const SARIK_DOOR_GLASS_HEIGHT_DEDUCT = SARIK_DOOR_GLASS_FROM_BEADING_HEIGHT_DEDUCT;

export const SARIK_DOUBLE_DOOR_FLAT_MULLION_HEIGHT_DEDUCT = 196;

/** Superseded v1 sash height deduct — do not revert to this value. */
export const SUPERSEDED_SINGLE_DOOR_SASH_HEIGHT_DEDUCT = 34;

/** Retired legacy single-door sash deductions (Size 1) — width 52 must not return to production. */
export const RETIRED_SINGLE_DOOR_SASH_WIDTH_DEDUCT = 52;
/** Legacy Size 1 height deduct; coincidentally matches v2 official height deduct (31). */
export const RETIRED_SINGLE_DOOR_SASH_HEIGHT_DEDUCT = 31;

export const DOOR_PROFILE_CODES = {
  frame: "P60A-052",
  sash: "P60A-057",
  beading: "P60A-059",
  mullion: "P60A-052",
} as const;

export const DOOR_METHOD_LABEL = "Sarik Door Method";
