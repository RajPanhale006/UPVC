import {
  SARIK_DOOR_BEADING_HEIGHT_DEDUCT,
  SARIK_DOOR_BEADING_WIDTH_DEDUCT,
  SARIK_DOOR_FRAME_HEIGHT_ADD,
  SARIK_DOOR_FRAME_WIDTH_ADD,
  SARIK_DOOR_GLASS_FROM_BEADING_HEIGHT_DEDUCT,
  SARIK_DOOR_GLASS_FROM_BEADING_WIDTH_DEDUCT,
  SARIK_DOUBLE_DOOR_FLAT_MULLION_HEIGHT_DEDUCT,
  SARIK_DOUBLE_DOOR_SASH_HEIGHT_DEDUCT,
  SARIK_DOUBLE_DOOR_TOTAL_WIDTH_DEDUCT,
  SARIK_SINGLE_DOOR_SASH_HEIGHT_DEDUCT,
  SARIK_SINGLE_DOOR_SASH_WIDTH_DEDUCT,
} from "./constants";
import type {
  DoorComponentSizes,
  DoorConfiguration,
  DoorCuttingOptions,
  DoorDimensions,
  DoorOpeningDirection,
} from "./types";

function roundDoorMm(value: number): number {
  return Math.round(value);
}

/** Minimum door size so sash, beading and glass all stay positive. */
export function getMinimumDoorDimensions(configuration: DoorConfiguration): {
  minWidthMm: number;
  minHeightMm: number;
} {
  const minSashForBeadingAndGlass =
    SARIK_DOOR_BEADING_WIDTH_DEDUCT + SARIK_DOOR_GLASS_FROM_BEADING_WIDTH_DEDUCT + 1;
  const minHeightMm =
    (configuration === "single"
      ? SARIK_SINGLE_DOOR_SASH_HEIGHT_DEDUCT
      : SARIK_DOUBLE_DOOR_SASH_HEIGHT_DEDUCT) +
    SARIK_DOOR_BEADING_HEIGHT_DEDUCT +
    SARIK_DOOR_GLASS_FROM_BEADING_HEIGHT_DEDUCT +
    1;

  if (configuration === "single") {
    return {
      minWidthMm:
        SARIK_SINGLE_DOOR_SASH_WIDTH_DEDUCT + minSashForBeadingAndGlass,
      minHeightMm,
    };
  }

  return {
    minWidthMm:
      SARIK_DOUBLE_DOOR_TOTAL_WIDTH_DEDUCT + minSashForBeadingAndGlass * 2 + 1,
    minHeightMm,
  };
}

export function validateDoorDimensions(
  dimensions: DoorDimensions,
  configuration: DoorConfiguration,
): string | null {
  const { widthMm, heightMm } = dimensions;
  const { minWidthMm, minHeightMm } = getMinimumDoorDimensions(configuration);

  if (widthMm <= 0 || heightMm <= 0) {
    return "Enter valid door width and height.";
  }
  if (widthMm <= minWidthMm) {
    return `Door width must be greater than ${minWidthMm} mm for ${configuration === "single" ? "a single" : "a double"} door.`;
  }
  if (heightMm <= minHeightMm) {
    return `Door height must be greater than ${minHeightMm} mm.`;
  }
  return null;
}

/** Sarik Door Method — entered size is the final door size (mm). */
export function calculateSarikDoorComponents(
  dimensions: DoorDimensions,
  configuration: DoorConfiguration,
): DoorComponentSizes {
  const widthMm = roundDoorMm(dimensions.widthMm);
  const heightMm = roundDoorMm(dimensions.heightMm);

  const frameWidthMm = widthMm + SARIK_DOOR_FRAME_WIDTH_ADD;
  const frameHeightMm = heightMm + SARIK_DOOR_FRAME_HEIGHT_ADD;

  let sashWidthMm: number;
  const sashHeightMm =
    configuration === "single"
      ? heightMm - SARIK_SINGLE_DOOR_SASH_HEIGHT_DEDUCT
      : heightMm - SARIK_DOUBLE_DOOR_SASH_HEIGHT_DEDUCT;
  const sashQty = configuration === "single" ? 1 : 2;

  if (configuration === "single") {
    sashWidthMm = widthMm - SARIK_SINGLE_DOOR_SASH_WIDTH_DEDUCT;
  } else {
    sashWidthMm = roundDoorMm(
      (widthMm - SARIK_DOUBLE_DOOR_TOTAL_WIDTH_DEDUCT) / 2,
    );
  }

  const beadingWidthMm = sashWidthMm - SARIK_DOOR_BEADING_WIDTH_DEDUCT;
  const beadingHeightMm = sashHeightMm - SARIK_DOOR_BEADING_HEIGHT_DEDUCT;
  const glassWidthMm = beadingWidthMm - SARIK_DOOR_GLASS_FROM_BEADING_WIDTH_DEDUCT;
  const glassHeightMm = beadingHeightMm - SARIK_DOOR_GLASS_FROM_BEADING_HEIGHT_DEDUCT;

  // Flat mullion uses actual door height − 196 mm — not derived from sash cutting height.
  // The v2 sash height correction (+3 mm vs v1) applies to sash height only.
  const flatMullionMm =
    configuration === "double"
      ? heightMm - SARIK_DOUBLE_DOOR_FLAT_MULLION_HEIGHT_DEDUCT
      : null;

  return {
    finalWidthMm: widthMm,
    finalHeightMm: heightMm,
    frame: { widthMm: frameWidthMm, heightMm: frameHeightMm },
    sash: { widthMm: sashWidthMm, heightMm: sashHeightMm, quantity: sashQty },
    beading: { widthMm: beadingWidthMm, heightMm: beadingHeightMm },
    glass: { widthMm: glassWidthMm, heightMm: glassHeightMm },
    flatMullionMm,
  };
}

