export {
  DEFAULT_KERF_MM,
  DEFAULT_MINIMUM_REUSABLE_LENGTH_MM,
  DEFAULT_STANDARD_BAR_LENGTH_MM,
} from "@/lib/cutting/bar-optimization/constants";

/** Fixed UPVC Partition Frame — centralized formula version. */
export const FIXED_FRAME_FORMULA_VERSION = 1;

/** Default maximum module width for AUTO division (14 ft ≈ 4267 mm). */
export const DEFAULT_MAXIMUM_MODULE_WIDTH_MM = 4267;

export const DEFAULT_JOINT_GAP_MM = 10;
export const DEFAULT_MANUAL_WIDTH_TOLERANCE_MM = 2;

/** Frame weld allowance — deducted from each side for welded internal size. */
export const DEFAULT_FRAME_SIDE_DEDUCTION_MM = 58;
export const DEFAULT_FRAME_TOP_BOTTOM_DEDUCTION_MM = 58;

/** Mullion profile width used in INTERNAL_PARTITIONS section width split. */
export const DEFAULT_MULLION_PROFILE_WIDTH_MM = 58;

/** Module joiner count per gap between separate modules. */
export const MODULE_JOINER_PER_GAP = 2;

/** Consumables — approximate per opening (not sliding hardware). */
export const ANCHOR_FASTENERS_PER_OPENING = 8;
export const FIXING_SCREWS_PER_OPENING = 24;
export const SETTING_BLOCKS_PER_GLASS_PANEL = 4;
export const GASKET_METRES_PER_GLASS_PERIMETER_M = 1.05;
export const SILICONE_TUBE_PER_OPENING = 0.5;
export const PU_FOAM_CAN_PER_OPENING = 0.25;
export const PROTECTIVE_TAPE_METRES_PER_OPENING = 4;
export const CLEANING_CONSUMABLE_PER_OPENING = 50;

export const FIXED_FRAME_METHOD_LABEL = "Fixed UPVC Partition Frame";
