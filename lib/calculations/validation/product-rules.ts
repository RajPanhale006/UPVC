import type { TrackSystemId } from "@/lib/cutting/types";
import type { DoorConfiguration } from "@/lib/cutting/door";
import { getMinimumDoorDimensions } from "@/lib/cutting/door/sarik-door-method";
import type { ProductType } from "../types";

/** Configuration-driven minimum sizes — extend without touching UI components. */
export const PRODUCT_RULES = {
  window: {
    "2-track-t60": {
      minimumWidthMm: 400,
      minimumHeightMm: 400,
      label: "2 Track",
    },
    "2.5-track-t60": {
      minimumWidthMm: 450,
      minimumHeightMm: 400,
      label: "2.5 Track",
    },
    "3-track-t109": {
      minimumWidthMm: 500,
      minimumHeightMm: 450,
      label: "3 Track",
    },
  },
  door: {
    single: {
      getMinimum: () => getMinimumDoorDimensions("single"),
      label: "Single Door",
    },
    double: {
      getMinimum: () => getMinimumDoorDimensions("double"),
      label: "Double Door",
    },
  },
} as const;

export function getWindowMinimumDimensions(trackSystemId: TrackSystemId): {
  minimumWidthMm: number;
  minimumHeightMm: number;
  label: string;
} {
  return PRODUCT_RULES.window[trackSystemId];
}

export function getDoorMinimumDimensions(configuration: DoorConfiguration): {
  minimumWidthMm: number;
  minimumHeightMm: number;
  label: string;
} {
  const mins = PRODUCT_RULES.door[configuration].getMinimum();
  return {
    minimumWidthMm: mins.minWidthMm,
    minimumHeightMm: mins.minHeightMm,
    label: PRODUCT_RULES.door[configuration].label,
  };
}

export function getMinimumDimensionsMessage(
  productType: ProductType,
  trackOrConfig: TrackSystemId | DoorConfiguration,
  widthMm: number,
  heightMm: number,
): string | null {
  if (productType === "door") {
    const config = trackOrConfig as DoorConfiguration;
    const { minimumWidthMm, minimumHeightMm, label } =
      getDoorMinimumDimensions(config);
    if (widthMm <= minimumWidthMm || heightMm <= minimumHeightMm) {
      return `Invalid ${label} size. Minimum ${minimumWidthMm} × ${minimumHeightMm} mm required (entered ${Math.round(widthMm)} × ${Math.round(heightMm)} mm).`;
    }
    return null;
  }

  const track = trackOrConfig as TrackSystemId;
  const { minimumWidthMm, minimumHeightMm, label } =
    getWindowMinimumDimensions(track);
  if (widthMm <= minimumWidthMm || heightMm <= minimumHeightMm) {
    return `Invalid ${label} window size. Minimum ${minimumWidthMm} × ${minimumHeightMm} mm required (entered ${Math.round(widthMm)} × ${Math.round(heightMm)} mm).`;
  }
  return null;
}
