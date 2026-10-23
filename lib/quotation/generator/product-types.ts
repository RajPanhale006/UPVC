import type { QuotationProductType } from "./types";

export const QUOTATION_PRODUCT_LABELS: Record<QuotationProductType, string> = {
  "2-track": "2 Track",
  "3-track-2glass-1mesh": "3 Track - 2 Glass + 1 Mesh",
  "3-track-3glass": "3 Track - 3 Glass",
  lowers: "Lowers",
  "fix-frame": "Fixed Frame",
  partition: "Partition",
  door: "Door",
};

export const QUOTATION_PRODUCT_ORDER: QuotationProductType[] = [
  "2-track",
  "3-track-2glass-1mesh",
  "3-track-3glass",
  "lowers",
  "fix-frame",
  "partition",
  "door",
];

const IMAGE_DIR = "/quotation-images";

export const QUOTATION_REFERENCE_IMAGE_PATHS: Record<QuotationProductType, string> = {
  "2-track": `${IMAGE_DIR}/2-track.png`,
  "3-track-2glass-1mesh": `${IMAGE_DIR}/3-track-2glass-1mesh.png`,
  "3-track-3glass": `${IMAGE_DIR}/3-track-3glass.png`,
  lowers: `${IMAGE_DIR}/lowers.png`,
  "fix-frame": `${IMAGE_DIR}/fix-frame.png`,
  partition: `${IMAGE_DIR}/partition.png`,
  door: `${IMAGE_DIR}/door.png`,
};

export function getProductTypeLabel(productType: QuotationProductType): string {
  return QUOTATION_PRODUCT_LABELS[productType];
}