/** Opening direction does not affect cutting sizes — included for API symmetry in tests. */
export function calculateSarikDoorComponentsWithOptions(
  dimensions: DoorDimensions,
  options: Pick<DoorCuttingOptions, "configuration" | "openingDirection">,
): DoorComponentSizes {
  void options.openingDirection;
  return calculateSarikDoorComponents(dimensions, options.configuration);
}

export type DoorAcceptanceSample = {
  label: string;
  configuration: DoorConfiguration;
  widthMm: number;
  heightMm: number;
  expected: {
    frameWidth: number;
    frameHeight: number;
    sashWidth: number;
    sashHeight: number;
    beadingWidth: number;
    beadingHeight: number;
    glassWidth: number;
    glassHeight: number;
    flatMullion?: number;
  };
};

export const DOOR_ACCEPTANCE_SAMPLES: DoorAcceptanceSample[] = [
  {
    label: "Single Door 862 × 2141",
    configuration: "single",
    widthMm: 862,
    heightMm: 2141,
    expected: {
      frameWidth: 868,
      frameHeight: 2144,
      sashWidth: 804,
      sashHeight: 2110,
      beadingWidth: 626,
      beadingHeight: 1932,
      glassWidth: 621,
      glassHeight: 1927,
    },
  },
  {
    label: "Double Door 1808 × 2425",
    configuration: "double",
    widthMm: 1808,
    heightMm: 2425,
    expected: {
      frameWidth: 1814,
      frameHeight: 2428,
      sashWidth: 876,
      sashHeight: 2394,
      beadingWidth: 698,
      beadingHeight: 2216,
      glassWidth: 693,
      glassHeight: 2211,
      flatMullion: 2229,
    },
  },
];

export type DoorVerificationRow = {
  item: string;
  expected: number;
  calculated: number;
  diff: number;
  status: "ok" | "fail";
};

export type DoorVerificationResult = {
  label: string;
  allOk: boolean;
  rows: DoorVerificationRow[];
};

function verifyRow(
  item: string,
  expected: number,
  calculated: number,
): DoorVerificationRow {
  const diff = calculated - expected;
  return {
    item,
    expected,
    calculated,
    diff,
    status: Math.abs(diff) <= 0.5 ? "ok" : "fail",
  };
}

export function runDoorAcceptanceTest(
  sample: DoorAcceptanceSample,
): DoorVerificationResult {
  const components = calculateSarikDoorComponents(
    { widthMm: sample.widthMm, heightMm: sample.heightMm },
    sample.configuration,
  );

  const rows: DoorVerificationRow[] = [
    verifyRow("Frame width", sample.expected.frameWidth, components.frame.widthMm),
    verifyRow("Frame height", sample.expected.frameHeight, components.frame.heightMm),
    verifyRow("Sash width", sample.expected.sashWidth, components.sash.widthMm),
    verifyRow("Sash height", sample.expected.sashHeight, components.sash.heightMm),
    verifyRow("Beading width", sample.expected.beadingWidth, components.beading.widthMm),
    verifyRow("Beading height", sample.expected.beadingHeight, components.beading.heightMm),
    verifyRow("Glass width", sample.expected.glassWidth, components.glass.widthMm),
    verifyRow("Glass height", sample.expected.glassHeight, components.glass.heightMm),
  ];

  if (sample.expected.flatMullion != null) {
    rows.push(
      verifyRow(
        "Flat mullion",
        sample.expected.flatMullion,
        components.flatMullionMm ?? 0,
      ),
    );
  }

  return {
    label: sample.label,
    allOk: rows.every((row) => row.status === "ok"),
    rows,
  };
}

export function runDoorOpeningDirectionInvariantTest(): {
  allOk: boolean;
  inward: DoorComponentSizes;
  outward: DoorComponentSizes;
} {
  const dimensions = { widthMm: 862, heightMm: 2141 };
  const inward = calculateSarikDoorComponentsWithOptions(dimensions, {
    configuration: "single",
    openingDirection: "inward" satisfies DoorOpeningDirection,
  });
  const outward = calculateSarikDoorComponentsWithOptions(dimensions, {
    configuration: "single",
    openingDirection: "outward",
  });

  const keys: (keyof DoorComponentSizes)[] = [
    "finalWidthMm",
    "finalHeightMm",
    "frame",
    "sash",
    "beading",
    "glass",
    "flatMullionMm",
  ];

  const allOk = keys.every((key) => {
    return JSON.stringify(inward[key]) === JSON.stringify(outward[key]);
  });

  return { allOk, inward, outward };
}

export function runAllDoorAcceptanceTests(): DoorVerificationResult[] {
  return DOOR_ACCEPTANCE_SAMPLES.map(runDoorAcceptanceTest);
}
