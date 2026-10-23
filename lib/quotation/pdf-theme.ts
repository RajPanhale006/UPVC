/** Shivshakti quotation PDF palette — extracted from company reference PDF. */
export const QUOTATION_PDF_COLORS = {
  background: [250, 247, 244] as [number, number, number], // #faf7f4
  maroon: [128, 0, 0] as [number, number, number], // #800000
  signature: [159, 23, 40] as [number, number, number], // #9f1728
  black: [0, 0, 0] as [number, number, number],
  white: [255, 255, 255] as [number, number, number],
  footer: [153, 153, 153] as [number, number, number], // #999999
  border: [128, 128, 128] as [number, number, number], // #808080
};

/** Font sizes in points — matched to Shivshakti letterhead. */
export const QUOTATION_PDF_FONT_SIZES = {
  companyName: 26,
  tagline: 14,
  address: 11,
  body: 13,
  subject: 14,
  total: 14,
  amountWords: 12,
  termsBody: 12,
  footer: 11,
};

export const QUOTATION_PDF_MARGINS = {
  left: 15,
  right: 15,
  top: 16,
};

export const QUOTATION_PDF_FONT = "times" as const;
